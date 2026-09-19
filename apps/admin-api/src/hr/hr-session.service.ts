import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import type { RequestContext } from '@ptt/shared-kernel';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertPermission, requireHrIam } from './hr-access';

@Injectable()
export class HrSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createSession(input: {
    tenantId: string;
    userId: string;
    accessToken?: string;
    ip?: string;
    userAgent?: string;
  }) {
    const id = createId('uss');
    await this.prisma.db.userSession.create({
      data: {
        id,
        tenantId: input.tenantId,
        userId: input.userId,
        tokenHash: input.accessToken ? this.hash(input.accessToken) : null,
        ip: input.ip || null,
        userAgent: input.userAgent || null,
      },
    });
    return id;
  }

  async recordLogin(input: {
    tenantId?: string | null;
    userId?: string | null;
    email: string;
    success: boolean;
    reason?: string;
    ip?: string;
    userAgent?: string;
  }) {
    await this.prisma.db.loginEvent.create({
      data: {
        id: createId('lge'),
        tenantId: input.tenantId || null,
        userId: input.userId || null,
        email: input.email,
        success: input.success,
        reason: input.reason || null,
        ip: input.ip || null,
        userAgent: input.userAgent || null,
      },
    });
  }

  async assertSessionActive(sessionId: string, userId: string) {
    const s = await this.prisma.db.userSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!s || s.revokedAt) {
      throw AppError.unauthorized('Session revoked');
    }
    await this.prisma.db.userSession.update({
      where: { id: s.id },
      data: { lastSeenAt: new Date() },
    });
  }

  async listForUser(ctx: RequestContext, userId: string) {
    requireHrIam();
    await assertPermission(this.prisma, ctx, 'hr.user.read');
    const rows = await this.prisma.db.userSession.findMany({
      where: { tenantId: ctx.tenantId, userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((s) => ({
      id: s.id,
      ip: s.ip,
      user_agent: s.userAgent,
      created_at: s.createdAt.toISOString(),
      last_seen_at: s.lastSeenAt.toISOString(),
      revoked_at: s.revokedAt?.toISOString() ?? null,
      active: !s.revokedAt,
    }));
  }

  async listLoginEvents(
    ctx: RequestContext,
    query?: { user_id?: string; email?: string; success?: boolean },
  ) {
    requireHrIam();
    await assertPermission(this.prisma, ctx, 'hr.user.read');
    const rows = await this.prisma.db.loginEvent.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(query?.user_id ? { userId: query.user_id } : {}),
        ...(query?.email ? { email: { contains: query.email, mode: 'insensitive' } } : {}),
        ...(query?.success !== undefined ? { success: query.success } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((e) => ({
      id: e.id,
      user_id: e.userId,
      email: e.email,
      success: e.success,
      reason: e.reason,
      ip: e.ip,
      user_agent: e.userAgent,
      created_at: e.createdAt.toISOString(),
    }));
  }

  async revoke(ctx: RequestContext, sessionId: string) {
    requireHrIam();
    await assertPermission(this.prisma, ctx, 'hr.session.revoke');
    const s = await this.prisma.db.userSession.findFirst({
      where: { id: sessionId, tenantId: ctx.tenantId },
    });
    if (!s) throw AppError.notFound('Session not found');
    if (s.revokedAt) return { id: s.id, revoked: true };
    await this.prisma.db.userSession.update({
      where: { id: s.id },
      data: { revokedAt: new Date() },
    });
    await this.audit.write({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      action: 'hr.session.revoke',
      entity: 'user_session',
      entityId: s.id,
      payload: { user_id: s.userId },
    });
    return { id: s.id, revoked: true };
  }

  async revokeAllForUser(tenantId: string, userId: string, actorId?: string) {
    await this.prisma.db.userSession.updateMany({
      where: { tenantId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'hr.session.revoke_all',
      entity: 'user',
      entityId: userId,
    });
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
