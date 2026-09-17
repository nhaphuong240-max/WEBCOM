import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CartService } from '../cart/cart.service';
import { CheckoutService } from '../checkout/checkout.service';
import { CatalogService, PricingService } from '../catalog/catalog.service';
import { SocialService } from './social.service';

export type DraftLineInput = { sku_id: string; qty: number };

export type ProductSnapshotLine = {
  sku_id: string;
  sku_code: string;
  product_id: string;
  product_title: string;
  variant_title: string;
  qty: number;
  unit_price: string;
  line_total: string;
  currency: string;
  available_at_draft: number;
  snapshot_at: string;
};

function money(n: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(n).toFixed(2);
}

function scoreRisk(input: {
  phone: string;
  payment: string;
  subtotal: number;
  source: string;
  hasAddress: boolean;
}): { score: number; flags: string[] } {
  const flags: string[] = [];
  let score = 0;
  if (!input.phone || input.phone.replace(/\D/g, '').length < 9) {
    flags.push('missing_phone');
    score += 25;
  }
  if (!input.hasAddress) {
    flags.push('missing_address');
    score += 15;
  }
  if (input.payment === 'COD' && input.subtotal >= 1_000_000) {
    flags.push('cod_high_value');
    score += 30;
  }
  if (input.source === 'comment') {
    flags.push('comment_origin');
    score += 10;
  }
  if (input.payment === 'COD') {
    flags.push('cod');
    score += 5;
  }
  return { score: Math.min(100, score), flags };
}

