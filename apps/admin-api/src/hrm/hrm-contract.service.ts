import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import type { RequestContext } from '@ptt/shared-kernel';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertPermission, requireHrmPro } from './hrm-access';
import { dec, parseDateOnly } from './hrm-utils';

@Injectable()
export class HrmContractService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(ctx: RequestContext, query?: { employee_id?: string; status?: string }) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.contract.read');
    return this.prisma.db.employmentContract.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(query?.employee_id ? { employeeId: query.employee_id } : {}),
        ...(query?.status ? { status: query.status } : {}),
      },
      orderBy: { startDate: 'desc' },
      take: 200,
    });
  }

  async create(
    ctx: RequestContext,
    input: {
      employee_id: string;
      contract_type: string;
      start_date: string;
      end_date?: string;
      base_salary: number;
      currency?: string;
      document_url?: string;
      note?: string;
    },
  ) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.contract.manage');
    await this.assertEmployee(ctx.tenantId, input.employee_id);
    const id = createId('con');
    const row = await this.prisma.db.employmentContract.create({
      data: {
        id,
        tenantId: ctx.tenantId,
        employeeId: input.employee_id,
        contractType: input.contract_type,
        startDate: parseDateOnly(input.start_date),
        endDate: input.end_date ? parseDateOnly(input.end_date) : null,
        baseSalary: input.base_salary,
        currency: input.currency || 'VND',
        status: 'draft',
        documentUrl: input.document_url || null,
        note: input.note || null,
      },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'create',
      entity: 'employment_contract',
      entityId: id,
    });
    return row;
  }

  async update(
    ctx: RequestContext,
    id: string,
    input: {
      contract_type?: string;
      start_date?: string;
      end_date?: string | null;
      base_salary?: number;
      currency?: string;
      document_url?: string | null;
      note?: string | null;
    },
  ) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.contract.manage');
    const existing = await this.prisma.db.employmentContract.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!existing) throw AppError.notFound('Contract not found');
    if (existing.status === 'ended') throw AppError.validation('Cannot edit ended contract');
    const row = await this.prisma.db.employmentContract.update({
      where: { id },
      data: {
        ...(input.contract_type ? { contractType: input.contract_type } : {}),
        ...(input.start_date ? { startDate: parseDateOnly(input.start_date) } : {}),
        ...(input.end_date !== undefined
          ? { endDate: input.end_date ? parseDateOnly(input.end_date) : null }
          : {}),
        ...(input.base_salary !== undefined ? { baseSalary: input.base_salary } : {}),
        ...(input.currency ? { currency: input.currency } : {}),
        ...(input.document_url !== undefined ? { documentUrl: input.document_url } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
      },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'update',
      entity: 'employment_contract',
      entityId: id,
    });
    return row;
  }

  async activate(ctx: RequestContext, id: string) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.contract.manage');
    const existing = await this.prisma.db.employmentContract.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!existing) throw AppError.notFound('Contract not found');
    if (existing.status === 'active') return existing;
    await this.prisma.db.employmentContract.updateMany({
      where: {
        tenantId: ctx.tenantId,
        employeeId: existing.employeeId,
        status: 'active',
        id: { not: id },
      },
      data: { status: 'ended' },
    });
    const row = await this.prisma.db.employmentContract.update({
      where: { id },
      data: { status: 'active' },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'activate',
      entity: 'employment_contract',
      entityId: id,
      payload: { base_salary: dec(existing.baseSalary) },
    });
    return row;
  }

  private async assertEmployee(tenantId: string, employeeId: string) {
    const emp = await this.prisma.db.employee.findFirst({
      where: { id: employeeId, tenantId },
    });
    if (!emp) throw AppError.notFound('Employee not found');
  }
}
