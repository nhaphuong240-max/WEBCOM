import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import type { RequestContext } from '@ptt/shared-kernel';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertPermission, requireHrmPro } from './hrm-access';

@Injectable()
export class HrmOrgService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listLegalEntities(ctx: RequestContext) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.department.manage');
    return this.prisma.db.legalEntity.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { code: 'asc' },
    });
  }

  async createLegalEntity(
    ctx: RequestContext,
    input: { code: string; name: string; tax_code?: string; status?: string },
  ) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.department.manage');
    const code = input.code.trim().toUpperCase();
    const id = createId('leg');
    const row = await this.prisma.db.legalEntity.create({
      data: {
        id,
        tenantId: ctx.tenantId,
        code,
        name: input.name.trim(),
        taxCode: input.tax_code?.trim() || null,
        status: input.status || 'active',
      },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'create',
      entity: 'legal_entity',
      entityId: id,
    });
    return row;
  }

  async listDepartments(ctx: RequestContext) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.department.manage');
    return this.prisma.db.hrmDepartment.findMany({
      where: { tenantId: ctx.tenantId },
      include: { legalEntity: { select: { id: true, code: true, name: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async createDepartment(
    ctx: RequestContext,
    input: {
      code: string;
      name: string;
      legal_entity_id?: string;
      parent_id?: string;
    },
  ) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.department.manage');
    const id = createId('hde');
    const row = await this.prisma.db.hrmDepartment.create({
      data: {
        id,
        tenantId: ctx.tenantId,
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        legalEntityId: input.legal_entity_id || null,
        parentId: input.parent_id || null,
      },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'create',
      entity: 'hrm_department',
      entityId: id,
    });
    return row;
  }

  async patchEmployeeOrg(
    ctx: RequestContext,
    employeeId: string,
    input: { department_id?: string | null; reports_to_id?: string | null; legal_entity_id?: string | null },
  ) {
    requireHrmPro();
    await assertPermission(this.prisma, ctx, 'hrm.department.manage');
    const emp = await this.prisma.db.employee.findFirst({
      where: { id: employeeId, tenantId: ctx.tenantId },
    });
    if (!emp) throw AppError.notFound('Employee not found');
    if (input.reports_to_id === employeeId) {
      throw AppError.validation('Employee cannot report to self');
    }
    const updated = await this.prisma.db.employee.update({
      where: { id: employeeId },
      data: {
        ...(input.department_id !== undefined ? { departmentId: input.department_id } : {}),
        ...(input.reports_to_id !== undefined ? { reportsToId: input.reports_to_id } : {}),
        ...(input.legal_entity_id !== undefined ? { legalEntityId: input.legal_entity_id } : {}),
      },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'update',
      entity: 'employee_org',
      entityId: employeeId,
      payload: input,
    });
    return updated;
  }
}
