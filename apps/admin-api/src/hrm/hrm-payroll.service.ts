import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import type { RequestContext } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertPermission, requireHrmPro } from './hrm-access';
import {
  PAYSLIP_DISCLAIMER,
  calcProgressivePitMonthly,
  dec,
  sumAllowances,
  toDec,
} from './hrm-utils';

const VN_DEFAULT_RATES = {
  bhxhEmployee: 0.08,
  bhxhEmployer: 0.175,
  bhytEmployee: 0.015,
  bhytEmployer: 0.03,
  bhtnEmployee: 0.01,
  bhtnEmployer: 0.01,
  pitPersonalDeduction: 11_000_000,
  pitDependentDeduction: 4_400_000,
};

const RUN_TRANSITIONS: Record<string, string[]> = {
  draft: ['review'],
  review: ['approved', 'draft'],
  approved: ['paid', 'review'],
  paid: [],
};

@Injectable()
export class HrmPayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async upsertSalary(
    ctx: RequestContext,
    employeeId: string,
    input: { base_salary: number; allowances?: Record<string, number>; effective_from?: string },
  ) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.payroll.manage');
    const emp = await this.prisma.db.employee.findFirst({
      where: { id: employeeId, tenantId: ctx.tenantId },
    });
    if (!emp) throw AppError.notFound('Employee not found');
    const id = createId('sal');
    const row = await this.prisma.db.salaryStructure.create({
      data: {
        id,
        tenantId: ctx.tenantId,
        employeeId,
        baseSalary: input.base_salary,
        allowances: (input.allowances ?? {}) as Prisma.InputJsonValue,
        effectiveFrom: input.effective_from ? new Date(input.effective_from) : new Date(),
      },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'upsert',
      entity: 'salary_structure',
      entityId: id,
    });
    return row;
  }

  async createRun(ctx: RequestContext, year: number, month: number) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.payroll.manage');

    const tsPeriod = await this.prisma.db.timesheetPeriod.findUnique({
      where: { tenantId_year_month: { tenantId: ctx.tenantId, year, month } },
      include: { lines: true },
    });
    if (!tsPeriod || tsPeriod.status !== 'locked') {
      throw AppError.validation('Timesheet must be locked before payroll run');
    }

    await this.ensureRateConfig(ctx.tenantId, year);

    const periodId = await this.ensurePayrollPeriod(ctx.tenantId, year, month);
    const runId = createId('prun');
    const run = await this.prisma.db.payrollRun.create({
      data: {
        id: runId,
        tenantId: ctx.tenantId,
        periodId,
        status: 'draft',
        ratesYear: year,
        timesheetPeriodId: tsPeriod.id,
      },
    });

    const rates = await this.prisma.db.payrollRateConfig.findUnique({
      where: { tenantId_year: { tenantId: ctx.tenantId, year } },
    });
    if (!rates) throw AppError.validation('Payroll rates not configured');

    for (const line of tsPeriod.lines) {
      await this.computePayslip(ctx, run, line.employeeId, rates, dec(line.workDays));
    }

    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'create_run',
      entity: 'payroll_run',
      entityId: runId,
      payload: { year, month },
    });

    return run;
  }

  async transitionRun(ctx: RequestContext, runId: string, status: string) {
    requireHrmPro();
    const run = await this.prisma.db.payrollRun.findFirst({
      where: { id: runId, tenantId: ctx.tenantId },
    });
    if (!run) throw AppError.notFound('Payroll run not found');

    const allowed = RUN_TRANSITIONS[run.status] ?? [];
    if (!allowed.includes(status)) {
      throw AppError.validation(`Cannot transition ${run.status} → ${status}`);
    }

    if (status === 'approved' || status === 'paid') {
      await assertPermission(this.prisma, ctx, 'hrm.payroll.approve');
    } else {
      await assertPermission(this.prisma, ctx, 'hrm.payroll.manage');
    }

    const row = await this.prisma.db.payrollRun.update({
      where: { id: runId },
      data: {
        status,
        ...(status === 'approved' ? { approvedAt: new Date() } : {}),
        ...(status === 'paid' ? { paidAt: new Date() } : {}),
      },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'transition',
      entity: 'payroll_run',
      entityId: runId,
      payload: { status },
    });
    return row;
  }

  async listPayslips(ctx: RequestContext, runId: string) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.payroll.read');
    return this.prisma.db.payslip.findMany({
      where: { tenantId: ctx.tenantId, runId },
      include: { employee: { select: { id: true, code: true, displayName: true } } },
    });
  }

  async listRuns(ctx: RequestContext) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.payroll.read');
    return this.prisma.db.payrollRun.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { period: true, _count: { select: { payslips: true } } },
    });
  }

  async myPayslips(ctx: RequestContext) {
    requireHrmPro();
    const emp = await this.prisma.db.employee.findFirst({
      where: { userId: ctx.actorId, tenantId: ctx.tenantId },
    });
    if (!emp) return [];
    return this.prisma.db.payslip.findMany({
      where: { tenantId: ctx.tenantId, employeeId: emp.id },
      orderBy: { createdAt: 'desc' },
      take: 24,
      include: { run: { include: { period: true } } },
    });
  }

  private async ensureRateConfig(tenantId: string, year: number) {
    const existing = await this.prisma.db.payrollRateConfig.findUnique({
      where: { tenantId_year: { tenantId, year } },
    });
    if (existing) return existing;
    return this.prisma.db.payrollRateConfig.create({
      data: {
        id: createId('prc'),
        tenantId,
        year,
        bhxhEmployee: VN_DEFAULT_RATES.bhxhEmployee,
        bhxhEmployer: VN_DEFAULT_RATES.bhxhEmployer,
        bhytEmployee: VN_DEFAULT_RATES.bhytEmployee,
        bhytEmployer: VN_DEFAULT_RATES.bhytEmployer,
        bhtnEmployee: VN_DEFAULT_RATES.bhtnEmployee,
        bhtnEmployer: VN_DEFAULT_RATES.bhtnEmployer,
        pitPersonalDeduction: VN_DEFAULT_RATES.pitPersonalDeduction,
        pitDependentDeduction: VN_DEFAULT_RATES.pitDependentDeduction,
      },
    });
  }

  private async ensurePayrollPeriod(tenantId: string, year: number, month: number) {
    const existing = await this.prisma.db.payrollPeriod.findUnique({
      where: { tenantId_year_month: { tenantId, year, month } },
    });
    if (existing) return existing.id;
    const id = createId('ppy');
    await this.prisma.db.payrollPeriod.create({
      data: {
        id,
        tenantId,
        year,
        month,
        label: `${month}/${year}`,
        status: 'open',
      },
    });
    return id;
  }

  private async computePayslip(
    _ctx: RequestContext,
    run: { id: string; tenantId: string },
    employeeId: string,
    rates: {
      bhxhEmployee: { toNumber(): number };
      bhxhEmployer: { toNumber(): number };
      bhytEmployee: { toNumber(): number };
      bhytEmployer: { toNumber(): number };
      bhtnEmployee: { toNumber(): number };
      bhtnEmployer: { toNumber(): number };
      pitPersonalDeduction: { toNumber(): number };
    },
    workDays: number,
  ) {
    const salary = await this.prisma.db.salaryStructure.findFirst({
      where: { tenantId: run.tenantId, employeeId },
      orderBy: { effectiveFrom: 'desc' },
    });
    const contract = await this.prisma.db.employmentContract.findFirst({
      where: { tenantId: run.tenantId, employeeId, status: 'active' },
      orderBy: { startDate: 'desc' },
    });

    const base = salary ? dec(salary.baseSalary) : contract ? dec(contract.baseSalary) : 0;
    const allowances = salary ? sumAllowances(salary.allowances) : 0;
    const gross = base + allowances;

    const bhxhEe = gross * dec(rates.bhxhEmployee);
    const bhytEe = gross * dec(rates.bhytEmployee);
    const bhtnEe = gross * dec(rates.bhtnEmployee);
    const bhxhEr = gross * dec(rates.bhxhEmployer);
    const bhytEr = gross * dec(rates.bhytEmployer);
    const bhtnEr = gross * dec(rates.bhtnEmployer);

    const taxableMonthly =
      gross - bhxhEe - bhytEe - bhtnEe - dec(rates.pitPersonalDeduction) / 12;
    const pit = calcProgressivePitMonthly(taxableMonthly, dec(rates.pitPersonalDeduction));
    const net = gross - bhxhEe - bhytEe - bhtnEe - pit;
    const employerCost = gross + bhxhEr + bhytEr + bhtnEr;

    const lines = [
      { code: 'base', label: 'Lương cơ bản', amount: base },
      { code: 'allowances', label: 'Phụ cấp', amount: allowances },
      { code: 'bhxh_ee', label: 'BHXH (NV)', amount: -bhxhEe },
      { code: 'bhyt_ee', label: 'BHYT (NV)', amount: -bhytEe },
      { code: 'bhtn_ee', label: 'BHTN (NV)', amount: -bhtnEe },
      { code: 'pit', label: 'Thuế TNCN', amount: -pit },
      { code: 'work_days', label: 'Ngày công', amount: workDays },
    ];

    await this.prisma.db.payslip.upsert({
      where: { runId_employeeId: { runId: run.id, employeeId } },
      create: {
        id: createId('pay'),
        tenantId: run.tenantId,
        runId: run.id,
        employeeId,
        gross: toDec(gross),
        bhxhEmployee: toDec(bhxhEe),
        bhytEmployee: toDec(bhytEe),
        bhtnEmployee: toDec(bhtnEe),
        pit: toDec(pit),
        net: toDec(net),
        employerCost: toDec(employerCost),
        lines,
        disclaimer: PAYSLIP_DISCLAIMER,
      },
      update: {
        gross: toDec(gross),
        bhxhEmployee: toDec(bhxhEe),
        bhytEmployee: toDec(bhytEe),
        bhtnEmployee: toDec(bhtnEe),
        pit: toDec(pit),
        net: toDec(net),
        employerCost: toDec(employerCost),
        lines,
        disclaimer: PAYSLIP_DISCLAIMER,
      },
    });
  }
}