@Injectable()
export class SocialDraftService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly carts: CartService,
    private readonly checkout: CheckoutService,
    private readonly catalog: CatalogService,
    private readonly pricing: PricingService,
    private readonly social: SocialService,
  ) {}

  async searchProducts(tenantId: string, q?: string, brandId?: string) {
    const result = await this.catalog.searchProducts(tenantId, { q, brandId });
    const picks = result.items.flatMap((p) =>
      p.skus.map((s) => ({
        product_id: p.id,
        product_title: p.title,
        slug: p.slug,
        sku_id: s.id,
        sku_code: s.code,
        variant_title: s.variant_title,
        unit_price: s.unit_price,
        currency: s.currency,
        available: s.available,
      })),
    );
    return { items: picks, meta: result.meta };
  }

  async listDrafts(
    tenantId: string,
    query: { conversation_id?: string; status?: string; limit?: number },
  ) {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
    const where: Prisma.SocialOrderDraftWhereInput = { tenantId };
    if (query.conversation_id) where.conversationId = query.conversation_id;
    if (query.status) where.status = query.status;
    const rows = await this.prisma.db.socialOrderDraft.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.mapDraft(r));
  }

  async getDraft(tenantId: string, id: string) {
    const row = await this.prisma.db.socialOrderDraft.findFirst({ where: { id, tenantId } });
    if (!row) throw AppError.notFound('Social order draft not found');
    return this.mapDraft(row);
  }

  /**
   * Create draft from inbox thread + product picker (BR-023 snapshot + thread ID).
   */
  async createDraft(
    tenantId: string,
    input: {
      conversation_id: string;
      message_id?: string;
      lines: DraftLineInput[];
      source?: 'comment' | 'chat' | 'messenger_cart';
      storefront_id?: string;
      contact_phone?: string;
      shipping_name?: string;
      shipping_phone?: string;
      shipping_address?: string;
      shipping_city?: string;
      payment_method?: 'COD' | 'TRANSFER';
      note?: string;
      post_id?: string;
      reel_id?: string;
    },
    actorId?: string,
  ) {
    if (!input.lines?.length) throw AppError.validation('lines required');

    const conv = await this.prisma.db.inboxConversation.findFirst({
      where: { id: input.conversation_id, tenantId },
      include: { channelAccount: true },
    });
    if (!conv) throw AppError.notFound('Conversation not found');
    if (!conv.externalThreadId) {
      throw AppError.validation('Conversation missing external_thread_id (BR-023)');
    }

    let messageId = input.message_id;
    let source = input.source ?? 'chat';
    let sourceContext: Record<string, unknown> = {};

    if (messageId) {
      const msg = await this.prisma.db.inboxMessage.findFirst({
        where: { id: messageId, tenantId, conversationId: conv.id },
      });
      if (!msg) throw AppError.notFound('Message not found');
      const payload = (msg.payload || {}) as Record<string, unknown>;
      const kind = String(payload.message_kind || payload.kind || '');
      if (kind === 'comment') source = 'comment';
      sourceContext = {
        message_id: msg.id,
        message_body: msg.body.slice(0, 280),
        post_id: payload.post_id || input.post_id,
        reel_id: payload.reel_id || input.reel_id,
        message_kind: kind || source,
      };
    } else if (input.post_id || input.reel_id) {
      source = 'comment';
      sourceContext = { post_id: input.post_id, reel_id: input.reel_id };
    }

    const storefrontId =
      input.storefront_id ||
      conv.channelAccount.storefrontId ||
      process.env.NEXT_PUBLIC_STOREFRONT_ID ||
      'sf_aura';
    const sf = await this.prisma.db.storefront.findFirst({
      where: { id: storefrontId, tenantId },
    });
    if (!sf) throw AppError.notFound('Storefront not found');

    const snapshots: ProductSnapshotLine[] = [];
    let subtotal = new Prisma.Decimal(0);
    const now = new Date().toISOString();

    for (const line of input.lines) {
      if (line.qty < 1) throw AppError.validation('qty must be >= 1');
      const sku = await this.prisma.db.sku.findFirst({
        where: { id: line.sku_id, tenantId, status: 'active' },
        include: {
          inventory: true,
          variant: { include: { product: true } },
        },
      });
      if (!sku) throw AppError.notFound(`SKU not found: ${line.sku_id}`);
      const price = await this.pricing.resolveUnitPrice(tenantId, sku.id);
      const lineTotal = price.unitPrice.mul(line.qty);
      subtotal = subtotal.add(lineTotal);
      const onHand = sku.inventory?.onHand ?? 0;
      const reserved = sku.inventory?.reserved ?? 0;
      const available = Math.max(0, onHand - reserved);
      if (line.qty > available) {
        throw AppError.insufficientStock('Not enough stock for draft', {
          sku_id: sku.id,
          available,
          requested: line.qty,
        });
      }
      snapshots.push({
        sku_id: sku.id,
        sku_code: sku.code,
        product_id: sku.variant.product.id,
        product_title: sku.variant.product.title,
        variant_title: sku.variant.title,
        qty: line.qty,
        unit_price: money(price.unitPrice),
        line_total: money(lineTotal),
        currency: price.currency,
        available_at_draft: available,
        snapshot_at: now,
      });
    }

    const phone = input.shipping_phone || input.contact_phone || '';
    const payment = input.payment_method || 'COD';
    const risk = scoreRisk({
      phone,
      payment,
      subtotal: Number(subtotal),
      source,
      hasAddress: Boolean(input.shipping_address?.trim()),
    });

    const draft = await this.prisma.db.socialOrderDraft.create({
      data: {
        id: createId('sod'),
        tenantId,
        storefrontId,
        conversationId: conv.id,
        messageId: messageId ?? null,
        channelAccountId: conv.channelAccountId,
        externalThreadId: conv.externalThreadId,
        source,
        status: 'draft',
        riskScore: risk.score,
        riskFlags: risk.flags,
        contactName: conv.contactName,
        contactPhone: input.contact_phone || '',
        shippingName: input.shipping_name || conv.contactName || '',
        shippingPhone: phone,
        shippingAddress: input.shipping_address || '',
        shippingCity: input.shipping_city || '',
        paymentMethod: payment,
        currency: snapshots[0]?.currency || 'VND',
        subtotalAmount: subtotal,
        linesSnapshot: snapshots as unknown as Prisma.InputJsonValue,
        sourceContext: sourceContext as Prisma.InputJsonValue,
        note: input.note || '',
        createdBy: actorId,
      },
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'social.draft_create',
      entity: 'social_order_draft',
      entityId: draft.id,
      payload: {
        conversation_id: conv.id,
        external_thread_id: conv.externalThreadId,
        source,
        risk_score: risk.score,
        lines: snapshots.map((l) => ({ sku_id: l.sku_id, qty: l.qty, unit_price: l.unit_price })),
      },
    });

    return this.mapDraft(draft);
  }

  /** FR-SOC-004/005 — stub gửi giỏ Messenger / comment reply với cart link */
  async sendCart(
    tenantId: string,
    draftId: string,
    actorId?: string,
  ) {
    const draft = await this.requireDraft(tenantId, draftId, ['draft', 'cart_sent']);
    const conv = await this.prisma.db.inboxConversation.findFirst({
      where: { id: draft.conversationId, tenantId },
      include: { channelAccount: true },
    });
    if (!conv) throw AppError.notFound('Conversation not found');

    const token = `mc_${randomBytes(8).toString('hex')}`;
    const cartUrl = `https://m.me/stub?ref=ptt_cart_${draft.id}_${token}`;
    const lines = draft.linesSnapshot as unknown as ProductSnapshotLine[];
    const summary = lines.map((l) => `${l.qty}× ${l.product_title}`).join(', ');
    const messengerCart = {
      mode: 'stub',
      token,
      cart_url: cartUrl,
      draft_id: draft.id,
      external_thread_id: draft.externalThreadId,
      provider: conv.channelAccount.provider,
      lines_summary: summary,
      subtotal: money(draft.subtotalAmount),
      sent_at: new Date().toISOString(),
    };

    const updated = await this.prisma.db.socialOrderDraft.update({
      where: { id: draft.id },
      data: {
        status: 'cart_sent',
        messengerCart: messengerCart as Prisma.InputJsonValue,
      },
    });

    await this.social.reply(
      tenantId,
      conv.id,
      `🛒 Giỏ hàng sẵn sàng: ${summary} — ${money(draft.subtotalAmount)} ${draft.currency}\n${cartUrl}`,
      actorId,
    );

    await this.audit.write({
      tenantId,
      actorId,
      action: 'social.draft_cart_sent',
      entity: 'social_order_draft',
      entityId: draft.id,
      payload: { cart_url: cartUrl, external_thread_id: draft.externalThreadId },
    });

    return this.mapDraft(updated);
  }

  /**
   * Convert draft → cart → checkout CONFIRMED (COD/TRANSFER) với stock reserve + attribution.
   */
  async convert(
    tenantId: string,
    draftId: string,
    input: {
      payment_method?: 'COD' | 'TRANSFER';
      shipping_name?: string;
      shipping_phone?: string;
      shipping_address?: string;
      shipping_city?: string;
      shipping_carrier?: string;
      voucher_code?: string;
      note?: string;
      send_confirmation?: boolean;
    },
    actorId?: string,
  ) {
    const draft = await this.requireDraft(tenantId, draftId, ['draft', 'cart_sent']);
    if (!draft.externalThreadId) {
      throw AppError.validation('Draft missing external_thread_id (BR-023)');
    }
    const lines = draft.linesSnapshot as unknown as ProductSnapshotLine[];
    if (!Array.isArray(lines) || !lines.length) {
      throw AppError.validation('Draft has empty product snapshot');
    }

    const shippingName = input.shipping_name || draft.shippingName || draft.contactName;
    const shippingPhone = input.shipping_phone || draft.shippingPhone || draft.contactPhone;
    const shippingAddress = input.shipping_address || draft.shippingAddress;
    if (!shippingName?.trim()) throw AppError.validation('shipping_name required');
    if (!shippingPhone?.trim()) throw AppError.validation('shipping_phone required');
    if (!shippingAddress?.trim()) throw AppError.validation('shipping_address required');

    const paymentMethod = input.payment_method || (draft.paymentMethod as 'COD' | 'TRANSFER') || 'COD';

    const conv = await this.prisma.db.inboxConversation.findFirst({
      where: { id: draft.conversationId, tenantId },
      include: { channelAccount: true },
    });
    if (!conv) throw AppError.notFound('Conversation not found');

    const cart = await this.carts.create(tenantId, draft.storefrontId);
    for (const line of lines) {
      await this.carts.addItem(tenantId, cart.id, line.sku_id, line.qty);
    }

    const idempotencyKey = `social-draft-${draft.id}`;
    const checkoutResult = (await this.checkout.checkout(tenantId, actorId || 'social', {
      cartId: cart.id,
      paymentMethod,
      shippingName,
      shippingPhone,
      shippingAddress,
      shippingCity: input.shipping_city || draft.shippingCity || '',
      shippingCarrier: input.shipping_carrier || 'GHN',
      voucherCode: input.voucher_code,
      note: input.note || draft.note || `Social ${draft.source} · thread ${draft.externalThreadId}`,
      idempotencyKey,
    })) as {
      order_id: string;
      status: string;
      total: string;
      payment_method: string;
      payment?: Record<string, unknown> | null;
      lines?: unknown[];
    };

    const orderId = checkoutResult.order_id;
    await this.prisma.db.order.update({
      where: { id: orderId },
      data: {
        attributionChannel: `${conv.channelAccount.provider}/${conv.channelAccount.channelType}`,
        attributionThreadId: draft.externalThreadId,
        attributionProvider: conv.channelAccount.provider,
        socialDraftId: draft.id,
      },
    });

    const updated = await this.prisma.db.socialOrderDraft.update({
      where: { id: draft.id },
      data: {
        status: 'converted',
        cartId: cart.id,
        orderId,
        paymentMethod,
        shippingName,
        shippingPhone,
        shippingAddress,
        shippingCity: input.shipping_city || draft.shippingCity || '',
        convertedAt: new Date(),
      },
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'social.draft_convert',
      entity: 'social_order_draft',
      entityId: draft.id,
      payload: {
        order_id: orderId,
        external_thread_id: draft.externalThreadId,
        attribution_channel: `${conv.channelAccount.provider}/${conv.channelAccount.channelType}`,
        source: draft.source,
        payment_method: paymentMethod,
        product_snapshot: lines,
        risk_score: draft.riskScore,
      },
    });

    if (input.send_confirmation !== false) {
      await this.social.reply(
        tenantId,
        conv.id,
        `✅ Đơn ${orderId} đã xác nhận (${paymentMethod}) · ${checkoutResult.total} · thread ${draft.externalThreadId}`,
        actorId,
      ).catch(() => undefined);
    }

    return {
      draft: this.mapDraft(updated),
      order: checkoutResult,
      attribution: {
        channel: `${conv.channelAccount.provider}/${conv.channelAccount.channelType}`,
        thread_id: draft.externalThreadId,
        provider: conv.channelAccount.provider,
        social_draft_id: draft.id,
        source: draft.source,
      },
    };
  }

  async cancel(tenantId: string, draftId: string, actorId?: string) {
    const draft = await this.requireDraft(tenantId, draftId, ['draft', 'cart_sent']);
    const updated = await this.prisma.db.socialOrderDraft.update({
      where: { id: draft.id },
      data: { status: 'cancelled' },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'social.draft_cancel',
      entity: 'social_order_draft',
      entityId: draft.id,
    });
    return this.mapDraft(updated);
  }

  /**
   * One-click: ingest comment context đã có trên message → create draft từ SKUs.
   */
  async createFromComment(
    tenantId: string,
    input: {
      conversation_id: string;
      message_id: string;
      lines: DraftLineInput[];
      storefront_id?: string;
      shipping_name?: string;
      shipping_phone?: string;
      shipping_address?: string;
      shipping_city?: string;
      payment_method?: 'COD' | 'TRANSFER';
    },
    actorId?: string,
  ) {
    return this.createDraft(
      tenantId,
      {
        ...input,
        source: 'comment',
      },
      actorId,
    );
  }

  private async requireDraft(tenantId: string, id: string, allowed: string[]) {
    const row = await this.prisma.db.socialOrderDraft.findFirst({ where: { id, tenantId } });
    if (!row) throw AppError.notFound('Social order draft not found');
    if (!allowed.includes(row.status)) {
      throw AppError.conflict(`Draft status ${row.status} not allowed`, { allowed });
    }
    return row;
  }

  private mapDraft(r: {
    id: string;
    tenantId: string;
    storefrontId: string;
    conversationId: string;
    messageId: string | null;
    channelAccountId: string;
    externalThreadId: string;
    source: string;
    status: string;
    riskScore: number;
    riskFlags: string[];
    contactName: string;
    contactPhone: string;
    shippingName: string;
    shippingPhone: string;
    shippingAddress: string;
    shippingCity: string;
    paymentMethod: string;
    currency: string;
    subtotalAmount: Prisma.Decimal;
    linesSnapshot: Prisma.JsonValue;
    sourceContext: Prisma.JsonValue;
    messengerCart: Prisma.JsonValue | null;
    cartId: string | null;
    orderId: string | null;
    note: string;
    createdBy: string | null;
    convertedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: r.id,
      tenant_id: r.tenantId,
      storefront_id: r.storefrontId,
      conversation_id: r.conversationId,
      message_id: r.messageId,
      channel_account_id: r.channelAccountId,
      external_thread_id: r.externalThreadId,
      source: r.source,
      status: r.status,
      risk_score: r.riskScore,
      risk_flags: r.riskFlags,
      contact_name: r.contactName,
      contact_phone: r.contactPhone,
      shipping_name: r.shippingName,
      shipping_phone: r.shippingPhone,
      shipping_address: r.shippingAddress,
      shipping_city: r.shippingCity,
      payment_method: r.paymentMethod,
      currency: r.currency,
      subtotal: money(r.subtotalAmount),
      lines: r.linesSnapshot,
      source_context: r.sourceContext,
      messenger_cart: r.messengerCart,
      cart_id: r.cartId,
      order_id: r.orderId,
      note: r.note,
      created_by: r.createdBy,
      converted_at: r.convertedAt?.toISOString() ?? null,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    };
  }
}
