import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

function money(n: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(n).toFixed(2);
}

type AddressIn = {
  label?: string;
  line1: string;
  city?: string;
  phone?: string;
  is_default?: boolean;
};

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  status() {
    return {
      wave: 'C6',
      features: {
        customer_360: true,
        consent_channels: true,
        order_summary: true,
        inbox_link: true,
        profile_tags_notes: true,
        addresses: true,
        identity_resolution: true,
        match_queue: true,
        merge_unmerge: true,
        auto_attach: true,
        rfm_scoring: true,
        segmentation: true,
        segment_preview: true,
        segment_materialize: true,
        loyalty_ledger: true,
        journey_orchestration: true,
        service_recovery: true,
        nba: true,
      },
    };
  }

  async ensure(
    tenantId: string,
    input: {
      phone?: string;
      email?: string;
      name?: string;
      tags?: string[];
      notes?: string;
      consent_marketing?: boolean;
      consent_email?: boolean;
      consent_sms?: boolean;
      consent_zns?: boolean;
      consent_messenger?: boolean;
      addresses?: AddressIn[];
    },
    actorId?: string,
  ) {
    if (!input.phone && !input.email) {
      throw AppError.validation('phone or email required');
    }
    const existing = await this.prisma.db.customer.findFirst({
      where: {
        tenantId,
        status: { not: 'merged' },
        OR: [
          ...(input.phone ? [{ phone: input.phone }] : []),
          ...(input.email ? [{ email: input.email }] : []),
        ],
      },
    });

    const marketing = input.consent_marketing ?? true;
    const data = {
      name: input.name ?? existing?.name ?? '',
      tags: input.tags ?? existing?.tags ?? [],
      notes: input.notes ?? existing?.notes ?? '',
      consentMarketing: marketing,
      consentEmail: input.consent_email ?? existing?.consentEmail ?? Boolean(input.email),
      consentSms: input.consent_sms ?? existing?.consentSms ?? Boolean(input.phone),
      consentZns: input.consent_zns ?? existing?.consentZns ?? false,
      consentMessenger: input.consent_messenger ?? existing?.consentMessenger ?? false,
      addresses: (input.addresses ?? existing?.addresses ?? []) as Prisma.InputJsonValue,
      status: 'active' as const,
    };

    const row = existing
      ? await this.prisma.db.customer.update({
          where: { id: existing.id },
          data: {
            ...data,
            phone: input.phone ?? existing.phone,
            email: input.email ?? existing.email,
          },
        })
      : await this.prisma.db.customer.create({
          data: {
            id: createId('cus'),
            tenantId,
            phone: input.phone,
            email: input.email,
            ...data,
          },
        });

    await this.refreshLifetime(tenantId, row.id);
    await this.linkInboxByPhone(tenantId, row.id, row.phone);
    await this.syncPrimaryIdentities(tenantId, row.id);
    await this.audit.write({
      tenantId,
      actorId,
      action: existing ? 'crm.customer_ensure_update' : 'crm.customer_ensure_create',
      entity: 'customer',
      entityId: row.id,
      payload: { phone: row.phone, email: row.email },
    });

    return this.get360(tenantId, row.id);
  }

  async list(
    tenantId: string,
    query: { q?: string; limit?: number; status?: string; include_merged?: boolean },
  ) {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
    const q = query.q?.trim();
    const where: Prisma.CustomerWhereInput = {
      tenantId,
      ...(query.status
        ? { status: query.status }
        : query.include_merged
          ? {}
          : { status: { not: 'merged' } }),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
              { email: { contains: q, mode: 'insensitive' } },
              { tags: { has: q } },
            ],
          }
        : {}),
    };
    const rows = await this.prisma.db.customer.findMany({
      where,
      orderBy: [{ lastOrderAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
    return rows.map((r) => this.mapList(r));
  }

  async get360(tenantId: string, id: string) {
    const row = await this.prisma.db.customer.findFirst({ where: { id, tenantId } });
    if (!row) throw AppError.notFound('Customer not found');

    await this.refreshLifetime(tenantId, id);
    await this.linkInboxByPhone(tenantId, id, row.phone);
    const fresh = await this.prisma.db.customer.findFirstOrThrow({ where: { id, tenantId } });

    const orders = await this.prisma.db.order.findMany({
      where: { tenantId, customerId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { lines: true },
    });

    // Also surface guest orders matching phone (soft 360 until C2 merge)
    const phoneOrders =
      fresh.phone && !orders.length
        ? await this.prisma.db.order.findMany({
            where: {
              tenantId,
              customerId: null,
              shippingPhone: fresh.phone,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { lines: true },
          })
        : [];

    const conversations = await this.prisma.db.inboxConversation.findMany({
      where: { tenantId, customerId: id },
      orderBy: { lastMessageAt: 'desc' },
      take: 20,
      include: { channelAccount: true },
    });

    const identities = await this.prisma.db.customerIdentity.findMany({
      where: { tenantId, customerId: id },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    });

    const memberships = await this.prisma.db.segmentMembership.findMany({
      where: { tenantId, customerId: id },
      include: { segment: true },
      orderBy: { snapshotAt: 'desc' },
    });

    const loyalty = await this.prisma.db.loyaltyAccount.findFirst({
      where: { tenantId, customerId: id },
    });

    const tickets = await this.prisma.db.serviceTicket.findMany({
      where: { tenantId, customerId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const nba = await this.prisma.db.nbaRecommendation.findMany({
      where: { tenantId, customerId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const allOrders = [...orders, ...phoneOrders];

    return {
      ...this.mapDetail(fresh),
      merged_into_id: fresh.mergedIntoId,
      merged_at: fresh.mergedAt?.toISOString() ?? null,
      rfm: {
        r: fresh.rfmR,
        f: fresh.rfmF,
        m: fresh.rfmM,
        score: fresh.rfmScore,
        segment: fresh.rfmSegment,
        computed_at: fresh.rfmComputedAt?.toISOString() ?? null,
      },
      loyalty: loyalty
        ? {
            account_id: loyalty.id,
            points_balance: loyalty.pointsBalance,
            lifetime_earned: loyalty.lifetimeEarned,
            lifetime_redeemed: loyalty.lifetimeRedeemed,
            tier_code: loyalty.tierCode,
            referral_code: loyalty.referralCode,
          }
        : null,
      recovery: {
        tickets: tickets.map((t) => ({
          id: t.id,
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          playbook_code: t.playbookCode,
          care_reply_draft: t.careReplyDraft,
          created_at: t.createdAt.toISOString(),
        })),
        nba: nba.map((n) => ({
          id: n.id,
          action: n.action,
          reason: n.reason,
          status: n.status,
          expected_outcome: n.expectedOutcome,
          created_at: n.createdAt.toISOString(),
        })),
      },
      segments: memberships.map((m) => ({
        segment_id: m.segmentId,
        name: m.segment.name,
        status: m.segment.status,
        snapshot_at: m.snapshotAt.toISOString(),
      })),
      identities: identities.map((i) => ({
        id: i.id,
        type: i.type,
        value: i.value,
        normalized_value: i.normalizedValue,
        verified: i.verified,
        metadata: i.metadata,
        created_at: i.createdAt.toISOString(),
      })),
      orders_summary: {
        count: fresh.lifetimeOrders,
        lifetime_spend: money(fresh.lifetimeSpend),
        last_order_at: fresh.lastOrderAt?.toISOString() ?? null,
      },
      orders: allOrders.map((o) => ({
        id: o.id,
        status: o.status,
        total: money(o.totalAmount),
        payment_method: o.paymentMethod,
        payment_status: o.paymentStatus,
        attribution_channel: o.attributionChannel,
        customer_linked: Boolean(o.customerId),
        created_at: o.createdAt.toISOString(),
        lines: o.lines.map((l) => ({
          title: l.title,
          qty: l.qty,
          sku_code: l.skuCode,
        })),
      })),
      conversations: conversations.map((c) => ({
        id: c.id,
        status: c.status,
        contact_name: c.contactName,
        contact_handle: c.contactHandle,
        last_message_preview: c.lastMessagePreview,
        last_message_at: c.lastMessageAt.toISOString(),
        unread_count: c.unreadCount,
        channel: {
          provider: c.channelAccount.provider,
          channel_type: c.channelAccount.channelType,
          display_name: c.channelAccount.displayName,
        },
      })),
    };
  }

  async updateProfile(
    tenantId: string,
    id: string,
    input: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      tags?: string[];
      notes?: string;
      addresses?: AddressIn[];
      status?: string;
    },
    actorId?: string,
  ) {
    const row = await this.requireCustomer(tenantId, id);
    try {
      const updated = await this.prisma.db.customer.update({
        where: { id: row.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.tags !== undefined ? { tags: input.tags } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(input.addresses !== undefined
            ? { addresses: input.addresses as unknown as Prisma.InputJsonValue }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });
      if (updated.phone) await this.linkInboxByPhone(tenantId, id, updated.phone);
      await this.syncPrimaryIdentities(tenantId, id);
      await this.audit.write({
        tenantId,
        actorId,
        action: 'crm.customer_update',
        entity: 'customer',
        entityId: id,
        payload: input,
      });
      return this.mapDetail(updated);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw AppError.conflict('Phone or email already used by another customer');
      }
      throw e;
    }
  }

  async updateConsent(
    tenantId: string,
    id: string,
    input: {
      consent_marketing?: boolean;
      consent_email?: boolean;
      consent_sms?: boolean;
      consent_zns?: boolean;
      consent_messenger?: boolean;
    },
    actorId?: string,
  ) {
    await this.requireCustomer(tenantId, id);
    const updated = await this.prisma.db.customer.update({
      where: { id },
      data: {
        ...(input.consent_marketing !== undefined
          ? { consentMarketing: input.consent_marketing }
          : {}),
        ...(input.consent_email !== undefined ? { consentEmail: input.consent_email } : {}),
        ...(input.consent_sms !== undefined ? { consentSms: input.consent_sms } : {}),
        ...(input.consent_zns !== undefined ? { consentZns: input.consent_zns } : {}),
        ...(input.consent_messenger !== undefined
          ? { consentMessenger: input.consent_messenger }
          : {}),
      },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'crm.customer_consent',
      entity: 'customer',
      entityId: id,
      payload: input,
    });
    return this.mapDetail(updated);
  }

  /** Attach unlinked inbox threads whose contact_handle matches phone. */
  async linkInboxByPhone(tenantId: string, customerId: string, phone: string | null) {
    if (!phone) return { linked: 0 };
    const digits = phone.replace(/\D/g, '');
    const tail = digits.slice(-9);
    const result = await this.prisma.db.inboxConversation.updateMany({
      where: {
        tenantId,
        customerId: null,
        OR: [
          { contactHandle: phone },
          ...(tail.length >= 8 ? [{ contactHandle: { contains: tail } }] : []),
        ],
      },
      data: { customerId },
    });
    return { linked: result.count };
  }

  async refreshLifetime(tenantId: string, customerId: string) {
    const agg = await this.prisma.db.order.aggregate({
      where: {
        tenantId,
        customerId,
        status: { not: 'CANCELLED' },
      },
      _count: { id: true },
      _sum: { totalAmount: true },
      _max: { createdAt: true },
    });
    await this.prisma.db.customer.update({
      where: { id: customerId },
      data: {
        lifetimeOrders: agg._count.id,
        lifetimeSpend: agg._sum.totalAmount ?? 0,
        lastOrderAt: agg._max.createdAt,
      },
    });
  }

  /** C2 — mirror primary phone/email into CustomerIdentity (idempotent). */
  async syncPrimaryIdentities(tenantId: string, customerId: string) {
    const c = await this.prisma.db.customer.findFirst({ where: { id: customerId, tenantId } });
    if (!c || c.status === 'merged') return;
    const upsert = async (type: 'phone' | 'email', value: string) => {
      const normalized =
        type === 'phone' ? value.replace(/\D/g, '') : value.trim().toLowerCase();
      const existing = await this.prisma.db.customerIdentity.findFirst({
        where: { tenantId, type, normalizedValue: normalized },
      });
      if (existing) return;
      await this.prisma.db.customerIdentity.create({
        data: {
          id: createId('cid'),
          tenantId,
          customerId,
          type,
          value,
          normalizedValue: normalized,
          metadata: { source: 'primary' },
        },
      });
    };
    if (c.phone) await upsert('phone', c.phone);
    if (c.email) await upsert('email', c.email);
  }

  private async requireCustomer(tenantId: string, id: string) {
    const row = await this.prisma.db.customer.findFirst({ where: { id, tenantId } });
    if (!row) throw AppError.notFound('Customer not found');
    return row;
  }

  private mapList(r: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    tags: string[];
    status: string;
    lifetimeOrders: number;
    lifetimeSpend: Prisma.Decimal;
    lastOrderAt: Date | null;
    consentMarketing: boolean;
    rfmSegment?: string | null;
    rfmScore?: number | null;
    createdAt: Date;
  }) {
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      tags: r.tags,
      status: r.status,
      lifetime_orders: r.lifetimeOrders,
      lifetime_spend: money(r.lifetimeSpend),
      last_order_at: r.lastOrderAt?.toISOString() ?? null,
      consent_marketing: r.consentMarketing,
      rfm_segment: r.rfmSegment ?? null,
      rfm_score: r.rfmScore ?? null,
      created_at: r.createdAt.toISOString(),
    };
  }

  private mapDetail(r: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    tags: string[];
    notes: string;
    addresses: Prisma.JsonValue;
    status: string;
    mergedIntoId?: string | null;
    mergedAt?: Date | null;
    rfmR?: number | null;
    rfmF?: number | null;
    rfmM?: number | null;
    rfmScore?: number | null;
    rfmSegment?: string | null;
    rfmComputedAt?: Date | null;
    consentMarketing: boolean;
    consentEmail: boolean;
    consentSms: boolean;
    consentZns: boolean;
    consentMessenger: boolean;
    lifetimeOrders: number;
    lifetimeSpend: Prisma.Decimal;
    lastOrderAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      tags: r.tags,
      notes: r.notes,
      addresses: r.addresses,
      status: r.status,
      merged_into_id: r.mergedIntoId ?? null,
      merged_at: r.mergedAt?.toISOString() ?? null,
      rfm: {
        r: r.rfmR ?? null,
        f: r.rfmF ?? null,
        m: r.rfmM ?? null,
        score: r.rfmScore ?? null,
        segment: r.rfmSegment ?? null,
        computed_at: r.rfmComputedAt?.toISOString() ?? null,
      },
      consent: {
        marketing: r.consentMarketing,
        email: r.consentEmail,
        sms: r.consentSms,
        zns: r.consentZns,
        messenger: r.consentMessenger,
      },
      lifetime_orders: r.lifetimeOrders,
      lifetime_spend: money(r.lifetimeSpend),
      last_order_at: r.lastOrderAt?.toISOString() ?? null,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    };
  }
}
