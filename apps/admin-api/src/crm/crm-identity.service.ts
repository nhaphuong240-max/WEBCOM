import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CrmService } from './crm.service';

const IDENTITY_TYPES = [
  'phone',
  'email',
  'meta',
  'zalo',
  'shopee',
  'tiktok',
  'loyalty',
  'other',
] as const;

export type IdentityType = (typeof IDENTITY_TYPES)[number];

export function normalizeIdentity(type: string, value: string) {
  const v = value.trim();
  if (type === 'phone') return v.replace(/\D/g, '');
  if (type === 'email') return v.toLowerCase();
  return v.toLowerCase();
}

type Signal = { type: string; value: string; source: string };

@Injectable()
export class CrmIdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly crm: CrmService,
  ) {}

  /** Sync primary phone/email onto identity table (idempotent). */
  async syncPrimaryIdentities(tenantId: string, customerId: string) {
    const c = await this.prisma.db.customer.findFirst({ where: { id: customerId, tenantId } });
    if (!c || c.status === 'merged') return { synced: 0 };
    let n = 0;
    if (c.phone) {
      await this.upsertIdentityQuiet(tenantId, customerId, 'phone', c.phone, { source: 'primary' });
      n += 1;
    }
    if (c.email) {
      await this.upsertIdentityQuiet(tenantId, customerId, 'email', c.email, { source: 'primary' });
      n += 1;
    }
    return { synced: n };
  }

  async listIdentities(tenantId: string, customerId: string) {
    await this.requireActiveOrMerged(tenantId, customerId);
    const rows = await this.prisma.db.customerIdentity.findMany({
      where: { tenantId, customerId },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => this.mapIdentity(r));
  }

  /**
   * Add identity. If same type+value owned by another active customer → create match candidate.
   */
  async addIdentity(
    tenantId: string,
    customerId: string,
    input: { type: string; value: string; verified?: boolean; metadata?: Record<string, unknown> },
    actorId?: string,
  ) {
    const type = input.type.toLowerCase();
    if (!IDENTITY_TYPES.includes(type as IdentityType)) {
      throw AppError.validation(`type must be one of ${IDENTITY_TYPES.join('|')}`);
    }
    const value = input.value.trim();
    if (!value) throw AppError.validation('value required');
    await this.requireActive(tenantId, customerId);
    const normalized = normalizeIdentity(type, value);

    const existing = await this.prisma.db.customerIdentity.findFirst({
      where: { tenantId, type, normalizedValue: normalized },
      include: { customer: true },
    });

    if (existing) {
      if (existing.customerId === customerId) {
        const updated = await this.prisma.db.customerIdentity.update({
          where: { id: existing.id },
          data: {
            verified: input.verified ?? existing.verified,
            metadata: (input.metadata ?? existing.metadata) as Prisma.InputJsonValue,
            value,
          },
        });
        return { identity: this.mapIdentity(updated), match: null, conflict: false };
      }
      if (existing.customer.status !== 'merged') {
        const match = await this.upsertMatchCandidate(
          tenantId,
          customerId,
          existing.customerId,
          [{ type, value, source: 'identity_conflict' }],
          90,
        );
        await this.audit.write({
          tenantId,
          actorId,
          action: 'crm.identity_conflict',
          entity: 'customer_identity',
          entityId: existing.id,
          payload: { customer_id: customerId, other_customer_id: existing.customerId, type, value },
        });
        return {
          identity: null,
          match,
          conflict: true,
          message: 'Identity owned by another customer — match candidate created',
        };
      }
    }

    const row = await this.prisma.db.customerIdentity.create({
      data: {
        id: createId('cid'),
        tenantId,
        customerId,
        type,
        value,
        normalizedValue: normalized,
        verified: input.verified ?? false,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    await this.autoAttach(tenantId, customerId, type, value);
    await this.scanMatches(tenantId);
    await this.audit.write({
      tenantId,
      actorId,
      action: 'crm.identity_add',
      entity: 'customer_identity',
      entityId: row.id,
      payload: { customer_id: customerId, type, value },
    });

    return { identity: this.mapIdentity(row), match: null, conflict: false };
  }

  async removeIdentity(tenantId: string, identityId: string, actorId?: string) {
    const row = await this.prisma.db.customerIdentity.findFirst({
      where: { id: identityId, tenantId },
    });
    if (!row) throw AppError.notFound('Identity not found');
    // Keep primary phone/email identities if they mirror customer fields
    const customer = await this.prisma.db.customer.findFirst({
      where: { id: row.customerId, tenantId },
    });
    if (
      customer &&
      ((row.type === 'phone' && customer.phone && normalizeIdentity('phone', customer.phone) === row.normalizedValue) ||
        (row.type === 'email' &&
          customer.email &&
          normalizeIdentity('email', customer.email) === row.normalizedValue))
    ) {
      throw AppError.conflict('Cannot remove primary phone/email identity — clear profile field first');
    }
    await this.prisma.db.customerIdentity.delete({ where: { id: identityId } });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'crm.identity_remove',
      entity: 'customer_identity',
      entityId: identityId,
      payload: { customer_id: row.customerId, type: row.type, value: row.value },
    });
    return { deleted: true, id: identityId };
  }

  /** Scan shared signals → pending match candidates. */
  async scanMatches(tenantId: string) {
    const customers = await this.prisma.db.customer.findMany({
      where: { tenantId, status: { not: 'merged' } },
      select: { id: true, phone: true, email: true },
    });
    const identities = await this.prisma.db.customerIdentity.findMany({
      where: { tenantId, customer: { status: { not: 'merged' } } },
    });

    type Hit = { customerId: string; type: string; value: string; source: string };
    const map = new Map<string, Hit[]>();

    const add = (key: string, hit: Hit) => {
      const arr = map.get(key) || [];
      if (!arr.some((h) => h.customerId === hit.customerId)) arr.push(hit);
      map.set(key, arr);
    };

    for (const c of customers) {
      if (c.phone) {
        const n = normalizeIdentity('phone', c.phone);
        add(`phone:${n}`, { customerId: c.id, type: 'phone', value: c.phone, source: 'customer.phone' });
      }
      if (c.email) {
        const n = normalizeIdentity('email', c.email);
        add(`email:${n}`, { customerId: c.id, type: 'email', value: c.email, source: 'customer.email' });
      }
    }
    for (const idn of identities) {
      add(`${idn.type}:${idn.normalizedValue}`, {
        customerId: idn.customerId,
        type: idn.type,
        value: idn.value,
        source: 'identity',
      });
    }

    let created = 0;
    let updated = 0;
    for (const [, hits] of map) {
      if (hits.length < 2) continue;
      for (let i = 0; i < hits.length; i++) {
        for (let j = i + 1; j < hits.length; j++) {
          const signals: Signal[] = [
            { type: hits[i].type, value: hits[i].value, source: hits[i].source },
            { type: hits[j].type, value: hits[j].value, source: hits[j].source },
          ];
          const score = hits[i].type === hits[j].type ? 95 : 70;
          const r = await this.upsertMatchCandidate(
            tenantId,
            hits[i].customerId,
            hits[j].customerId,
            signals,
            score,
          );
          if (r.created) created += 1;
          else updated += 1;
        }
      }
    }
    return { scanned_keys: map.size, created, updated };
  }

  async listMatches(tenantId: string, status = 'pending', limit = 50) {
    const rows = await this.prisma.db.customerMatchCandidate.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(Math.max(limit, 1), 100),
      include: {
        leftCustomer: true,
        rightCustomer: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      score: r.score,
      status: r.status,
      signals: r.signals,
      left: {
        id: r.leftCustomer.id,
        name: r.leftCustomer.name,
        phone: r.leftCustomer.phone,
        email: r.leftCustomer.email,
        status: r.leftCustomer.status,
      },
      right: {
        id: r.rightCustomer.id,
        name: r.rightCustomer.name,
        phone: r.rightCustomer.phone,
        email: r.rightCustomer.email,
        status: r.rightCustomer.status,
      },
      created_at: r.createdAt.toISOString(),
    }));
  }

  async dismissMatch(tenantId: string, matchId: string, actorId?: string) {
    const row = await this.prisma.db.customerMatchCandidate.findFirst({
      where: { id: matchId, tenantId },
    });
    if (!row) throw AppError.notFound('Match candidate not found');
    const updated = await this.prisma.db.customerMatchCandidate.update({
      where: { id: matchId },
      data: { status: 'dismissed' },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'crm.match_dismiss',
      entity: 'customer_match_candidate',
      entityId: matchId,
    });
    return { id: updated.id, status: updated.status };
  }

  /**
   * Merge mergedId into survivorId. Orders/inbox/identities move; merged marked status=merged.
   */
  async merge(
    tenantId: string,
    input: { survivor_id: string; merged_id: string; reason?: string; match_id?: string },
    actorId?: string,
  ) {
    if (input.survivor_id === input.merged_id) {
      throw AppError.validation('survivor and merged must differ');
    }
    const survivor = await this.requireActive(tenantId, input.survivor_id);
    const merged = await this.requireActive(tenantId, input.merged_id);

    const [mergedOrders, mergedCarts, mergedConvos, mergedIdentities] = await Promise.all([
      this.prisma.db.order.findMany({
        where: { tenantId, customerId: merged.id },
        select: { id: true },
      }),
      this.prisma.db.cart.findMany({
        where: { tenantId, customerId: merged.id },
        select: { id: true },
      }),
      this.prisma.db.inboxConversation.findMany({
        where: { tenantId, customerId: merged.id },
        select: { id: true },
      }),
      this.prisma.db.customerIdentity.findMany({ where: { tenantId, customerId: merged.id } }),
    ]);

    const beforeSnapshot = {
      survivor: {
        id: survivor.id,
        phone: survivor.phone,
        email: survivor.email,
        name: survivor.name,
        tags: survivor.tags,
      },
      merged: {
        id: merged.id,
        phone: merged.phone,
        email: merged.email,
        name: merged.name,
        tags: merged.tags,
        notes: merged.notes,
      },
      order_ids: mergedOrders.map((o) => o.id),
      cart_ids: mergedCarts.map((c) => c.id),
      conversation_ids: mergedConvos.map((c) => c.id),
      identities: mergedIdentities.map((i) => ({
        id: i.id,
        type: i.type,
        value: i.value,
        normalized_value: i.normalizedValue,
      })),
    };

    const eventId = createId('cmg');

    await this.prisma.db.$transaction(async (tx) => {
      // Move identities (skip if survivor already has same type+normalized)
      for (const idn of mergedIdentities) {
        const clash = await tx.customerIdentity.findFirst({
          where: {
            tenantId,
            type: idn.type,
            normalizedValue: idn.normalizedValue,
            customerId: survivor.id,
          },
        });
        if (clash) {
          await tx.customerIdentity.delete({ where: { id: idn.id } });
        } else {
          await tx.customerIdentity.update({
            where: { id: idn.id },
            data: { customerId: survivor.id },
          });
        }
      }

      // Preserve merged phone/email as identities on survivor if free
      if (merged.phone) {
        const n = normalizeIdentity('phone', merged.phone);
        const owned = await tx.customerIdentity.findFirst({
          where: { tenantId, type: 'phone', normalizedValue: n },
        });
        if (!owned) {
          await tx.customerIdentity.create({
            data: {
              id: createId('cid'),
              tenantId,
              customerId: survivor.id,
              type: 'phone',
              value: merged.phone,
              normalizedValue: n,
              metadata: { source: 'merge_from', from_customer_id: merged.id },
            },
          });
        }
      }
      if (merged.email) {
        const n = normalizeIdentity('email', merged.email);
        const owned = await tx.customerIdentity.findFirst({
          where: { tenantId, type: 'email', normalizedValue: n },
        });
        if (!owned) {
          await tx.customerIdentity.create({
            data: {
              id: createId('cid'),
              tenantId,
              customerId: survivor.id,
              type: 'email',
              value: merged.email,
              normalizedValue: n,
              metadata: { source: 'merge_from', from_customer_id: merged.id },
            },
          });
        }
      }

      await tx.order.updateMany({
        where: { tenantId, customerId: merged.id },
        data: { customerId: survivor.id },
      });
      await tx.cart.updateMany({
        where: { tenantId, customerId: merged.id },
        data: { customerId: survivor.id },
      });
      await tx.inboxConversation.updateMany({
        where: { tenantId, customerId: merged.id },
        data: { customerId: survivor.id },
      });

      // Clear unique phone/email on merged so survivor can keep theirs
      await tx.customer.update({
        where: { id: merged.id },
        data: {
          phone: null,
          email: null,
          status: 'merged',
          mergedIntoId: survivor.id,
          mergedAt: new Date(),
          tags: Array.from(new Set([...survivor.tags, ...merged.tags, 'merged_source'])),
          notes: [merged.notes, `Merged into ${survivor.id}`].filter(Boolean).join('\n'),
        },
      });

      // Union tags on survivor
      await tx.customer.update({
        where: { id: survivor.id },
        data: {
          tags: Array.from(new Set([...survivor.tags, ...merged.tags])),
          name: survivor.name || merged.name,
        },
      });

      await tx.customerMergeEvent.create({
        data: {
          id: eventId,
          tenantId,
          survivorId: survivor.id,
          mergedId: merged.id,
          status: 'merged',
          reason: input.reason || 'manual_merge',
          beforeSnapshot: beforeSnapshot as unknown as Prisma.InputJsonValue,
          afterSnapshot: {
            survivor_id: survivor.id,
            merged_id: merged.id,
            moved_orders: mergedOrders.length,
            moved_conversations: mergedConvos.length,
          } as Prisma.InputJsonValue,
          actorId,
        },
      });

      if (input.match_id) {
        await tx.customerMatchCandidate.updateMany({
          where: { id: input.match_id, tenantId },
          data: { status: 'merged' },
        });
      }
      await tx.customerMatchCandidate.updateMany({
        where: {
          tenantId,
          status: 'pending',
          OR: [
            { leftCustomerId: { in: [survivor.id, merged.id] } },
            { rightCustomerId: { in: [survivor.id, merged.id] } },
          ],
        },
        data: { status: 'merged' },
      });
    });

    await this.crm.refreshLifetime(tenantId, survivor.id);
    await this.syncPrimaryIdentities(tenantId, survivor.id);
    await this.autoAttach(tenantId, survivor.id, 'phone', survivor.phone || '');

    await this.audit.write({
      tenantId,
      actorId,
      action: 'crm.customer_merge',
      entity: 'customer_merge_event',
      entityId: eventId,
      payload: {
        survivor_id: survivor.id,
        merged_id: merged.id,
        orders_moved: mergedOrders.length,
        conversations_moved: mergedConvos.length,
      },
    });

    const detail = await this.crm.get360(tenantId, survivor.id);
    return {
      merge_event_id: eventId,
      survivor_id: survivor.id,
      merged_id: merged.id,
      orders_moved: mergedOrders.length,
      conversations_moved: mergedConvos.length,
      identities_moved: mergedIdentities.length,
      survivor: detail,
    };
  }

  /** Soft unmerge — restore merged customer + move back snapshot entities (BR-006). */
  async unmerge(tenantId: string, mergeEventId: string, actorId?: string) {
    const event = await this.prisma.db.customerMergeEvent.findFirst({
      where: { id: mergeEventId, tenantId },
    });
    if (!event) throw AppError.notFound('Merge event not found');
    if (event.status !== 'merged') throw AppError.conflict('Merge event already unmerged');

    const snap = event.beforeSnapshot as {
      merged?: {
        id: string;
        phone: string | null;
        email: string | null;
        name: string;
        tags: string[];
        notes?: string;
      };
      order_ids?: string[];
      cart_ids?: string[];
      conversation_ids?: string[];
      identities?: Array<{ id: string; type: string; value: string; normalized_value: string }>;
    };

    const mergedId = event.mergedId;
    const survivorId = event.survivorId;
    const mergedProfile = snap.merged;

    await this.prisma.db.$transaction(async (tx) => {
      // Restore merged profile fields (may conflict if survivor took same phone — then keep as identity only)
      let phone = mergedProfile?.phone ?? null;
      let email = mergedProfile?.email ?? null;
      if (phone) {
        const clash = await tx.customer.findFirst({
          where: { tenantId, phone, id: { not: mergedId }, status: { not: 'merged' } },
        });
        if (clash) phone = null;
      }
      if (email) {
        const clash = await tx.customer.findFirst({
          where: { tenantId, email, id: { not: mergedId }, status: { not: 'merged' } },
        });
        if (email && clash) email = null;
      }

      await tx.customer.update({
        where: { id: mergedId },
        data: {
          status: 'active',
          mergedIntoId: null,
          mergedAt: null,
          phone,
          email,
          name: mergedProfile?.name || '',
          tags: (mergedProfile?.tags || []).filter((t) => t !== 'merged_source'),
          notes: mergedProfile?.notes || '',
        },
      });

      for (const oid of snap.order_ids || []) {
        await tx.order.updateMany({
          where: { id: oid, tenantId, customerId: survivorId },
          data: { customerId: mergedId },
        });
      }
      for (const cid of snap.cart_ids || []) {
        await tx.cart.updateMany({
          where: { id: cid, tenantId, customerId: survivorId },
          data: { customerId: mergedId },
        });
      }
      for (const cid of snap.conversation_ids || []) {
        await tx.inboxConversation.updateMany({
          where: { id: cid, tenantId, customerId: survivorId },
          data: { customerId: mergedId },
        });
      }

      for (const idn of snap.identities || []) {
        const current = await tx.customerIdentity.findFirst({ where: { id: idn.id, tenantId } });
        if (current && current.customerId === survivorId) {
          await tx.customerIdentity.update({
            where: { id: idn.id },
            data: { customerId: mergedId },
          });
        } else if (!current) {
          const clash = await tx.customerIdentity.findFirst({
            where: {
              tenantId,
              type: idn.type,
              normalizedValue: idn.normalized_value,
            },
          });
          if (!clash) {
            await tx.customerIdentity.create({
              data: {
                id: idn.id,
                tenantId,
                customerId: mergedId,
                type: idn.type,
                value: idn.value,
                normalizedValue: idn.normalized_value,
                metadata: { source: 'unmerge_restore' },
              },
            });
          }
        }
      }

      await tx.customerMergeEvent.update({
        where: { id: event.id },
        data: { status: 'unmerged', unmergedAt: new Date() },
      });
    });

    await this.crm.refreshLifetime(tenantId, survivorId);
    await this.crm.refreshLifetime(tenantId, mergedId);
    await this.syncPrimaryIdentities(tenantId, survivorId);
    await this.syncPrimaryIdentities(tenantId, mergedId);

    await this.audit.write({
      tenantId,
      actorId,
      action: 'crm.customer_unmerge',
      entity: 'customer_merge_event',
      entityId: mergeEventId,
      payload: { survivor_id: survivorId, merged_id: mergedId },
    });

    return {
      merge_event_id: mergeEventId,
      status: 'unmerged',
      survivor_id: survivorId,
      merged_id: mergedId,
      survivor: await this.crm.get360(tenantId, survivorId),
      restored: await this.crm.get360(tenantId, mergedId),
    };
  }

  async listMergeEvents(tenantId: string, limit = 50) {
    const rows = await this.prisma.db.customerMergeEvent.findMany({
      where: { tenantId },
      orderBy: { mergedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
    return rows.map((r) => ({
      id: r.id,
      survivor_id: r.survivorId,
      merged_id: r.mergedId,
      status: r.status,
      reason: r.reason,
      actor_id: r.actorId,
      merged_at: r.mergedAt.toISOString(),
      unmerged_at: r.unmergedAt?.toISOString() ?? null,
      before_snapshot: r.beforeSnapshot,
      after_snapshot: r.afterSnapshot,
    }));
  }

  /** Auto-link inbox + guest orders by phone / channel handle. */
  async autoAttach(tenantId: string, customerId: string, type: string, value: string) {
    let linkedInbox = 0;
    let linkedOrders = 0;
    if (type === 'phone' && value) {
      const r = await this.crm.linkInboxByPhone(tenantId, customerId, value);
      linkedInbox += r.linked;
      const ord = await this.prisma.db.order.updateMany({
        where: { tenantId, customerId: null, shippingPhone: value },
        data: { customerId },
      });
      linkedOrders += ord.count;
    }
    if (['meta', 'zalo', 'shopee', 'tiktok'].includes(type) && value) {
      const r = await this.prisma.db.inboxConversation.updateMany({
        where: {
          tenantId,
          customerId: null,
          OR: [{ contactHandle: value }, { contactHandle: { contains: value } }],
        },
        data: { customerId },
      });
      linkedInbox += r.count;
    }
    if (linkedOrders) await this.crm.refreshLifetime(tenantId, customerId);
    return { linked_inbox: linkedInbox, linked_orders: linkedOrders };
  }

  private async upsertIdentityQuiet(
    tenantId: string,
    customerId: string,
    type: string,
    value: string,
    metadata: Record<string, unknown>,
  ) {
    const normalized = normalizeIdentity(type, value);
    const existing = await this.prisma.db.customerIdentity.findFirst({
      where: { tenantId, type, normalizedValue: normalized },
    });
    if (existing) {
      if (existing.customerId !== customerId) return null;
      return existing;
    }
    return this.prisma.db.customerIdentity.create({
      data: {
        id: createId('cid'),
        tenantId,
        customerId,
        type,
        value,
        normalizedValue: normalized,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  private async upsertMatchCandidate(
    tenantId: string,
    a: string,
    b: string,
    signals: Signal[],
    score: number,
  ) {
    const [left, right] = a < b ? [a, b] : [b, a];
    const existing = await this.prisma.db.customerMatchCandidate.findFirst({
      where: { tenantId, leftCustomerId: left, rightCustomerId: right },
    });
    if (existing) {
      if (existing.status === 'dismissed' || existing.status === 'merged') {
        return { ...this.mapMatchLite(existing), created: false };
      }
      const updated = await this.prisma.db.customerMatchCandidate.update({
        where: { id: existing.id },
        data: {
          score: Math.max(existing.score, score),
          signals: signals as unknown as Prisma.InputJsonValue,
          status: 'pending',
        },
      });
      return { ...this.mapMatchLite(updated), created: false };
    }
    const created = await this.prisma.db.customerMatchCandidate.create({
      data: {
        id: createId('cmc'),
        tenantId,
        leftCustomerId: left,
        rightCustomerId: right,
        score,
        signals: signals as unknown as Prisma.InputJsonValue,
        status: 'pending',
      },
    });
    return { ...this.mapMatchLite(created), created: true };
  }

  private mapMatchLite(r: {
    id: string;
    leftCustomerId: string;
    rightCustomerId: string;
    score: number;
    status: string;
    signals: Prisma.JsonValue;
  }) {
    return {
      id: r.id,
      left_customer_id: r.leftCustomerId,
      right_customer_id: r.rightCustomerId,
      score: r.score,
      status: r.status,
      signals: r.signals,
    };
  }

  private mapIdentity(r: {
    id: string;
    customerId: string;
    type: string;
    value: string;
    normalizedValue: string;
    verified: boolean;
    metadata: Prisma.JsonValue;
    createdAt: Date;
  }) {
    return {
      id: r.id,
      customer_id: r.customerId,
      type: r.type,
      value: r.value,
      normalized_value: r.normalizedValue,
      verified: r.verified,
      metadata: r.metadata,
      created_at: r.createdAt.toISOString(),
    };
  }

  private async requireActive(tenantId: string, id: string) {
    const row = await this.prisma.db.customer.findFirst({ where: { id, tenantId } });
    if (!row) throw AppError.notFound('Customer not found');
    if (row.status === 'merged') {
      throw AppError.conflict('Customer is merged', { merged_into_id: row.mergedIntoId });
    }
    return row;
  }

  private async requireActiveOrMerged(tenantId: string, id: string) {
    const row = await this.prisma.db.customer.findFirst({ where: { id, tenantId } });
    if (!row) throw AppError.notFound('Customer not found');
    return row;
  }
}
