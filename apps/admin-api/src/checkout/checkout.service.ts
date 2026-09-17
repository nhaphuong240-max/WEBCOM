import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { AuditService } from '../audit/audit.service';
import { ShippingService } from '../shipping/shipping.service';
import { PaymentService } from '../payment/payment.service';
import { WebsiteService } from '../website/website.service';
import { REDIS, withRedisLock } from '../redis/redis.module';

function money(n: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(n).toFixed(2);
}

function hashBody(body: unknown) {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

export type CheckoutInput = {
  cartId: string;
  paymentMethod: 'COD' | 'TRANSFER';
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity?: string;
  shippingCarrier?: string;
  shippingService?: string;
  voucherCode?: string;
  note?: string;
  customerId?: string;
  clientTotal?: number;
  idempotencyKey: string;
};

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly carts: CartService,
    private readonly audit: AuditService,
    private readonly shipping: ShippingService,
    private readonly payments: PaymentService,
    private readonly website: WebsiteService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async checkout(tenantId: string, actorId: string, input: CheckoutInput) {
    const requestHash = hashBody({
      cartId: input.cartId,
      paymentMethod: input.paymentMethod,
      shippingName: input.shippingName,
      shippingPhone: input.shippingPhone,
      shippingAddress: input.shippingAddress,
      shippingCity: input.shippingCity ?? '',
      shippingCarrier: input.shippingCarrier ?? '',
      voucherCode: input.voucherCode ?? '',
      note: input.note ?? '',
      customerId: input.customerId ?? null,
    });

    const existing = await this.prisma.db.idempotencyRecord.findUnique({
      where: { tenantId_key: { tenantId, key: input.idempotencyKey } },
    });
    if (existing) {
      if (existing.requestHash !== requestHash) throw AppError.idempotencyConflict();
      return existing.responseBody;
    }

    const lockKey = `checkout:lock:${tenantId}:${input.idempotencyKey}`;
    const run = async () => this.executeCheckout(tenantId, actorId, input, requestHash);

    try {
      await this.redis.connect().catch(() => undefined);
      return await withRedisLock(this.redis, lockKey, 15000, run);
    } catch (e) {
      if (e instanceof Error && e.message === 'LOCK_NOT_ACQUIRED') {
        const again = await this.prisma.db.idempotencyRecord.findUnique({
          where: { tenantId_key: { tenantId, key: input.idempotencyKey } },
        });
        if (again) return again.responseBody;
        throw AppError.conflict('Checkout in progress, retry');
      }
      return run();
    }
  }

  private async executeCheckout(
    tenantId: string,
    actorId: string,
    input: CheckoutInput,
    requestHash: string,
  ) {
    const priced = await this.carts.getPriced(tenantId, input.cartId);
    if (priced.status !== 'open') throw AppError.conflict('Cart not open');
    if (priced.lines.length === 0) throw AppError.validation('Cart is empty');

    const subtotal = Number(priced.subtotal);
    const ship = await this.shipping.quoteAmount(
      input.shippingCity,
      input.shippingCarrier || 'GHN',
    );
    let discount = 0;
    let voucherCode: string | null = null;
    if (input.voucherCode?.trim()) {
      const v = await this.website.validateVoucher(
        tenantId,
        priced.storefront_id,
        input.voucherCode.trim(),
        subtotal,
      );
      discount = Number(v.discount_amount);
      voucherCode = v.code;
    }

    const shippingAmount = ship.amount;
    const total = Math.max(0, subtotal - discount) + shippingAmount;
    const orderId = createId('ord');

    const response = await this.prisma.db.$transaction(async (tx) => {
      for (const line of priced.lines) {
        const bal = await tx.inventoryBalance.findFirst({
          where: { tenantId, skuId: line.sku_id },
        });
        if (!bal) throw AppError.notFound(`Inventory missing for ${line.sku_id}`);
        const available = Math.max(0, bal.onHand - bal.reserved);
        if (available < line.qty) {
          throw AppError.insufficientStock('Insufficient available stock', {
            sku_id: line.sku_id,
            available,
            requested: line.qty,
          });
        }
      }

      const created = await tx.order.create({
        data: {
          id: orderId,
          tenantId,
          storefrontId: priced.storefront_id,
          customerId: input.customerId,
          cartId: input.cartId,
          status: 'CONFIRMED',
          currency: priced.currency,
          subtotalAmount: subtotal,
          discountAmount: discount,
          shippingAmount,
          totalAmount: total,
          paymentMethod: input.paymentMethod,
          paymentStatus: 'pending',
          shippingName: input.shippingName,
          shippingPhone: input.shippingPhone,
          shippingAddress: input.shippingAddress,
          shippingCity: input.shippingCity ?? '',
          shippingCarrier: ship.carrier,
          shippingService: input.shippingService || ship.service,
          voucherCode,
          note: input.note ?? '',
          idempotencyKey: input.idempotencyKey,
          lines: {
            create: priced.lines.map((l) => ({
              id: createId('oline'),
              tenantId,
              skuId: l.sku_id,
              skuCode: l.sku_code,
              title: l.title,
              qty: l.qty,
              unitPrice: l.unit_price,
              lineTotal: l.line_total,
            })),
          },
        },
        include: { lines: true },
      });

      for (const line of priced.lines) {
        const bal = await tx.inventoryBalance.findFirst({
          where: { tenantId, skuId: line.sku_id },
        });
        if (!bal) throw AppError.notFound(`Inventory missing for ${line.sku_id}`);
        await tx.inventoryBalance.update({
          where: { id: bal.id },
          data: { reserved: bal.reserved + line.qty },
        });
        await tx.stockReservation.create({
          data: {
            id: createId('rsv'),
            tenantId,
            skuId: line.sku_id,
            orderId,
            qty: line.qty,
            status: 'active',
          },
        });
        await tx.stockLedger.create({
          data: {
            id: createId('ldg'),
            tenantId,
            skuId: line.sku_id,
            delta: -line.qty,
            reason: 'reserve',
            refType: 'order',
            refId: orderId,
            actorId,
          },
        });
      }

      await tx.cart.update({
        where: { id: input.cartId },
        data: { status: 'converted' },
      });

      const body = {
        order_id: created.id,
        status: created.status,
        payment_method: created.paymentMethod,
        payment_status: created.paymentStatus,
        currency: created.currency,
        subtotal: money(created.subtotalAmount),
        discount: money(created.discountAmount),
        shipping: money(created.shippingAmount),
        shipping_carrier: created.shippingCarrier,
        shipping_service: created.shippingService,
        voucher_code: created.voucherCode,
        total: money(created.totalAmount),
        client_total_ignored: input.clientTotal ?? null,
        lines: created.lines.map((l) => ({
          sku_code: l.skuCode,
          title: l.title,
          qty: l.qty,
          unit_price: money(l.unitPrice),
          line_total: money(l.lineTotal),
        })),
        payment: null as Record<string, unknown> | null,
      };

      await tx.idempotencyRecord.create({
        data: {
          id: createId('idem'),
          tenantId,
          key: input.idempotencyKey,
          requestHash,
          responseBody: body as Prisma.InputJsonValue,
          statusCode: 201,
        },
      });

      return body;
    });

    if (input.paymentMethod === 'TRANSFER') {
      const payment = await this.payments.createIntentForOrder(
        tenantId,
        orderId,
        total,
        priced.currency,
        actorId,
      );
      response.payment = payment;
      await this.prisma.db.idempotencyRecord.update({
        where: { tenantId_key: { tenantId, key: input.idempotencyKey } },
        data: { responseBody: response as Prisma.InputJsonValue },
      });
    }

    await this.audit.write({
      tenantId,
      actorId,
      action: 'order.create',
      entity: 'order',
      entityId: orderId,
      payload: {
        total: String(response.total),
        payment: input.paymentMethod,
        shipping_carrier: ship.carrier,
        voucher: voucherCode,
      },
    });

    return response;
  }
}
