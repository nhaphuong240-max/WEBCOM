import { Injectable } from '@nestjs/common';
import {
  AppError,
  createId,
  getRoleTemplate,
  isHrPermission,
  listRoleTemplates,
  PERMISSION_CATALOG,
} from '@ptt/shared-kernel';
import type { RequestContext } from '@ptt/shared-kernel';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertPermission, requireHrIam } from './hr-access';

const CODE_RE = /^[a-z][a-z0-9_]{1,47}$/;

@Injectable()
export class HrRoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listCustom(ctx: RequestContext) {
    requireHrIam();
    await assertPermission(this.prisma, ctx, 'hr.role.read');
    const rows = await this.prisma.db.tenantRoleTemplate.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { code: 'asc' },
    });
    return rows.map((r) => this.map(r));
  }

  async create(
    ctx: RequestContext,
    input: { code: string; name: string; description?: string; permissions: string[] },
  ) {
    requireHrIam();
    await assertPermission(this.prisma, ctx, 'hr.role.manage');
    const code = input.code.trim().toLowerCase();
    if (!CODE_RE.test(code)) {
      throw AppError.validation('Invalid role code (a-z, 0-9, _, start letter, max 48)');
    }
    if (getRoleTemplate(code)) {
      throw AppError.validation('Cannot override system role code');
    }
    const name = input.name.trim();
    if (!name) throw AppError.validation('name required');
    const permissions = this.sanitizePermissions(input.permissions);

    const existing = await this.prisma.db.tenantRoleTemplate.findUnique({
      where: { tenantId_code: { tenantId: ctx.tenantId, code } },
    });
    if (existing) throw AppError.conflict('Role code already exists');

    const id = createId('trt');
    await this.prisma.db.tenantRoleTemplate.create({
      data: {
        id,
        tenantId: ctx.tenantId,
        code,
        name,
        description: input.description?.trim() || '',
        permissions,
      },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'hr.role.create',
      entity: 'tenant_role_template',
      entityId: id,
      payload: { code, permissions },
    });
    return this.get(ctx, id);
  }

  async update(
    ctx: RequestContext,
    id: string,
    input: { name?: string; description?: string; permissions?: string[] },
  ) {
    requireHrIam();
    await assertPermission(this.prisma, ctx, 'hr.role.manage');
    const row = await this.require(ctx.tenantId, id);
    await this.prisma.db.tenantRoleTemplate.update({
      where: { id: row.id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() || row.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description.trim() }
          : {}),
        ...(input.permissions !== undefined
          ? { permissions: this.sanitizePermissions(input.permissions) }
          : {}),
      },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'hr.role.update',
      entity: 'tenant_role_template',
      entityId: row.id,
      payload: { code: row.code },
    });
    return this.get(ctx, row.id);
  }

  async remove(ctx: RequestContext, id: string) {
    requireHrIam();
    await assertPermission(this.prisma, ctx, 'hr.role.manage');
    const row = await this.require(ctx.tenantId, id);
    const inUse = await this.prisma.db.userRoleAssignment.count({
      where: { tenantId: ctx.tenantId, roleCode: row.code },
    });
    if (inUse > 0) {
      throw AppError.conflict('Role is assigned to users; unassign first', { count: inUse });
    }
    await this.prisma.db.tenantRoleTemplate.delete({ where: { id: row.id } });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'hr.role.delete',
      entity: 'tenant_role_template',
      entityId: row.id,
      payload: { code: row.code },
    });
    return { deleted: true, code: row.code };
  }

  async get(ctx: RequestContext, id: string) {
    requireHrIam();
    await assertPermission(this.prisma, ctx, 'hr.role.read');
    const row = await this.require(ctx.tenantId, id);
    return this.map(row);
  }

  /** Catalog = system + custom */
  async catalogMerged(ctx: RequestContext) {
    requireHrIam();
    const custom = await this.prisma.db.tenantRoleTemplate.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { code: 'asc' },
    });
    return {
      permissions: PERMISSION_CATALOG,
      roles: [
        ...listRoleTemplates().map((r) => ({
          code: r.code,
          name: r.name,
          description: r.description,
          system: true as const,
          permissions: r.all ? [...PERMISSION_CATALOG.map((p) => p.code)] : r.permissions,
          default_scope_type: r.defaultScopeType,
        })),
        ...custom.map((r) => ({
          code: r.code,
          name: r.name,
          description: r.description,
          system: false as const,
          permissions: r.permissions,
          default_scope_type: 'tenant' as const,
          id: r.id,
        })),
      ],
    };
  }

  async assertRoleCodesExist(tenantId: string, codes: string[]) {
    if (!codes?.length) throw AppError.validation('role_codes required');
    const out: string[] = [];
    for (const c of codes) {
      const code = c.trim();
      if (getRoleTemplate(code)) {
        out.push(code);
        continue;
      }
      const custom = await this.prisma.db.tenantRoleTemplate.findUnique({
        where: { tenantId_code: { tenantId, code } },
      });
      if (!custom) throw AppError.validation(`Unknown role: ${code}`);
      out.push(code);
    }
    return out;
  }

  private sanitizePermissions(perms: string[]) {
    if (!perms?.length) throw AppError.validation('permissions required');
    const out: string[] = [];
    for (const p of perms) {
      if (!isHrPermission(p)) throw AppError.validation(`Unknown permission: ${p}`);
      if (p === 'secret.manage') {
        throw AppError.validation('Custom roles cannot include secret.manage');
      }
      if (!out.includes(p)) out.push(p);
    }
    return out;
  }

  private async require(tenantId: string, id: string) {
    const row = await this.prisma.db.tenantRoleTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw AppError.notFound('Custom role not found');
    return row;
  }

  private map(r: {
    id: string;
    code: string;
    name: string;
    description: string;
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      system: false as const,
      permissions: r.permissions,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    };
  }
}
