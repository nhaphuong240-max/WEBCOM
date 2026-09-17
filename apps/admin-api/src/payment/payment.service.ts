import { createHmac, createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

function money(n: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(n).toFixed(2);
}

function featureQr() {
  const v = process.env.FEATURE_PAYMENT_QR;
  if (v === undefined || v === '') return true;
  return v === '1' || v.toLowerCase() === 'true';
}

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  buildVietQr(input: {
    orderId: string;
    amount: number;
    content: string;
  }): { providerRef: string; qrPayload: string; qrImageUrl: string; transferContent: string } {
    const bank = process.env.VIETQR_BANK_BIN || '970422'; // MB Bank demo BIN
    const account = process.env.VIETQR_ACCOUNT_NO || '0123456789';
    const accountName = encodeURIComponent(process.env.VIETQR_ACCOUNT_NAME || 'PTT WEBCOM');
    const amount = Math.round(input.amount);
    const addInfo = encodeURIComponent(input.content.slice(0, 25));
    const template = process.env.VIETQR_TEMPLATE || 'compact2';
    const qrImageUrl = `https://img.vietqr.io/image/${bank}-${account}-${template}.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`;
    const providerRef = `vq_${input.orderId}_${randomBytes(4).toString('hex')}`;
    const qrPayload = `VIETQR|${bank}|${account}|${amount}|${input.content}`;
    return {
      providerRef,
      qrPayload,
      qrImageUrl,
      transferContent: input.content,
    };
  }

  async createIntentForOrder(
    tenantId: string,
    orderId: string,
    amount: number,
    currency: string,
    actorId?: string,
  ) {
    if (!featureQr()) {
      return {
        intent_id: null,
        status: 'skipped',
        qr_image_url: null,
        qr_payload: null,
        transfer_content: null,
        provider: 'stub',
        amount: money(amount),
      };
    }

    const content = `PTT ${orderId.replace(/^ord_/, '').slice(0, 12)}`.toUpperCase();
    const built = this.buildVietQr({ orderId, amount, content });
    const intent = await this.prisma.db.paymentIntent.create({
      data: {
        id: createId('pi'),
        tenantId,
        orderId,
        provider: 'vietqr',
        amount,
        currency,
        status: 'requires_payment',
        qrPayload: built.qrPayload,
        qrImageUrl: built.qrImageUrl,
        providerRef: built.providerRef,
        transferContent: built.transferContent,
      },
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'payment.intent_create',
      entity: 'payment_intent',
      entityId: intent.id,
      payload: { order_id: orderId, amount, provider: 'vietqr' },
    });

    return this.mapIntent(intent);
  }

  async getIntent(tenantId: string, intentId: string) {
    const intent = await this.prisma.db.paymentIntent.findFirst({
      where: { id: intentId, tenantId },
    });
    if (!intent) throw AppError.notFound('Payment intent not found');
    return this.mapIntent(intent);
  }

  async getLatestForOrder(tenantId: string, orderId: string) {
    const intent = await this.prisma.db.paymentIntent.findFirst({
      where: { tenantId, orderId },
      orderBy: { createdAt: 'desc' },
    });
    return intent ? this.mapIntent(intent) : null;
  }

  /**
   * Idempotent webhook: unique (provider, provider_event_id).
   * Body: { event_id, order_id?, provider_ref?, amount, status: 'paid' }
   * Header: x-ptt-signature = HMAC-SHA256(secret, rawBody) hex OR x-ptt-webhook-secret match.
   */
  async handleWebhook(
    provider: string,
    rawBody: string,
    headers: Record<string, string | undefined>,
  ) {
    this.verifySignature(rawBody, headers);
    let body: {
      event_id?: string;
      order_id?: string;
      provider_ref?: string;
      amount?: number;
      status?: string;
      tenant_id?: string;
    };
    try {
      body = JSON.parse(rawBody) as typeof body;
    } catch {
      throw AppError.validation('Invalid webhook JSON');
    }
    if (!body.event_id) throw AppError.validation('event_id required');
    if (body.status !== 'paid') {
      return { ok: true, ignored: true, reason: 'status_not_paid' };
    }

    const payloadHash = createHash('sha256').update(rawBody).digest('hex');
    const existing = await this.prisma.db.webhookEvent.findUnique({
      where: {
        provider_providerEventId: { provider, providerEventId: body.event_id },
      },
    });
    if (existing) {
      return { ok: true, duplicate: true, event_id: body.event_id };
    }

    const intent = await this.prisma.db.paymentIntent.findFirst({
      where: {
        ...(body.provider_ref ? { providerRef: body.provider_ref } : {}),
        ...(body.order_id ? { orderId: body.order_id } : {}),
        status: 'requires_payment',
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!intent) throw AppError.notFound('Payment intent not found for webhook');

    const amount = Number(intent.amount);
    if (body.amount != null && Math.round(Number(body.amount)) !== Math.round(amount)) {
      throw AppError.validation('Webhook amount mismatch');
    }

    await this.prisma.db.$transaction(async (tx) => {
      await tx.webhookEvent.create({
        data: {
          id: createId('wh'),
          tenantId: intent.tenantId,
          provider,
          providerEventId: body.event_id!,
          payloadHash,
          status: 'processed',
        },
      });
      await tx.paymentIntent.update({
        where: { id: intent.id },
        data: { status: 'paid', paidAt: new Date() },
      });
      await tx.order.update({
        where: { id: intent.orderId },
        data: { paymentStatus: 'paid' },
      });
    });

    await this.audit.write({
      tenantId: intent.tenantId,
      actorId: 'webhook',
      action: 'payment.paid',
      entity: 'payment_intent',
      entityId: intent.id,
      payload: { order_id: intent.orderId, event_id: body.event_id, provider },
    });

    return {
      ok: true,
      paid: true,
      intent_id: intent.id,
      order_id: intent.orderId,
      event_id: body.event_id,
    };
  }

  /** Dev/e2e helper — marks intent paid without external bank. */
  async simulatePaid(tenantId: string, intentId: string, actorId?: string) {
    const allow =
      process.env.AUTH_DEV_BYPASS === 'true' ||
      process.env.FEATURE_PAYMENT_SIMULATE === '1' ||
      process.env.FEATURE_PAYMENT_SIMULATE === 'true';
    if (!allow) throw AppError.validation('Payment simulate disabled');

    const intent = await this.prisma.db.paymentIntent.findFirst({
      where: { id: intentId, tenantId },
    });
    if (!intent) throw AppError.notFound('Payment intent not found');
    if (intent.status === 'paid') return this.mapIntent(intent);

    const eventId = `sim_${intent.id}_${Date.now()}`;
    return this.handleWebhook(
      intent.provider,
      JSON.stringify({
        event_id: eventId,
        order_id: intent.orderId,
        provider_ref: intent.providerRef,
        amount: Number(intent.amount),
        status: 'paid',
        tenant_id: tenantId,
      }),
      {
        'x-ptt-webhook-secret': process.env.PAYMENT_WEBHOOK_SECRET || 'ptt-dev-webhook-secret',
      },
    ).then(async () => {
      await this.audit.write({
        tenantId,
        actorId,
        action: 'payment.simulate_paid',
        entity: 'payment_intent',
        entityId: intentId,
      });
      return this.getIntent(tenantId, intentId);
    });
  }

  private verifySignature(rawBody: string, headers: Record<string, string | undefined>) {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || 'ptt-dev-webhook-secret';
    const plain = headers['x-ptt-webhook-secret'] || headers['X-PTT-WEBHOOK-SECRET'];
    if (plain && plain === secret) return;

    const sig = headers['x-ptt-signature'] || headers['X-PTT-SIGNATURE'];
    if (!sig) {
      // Allow unsigned only when AUTH_DEV_BYPASS (local e2e)
      if (process.env.AUTH_DEV_BYPASS === 'true') return;
      throw AppError.unauthorized('Missing webhook signature');
    }
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (sig !== expected && sig !== `sha256=${expected}`) {
      throw AppError.unauthorized('Invalid webhook signature');
    }
  }

  private mapIntent(intent: {
    id: string;
    orderId: string;
    provider: string;
    amount: Prisma.Decimal;
    currency: string;
    status: string;
    qrPayload: string | null;
    qrImageUrl: string | null;
    providerRef: string | null;
    transferContent: string | null;
    paidAt: Date | null;
  }) {
    return {
      intent_id: intent.id,
      order_id: intent.orderId,
      provider: intent.provider,
      amount: money(intent.amount),
      currency: intent.currency,
      status: intent.status,
      qr_payload: intent.qrPayload,
      qr_image_url: intent.qrImageUrl,
      provider_ref: intent.providerRef,
      transfer_content: intent.transferContent,
      paid_at: intent.paidAt?.toISOString() ?? null,
    };
  }
}
