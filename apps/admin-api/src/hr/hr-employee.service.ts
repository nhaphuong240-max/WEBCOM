import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import type { RequestContext } from '@ptt/shared-kernel';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertPermission, requireHrEmployee } from './hr-access';

@Injectable()
export class HrEmployeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    ctx: RequestContext,
    query?: { q?: string; status?: string; department?: string },
  ) {
    requireHrEmployee();
    await assertPermission(this.prisma, ctx, 'hr.employee.read');
    const rows = await this.prisma.db.employee.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(query?.status ? { status: query.status } : {}),
        ...(query?.department ? { department: query.department } : {}),
        ...(query?.q
          ? {
              OR: [
                { code: { contains: query.q, mode: 'insensitive' } },
                { displayName: { contains: query.q, mode: 'insensitive' } },
                { email: { contains: query.q, mode: 'insensitive' } },
                { department: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { assignments: true, user: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((e) => this.map(e));
  }

  async get(ctx: RequestContext, id: string) {
    requireHrEmployee();
    await assertPermission(this.prisma, ctx, 'hr.employee.read');
    const e = await this.prisma.db.employee.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: { assignments: true, user: { select: { id: true, email: true } } },
    });
    if (!e) throw AppError.notFound('Employee not found');
    return this.map(e);
  }

  async create(
    ctx: RequestContext,
    input: {
      code: string;
      display_name: string;
      title?: string;
      phone?: string;
      email?: string;
      department?: string;
      status?: string;
      store_ids?: string[];
      primary_store_id?: string;
    },
  ) {
    requireHrEmployee();
    await assertPermission(this.prisma, ctx, 'hr.employee.manage');
    const code = input.code.trim().toUpperCase();
    if (!code) throw AppError.validation('code required');
    const existing = await this.prisma.db.employee.findUnique({
      where: { tenantId_code: { tenantId: ctx.tenantId, code } },
    });
    if (existing) throw AppError.conflict('Employee code already exists');

    const id = createId('emp');
    await this.prisma.db.employee.create({
      data: {
        id,
        tenantId: ctx.tenantId,
        code,
        displayName: input.display_name.trim(),
        title: input.title?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim().toLowerCase() || null,
        department: input.department?.trim() || null,
        status: input.status || 'active',
        hiredAt: new Date(),
      },
    });
    if (input.store_ids?.length) {
      await this.setStores(ctx.tenantId, id, input.store_ids, input.primary_store_id);
    }
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'hr.employee.create',
      entity: 'employee',
      entityId: id,
      payload: { code },
    });
    return this.get(ctx, id);
  }

  async update(
    ctx: RequestContext,
    id: string,
    input: {
      display_name?: string;
      title?: string;
      phone?: string;
      email?: string;
      department?: string;
      status?: string;
    },
  ) {
    requireHrEmployee();
    await assertPermission(this.prisma, ctx, 'hr.employee.manage');
    const e = await this.prisma.db.employee.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!e) throw AppError.notFound('Employee not found');
    await this.prisma.db.employee.update({
      where: { id },
      data: {
        ...(input.display_name !== undefined
          ? { displayName: input.display_name.trim() }
          : {}),
        ...(input.title !== undefined ? { title: input.title.trim() || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone.trim() || null } : {}),
        ...(input.email !== undefined
          ? { email: input.email.trim().toLowerCase() || null }
          : {}),
        ...(input.department !== undefined
          ? { department: input.department.trim() || null }
          : {}),
        ...(input.status
          ? {
              status: input.status,
              terminatedAt: input.status === 'terminated' ? new Date() : e.terminatedAt,
            }
          : {}),
      },
    });
    return this.get(ctx, id);
  }

  async linkUser(ctx: RequestContext, employeeId: string, userId: string | null) {
    requireHrEmployee();
    await assertPermission(this.prisma, ctx, 'hr.employee.manage');
    const e = await this.prisma.db.employee.findFirst({
      where: { id: employeeId, tenantId: ctx.tenantId },
    });
    if (!e) throw AppError.notFound('Employee not found');
    if (userId) {
      const user = await this.prisma.db.user.findFirst({
        where: { id: userId, tenantId: ctx.tenantId },
      });
      if (!user) throw AppError.notFound('User not found');
      const taken = await this.prisma.db.employee.findFirst({
        where: { tenantId: ctx.tenantId, userId, id: { not: employeeId } },
      });
      if (taken) throw AppError.conflict('User already linked to another employee');
    }
    await this.prisma.db.employee.update({
      where: { id: employeeId },
      data: { userId },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'hr.employee.link_user',
      entity: 'employee',
      entityId: employeeId,
      payload: { user_id: userId },
    });
    return this.get(ctx, employeeId);
  }

  async setStoreAssignments(
    ctx: RequestContext,
    employeeId: string,
    input: { store_ids: string[]; primary_store_id?: string },
  ) {
    requireHrEmployee();
    await assertPermission(this.prisma, ctx, 'hr.employee.manage');
    const e = await this.prisma.db.employee.findFirst({
      where: { id: employeeId, tenantId: ctx.tenantId },
    });
    if (!e) throw AppError.notFound('Employee not found');
    await this.setStores(
      ctx.tenantId,
      employeeId,
      input.store_ids,
      input.primary_store_id,
    );
    return this.get(ctx, employeeId);
  }

  async setPosPin(ctx: RequestContext, employeeId: string, pin: string) {
    requireHrEmployee();
    await assertPermission(this.prisma, ctx, 'hr.employee.manage');
    if (!/^\d{4,8}$/.test(pin)) {
      throw AppError.validation('PIN must be 4–8 digits');
    }
    const e = await this.prisma.db.employee.findFirst({
      where: { id: employeeId, tenantId: ctx.tenantId },
    });
    if (!e) throw AppError.notFound('Employee not found');
    const hash = await bcrypt.hash(pin, 10);
    await this.prisma.db.employee.update({
      where: { id: e.id },
      data: { posPinHash: hash },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'hr.employee.pos_pin_set',
      entity: 'employee',
      entityId: e.id,
    });
    return { id: e.id, pos_pin_set: true };
  }

  async verifyPosPin(ctx: RequestContext, employeeId: string, pin: string) {
    requireHrEmployee();
    await assertPermission(this.prisma, ctx, 'hr.employee.read');
    const e = await this.prisma.db.employee.findFirst({
      where: { id: employeeId, tenantId: ctx.tenantId },
    });
    if (!e) throw AppError.notFound('Employee not found');
    if (!e.posPinHash) throw AppError.validation('POS PIN not set');
    const ok = await bcrypt.compare(pin, e.posPinHash);
    if (!ok) throw AppError.unauthorized('Invalid POS PIN');
    return { id: e.id, verified: true };
  }

  private async setStores(
    tenantId: string,
    employeeId: string,
    storeIds: string[],
    primaryStoreId?: string,
  ) {
    for (const sid of storeIds) {
      const sf = await this.prisma.db.storefront.findFirst({
        where: { id: sid, tenantId },
      });
      if (!sf) throw AppError.validation(`Unknown storefront: ${sid}`);
    }
    await this.prisma.db.employeeStoreAssignment.deleteMany({ where: { employeeId } });
    const primary = primaryStoreId || storeIds[0];
    for (const sid of storeIds) {
      await this.prisma.db.employeeStoreAssignment.create({
        data: {
          id: createId('esa'),
          employeeId,
          storeId: sid,
          isPrimary: sid === primary,
        },
      });
    }
  }

  private map(e: {
    id: string;
    code: string;
    displayName: string;
    title: string | null;
    phone: string | null;
    email: string | null;
    department: string | null;
    status: string;
    userId: string | null;
    hiredAt: Date | null;
    terminatedAt: Date | null;
    posPinHash: string | null;
    createdAt: Date;
    assignments: Array<{ storeId: string; isPrimary: boolean }>;
    user: { id: string; email: string } | null;
  }) {
    return {
      id: e.id,
      code: e.code,
      display_name: e.displayName,
      title: e.title,
      phone: e.phone,
      email: e.email,
      department: e.department,
      status: e.status,
      user_id: e.userId,
      user: e.user ? { id: e.user.id, email: e.user.email } : null,
      stores: e.assignments.map((a) => ({
        store_id: a.storeId,
        is_primary: a.isPrimary,
      })),
      pos_pin_set: Boolean(e.posPinHash),
      hired_at: e.hiredAt?.toISOString() ?? null,
      terminated_at: e.terminatedAt?.toISOString() ?? null,
      created_at: e.createdAt.toISOString(),
    };
  }
}
