import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SocialConnectors, type SocialProvider } from './social.connectors';

const PROVIDERS = ['meta', 'zalo'] as const;
const CHANNEL_TYPES: Record<string, string[]> = {
  meta: ['fanpage', 'messenger', 'ig'],
  zalo: ['oa'],
};

function slaMinutes() {
  return Number(process.env.SOCIAL_SLA_MINUTES || 15);
}

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly connectors: SocialConnectors,
  ) {}

  status() {
    return {
      wave: 'B2',
      features: {
        channel_binding: true,
        unified_inbox: true,
        comment_to_order: true,
        messenger_cart_stub: true,
        draft_convert_oms: true,
      },
      ...this.connectors.status(),
    };
  }

  async listChannels(tenantId: string) {
    const rows = await this.prisma.db.channelAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.mapChannel(r));
  }

  async bindChannel(
    tenantId: string,
    input: {
      provider: string;
      channel_type: string;
      storefront_id?: string;
      external_id?: string;
      display_name?: string;
    },
    actorId?: string,
  ) {
    if (!PROVIDERS.includes(input.provider as SocialProvider)) {
      throw AppError.validation('provider must be meta|zalo (B1 stubs)');
    }
    const allowed = CHANNEL_TYPES[input.provider] || [];
    if (!allowed.includes(input.channel_type)) {
      throw AppError.validation(`channel_type for ${input.provider}: ${allowed.join('|')}`);
    }
    if (input.storefront_id) {
      const sf = await this.prisma.db.storefront.findFirst({
        where: { id: input.storefront_id, tenantId },
      });
      if (!sf) throw AppError.notFound('Storefront not found');
    }

    const stub = this.connectors.bindStub({
      provider: input.provider as SocialProvider,
      channel_type: input.channel_type,
      external_id: input.external_id,
      display_name: input.display_name,
    });

    const existing = await this.prisma.db.channelAccount.findFirst({
      where: {
        tenantId,
        provider: input.provider,
        externalId: stub.external_id,
      },
    });
    if (existing) {
      const updated = await this.prisma.db.channelAccount.update({
        where: { id: existing.id },
        data: {
          status: 'connected',
          displayName: stub.display_name,
          storefrontId: input.storefront_id ?? existing.storefrontId,
          credentials: stub.credentials as Prisma.InputJsonValue,
          metadata: stub.metadata as Prisma.InputJsonValue,
          connectedAt: new Date(),
          lastSyncAt: new Date(),
        },
      });
      await this.audit.write({
        tenantId,
        actorId,
        action: 'social.channel_rebind',
        entity: 'channel_account',
        entityId: updated.id,
        payload: { provider: input.provider, channel_type: input.channel_type },
      });
      return this.mapChannel(updated);
    }

    const row = await this.prisma.db.channelAccount.create({
      data: {
        id: createId('cha'),
        tenantId,
        storefrontId: input.storefront_id,
        provider: input.provider,
        channelType: input.channel_type,
        externalId: stub.external_id,
        displayName: stub.display_name,
        status: 'connected',
        credentials: stub.credentials as Prisma.InputJsonValue,
        metadata: stub.metadata as Prisma.InputJsonValue,
        connectedAt: new Date(),
        lastSyncAt: new Date(),
      },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'social.channel_bind',
      entity: 'channel_account',
      entityId: row.id,
      payload: { provider: input.provider, channel_type: input.channel_type },
    });
    return this.mapChannel(row);
  }

  async disconnectChannel(tenantId: string, id: string, actorId?: string) {
    const row = await this.prisma.db.channelAccount.findFirst({ where: { id, tenantId } });
    if (!row) throw AppError.notFound('Channel not found');
    const updated = await this.prisma.db.channelAccount.update({
      where: { id },
      data: { status: 'disconnected' },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'social.channel_disconnect',
      entity: 'channel_account',
      entityId: id,
    });
    return this.mapChannel(updated);
  }

  async listInbox(
    tenantId: string,
    query: {
      status?: string;
      channel_id?: string;
      owner_id?: string;
      tag?: string;
      limit?: number;
    },
  ) {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
    const where: Prisma.InboxConversationWhereInput = { tenantId };
    if (query.status) where.status = query.status;
    if (query.channel_id) where.channelAccountId = query.channel_id;
    if (query.owner_id) where.ownerId = query.owner_id;
    if (query.tag) where.tags = { has: query.tag };

    const rows = await this.prisma.db.inboxConversation.findMany({
      where,
      include: { channelAccount: true },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.mapConversation(r, r.channelAccount));
  }

  async getConversation(tenantId: string, id: string) {
    const row = await this.prisma.db.inboxConversation.findFirst({
      where: { id, tenantId },
      include: {
        channelAccount: true,
        messages: { orderBy: { createdAt: 'asc' }, take: 200 },
      },
    });
    if (!row) throw AppError.notFound('Conversation not found');
    return {
      ...this.mapConversation(row, row.channelAccount),
      messages: row.messages.map((m) => this.mapMessage(m)),
    };
  }

  async assignConversation(
    tenantId: string,
    id: string,
    input: {
      owner_id?: string | null;
      tags?: string[];
      notes?: string;
      status?: string;
      sla_minutes?: number;
    },
    actorId?: string,
  ) {
    const row = await this.prisma.db.inboxConversation.findFirst({ where: { id, tenantId } });
    if (!row) throw AppError.notFound('Conversation not found');

    const minutes = input.sla_minutes ?? slaMinutes();
    const data: Prisma.InboxConversationUpdateInput = {};
    if (input.owner_id !== undefined) data.ownerId = input.owner_id;
    if (input.tags !== undefined) data.tags = input.tags;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.status !== undefined) {
      if (!['open', 'pending', 'closed'].includes(input.status)) {
        throw AppError.validation('status must be open|pending|closed');
      }
      data.status = input.status;
    }
    // Reset SLA clock on assign (AC: owner+tag ≤1 phút ops)
    data.slaDueAt = new Date(Date.now() + minutes * 60_000);
    data.slaStatus = 'ok';

    const updated = await this.prisma.db.inboxConversation.update({
      where: { id },
      data,
      include: { channelAccount: true },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'social.inbox_assign',
      entity: 'inbox_conversation',
      entityId: id,
      payload: {
        owner_id: input.owner_id,
        tags: input.tags,
        status: input.status,
      },
    });
    return this.mapConversation(updated, updated.channelAccount);
  }

  async reply(
    tenantId: string,
    id: string,
    body: string,
    actorId?: string,
  ) {
    const conv = await this.prisma.db.inboxConversation.findFirst({
      where: { id, tenantId },
      include: { channelAccount: true },
    });
    if (!conv) throw AppError.notFound('Conversation not found');
    if (conv.channelAccount.status !== 'connected') {
      throw AppError.conflict('Channel disconnected');
    }

    const sent = await this.connectors.sendReply(
      conv.channelAccount.provider as SocialProvider,
      conv.channelAccount.externalId,
      body,
    );

    const msg = await this.prisma.db.inboxMessage.create({
      data: {
        id: createId('imsg'),
        tenantId,
        conversationId: id,
        direction: 'outbound',
        body,
        externalMessageId: sent.external_message_id,
        authorName: actorId || 'agent',
        payload: { mode: sent.mode },
      },
    });
    await this.prisma.db.inboxConversation.update({
      where: { id },
      data: {
        lastMessageAt: msg.createdAt,
        lastMessagePreview: body.slice(0, 160),
        unreadCount: 0,
        status: conv.status === 'closed' ? 'open' : conv.status,
      },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'social.inbox_reply',
      entity: 'inbox_message',
      entityId: msg.id,
      payload: { conversation_id: id, mode: sent.mode },
    });
    return this.mapMessage(msg);
  }

  /**
   * Ingest stub webhook for meta|zalo → upsert conversation + inbound message.
   */
  async ingestWebhook(
    tenantId: string,
    provider: string,
    body: Record<string, unknown>,
    actorId?: string,
  ) {
    if (!PROVIDERS.includes(provider as SocialProvider)) {
      throw AppError.validation('provider must be meta|zalo');
    }
    const channelId = body.channel_id ? String(body.channel_id) : undefined;
    let channel = channelId
      ? await this.prisma.db.channelAccount.findFirst({
          where: { id: channelId, tenantId, provider },
        })
      : await this.prisma.db.channelAccount.findFirst({
          where: { tenantId, provider, status: 'connected' },
          orderBy: { connectedAt: 'desc' },
        });

    if (!channel) {
      // Auto-bind staging channel so e2e can ingest without prior bind
      const bound = await this.bindChannel(
        tenantId,
        {
          provider,
          channel_type: provider === 'zalo' ? 'oa' : 'messenger',
          display_name: `${provider} auto-staging`,
        },
        actorId,
      );
      channel = await this.prisma.db.channelAccount.findFirstOrThrow({
        where: { id: bound.id },
      });
    }
    if (channel.status !== 'connected') {
      throw AppError.conflict('Channel not connected');
    }

    const inbound = this.connectors.parseInbound(provider as SocialProvider, body);
    const due = new Date(Date.now() + slaMinutes() * 60_000);

    const conversation = await this.prisma.db.$transaction(async (tx) => {
      let conv = await tx.inboxConversation.findFirst({
        where: {
          channelAccountId: channel!.id,
          externalThreadId: inbound.external_thread_id,
        },
      });
      if (!conv) {
        conv = await tx.inboxConversation.create({
          data: {
            id: createId('iconv'),
            tenantId,
            channelAccountId: channel!.id,
            externalThreadId: inbound.external_thread_id,
            contactName: inbound.contact_name,
            contactHandle: inbound.contact_handle,
            status: 'open',
            slaDueAt: due,
            slaStatus: 'ok',
            lastMessageAt: new Date(),
            lastMessagePreview: inbound.body.slice(0, 160),
            unreadCount: 1,
          },
        });
      } else {
        conv = await tx.inboxConversation.update({
          where: { id: conv.id },
          data: {
            contactName: inbound.contact_name || conv.contactName,
            contactHandle: inbound.contact_handle || conv.contactHandle,
            lastMessageAt: new Date(),
            lastMessagePreview: inbound.body.slice(0, 160),
            unreadCount: { increment: 1 },
            status: conv.status === 'closed' ? 'open' : conv.status,
            slaDueAt: conv.slaDueAt ?? due,
          },
        });
      }

      const existingMsg = await tx.inboxMessage.findFirst({
        where: {
          conversationId: conv.id,
          externalMessageId: inbound.external_message_id,
        },
      });
      if (existingMsg) {
        return { conversation: conv, message: existingMsg, deduped: true };
      }

      const message = await tx.inboxMessage.create({
        data: {
          id: createId('imsg'),
          tenantId,
          conversationId: conv.id,
          direction: 'inbound',
          body: inbound.body,
          externalMessageId: inbound.external_message_id,
          authorName: inbound.author_name,
          payload: inbound.payload as Prisma.InputJsonValue,
        },
      });
      return { conversation: conv, message, deduped: false };
    });

    await this.prisma.db.channelAccount.update({
      where: { id: channel.id },
      data: { lastSyncAt: new Date() },
    });

    if (!conversation.deduped) {
      await this.audit.write({
        tenantId,
        actorId,
        action: 'social.webhook_ingest',
        entity: 'inbox_conversation',
        entityId: conversation.conversation.id,
        payload: {
          provider,
          channel_id: channel.id,
          message_id: conversation.message.id,
        },
      });
    }

    return {
      deduped: conversation.deduped,
      channel: this.mapChannel(channel),
      conversation: this.mapConversation(conversation.conversation, channel),
      message: this.mapMessage(conversation.message),
    };
  }

  /** Refresh SLA statuses for open conversations (warning/breached). */
  async refreshSla(tenantId: string) {
    const now = new Date();
    const open = await this.prisma.db.inboxConversation.findMany({
      where: { tenantId, status: { in: ['open', 'pending'] }, slaDueAt: { not: null } },
    });
    let updated = 0;
    for (const c of open) {
      if (!c.slaDueAt) continue;
      const msLeft = c.slaDueAt.getTime() - now.getTime();
      let next: string = 'ok';
      if (msLeft < 0) next = 'breached';
      else if (msLeft < 5 * 60_000) next = 'warning';
      if (next !== c.slaStatus) {
        await this.prisma.db.inboxConversation.update({
          where: { id: c.id },
          data: { slaStatus: next },
        });
        updated += 1;
      }
    }
    return { checked: open.length, updated };
  }

  private mapChannel(r: {
    id: string;
    tenantId: string;
    storefrontId: string | null;
    provider: string;
    channelType: string;
    externalId: string;
    displayName: string;
    status: string;
    metadata: Prisma.JsonValue;
    connectedAt: Date | null;
    lastSyncAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: r.id,
      tenant_id: r.tenantId,
      storefront_id: r.storefrontId,
      provider: r.provider,
      channel_type: r.channelType,
      external_id: r.externalId,
      display_name: r.displayName,
      status: r.status,
      mode: this.connectors.mode(r.provider as SocialProvider),
      metadata: r.metadata,
      connected_at: r.connectedAt?.toISOString() ?? null,
      last_sync_at: r.lastSyncAt?.toISOString() ?? null,
      created_at: r.createdAt.toISOString(),
    };
  }

  private mapConversation(
    r: {
      id: string;
      tenantId: string;
      channelAccountId: string;
      externalThreadId: string;
      customerId: string | null;
      contactName: string;
      contactHandle: string;
      status: string;
      ownerId: string | null;
      tags: string[];
      notes: string;
      slaStatus: string;
      slaDueAt: Date | null;
      lastMessageAt: Date;
      lastMessagePreview: string;
      unreadCount: number;
      createdAt: Date;
      updatedAt: Date;
    },
    channel?: {
      provider: string;
      channelType: string;
      displayName: string;
      status: string;
    } | null,
  ) {
    return {
      id: r.id,
      tenant_id: r.tenantId,
      channel_account_id: r.channelAccountId,
      external_thread_id: r.externalThreadId,
      customer_id: r.customerId,
      contact_name: r.contactName,
      contact_handle: r.contactHandle,
      status: r.status,
      owner_id: r.ownerId,
      tags: r.tags,
      notes: r.notes,
      sla_status: r.slaStatus,
      sla_due_at: r.slaDueAt?.toISOString() ?? null,
      last_message_at: r.lastMessageAt.toISOString(),
      last_message_preview: r.lastMessagePreview,
      unread_count: r.unreadCount,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
      channel: channel
        ? {
            provider: channel.provider,
            channel_type: channel.channelType,
            display_name: channel.displayName,
            status: channel.status,
          }
        : undefined,
    };
  }

  private mapMessage(m: {
    id: string;
    conversationId: string;
    direction: string;
    body: string;
    externalMessageId: string | null;
    authorName: string;
    payload: Prisma.JsonValue;
    createdAt: Date;
  }) {
    const payload = (m.payload || {}) as Record<string, unknown>;
    return {
      id: m.id,
      conversation_id: m.conversationId,
      direction: m.direction,
      body: m.body,
      external_message_id: m.externalMessageId,
      author_name: m.authorName,
      message_kind: String(payload.message_kind || 'chat'),
      post_id: payload.post_id ?? null,
      reel_id: payload.reel_id ?? null,
      payload: m.payload,
      created_at: m.createdAt.toISOString(),
    };
  }
}
