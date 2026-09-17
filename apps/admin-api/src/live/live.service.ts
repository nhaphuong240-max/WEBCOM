import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PricingService } from '../catalog/catalog.service';
import { SocialService } from '../social/social.service';
import { SocialDraftService } from '../social/social-draft.service';

function money(n: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(n).toFixed(2);
}

function normalizeKeyword(s: string) {
  return s.trim().toUpperCase().replace(/\s+/g, '');
}

@Injectable()
export class LiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pricing: PricingService,
    private readonly social: SocialService,
    private readonly drafts: SocialDraftService,
  ) {}

  status() {
    return {
      wave: 'B4',
      features: {
        live_session_plan: true,
        keyword_to_order: true,
        comment_feed_stub: true,
        stock_alert: true,
        post_live_recovery: true,
      },
    };
  }

  async listSessions(tenantId: string, status?: string) {
    const where: Prisma.LiveSessionWhereInput = { tenantId };
    if (status) where.status = status;
    const rows = await this.prisma.db.liveSession.findMany({
      where,
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => this.mapSession(r, r.items));
  }

  async getSession(tenantId: string, id: string) {
    const row = await this.prisma.db.liveSession.findFirst({
      where: { id, tenantId },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        comments: { orderBy: { createdAt: 'desc' }, take: 100 },
        alerts: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!row) throw AppError.notFound('Live session not found');
    return {
      ...this.mapSession(row, row.items),
      comments: row.comments.map((c) => this.mapComment(c)),
      alerts: row.alerts.map((a) => this.mapAlert(a)),
    };
  }

  async createSession(
    tenantId: string,
    input: {
      title: string;
      host_name?: string;
      platform?: string;
      storefront_id?: string;
      script_notes?: string;
      gmv_target?: number;
      stock_alert_threshold?: number;
      scheduled_at?: string;
    },
    actorId?: string,
  ) {
    const sf =
      (input.storefront_id &&
        (await this.prisma.db.storefront.findFirst({
          where: { id: input.storefront_id, tenantId },
        }))) ||
      (await this.prisma.db.storefront.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' } }));
    if (!sf) throw AppError.notFound('Storefront not found');

    // Ensure Meta channel for live comment → social thread
    const channel = await this.social.bindChannel(
      tenantId,
      {
        provider: input.platform === 'zalo' ? 'zalo' : 'meta',
        channel_type: input.platform === 'zalo' ? 'oa' : 'fanpage',
        storefront_id: sf.id,
        display_name: `Live ${input.title}`.slice(0, 80),
        external_id: `live_${normalizeKeyword(input.title).slice(0, 24)}_${randomBytes(3).toString('hex')}`,
      },
      actorId,
    );

    const session = await this.prisma.db.liveSession.create({
      data: {
        id: createId('live'),
        tenantId,
        storefrontId: sf.id,
        channelAccountId: channel.id,
        title: input.title,
        hostName: input.host_name || '',
        platform: input.platform || 'meta',
        status: 'draft',
        scriptNotes: input.script_notes || '',
        gmvTarget: input.gmv_target ?? 0,
        stockAlertThreshold: input.stock_alert_threshold ?? 5,
        scheduledAt: input.scheduled_at ? new Date(input.scheduled_at) : null,
        createdBy: actorId,
      },
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'live.session_create',
      entity: 'live_session',
      entityId: session.id,
      payload: { title: input.title, channel_id: channel.id },
    });

    return this.mapSession(session, []);
  }

  async addItem(
    tenantId: string,
    sessionId: string,
    input: { sku_id: string; keyword: string; deal_price?: number; sort_order?: number },
    actorId?: string,
  ) {
    const session = await this.requireSession(tenantId, sessionId);
    if (session.status === 'ended') throw AppError.conflict('Session ended');

    const sku = await this.prisma.db.sku.findFirst({
      where: { id: input.sku_id, tenantId, status: 'active' },
      include: { variant: { include: { product: true } }, inventory: true },
    });
    if (!sku) throw AppError.notFound('SKU not found');

    const keyword = normalizeKeyword(input.keyword);
    if (!keyword) throw AppError.validation('keyword required');

    const price = await this.pricing.resolveUnitPrice(tenantId, sku.id);
    const deal = input.deal_price != null ? new Prisma.Decimal(input.deal_price) : price.unitPrice;

    const item = await this.prisma.db.liveSessionItem.create({
      data: {
        id: createId('litem'),
        tenantId,
        sessionId,
        skuId: sku.id,
        productTitle: sku.variant.product.title,
        keyword,
        dealPrice: deal,
        sortOrder: input.sort_order ?? 0,
      },
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'live.item_add',
      entity: 'live_session_item',
      entityId: item.id,
      payload: { session_id: sessionId, keyword, sku_id: sku.id },
    });

    // Pre-check stock for alert on add
    await this.maybeStockAlert(tenantId, session, sku.id, sku.inventory);

    return this.mapItem(item);
  }

  async startSession(tenantId: string, id: string, actorId?: string) {
    const session = await this.requireSession(tenantId, id);
    if (!['draft', 'scheduled'].includes(session.status)) {
      throw AppError.conflict(`Cannot start from ${session.status}`);
    }
    const items = await this.prisma.db.liveSessionItem.count({ where: { sessionId: id } });
    if (items < 1) throw AppError.validation('Add at least 1 product/keyword before go-live');

    const updated = await this.prisma.db.liveSession.update({
      where: { id },
      data: { status: 'live', startedAt: new Date(), viewersCurrent: 1, viewersPeak: 1 },
      include: { items: true },
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'live.session_start',
      entity: 'live_session',
      entityId: id,
    });

    return this.mapSession(updated, updated.items);
  }

  async endSession(tenantId: string, id: string, actorId?: string) {
    const session = await this.requireSession(tenantId, id);
    if (session.status !== 'live') throw AppError.conflict('Session is not live');

    const updated = await this.prisma.db.liveSession.update({
      where: { id },
      data: { status: 'ended', endedAt: new Date(), viewersCurrent: 0 },
      include: { items: true },
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'live.session_end',
      entity: 'live_session',
      entityId: id,
    });

    return {
      ...this.mapSession(updated, updated.items),
      recovery: await this.recoveryList(tenantId, id),
    };
  }

  async updateViewers(tenantId: string, id: string, viewers: number) {
    const session = await this.requireSession(tenantId, id);
    if (session.status !== 'live') throw AppError.conflict('Session is not live');
    const peak = Math.max(session.viewersPeak, viewers);
    const updated = await this.prisma.db.liveSession.update({
      where: { id },
      data: { viewersCurrent: viewers, viewersPeak: peak },
      include: { items: true },
    });
    return this.mapSession(updated, updated.items);
  }

  /**
   * Ingest live comment stub → match keyword → Social draft → OMS convert.
   */
  async ingestComment(
    tenantId: string,
    sessionId: string,
    input: {
      body: string;
      author_name?: string;
      author_handle?: string;
      external_id?: string;
      auto_convert?: boolean;
      shipping_name?: string;
      shipping_phone?: string;
      shipping_address?: string;
      shipping_city?: string;
      payment_method?: 'COD' | 'TRANSFER';
      qty?: number;
    },
    actorId?: string,
  ) {
    const session = await this.requireSession(tenantId, sessionId);
    if (session.status !== 'live') throw AppError.conflict('Session must be live to ingest comments');

    const externalId = input.external_id || `lcmt_${randomBytes(6).toString('hex')}`;
    const existing = await this.prisma.db.liveComment.findFirst({
      where: { sessionId, externalId },
    });
    if (existing) {
      return { deduped: true, comment: this.mapComment(existing) };
    }

    const items = await this.prisma.db.liveSessionItem.findMany({ where: { sessionId } });
    const bodyNorm = input.body.toUpperCase();
    const matched = items.find((it) => {
      const kw = normalizeKeyword(it.keyword);
      return bodyNorm.includes(kw) || normalizeKeyword(input.body) === kw;
    });

    let comment = await this.prisma.db.liveComment.create({
      data: {
        id: createId('lcmt'),
        tenantId,
        sessionId,
        externalId,
        authorName: input.author_name || 'Live viewer',
        authorHandle: input.author_handle || '',
        body: input.body,
        matchedKeyword: matched?.keyword ?? null,
        matchedItemId: matched?.id ?? null,
        status: matched ? 'matched' : 'ignored',
      },
    });

    await this.prisma.db.liveSession.update({
      where: { id: sessionId },
      data: { commentsCount: { increment: 1 } },
    });

    if (!matched) {
      return { deduped: false, comment: this.mapComment(comment), order: null };
    }

    // Stock check + alert before order
    const bal = await this.prisma.db.inventoryBalance.findFirst({
      where: { tenantId, skuId: matched.skuId },
    });
    await this.maybeStockAlert(tenantId, session, matched.skuId, bal);

    const qty = input.qty ?? 1;
    const avail = Math.max(0, (bal?.onHand ?? 0) - (bal?.reserved ?? 0));
    if (avail < qty) {
      await this.createAlert(tenantId, sessionId, {
        type: 'stock',
        severity: 'critical',
        message: `Hết hàng / không đủ tồn cho keyword ${matched.keyword} (avail ${avail})`,
        skuId: matched.skuId,
        payload: { available: avail, requested: qty, keyword: matched.keyword },
      });
      comment = await this.prisma.db.liveComment.update({
        where: { id: comment.id },
        data: { status: 'failed' },
      });
      throw AppError.insufficientStock('Live keyword order — insufficient stock', {
        sku_id: matched.skuId,
        available: avail,
        requested: qty,
      });
    }

    if (!session.channelAccountId) {
      throw AppError.conflict('Live session missing channel account');
    }

    // Ensure inbox thread for viewer
    const threadId = `live_${sessionId}_${normalizeKeyword(input.author_handle || input.author_name || externalId).slice(0, 24)}`;
    const ingested = await this.social.ingestWebhook(
      tenantId,
      session.platform === 'zalo' ? 'zalo' : 'meta',
      {
        channel_id: session.channelAccountId,
        kind: 'comment',
        thread_id: threadId,
        message_id: externalId,
        text: input.body,
        contact_name: input.author_name || 'Live viewer',
        contact_handle: input.author_handle || '',
        post_id: `live_post_${sessionId}`,
      },
      actorId,
    );

    const payment = input.payment_method || 'COD';
    const draft = await this.drafts.createDraft(
      tenantId,
      {
        conversation_id: ingested.conversation.id,
        message_id: ingested.message.id,
        source: 'comment',
        storefront_id: session.storefrontId,
        lines: [{ sku_id: matched.skuId, qty }],
        shipping_name: input.shipping_name || input.author_name || 'Live Guest',
        shipping_phone: input.shipping_phone || '0901002003',
        shipping_address: input.shipping_address || 'Live COD address',
        shipping_city: input.shipping_city || 'HCM',
        payment_method: payment,
        note: `Live ${session.title} · keyword ${matched.keyword}`,
        post_id: `live_post_${sessionId}`,
      },
      actorId,
    );

    // Override unit price with deal if set — snapshot already priced; for deal we recreate with unit_price via convert using live price
    // Social draft uses catalog price; if deal_price set, we still convert and note deal in attribution.
    let orderResult: Awaited<ReturnType<SocialDraftService['convert']>> | null = null;
    const autoConvert = input.auto_convert !== false;

    if (autoConvert) {
      orderResult = await this.drafts.convert(
        tenantId,
        draft.id,
        {
          payment_method: payment,
          shipping_name: input.shipping_name || input.author_name || 'Live Guest',
          shipping_phone: input.shipping_phone || '0901002003',
          shipping_address: input.shipping_address || 'Live COD address',
          shipping_city: input.shipping_city || 'HCM',
          note: `Live keyword ${matched.keyword}`,
          send_confirmation: true,
        },
        actorId,
      );

      // Tag order attribution as live
      if (orderResult.order?.order_id) {
        await this.prisma.db.order.update({
          where: { id: orderResult.order.order_id },
          data: {
            attributionChannel: `live/${session.platform}`,
            attributionProvider: 'live',
            attributionThreadId: sessionId,
          },
        });

        const orderTotal = Number(orderResult.order.total || 0);
        await this.prisma.db.liveSession.update({
          where: { id: sessionId },
          data: {
            ordersCount: { increment: 1 },
            gmvActual: { increment: orderTotal },
          },
        });
        await this.prisma.db.liveSessionItem.update({
          where: { id: matched.id },
          data: { ordersCount: { increment: 1 } },
        });
      }
    }

    comment = await this.prisma.db.liveComment.update({
      where: { id: comment.id },
      data: {
        status: orderResult ? 'ordered' : 'matched',
        conversationId: ingested.conversation.id,
        draftId: draft.id,
        orderId: orderResult?.order?.order_id ?? null,
      },
    });

    // Re-check stock after order for threshold alert
    const balAfter = await this.prisma.db.inventoryBalance.findFirst({
      where: { tenantId, skuId: matched.skuId },
    });
    await this.maybeStockAlert(tenantId, session, matched.skuId, balAfter);

    await this.audit.write({
      tenantId,
      actorId,
      action: 'live.keyword_order',
      entity: 'live_comment',
      entityId: comment.id,
      payload: {
        session_id: sessionId,
        keyword: matched.keyword,
        draft_id: draft.id,
        order_id: orderResult?.order?.order_id ?? null,
      },
    });

    return {
      deduped: false,
      comment: this.mapComment(comment),
      draft,
      order: orderResult,
      matched_keyword: matched.keyword,
      matched_item: this.mapItem(matched),
    };
  }

  async listComments(tenantId: string, sessionId: string) {
    await this.requireSession(tenantId, sessionId);
    const rows = await this.prisma.db.liveComment.findMany({
      where: { tenantId, sessionId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((c) => this.mapComment(c));
  }

  async listAlerts(tenantId: string, sessionId: string, unresolvedOnly = false) {
    await this.requireSession(tenantId, sessionId);
    const rows = await this.prisma.db.liveAlert.findMany({
      where: {
        tenantId,
        sessionId,
        ...(unresolvedOnly ? { resolved: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((a) => this.mapAlert(a));
  }

  async resolveAlert(tenantId: string, alertId: string, actorId?: string) {
    const alert = await this.prisma.db.liveAlert.findFirst({ where: { id: alertId, tenantId } });
    if (!alert) throw AppError.notFound('Alert not found');
    const updated = await this.prisma.db.liveAlert.update({
      where: { id: alertId },
      data: { resolved: true, resolvedAt: new Date() },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'live.alert_resolve',
      entity: 'live_alert',
      entityId: alertId,
    });
    return this.mapAlert(updated);
  }

  /** Post-live: unpaid / pending payment orders from this session. */
  async recoveryList(tenantId: string, sessionId: string) {
    await this.requireSession(tenantId, sessionId);
    const comments = await this.prisma.db.liveComment.findMany({
      where: { tenantId, sessionId, orderId: { not: null } },
    });
    const orderIds = comments.map((c) => c.orderId!).filter(Boolean);
    if (!orderIds.length) return { items: [], count: 0 };

    const orders = await this.prisma.db.order.findMany({
      where: { tenantId, id: { in: orderIds } },
      include: { lines: true, paymentIntents: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    const items = orders
      .filter((o) => o.paymentStatus === 'pending' || o.paymentMethod === 'TRANSFER')
      .map((o) => ({
        order_id: o.id,
        status: o.status,
        payment_method: o.paymentMethod,
        payment_status: o.paymentStatus,
        total: money(o.totalAmount),
        customer: o.shippingName,
        phone: o.shippingPhone,
        qr_image_url: o.paymentIntents[0]?.qrImageUrl ?? null,
        created_at: o.createdAt.toISOString(),
      }));

    return { items, count: items.length };
  }

  private async maybeStockAlert(
    tenantId: string,
    session: { id: string; stockAlertThreshold: number },
    skuId: string,
    bal: { onHand: number; reserved: number } | null | undefined,
  ) {
    if (!bal) return;
    const available = Math.max(0, bal.onHand - bal.reserved);
    const threshold = session.stockAlertThreshold ?? 5;
    const reservedRatio = bal.onHand > 0 ? bal.reserved / bal.onHand : 0;

    if (available <= threshold) {
      await this.createAlert(tenantId, session.id, {
        type: 'stock',
        severity: available === 0 ? 'critical' : 'warning',
        message: `Tồn thấp SKU ${skuId}: available=${available} (threshold ${threshold})`,
        skuId,
        payload: {
          on_hand: bal.onHand,
          reserved: bal.reserved,
          available,
          threshold,
        },
      });
    } else if (reservedRatio >= 0.8) {
      await this.createAlert(tenantId, session.id, {
        type: 'stock',
        severity: 'warning',
        message: `Reserved vượt ngưỡng 80% on_hand cho SKU ${skuId}`,
        skuId,
        payload: {
          on_hand: bal.onHand,
          reserved: bal.reserved,
          reserved_ratio: reservedRatio,
        },
      });
    }
  }

  private async createAlert(
    tenantId: string,
    sessionId: string,
    input: {
      type: string;
      severity: string;
      message: string;
      skuId?: string;
      payload?: Record<string, unknown>;
    },
  ) {
    // Dedupe open alerts of same type+sku in last 2 minutes
    const recent = await this.prisma.db.liveAlert.findFirst({
      where: {
        tenantId,
        sessionId,
        type: input.type,
        skuId: input.skuId ?? null,
        resolved: false,
        createdAt: { gte: new Date(Date.now() - 120_000) },
      },
    });
    if (recent) return recent;

    return this.prisma.db.liveAlert.create({
      data: {
        id: createId('lalert'),
        tenantId,
        sessionId,
        type: input.type,
        severity: input.severity,
        message: input.message,
        skuId: input.skuId,
        payload: (input.payload || {}) as Prisma.InputJsonValue,
      },
    });
  }

  private async requireSession(tenantId: string, id: string) {
    const row = await this.prisma.db.liveSession.findFirst({ where: { id, tenantId } });
    if (!row) throw AppError.notFound('Live session not found');
    return row;
  }

  private mapSession(
    r: {
      id: string;
      storefrontId: string;
      channelAccountId: string | null;
      title: string;
      hostName: string;
      platform: string;
      status: string;
      scriptNotes: string;
      gmvTarget: Prisma.Decimal;
      gmvActual: Prisma.Decimal;
      viewersPeak: number;
      viewersCurrent: number;
      ordersCount: number;
      commentsCount: number;
      stockAlertThreshold: number;
      scheduledAt: Date | null;
      startedAt: Date | null;
      endedAt: Date | null;
      createdAt: Date;
    },
    items: Array<{
      id: string;
      skuId: string;
      productTitle: string;
      keyword: string;
      dealPrice: Prisma.Decimal | null;
      sortOrder: number;
      ordersCount: number;
    }>,
  ) {
    return {
      id: r.id,
      storefront_id: r.storefrontId,
      channel_account_id: r.channelAccountId,
      title: r.title,
      host_name: r.hostName,
      platform: r.platform,
      status: r.status,
      script_notes: r.scriptNotes,
      gmv_target: money(r.gmvTarget),
      gmv_actual: money(r.gmvActual),
      viewers_peak: r.viewersPeak,
      viewers_current: r.viewersCurrent,
      orders_count: r.ordersCount,
      comments_count: r.commentsCount,
      stock_alert_threshold: r.stockAlertThreshold,
      scheduled_at: r.scheduledAt?.toISOString() ?? null,
      started_at: r.startedAt?.toISOString() ?? null,
      ended_at: r.endedAt?.toISOString() ?? null,
      created_at: r.createdAt.toISOString(),
      items: items.map((i) => this.mapItem(i)),
    };
  }

  private mapItem(i: {
    id: string;
    skuId: string;
    productTitle: string;
    keyword: string;
    dealPrice: Prisma.Decimal | null;
    sortOrder: number;
    ordersCount: number;
  }) {
    return {
      id: i.id,
      sku_id: i.skuId,
      product_title: i.productTitle,
      keyword: i.keyword,
      deal_price: i.dealPrice != null ? money(i.dealPrice) : null,
      sort_order: i.sortOrder,
      orders_count: i.ordersCount,
    };
  }

  private mapComment(c: {
    id: string;
    sessionId: string;
    externalId: string | null;
    authorName: string;
    authorHandle: string;
    body: string;
    matchedKeyword: string | null;
    matchedItemId: string | null;
    conversationId: string | null;
    draftId: string | null;
    orderId: string | null;
    status: string;
    createdAt: Date;
  }) {
    return {
      id: c.id,
      session_id: c.sessionId,
      external_id: c.externalId,
      author_name: c.authorName,
      author_handle: c.authorHandle,
      body: c.body,
      matched_keyword: c.matchedKeyword,
      matched_item_id: c.matchedItemId,
      conversation_id: c.conversationId,
      draft_id: c.draftId,
      order_id: c.orderId,
      status: c.status,
      created_at: c.createdAt.toISOString(),
    };
  }

  private mapAlert(a: {
    id: string;
    sessionId: string;
    type: string;
    severity: string;
    message: string;
    skuId: string | null;
    payload: Prisma.JsonValue;
    resolved: boolean;
    createdAt: Date;
    resolvedAt: Date | null;
  }) {
    return {
      id: a.id,
      session_id: a.sessionId,
      type: a.type,
      severity: a.severity,
      message: a.message,
      sku_id: a.skuId,
      payload: a.payload,
      resolved: a.resolved,
      created_at: a.createdAt.toISOString(),
      resolved_at: a.resolvedAt?.toISOString() ?? null,
    };
  }
}
