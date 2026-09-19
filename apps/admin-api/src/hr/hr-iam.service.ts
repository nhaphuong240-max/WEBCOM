import { Injectable } from '@nestjs/common';
import {
  AppError,
  createId,
} from '@ptt/shared-kernel';
import type { RequestContext } from '@ptt/shared-kernel';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  assertPermission,
  canAccessStore,
  hrFeature,
  parseScope,
  requireHrIam,
  resolveActorRoles,
  resolveActorScopes,
  resolveEffectivePermissions,
  storefrontIdsFromScopes,
  type DataScope,
} from './hr-access';
import { HrRoleService } from './hr-role.service';

@Injectable()
export class HrIamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly roles: HrRoleService,
  ) {}

  async catalog(ctx: RequestContext) {
    return this.roles.catalogMerged(ctx);
  }

  async me(ctx: RequestContext) {
    // Always available for /v1/me enrichment (flag only gates /hr admin APIs)
    const roles = await resolveActorRoles(this.prisma, ctx);
    const scopes = await resolveActorScopes(this.prisma, ctx);
    const permissions = await resolveEffectivePermissions(this.prisma, ctx.tenantId, roles);
    const employee = await this.prisma.db.employee.findFirst({
      where: { tenantId: ctx.tenantId, userId: ctx.actorId },
    });
    const user = await this.prisma.db.user.findFirst({
      where: { id: ctx.actorId, tenantId: ctx.tenantId },
    });
    return {
      actor_id: ctx.actorId,
      tenant_id: ctx.tenantId,
      brand_id: ctx.brandId ?? null,
      email: user?.email ?? null,
      name: user?.name ?? null,
      status: user?.status ?? null,
      roles,
      permissions,
      scopes,
      employee_id: employee?.id ?? null,
      features: {
        hr_iam: hrFeature('hr.iam'),
        hr_employee: hrFeature('hr.employee'),
        hr_shift: hrFeature('hr.shift', false),
        hr_mfa: hrFeature('hr.mfa', false),
      },
    };
  }

  async listUsers(
    ctx: RequestContext,
    query?: { q?: string; status?: string; role?: string },
  ) {
    requireHrIam();
    await assertPermission(this.prisma, ctx, 'hr.user.read');
    const rows = await this.prisma.db.user.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: { not: 'deleted' },
        ...(query?.status ? { status: query.status } : {}),
        ...(query?.q
          ? {
              OR: [
                { email: { contains: query.q, mode: 'insensitive' } },
                { name: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { roleAssignments: true, employee: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    let mapped = await Promise.all(rows.map((u) => this.mapUser(u)));
    if (query?.role) {
      mapped = mapped.filter((u) => u.roles.includes(query.role!));
    }
    return mapped;
  }

  async getUser(ctx: RequestContext, userId: string) {
    requireHrIam();
    await assertPermission(this.prisma, ctx, 'hr.user.read');
    const u = await this.prisma.db.user.findFirst({
      where: { id: userId, tenantId: ctx.tenantId },
      include: { roleAssignments: true, employee: true },
    });
    if (!u) throw AppError.notFound('User not found');
    return this.mapUser(u);
  }

  async invite(
    ctx: RequestContext,
    input: {
      email: string;
      name?: string;
      role_codes: string[];
      scope?: DataScope;
    },
  ) {
    requireHrIam();
    await assertPermission(this.prisma, ctx, 'hr.invite.manage');
    const email = input.email.trim().toLowerCase();
    if (!email.includes('@')) throw AppError.validation('Invalid email');
    const roleCodes = await this.roles.assertRoleCodesExist(ctx.tenantId, input.role_codes);
    const scope = parseScope(input.scope || { type: 'tenant' });

    const existing = await this.prisma.db.user.findUnique({
      where: { tenantId_email: { tenantId: ctx.tenantId, email } },
    });
    if (existing?.status === 'active') {
      throw AppError.conflict('Email already registered as active user');
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    let userId = existing?.id;
    if (!existing) {
      userId = createId('usr');
      await this.prisma.db.user.create({
        data: {
          id: userId,
          tenantId: ctx.tenantId,
          email,
          name: (input.name || email.split('@')[0]).trim(),
          roles: roleCodes,
          status: 'invited',
          invitedAt: new Date(),
        },
      });
    } else {
      await this.prisma.db.user.update({
        where: { id: existing.id },
        data: {
          status: 'invited',
          invitedAt: new Date(),
          name: input.name?.trim() || existing.name,
          roles: roleCodes,
        },
      });
    }

    await this.replaceAssignments(ctx.tenantId, userId!, roleCodes, scope);

    // revoke prior pending invites for same email
    await this.prisma.db.userInvite.updateMany({
      where: { tenantId: ctx.tenantId, email, status: 'pending' },
      data: { status: 'revoked' },
    });

    const invite = await this.prisma.db.userInvite.create({
      data: {
        id: createId('invi'),
        tenantId: ctx.tenantId,
        email,
        name: input.name?.trim() || null,
        roleCodes,
        scope: scope as Prisma.InputJsonValue,
        tokenHash,
        expiresAt,
        invitedById: ctx.actorId.startsWith('usr_') ? ctx.actorId : null,
        status: 'pending',
      },
    });

    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'hr.user.invite',
      entity: 'user_invite',
      entityId: invite.id,
      payload: { email, role_codes: roleCodes, scope },
    });

    const consoleBase =
      process.env.ADMIN_WEB_PUBLIC_URL?.replace(/\/$/, '') ||
      process.env.NEXT_PUBLIC_CONSOLE_URL?.replace(/\/$/, '') ||
      'http://localhost:3000/console';

    return {
      invite_id: invite.id,
      user_id: userId,
      email,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
      accept_path: `/invite/${token}`,
      accept_url: `${consoleBase}/invite/${token}`,
      /** Stub: copy this token/link — SMTP optional later */
      invite_token: token,
      stub: true,
    };
  }

  async previewInvite(token: string) {
    requireHrIam();
    const invite = await this.findPendingInvite(token);
    return {
      email: invite.email,
      name: invite.name,
      role_codes: invite.roleCodes,
      expires_at: invite.expiresAt.toISOString(),
      tenant_id: invite.tenantId,
    };
  }

  async acceptInvite(token: string, input: { password: string; name?: string }) {
    requireHrIam();
    if (!input.password || input.password.length < 8) {
      throw AppError.validation('password must be at least 8 characters');
    }
    const invite = await this.findPendingInvite(token);
    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await this.prisma.db.user.findUnique({
      where: { tenantId_email: { tenantId: invite.tenantId, email: invite.email } },
    });
    if (!user) throw AppError.notFound('Invited user missing');

    await this.prisma.db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: 'active',
        activatedAt: new Date(),
        name: input.name?.trim() || user.name,
        roles: invite.roleCodes.length ? invite.roleCodes : user.roles,
      },
    });
    await this.prisma.db.userInvite.update({
      where: { id: invite.id },
      data: { status: 'accepted', acceptedAt: new Date() },
    });

    await this.audit.write({
      tenantId: invite.tenantId,
      actorId: user.id,
      action: 'hr.user.activate',
      entity: 'user',
      entityId: user.id,
      payload: { invite_id: invite.id },
    });

    return {
      user_id: user.id,
      tenant_id: invite.tenantId,
      email: user.email,
      status: 'active',
      login_hint: 'POST /api/v1/auth/login',
    };
  }

  async suspend(ctx: RequestContext, userId: string) {
    requireHrIam();
    await assertPermission(this.prisma, ctx, 'hr.user.manage');
    const u = await this.requireUser(ctx.tenantId, userId);
    if (u.id === ctx.actorId) throw AppError.validation('Cannot suspend yourself');
    await this.ensureNotLastOwner(ctx.tenantId, u, 'suspend');
    await this.prisma.db.user.update({
      where: { id: u.id },
      data: { status: 'suspended' },
    });
    await this.prisma.db.userSession.updateMany({
      where: { tenantId: ctx.tenantId, userId: u.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'hr.user.suspend',
      entity: 'user',
      entityId: u.id,
      payload: { sessions_revoked: true },
    });
    return this.getUser(ctx, u.id);
  }

  async reactivate(ctx: RequestContext, userId: string) {
    requireHrIam();
    await assertPermission(this.prisma, ctx, 'hr.user.manage');
    const u = await this.requireUser(ctx.tenantId, userId);
    await this.prisma.db.user.update({
      where: { id: u.id },
      data: { status: 'active', activatedAt: u.activatedAt || new Date() },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'hr.user.reactivate',
      entity: 'user',
      entityId: u.id,
    });
    return this.getUser(ctx, u.id);
  }

  async assignRoles(
    ctx: RequestContext,
    userId: string,
    input: { role_codes: string[]; scope?: DataScope },
  ) {
    requireHrIam();
    await assertPermission(this.prisma, ctx, 'hr.role.manage');
    const u = await this.requireUser(ctx.tenantId, userId);
    const roleCodes = await this.roles.assertRoleCodesExist(ctx.tenantId, input.role_codes);
    const scope = parseScope(input.scope || { type: 'tenant' });
    if (u.roles.includes('owner') && !roleCodes.includes('owner')) {
      await this.ensureNotLastOwner(ctx.tenantId, u, 'remove_owner');
    }
    await this.replaceAssignments(ctx.tenantId, u.id, roleCodes, scope);
    await this.prisma.db.user.update({
      where: { id: u.id },
      data: { roles: roleCodes },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'hr.role.assign',
      entity: 'user',
      entityId: u.id,
      payload: { role_codes: roleCodes, scope },
    });
    return this.getUser(ctx, u.id);
  }

  /** Used by website controller for store scope gate. */
  async assertStorefrontAccess(ctx: RequestContext, storefrontId: string) {
    if (!hrFeature('hr.iam')) return;
    const scopes = await resolveActorScopes(this.prisma, ctx);
    if (!canAccessStore(scopes, storefrontId)) {
      throw AppError.forbidden('Storefront out of data scope');
    }
  }

  async assertWebsitePublish(ctx: RequestContext) {
    if (!hrFeature('hr.iam')) return;
    await assertPermission(this.prisma, ctx, 'website.publish');
  }

  /** null = all stores; string[] = restricted */
  async allowedStorefrontIds(ctx: RequestContext): Promise<string[] | null> {
    if (!hrFeature('hr.iam')) return null;
    const scopes = await resolveActorScopes(this.prisma, ctx);
    return storefrontIdsFromScopes(scopes);
  }

  async exportUsersCsv(ctx: RequestContext, reason: string) {
    requireHrIam();
    await assertPermission(this.prisma, ctx, 'pii.export');
    if (!reason || reason.trim().length < 5) {
      throw AppError.validation('export reason required (min 5 chars)');
    }
    const users = await this.prisma.db.user.findMany({
      where: { tenantId: ctx.tenantId, status: { not: 'deleted' } },
      orderBy: { createdAt: 'asc' },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'hr.user.export_pii',
      entity: 'user',
      entityId: ctx.tenantId,
      payload: { reason: reason.trim(), count: users.length },
    });
    const header = 'id,email,name,status,roles,created_at';
    const lines = users.map((u) =>
      [u.id, u.email, JSON.stringify(u.name), u.status, u.roles.join('|'), u.createdAt.toISOString()].join(
        ',',
      ),
    );
    return `${header}\n${lines.join('\n')}\n`;
  }

  async enrollMfa(ctx: RequestContext, userId: string) {
    requireHrIam();
    if (!hrFeature('hr.mfa', false)) throw AppError.validation('Feature hr.mfa disabled');
    await assertPermission(this.prisma, ctx, 'hr.user.manage');
    const u = await this.requireUser(ctx.tenantId, userId);
    const secret = `STUB${randomBytes(10).toString('hex').toUpperCase()}`;
    await this.prisma.db.user.update({
      where: { id: u.id },
      data: { mfaSecret: secret, mfaEnabled: false },
    });
    return {
      stub: true,
      secret,
      otpauth_url: `otpauth://totp/WebCom:${encodeURIComponent(u.email)}?secret=${secret}&issuer=WebCom`,
      note: 'HR-2 stub — verify with code 000000',
    };
  }

  async verifyMfa(ctx: RequestContext, userId: string, code: string) {
    requireHrIam();
    if (!hrFeature('hr.mfa', false)) throw AppError.validation('Feature hr.mfa disabled');
    await assertPermission(this.prisma, ctx, 'hr.user.manage');
    const u = await this.requireUser(ctx.tenantId, userId);
    if (!u.mfaSecret) throw AppError.validation('MFA not enrolled');
    if (code !== '000000') throw AppError.validation('Invalid MFA code (stub expects 000000)');
    await this.prisma.db.user.update({
      where: { id: u.id },
      data: { mfaEnabled: true },
    });
    return { mfa_enabled: true, stub: true };
  }

  async disableMfa(ctx: RequestContext, userId: string) {
    requireHrIam();
    if (!hrFeature('hr.mfa', false)) throw AppError.validation('Feature hr.mfa disabled');
    await assertPermission(this.prisma, ctx, 'hr.user.manage');
    const u = await this.requireUser(ctx.tenantId, userId);
    await this.prisma.db.user.update({
      where: { id: u.id },
      data: { mfaEnabled: false, mfaSecret: null },
    });
    return { mfa_enabled: false };
  }

  private async findPendingInvite(token: string) {
    const tokenHash = this.hashToken(token);
    const invite = await this.prisma.db.userInvite.findFirst({
      where: { tokenHash, status: 'pending' },
    });
    if (!invite) throw AppError.notFound('Invite not found');
    if (invite.expiresAt.getTime() < Date.now()) {
      await this.prisma.db.userInvite.update({
        where: { id: invite.id },
        data: { status: 'expired' },
      });
      throw AppError.validation('Invite expired');
    }
    return invite;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async replaceAssignments(
    tenantId: string,
    userId: string,
    roleCodes: string[],
    scope: DataScope,
  ) {
    await this.prisma.db.userRoleAssignment.deleteMany({ where: { userId, tenantId } });
    for (const roleCode of roleCodes) {
      await this.prisma.db.userRoleAssignment.create({
        data: {
          id: createId('ura'),
          tenantId,
          userId,
          roleCode,
          scope: scope as Prisma.InputJsonValue,
        },
      });
    }
  }

  private async requireUser(tenantId: string, userId: string) {
    const u = await this.prisma.db.user.findFirst({
      where: { id: userId, tenantId },
      include: { roleAssignments: true },
    });
    if (!u) throw AppError.notFound('User not found');
    return u;
  }

  private async ensureNotLastOwner(
    tenantId: string,
    user: { id: string; roles: string[] },
    _action: string,
  ) {
    const roles = user.roles;
    const assignments = await this.prisma.db.userRoleAssignment.findMany({
      where: { userId: user.id, tenantId },
    });
    const isOwner =
      roles.includes('owner') || assignments.some((a) => a.roleCode === 'owner');
    if (!isOwner) return;
    const otherOwners = await this.prisma.db.user.findMany({
      where: {
        tenantId,
        id: { not: user.id },
        status: 'active',
        OR: [
          { roles: { has: 'owner' } },
          { roleAssignments: { some: { roleCode: 'owner' } } },
        ],
      },
      take: 1,
    });
    if (!otherOwners.length) {
      throw AppError.validation('Cannot modify the last tenant owner');
    }
  }

  private async mapUser(u: {
    id: string;
    tenantId: string;
    email: string;
    name: string;
    status: string;
    roles: string[];
    invitedAt: Date | null;
    activatedAt: Date | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    roleAssignments: Array<{ roleCode: string; scope: unknown }>;
    employee: { id: string; code: string; displayName: string } | null;
  }) {
    const roles = u.roleAssignments.length
      ? u.roleAssignments.map((a) => a.roleCode)
      : u.roles;
    const permissions = await resolveEffectivePermissions(this.prisma, u.tenantId, roles);
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      status: u.status,
      roles,
      permissions,
      assignments: u.roleAssignments.map((a) => ({
        role_code: a.roleCode,
        scope: parseScope(a.scope),
      })),
      employee_id: u.employee?.id ?? null,
      employee: u.employee
        ? { id: u.employee.id, code: u.employee.code, display_name: u.employee.displayName }
        : null,
      invited_at: u.invitedAt?.toISOString() ?? null,
      activated_at: u.activatedAt?.toISOString() ?? null,
      last_login_at: u.lastLoginAt?.toISOString() ?? null,
      created_at: u.createdAt.toISOString(),
    };
  }
}
