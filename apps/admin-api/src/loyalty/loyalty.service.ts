import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/** Default economics (stub config). */
export const LOYALTY_DEFAULTS = {
  /** 1 point per this many VND of order total */
  vndPerPoint: 1000,
  /** 1 point redeems this many VND discount */
  vndPerRedeemPoint: 100,
  /** Max redeem discount as fraction of subtotal */
  maxRedeemRatio: 0.5,
  referralBonus: 100,
};

const DEFAULT_TIERS = [
  { code: 'bronze', name: 'Bronze', minPoints: 0, earnMultiplier: 1, sortOrder: 0 },
  { code: 'silver', name: 'Silver', minPoints: 500, earnMultiplier: 1.2, sortOrder: 1 },
  { code: 'gold', name: 'Gold', minPoints: 2000, earnMultiplier: 1.5, sortOrder: 2 },
] as const;

@Injectable()
export class LoyaltyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  status() {
    return {
      wave: 'C4',
      features: {
        loyalty_account: true,
        ledger_immutable: true,
        earn_on_confirmed: true,
        redeem_checkout: true,
        tiers: true,
        referral_one_level: true,
        fraud_soft_check: true,
      },
      defaults: LOYALTY_DEFAULTS,
    };
  }

  async ensureTiers(tenantId: string) {
    for (const t of DEFAULT_TIERS) {
      await this.prisma.db.loyaltyTier.upsert({
        where: { tenantId_code: { tenantId, code: t.code } },
        create: {
          id: createId('ltr'),
          tenantId,
          code: t.code,
          name: t.name,
          minPoints: t.minPoints,
          earnMultiplier: t.earnMultiplier,
          sortOrder: t.sortOrder,
        },
        update: {
          name: t.name,
          minPoints: t.minPoints,
          earnMultiplier: t.earnMultiplier,
          sortOrder: t.sortOrder,
        },
      });
    }
    const rows = await this.prisma.db.loyaltyTier.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((tier) => ({
      id: tier.id,
      code: tier.code,
      name: tier.name,
      min_points: tier.minPoints,
      earn_multiplier: Number(tier.earnMultiplier),
      sort_order: tier.sortOrder,
    }));
  }

  async listTiers(tenantId: string) {
    const rows = await this.prisma.db.loyaltyTier.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
    });
    if (!rows.length) return this.ensureTiers(tenantId);
    return rows.map((tier) => ({
      id: tier.id,
      code: tier.code,
      name: tier.name,
      min_points: tier.minPoints,
      earn_multiplier: Number(tier.earnMultiplier),
      sort_order: tier.sortOrder,
    }));
  }

  async ensureAccount(tenantId: string, customerId: string, actorId?: string) {
    await this.requireCustomer(tenantId, customerId);
    await this.ensureTiers(tenantId);
    const existing = await this.prisma.db.loyaltyAccount.findFirst({
      where: { tenantId, customerId },
    });
    if (existing) return this.mapAccount(existing);

    const code = `REF${createId('').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`;
    const row = await this.prisma.db.loyaltyAccount.create({
      data: {
        id: createId('lya'),
        tenantId,
        customerId,
        referralCode: code,
        tierCode: 'bronze',
      },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'loyalty.account_ensure',
      entity: 'loyalty_account',
      entityId: row.id,
      payload: { customer_id: customerId },
    });
    return this.mapAccount(row);
  }

  async getAccount(tenantId: string, customerId: string) {
    const row = await this.prisma.db.loyaltyAccount.findFirst({
      where: { tenantId, customerId },
    });
    if (!row) throw AppError.notFound('Loyalty account not found');
    return this.mapAccount(row);
  }

  async listAccounts(tenantId: string, limit = 50) {
    const rows = await this.prisma.db.loyaltyAccount.findMany({
      where: { tenantId },
      orderBy: { pointsBalance: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
      include: { customer: true },
    });
    return rows.map((r) => ({
      ...this.mapAccount(r),
      customer: {
        id: r.customer.id,
        name: r.customer.name,
        phone: r.customer.phone,
        email: r.customer.email,
      },
    }));
  }

  async listLedger(tenantId: string, customerId: string, limit = 50) {
    const account = await this.prisma.db.loyaltyAccount.findFirst({
      where: { tenantId, customerId },
    });
    if (!account) throw AppError.notFound('Loyalty account not found');
    const rows = await this.prisma.db.loyaltyLedger.findMany({
      where: { tenantId, accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
    return rows.map((r) => this.mapLedger(r));
  }

  /** Quote redeem: points → VND discount (capped). */
  async quoteRedeem(tenantId: string, customerId: string, points: number, subtotal: number) {
    if (points <= 0) throw AppError.validation('points must be > 0');
    const account = await this.ensureAccount(tenantId, customerId);
    if (points > account.points_balance) {
      throw AppError.conflict('Insufficient points', { balance: account.points_balance });
    }
    const raw = points * LOYALTY_DEFAULTS.vndPerRedeemPoint;
    const max = Math.floor(subtotal * LOYALTY_DEFAULTS.maxRedeemRatio);
    const discount = Math.min(raw, max);
    const pointsUsed = Math.ceil(discount / LOYALTY_DEFAULTS.vndPerRedeemPoint);
    return {
      customer_id: customerId,
      points_requested: points,
      points_used: pointsUsed,
      discount_amount: discount,
      max_discount: max,
      balance: account.points_balance,
    };
  }

  /**
   * Redeem points at checkout (or admin). Idempotent via key.
   * Returns discount VND applied.
   */
  async redeem(
    tenantId: string,
    input: {
      customer_id: string;
      points: number;
      subtotal: number;
      order_id?: string;
      idempotency_key: string;
      reason?: string;
    },
    actorId?: string,
  ) {
    const quote = await this.quoteRedeem(
      tenantId,
      input.customer_id,
      input.points,
      input.subtotal,
    );
    if (quote.points_used <= 0) {
      return { ...quote, ledger_id: null, applied: false };
    }

    const existing = await this.prisma.db.loyaltyLedger.findFirst({
      where: { tenantId, idempotencyKey: input.idempotency_key },
    });
    if (existing) {
      return {
        ...quote,
        points_used: Math.abs(existing.points),
        discount_amount: Math.abs(existing.points) * LOYALTY_DEFAULTS.vndPerRedeemPoint,
        ledger_id: existing.id,
        applied: true,
        idempotent: true,
      };
    }

    const account = await this.prisma.db.loyaltyAccount.findFirstOrThrow({
      where: { tenantId, customerId: input.customer_id },
    });
    if (account.pointsBalance < quote.points_used) {
      throw AppError.conflict('Insufficient points');
    }

    const balanceAfter = account.pointsBalance - quote.points_used;
    const ledger = await this.prisma.db.$transaction(async (tx) => {
      await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          pointsBalance: balanceAfter,
          lifetimeRedeemed: account.lifetimeRedeemed + quote.points_used,
        },
      });
      return tx.loyaltyLedger.create({
        data: {
          id: createId('lyl'),
          tenantId,
          accountId: account.id,
          type: 'redeem',
          points: -quote.points_used,
          balanceAfter,
          reason: input.reason || 'checkout_redeem',
          orderId: input.order_id,
          idempotencyKey: input.idempotency_key,
          metadata: {
            discount_amount: quote.discount_amount,
            subtotal: input.subtotal,
          } as Prisma.InputJsonValue,
          actorId,
        },
      });
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'loyalty.redeem',
      entity: 'loyalty_ledger',
      entityId: ledger.id,
      payload: {
        customer_id: input.customer_id,
        points: quote.points_used,
        discount: quote.discount_amount,
      },
    });

    return {
      ...quote,
      ledger_id: ledger.id,
      applied: true,
      balance_after: balanceAfter,
    };
  }

  /** Earn on CONFIRMED order — idempotent by order_id. */
  async earnOnOrder(
    tenantId: string,
    orderId: string,
    actorId?: string,
  ) {
    const order = await this.prisma.db.order.findFirst({
      where: { id: orderId, tenantId },
    });
    if (!order) throw AppError.notFound('Order not found');
    if (order.status !== 'CONFIRMED') {
      throw AppError.conflict('Order must be CONFIRMED to earn', { status: order.status });
    }
    if (!order.customerId) {
      return { earned: 0, skipped: true, reason: 'no_customer' };
    }

    const idempotencyKey = `earn:order:${orderId}`;
    const existing = await this.prisma.db.loyaltyLedger.findFirst({
      where: { tenantId, idempotencyKey },
    });
    if (existing) {
      return {
        earned: existing.points,
        ledger_id: existing.id,
        idempotent: true,
        account: await this.getAccount(tenantId, order.customerId),
      };
    }

    const account = await this.ensureAccount(tenantId, order.customerId, actorId);
    const tiers = await this.listTiers(tenantId);
    const tier = tiers.find((t) => t.code === account.tier_code) || tiers[0];
    const mult = tier?.earn_multiplier ?? 1;
    const total = Number(order.totalAmount);
    const base = Math.floor(total / LOYALTY_DEFAULTS.vndPerPoint);
    const points = Math.max(0, Math.floor(base * mult));
    if (points <= 0) {
      return { earned: 0, skipped: true, reason: 'zero_points', account };
    }

    const result = await this.postLedger(tenantId, {
      customerId: order.customerId,
      type: 'earn',
      points,
      reason: `earn_order_${orderId}`,
      orderId,
      idempotencyKey,
      metadata: { total, multiplier: mult, tier: account.tier_code },
      actorId,
    });

    return {
      earned: points,
      ledger_id: result.ledger.id,
      account: result.account,
      idempotent: false,
    };
  }

  async adjust(
    tenantId: string,
    input: {
      customer_id: string;
      points: number;
      reason: string;
      idempotency_key?: string;
    },
    actorId?: string,
  ) {
    if (!input.reason?.trim()) throw AppError.validation('reason required');
    if (input.points === 0) throw AppError.validation('points must be non-zero');
    const type = 'adjust';
    const key = input.idempotency_key || `adjust:${createId('adj')}`;
    const result = await this.postLedger(tenantId, {
      customerId: input.customer_id,
      type,
      points: input.points,
      reason: input.reason.trim(),
      idempotencyKey: key,
      actorId,
    });
    return { ledger: this.mapLedger(result.ledger), account: result.account };
  }

  async expire(
    tenantId: string,
    input: { customer_id: string; points: number; reason?: string },
    actorId?: string,
  ) {
    if (input.points <= 0) throw AppError.validation('points must be > 0');
    const result = await this.postLedger(tenantId, {
      customerId: input.customer_id,
      type: 'expire',
      points: -Math.abs(input.points),
      reason: input.reason || 'expire_stub',
      idempotencyKey: `expire:${input.customer_id}:${createId('exp')}`,
      actorId,
    });
    return { ledger: this.mapLedger(result.ledger), account: result.account };
  }

  /**
   * Apply referral code (1 level). Soft fraud → rejected without bonus.
   */
  async applyReferral(
    tenantId: string,
    input: { customer_id: string; referral_code: string },
    actorId?: string,
  ) {
    const code = input.referral_code.trim().toUpperCase();
    if (!code) throw AppError.validation('referral_code required');
    await this.requireCustomer(tenantId, input.customer_id);

    const existingRef = await this.prisma.db.loyaltyReferral.findFirst({
      where: { tenantId, refereeCustomerId: input.customer_id },
    });
    if (existingRef) {
      throw AppError.conflict('Customer already referred', { status: existingRef.status });
    }

    const refereeAccount = await this.ensureAccount(tenantId, input.customer_id, actorId);
    const referrer = await this.prisma.db.loyaltyAccount.findFirst({
      where: { tenantId, referralCode: code },
      include: { customer: true },
    });
    if (!referrer) throw AppError.notFound('Referral code not found');

    const referee = await this.prisma.db.customer.findFirstOrThrow({
      where: { id: input.customer_id, tenantId },
    });

    const fraudFlags: string[] = [];
    if (referrer.customerId === input.customer_id) fraudFlags.push('self_referral');
    if (referee.phone && referrer.customer.phone && referee.phone === referrer.customer.phone) {
      fraudFlags.push('same_phone');
    }
    if (referee.email && referrer.customer.email && referee.email === referrer.customer.email) {
      fraudFlags.push('same_email');
    }

    if (fraudFlags.length) {
      const rejected = await this.prisma.db.loyaltyReferral.create({
        data: {
          id: createId('lyr'),
          tenantId,
          referrerAccountId: referrer.id,
          refereeCustomerId: input.customer_id,
          codeUsed: code,
          status: 'rejected',
          fraudFlags,
          bonusPoints: 0,
        },
      });
      await this.audit.write({
        tenantId,
        actorId,
        action: 'loyalty.referral_rejected',
        entity: 'loyalty_referral',
        entityId: rejected.id,
        payload: { fraud_flags: fraudFlags },
      });
      return {
        status: 'rejected',
        fraud_flags: fraudFlags,
        referral_id: rejected.id,
        bonus_points: 0,
      };
    }

    const bonus = LOYALTY_DEFAULTS.referralBonus;
    const referralId = createId('lyr');

    await this.prisma.db.$transaction(async (tx) => {
      await tx.loyaltyReferral.create({
        data: {
          id: referralId,
          tenantId,
          referrerAccountId: referrer.id,
          refereeCustomerId: input.customer_id,
          codeUsed: code,
          status: 'rewarded',
          fraudFlags: [],
          bonusPoints: bonus,
        },
      });
      await tx.loyaltyAccount.update({
        where: { id: refereeAccount.id },
        data: { referredById: referrer.id },
      });
    });

    await this.postLedger(tenantId, {
      customerId: referrer.customerId,
      type: 'referral_bonus',
      points: bonus,
      reason: `referral_bonus_for_${input.customer_id}`,
      idempotencyKey: `ref:bonus:referrer:${referralId}`,
      metadata: { referee_customer_id: input.customer_id },
      actorId,
    });
    await this.postLedger(tenantId, {
      customerId: input.customer_id,
      type: 'referral_bonus',
      points: bonus,
      reason: `referral_welcome_${code}`,
      idempotencyKey: `ref:bonus:referee:${referralId}`,
      metadata: { referrer_account_id: referrer.id },
      actorId,
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'loyalty.referral_rewarded',
      entity: 'loyalty_referral',
      entityId: referralId,
      payload: { bonus, code },
    });

    return {
      status: 'rewarded',
      fraud_flags: [],
      referral_id: referralId,
      bonus_points: bonus,
      referrer_customer_id: referrer.customerId,
      referee_account: await this.getAccount(tenantId, input.customer_id),
      referrer_account: await this.getAccount(tenantId, referrer.customerId),
    };
  }

  async listReferrals(tenantId: string, limit = 50) {
    const rows = await this.prisma.db.loyaltyReferral.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
    return rows.map((r) => ({
      id: r.id,
      referrer_account_id: r.referrerAccountId,
      referee_customer_id: r.refereeCustomerId,
      code_used: r.codeUsed,
      status: r.status,
      fraud_flags: r.fraudFlags,
      bonus_points: r.bonusPoints,
      created_at: r.createdAt.toISOString(),
    }));
  }

  private async postLedger(
    tenantId: string,
    input: {
      customerId: string;
      type: string;
      points: number;
      reason: string;
      orderId?: string;
      idempotencyKey: string;
      metadata?: Record<string, unknown>;
      actorId?: string;
    },
  ) {
    const existing = await this.prisma.db.loyaltyLedger.findFirst({
      where: { tenantId, idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      const account = await this.prisma.db.loyaltyAccount.findFirstOrThrow({
        where: { id: existing.accountId },
      });
      return { ledger: existing, account: this.mapAccount(account), idempotent: true };
    }

    await this.ensureAccount(tenantId, input.customerId, input.actorId);
    const account = await this.prisma.db.loyaltyAccount.findFirstOrThrow({
      where: { tenantId, customerId: input.customerId },
    });

    const nextBalance = account.pointsBalance + input.points;
    if (nextBalance < 0) throw AppError.conflict('Insufficient points');

    const earnedDelta = input.points > 0 ? input.points : 0;
    const redeemedDelta = input.points < 0 && input.type === 'redeem' ? -input.points : 0;

    const { ledger, updated } = await this.prisma.db.$transaction(async (tx) => {
      const lifetimeEarned = account.lifetimeEarned + earnedDelta;
      const lifetimeRedeemed = account.lifetimeRedeemed + redeemedDelta;
      const tierCode = await this.resolveTierCode(tx, tenantId, lifetimeEarned);

      const updatedAcc = await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          pointsBalance: nextBalance,
          lifetimeEarned,
          lifetimeRedeemed,
          tierCode,
        },
      });
      const led = await tx.loyaltyLedger.create({
        data: {
          id: createId('lyl'),
          tenantId,
          accountId: account.id,
          type: input.type,
          points: input.points,
          balanceAfter: nextBalance,
          reason: input.reason,
          orderId: input.orderId,
          idempotencyKey: input.idempotencyKey,
          metadata: (input.metadata || {}) as Prisma.InputJsonValue,
          actorId: input.actorId,
        },
      });
      return { ledger: led, updated: updatedAcc };
    });

    return { ledger, account: this.mapAccount(updated), idempotent: false };
  }

  private async resolveTierCode(
    tx: Prisma.TransactionClient,
    tenantId: string,
    lifetimeEarned: number,
  ) {
    const tiers = await tx.loyaltyTier.findMany({
      where: { tenantId },
      orderBy: { minPoints: 'desc' },
    });
    const hit = tiers.find((t) => lifetimeEarned >= t.minPoints);
    return hit?.code || 'bronze';
  }

  private async requireCustomer(tenantId: string, id: string) {
    const row = await this.prisma.db.customer.findFirst({
      where: { id, tenantId, status: { not: 'merged' } },
    });
    if (!row) throw AppError.notFound('Customer not found');
    return row;
  }

  private mapAccount(r: {
    id: string;
    customerId: string;
    pointsBalance: number;
    lifetimeEarned: number;
    lifetimeRedeemed: number;
    tierCode: string;
    referralCode: string;
    referredById: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: r.id,
      customer_id: r.customerId,
      points_balance: r.pointsBalance,
      lifetime_earned: r.lifetimeEarned,
      lifetime_redeemed: r.lifetimeRedeemed,
      tier_code: r.tierCode,
      referral_code: r.referralCode,
      referred_by_id: r.referredById,
      status: r.status,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    };
  }

  private mapLedger(r: {
    id: string;
    accountId: string;
    type: string;
    points: number;
    balanceAfter: number;
    reason: string;
    orderId: string | null;
    idempotencyKey: string | null;
    metadata: Prisma.JsonValue;
    createdAt: Date;
  }) {
    return {
      id: r.id,
      account_id: r.accountId,
      type: r.type,
      points: r.points,
      balance_after: r.balanceAfter,
      reason: r.reason,
      order_id: r.orderId,
      idempotency_key: r.idempotencyKey,
      metadata: r.metadata,
      created_at: r.createdAt.toISOString(),
    };
  }
}
