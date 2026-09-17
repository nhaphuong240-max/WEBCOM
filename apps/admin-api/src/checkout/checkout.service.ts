import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { AuditService } from '../audit/audit.service';
import { REDIS, withRedisLock } from '../redis/redis.module';

function money(n: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(n).toFixed(2);
}

function hashBody(body: unknown) {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly carts: CartService,
    private readonly audit: AuditService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async checkout(
    tenantId: string,
    actorId: string,
    input: {
      cartId: string;
      paymentMethod: 'COD' | 'TRANSFER';
      shippingName: string;
      shippingPhone: string;
      shippingAddress: string;
      shippingCity?: string;
      note?: string;
      customerId?: string;
      clientTotal?: number;
      idempotencyKey: string;
    },
  ) {
    const requestHash = hashBody({
      cartId: input.cartId,
      paymentMethod: input.paymentMethod,
      shippingName: input.shippingName,
      shippingPhone: input.shippingPhone,
      shippingAddress: input.shippingAddress,
      shippingCity: input.shippingCity ?? '',
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
    input: {
      cartId: string;
      paymentMethod: 'COD' | 'TRANSFER';
      shippingName: string;
      shippingPhone: string;
      shippingAddress: string;
      shippingCity?: string;
      note?: string;
      customerId?: string;
      clientTotal?: number;
      idempotencyKey: string;
    },
    requestHash: string,
  ) {
    const priced = await this.carts.getPriced(tenantId, input.cartId);
    if (priced.status !== 'open') throw AppError.conflict('Cart not open');
    if (priced.lines.length === 0) throw AppError.validation('Cart is empty');

    const serverTotal = new Prisma.Decimal(priced.total);
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
          subtotalAmount: priced.subtotal,
          discountAmount: 0,
          shippingAmount: 0,
          totalAmount: serverTotal,
          paymentMethod: input.paymentMethod,
          paymentStatus: 'pending',
          shippingName: input.shippingName,
          shippingPhone: input.shippingPhone,
          shippingAddress: input.shippingAddress,
          shippingCity: input.shippingCity ?? '',
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
        total: money(created.totalAmount),
        client_total_ignored: input.clientTotal ?? null,
        lines: created.lines.map((l) => ({
          sku_code: l.skuCode,
          title: l.title,
          qty: l.qty,
          unit_price: money(l.unitPrice),
          line_total: money(l.lineTotal),
        })),
      };

      await tx.idempotencyRecord.create({
        data: {
          id: createId('idem'),
          tenantId,
          key: input.idempotencyKey,
          requestHash,
          responseBody: body,
          statusCode: 201,
        },
      });

      return body;
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'order.create',
      entity: 'order',
      entityId: orderId,
      payload: { total: response.total, payment: input.paymentMethod },
    });

    return response;
  }
}
