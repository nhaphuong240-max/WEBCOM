import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PlatformService } from '../website/platform.service';

const FLOW = [
  'submitted',
  'in_review',
  'accepted',
  'installed',
  'staging',
  'published',
  'rejected',
] as const;

@Injectable()
export class AgencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly platform: PlatformService,
  ) {}

  async list(tenantId: string, storefrontId: string) {
    const rows = await this.prisma.db.agencyDelivery.findMany({
      where: { tenantId, storefrontId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.map(r));
  }

  async submit(
    tenantId: string,
    storefrontId: string,
    input: { title: string; agency_name: string; notes?: string; white_label_host?: string },
    actorId?: string,
  ) {
    const sf = await this.prisma.db.storefront.findFirst({ where: { id: storefrontId, tenantId } });
    if (!sf) throw AppError.notFound('Storefront not found');
    const preview = await this.platform.createPreviewToken(tenantId, storefrontId, 72);
    const host =
      input.white_label_host ||
      `preview-${storefrontId.slice(0, 8)}.agency.webecom.local`;
    const row = await this.prisma.db.agencyDelivery.create({
      data: {
        id: createId('agd'),
        tenantId,
        storefrontId,
        title: input.title,
        agencyName: input.agency_name,
        status: 'submitted',
        notes: input.notes ?? '',
        previewToken: preview.token,
        whiteLabelHost: host,
        annotations: [],
      },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'agency.submit',
      entity: 'agency_delivery',
      entityId: row.id,
    });
    return {
      ...this.map(row),
      preview_path: preview.preview_path,
      preview_url: `https://${host}${preview.preview_path}`,
    };
  }

  async transition(
    tenantId: string,
    id: string,
    status: (typeof FLOW)[number],
    actorId?: string,
  ) {
    const row = await this.prisma.db.agencyDelivery.findFirst({ where: { id, tenantId } });
    if (!row) throw AppError.notFound('Delivery not found');
    if (!FLOW.includes(status)) throw AppError.validation('Invalid status');
    const updated = await this.prisma.db.agencyDelivery.update({
      where: { id },
      data: { status },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'agency.transition',
      entity: 'agency_delivery',
      entityId: id,
      payload: { status },
    });
    return this.map(updated);
  }

  async annotate(
    tenantId: string,
    id: string,
    note: { author: string; body: string; x?: number; y?: number },
    actorId?: string,
  ) {
    const row = await this.prisma.db.agencyDelivery.findFirst({ where: { id, tenantId } });
    if (!row) throw AppError.notFound('Delivery not found');
    const annotations = [
      ...((row.annotations as Array<Record<string, unknown>>) || []),
      {
        id: randomBytes(6).toString('hex'),
        ...note,
        at: new Date().toISOString(),
      },
    ];
    const updated = await this.prisma.db.agencyDelivery.update({
      where: { id },
      data: { annotations: annotations as Prisma.InputJsonValue },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'agency.annotate',
      entity: 'agency_delivery',
      entityId: id,
    });
    return this.map(updated);
  }

  async revokePreview(tenantId: string, storefrontId: string, token: string, actorId?: string) {
    const deleted = await this.prisma.db.stagingPreviewToken.deleteMany({
      where: { tenantId, storefrontId, token },
    });
    if (!deleted.count) throw AppError.notFound('Preview token not found');
    await this.prisma.db.agencyDelivery.updateMany({
      where: { tenantId, storefrontId, previewToken: token },
      data: { previewToken: null },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'agency.preview_revoke',
      entity: 'staging_preview_token',
      entityId: token.slice(0, 8),
    });
    return { revoked: true };
  }

  private map(row: {
    id: string;
    title: string;
    agencyName: string;
    status: string;
    notes: string;
    previewToken: string | null;
    whiteLabelHost: string | null;
    annotations: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      title: row.title,
      agency_name: row.agencyName,
      status: row.status,
      notes: row.notes,
      preview_token: row.previewToken,
      white_label_host: row.whiteLabelHost,
      annotations: row.annotations,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    };
  }
}
