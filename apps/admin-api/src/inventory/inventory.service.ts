import { Inject, Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { REDIS, withRedisLock } from '../redis/redis.module';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  available(onHand: number, reserved: number) {
    return Math.max(0, onHand - reserved);
  }

  async getBalance(tenantId: string, skuId: string) {
    const bal = await this.prisma.db.inventoryBalance.findFirst({
      where: { tenantId, skuId },
    });
    if (!bal) throw AppError.notFound('Inventory not found');
    return {
      sku_id: skuId,
      on_hand: bal.onHand,
      reserved: bal.reserved,
      available: this.available(bal.onHand, bal.reserved),
    };
  }

  async adjustOnHand(tenantId: string, actorId: string, skuId: string, delta: number, reason: string) {
    const lockKey = `inv:lock:${tenantId}:${skuId}`;
    try {
      await this.redis.connect().catch(() => undefined);
      return await withRedisLock(this.redis, lockKey, 5000, () =>
        this.adjustOnHandTx(tenantId, actorId, skuId, delta, reason),
      );
    } catch (e) {
      if (e instanceof Error && e.message === 'LOCK_NOT_ACQUIRED') {
        throw AppError.conflict('Inventory lock busy, retry');
      }
      // Redis down → still allow DB path for local/dev without Redis
      return this.adjustOnHandTx(tenantId, actorId, skuId, delta, reason);
    }
  }

  private async adjustOnHandTx(
    tenantId: string,
    actorId: string,
    skuId: string,
    delta: number,
    reason: string,
  ) {
    const result = await this.prisma.db.$transaction(async (tx) => {
      const bal = await tx.inventoryBalance.findFirst({ where: { tenantId, skuId } });
      if (!bal) throw AppError.notFound('Inventory not found');
      const next = bal.onHand + delta;
      if (next < bal.reserved) {
        throw AppError.insufficientStock('on_hand cannot go below reserved', {
          on_hand: bal.onHand,
          reserved: bal.reserved,
          delta,
        });
      }
      const updated = await tx.inventoryBalance.update({
        where: { id: bal.id },
        data: { onHand: next },
      });
      await tx.stockLedger.create({
        data: {
          id: createId('ldg'),
          tenantId,
          skuId,
          delta,
          reason,
          refType: 'adjust',
          actorId,
        },
      });
      return updated;
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'inventory.adjust',
      entity: 'sku',
      entityId: skuId,
      payload: { delta, reason },
    });

    return {
      sku_id: skuId,
      on_hand: result.onHand,
      reserved: result.reserved,
      available: this.available(result.onHand, result.reserved),
    };
  }

  async reserveForOrder(
    tenantId: string,
    orderId: string,
    lines: Array<{ skuId: string; qty: number }>,
  ) {
    await this.prisma.db.$transaction(async (tx) => {
      for (const line of lines) {
        const bal = await tx.inventoryBalance.findFirst({
          where: { tenantId, skuId: line.skuId },
        });
        if (!bal) throw AppError.notFound(`Inventory missing for ${line.skuId}`);
        const avail = this.available(bal.onHand, bal.reserved);
        if (avail < line.qty) {
          throw AppError.insufficientStock('Insufficient available stock', {
            sku_id: line.skuId,
            available: avail,
            requested: line.qty,
          });
        }
        await tx.inventoryBalance.update({
          where: { id: bal.id },
          data: { reserved: bal.reserved + line.qty },
        });
        await tx.stockReservation.create({
          data: {
            id: createId('rsv'),
            tenantId,
            skuId: line.skuId,
            orderId,
            qty: line.qty,
            status: 'active',
          },
        });
        await tx.stockLedger.create({
          data: {
            id: createId('ldg'),
            tenantId,
            skuId: line.skuId,
            delta: -line.qty,
            reason: 'reserve',
            refType: 'order',
            refId: orderId,
          },
        });
      }
    });
  }

  async releaseForOrder(tenantId: string, orderId: string, actorId?: string) {
    await this.prisma.db.$transaction(async (tx) => {
      const reservations = await tx.stockReservation.findMany({
        where: { tenantId, orderId, status: 'active' },
      });
      for (const r of reservations) {
        const bal = await tx.inventoryBalance.findFirst({
          where: { tenantId, skuId: r.skuId },
        });
        if (!bal) continue;
        await tx.inventoryBalance.update({
          where: { id: bal.id },
          data: { reserved: Math.max(0, bal.reserved - r.qty) },
        });
        await tx.stockReservation.update({
          where: { id: r.id },
          data: { status: 'released' },
        });
        await tx.stockLedger.create({
          data: {
            id: createId('ldg'),
            tenantId,
            skuId: r.skuId,
            delta: r.qty,
            reason: 'release',
            refType: 'order',
            refId: orderId,
            actorId,
          },
        });
      }
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'inventory.release',
      entity: 'order',
      entityId: orderId,
    });
  }
}
