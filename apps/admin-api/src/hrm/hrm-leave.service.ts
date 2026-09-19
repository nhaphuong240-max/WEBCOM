import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import type { RequestContext } from '@ptt/shared-kernel';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertPermission, requireHrmPro } from './hrm-access';
import { calendarDays, dec, parseDateOnly, toDec } from './hrm-utils';

const DEFAULT_POLICIES = [
  { leaveType: 'annual', name: 'Phép năm', daysPerYear: 12 },
  { leaveType: 'unpaid', name: 'Nghỉ không lương', daysPerYear: 0 },
  { leaveType: 'sick', name: 'Nghỉ ốm', daysPerYear: 30 },
  { leaveType: 'remote', name: 'Làm remote', daysPerYear: 0 },
] as const;

@Injectable()
export class HrmLeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listPolicies(ctx: RequestContext) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.leave.read');
    await this.ensureDefaultPolicies(ctx.tenantId);
    return this.prisma.db.leavePolicy.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { leaveType: 'asc' },
    });
  }

  async createPolicy(
    ctx: RequestContext,
    input: { leave_type: string; name: string; days_per_year: number },
  ) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.leave.manage');
    const id = createId('lpo');
    return this.prisma.db.leavePolicy.create({
      data: {
        id,
        tenantId: ctx.tenantId,
        leaveType: input.leave_type,
        name: input.name,
        daysPerYear: input.days_per_year,
      },
    });
  }

  async listBalances(ctx: RequestContext, employeeId: string, year?: number) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.leave.read');
    const y = year ?? new Date().getFullYear();
    await this.ensureDefaultPolicies(ctx.tenantId);
    await this.ensureBalance(ctx.tenantId, employeeId, 'annual', y);
    return this.prisma.db.leaveBalance.findMany({
      where: { tenantId: ctx.tenantId, employeeId, year: y },
    });
  }

  async listRequests(ctx: RequestContext, query?: { employee_id?: string; status?: string }) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.leave.read');
    return this.prisma.db.leaveRequest.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(query?.employee_id ? { employeeId: query.employee_id } : {}),
        ...(query?.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async createRequest(
    ctx: RequestContext,
    input: {
      employee_id: string;
      leave_type: string;
      start_date: string;
      end_date: string;
      reason?: string;
    },
  ) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.leave.manage');
    const start = parseDateOnly(input.start_date);
    const end = parseDateOnly(input.end_date);
    if (end < start) throw AppError.validation('end_date must be >= start_date');
    const days = calendarDays(start, end);
    const id = createId('lre');
    const row = await this.prisma.db.leaveRequest.create({
      data: {
        id,
        tenantId: ctx.tenantId,
        employeeId: input.employee_id,
        leaveType: input.leave_type,
        startDate: start,
        endDate: end,
        days,
        status: 'pending',
        reason: input.reason || null,
      },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'create',
      entity: 'leave_request',
      entityId: id,
    });
    return row;
  }

  async approve(ctx: RequestContext, id: string, reviewerNote?: string) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.leave.approve');
    const req = await this.prisma.db.leaveRequest.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!req) throw AppError.notFound('Leave request not found');
    if (req.status !== 'pending') throw AppError.validation('Request not pending');

    const reviewer = await this.prisma.db.employee.findFirst({
      where: { userId: ctx.actorId, tenantId: ctx.tenantId },
    });

    if (req.leaveType === 'annual') {
      const year = req.startDate.getFullYear();
      await this.ensureBalance(ctx.tenantId, req.employeeId, 'annual', year);
      const bal = await this.prisma.db.leaveBalance.findUnique({
        where: {
          tenantId_employeeId_leaveType_year: {
            tenantId: ctx.tenantId,
            employeeId: req.employeeId,
            leaveType: 'annual',
            year,
          },
        },
      });
      const remaining = dec(bal!.balance) - dec(req.days);
      if (remaining < 0) throw AppError.validation('Insufficient annual leave balance');
      await this.prisma.db.leaveBalance.update({
        where: { id: bal!.id },
        data: { balance: toDec(remaining) },
      });
    }

    const row = await this.prisma.db.leaveRequest.update({
      where: { id },
      data: {
        status: 'approved',
        reviewerNote: reviewerNote || null,
        reviewedById: reviewer?.id || null,
        reviewedAt: new Date(),
      },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'approve',
      entity: 'leave_request',
      entityId: id,
    });
    return row;
  }

  async reject(ctx: RequestContext, id: string, reviewerNote?: string) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.leave.approve');
    const req = await this.prisma.db.leaveRequest.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!req) throw AppError.notFound('Leave request not found');
    if (req.status !== 'pending') throw AppError.validation('Request not pending');
    const reviewer = await this.prisma.db.employee.findFirst({
      where: { userId: ctx.actorId, tenantId: ctx.tenantId },
    });
    const row = await this.prisma.db.leaveRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewerNote: reviewerNote || null,
        reviewedById: reviewer?.id || null,
        reviewedAt: new Date(),
      },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'reject',
      entity: 'leave_request',
      entityId: id,
    });
    return row;
  }

  async myLeave(ctx: RequestContext) {
    requireHrmPro();
    const emp = await this.prisma.db.employee.findFirst({
      where: { userId: ctx.actorId, tenantId: ctx.tenantId },
    });
    if (!emp) return { balances: [], requests: [] };
    const year = new Date().getFullYear();
    await this.ensureDefaultPolicies(ctx.tenantId);
    await this.ensureBalance(ctx.tenantId, emp.id, 'annual', year);
    const [balances, requests] = await Promise.all([
      this.prisma.db.leaveBalance.findMany({
        where: { tenantId: ctx.tenantId, employeeId: emp.id, year },
      }),
      this.prisma.db.leaveRequest.findMany({
        where: { tenantId: ctx.tenantId, employeeId: emp.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    return { balances, requests };
  }

  private async ensureDefaultPolicies(tenantId: string) {
    const count = await this.prisma.db.leavePolicy.count({ where: { tenantId } });
    if (count > 0) return;
    for (const p of DEFAULT_POLICIES) {
      await this.prisma.db.leavePolicy.create({
        data: {
          id: createId('lpo'),
          tenantId,
          leaveType: p.leaveType,
          name: p.name,
          daysPerYear: p.daysPerYear,
        },
      });
    }
  }

  private async ensureBalance(
    tenantId: string,
    employeeId: string,
    leaveType: string,
    year: number,
  ) {
    const existing = await this.prisma.db.leaveBalance.findUnique({
      where: { tenantId_employeeId_leaveType_year: { tenantId, employeeId, leaveType, year } },
    });
    if (existing) return existing;
    const policy = await this.prisma.db.leavePolicy.findUnique({
      where: { tenantId_leaveType: { tenantId, leaveType } },
    });
    const initial = policy?.daysPerYear ?? 12;
    return this.prisma.db.leaveBalance.create({
      data: {
        id: createId('lba'),
        tenantId,
        employeeId,
        leaveType,
        year,
        balance: initial,
      },
    });
  }
}
