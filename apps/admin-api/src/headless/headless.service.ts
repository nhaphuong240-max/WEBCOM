import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { hashKey } from './headless-api-key.guard';

const DEFAULT_SCOPES = [
  'product.read',
  'cart.write',
  'checkout.write',
  'customer.write',
  'content.read',
];

@Injectable()
export class HeadlessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createApiKey(
    tenantId: string,
    input: {
      name: string;
      storefrontId?: string;
      scopes?: string[];
      rateLimitRpm?: number;
    },
    actorId?: string,
  ) {
    const secret = `hk_live_${randomBytes(24).toString('base64url')}`;
    const prefix = secret.slice(0, 16);
    const row = await this.prisma.db.apiKey.create({
      data: {
        id: createId('apk'),
        tenantId,
        storefrontId: input.storefrontId,
        name: input.name,
        keyPrefix: prefix,
        keyHash: hashKey(secret),
        scopes: input.scopes?.length ? input.scopes : DEFAULT_SCOPES,
        rateLimitRpm: input.rateLimitRpm ?? 120,
        status: 'active',
      },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'api_key.create',
      entity: 'api_key',
      entityId: row.id,
      payload: { name: input.name, scopes: row.scopes },
    });
    return {
      id: row.id,
      name: row.name,
      key_prefix: row.keyPrefix,
      scopes: row.scopes,
      rate_limit_rpm: row.rateLimitRpm,
      /** Shown once — store securely */
      api_key: secret,
      api_version: 'v1',
    };
  }

  async listApiKeys(tenantId: string) {
    const rows = await this.prisma.db.apiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      key_prefix: r.keyPrefix,
      scopes: r.scopes,
      rate_limit_rpm: r.rateLimitRpm,
      status: r.status,
      last_used_at: r.lastUsedAt?.toISOString() ?? null,
      created_at: r.createdAt.toISOString(),
    }));
  }

  async revokeApiKey(tenantId: string, id: string, actorId?: string) {
    const row = await this.prisma.db.apiKey.findFirst({ where: { id, tenantId } });
    if (!row) throw AppError.notFound('API key not found');
    const updated = await this.prisma.db.apiKey.update({
      where: { id },
      data: { status: 'revoked', revokedAt: new Date() },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'api_key.revoke',
      entity: 'api_key',
      entityId: id,
    });
    return { id: updated.id, status: updated.status };
  }
}
