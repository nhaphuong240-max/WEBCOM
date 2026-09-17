import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { LoyaltyService } from './loyalty.service';

@Controller()
@UseGuards(TenantAuthGuard)
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get('v1/admin/loyalty/status')
  status() {
    return this.loyalty.status();
  }

  @Post('v1/admin/loyalty/tiers/ensure')
  ensureTiers(@ReqContext() ctx: RequestContext) {
    return this.loyalty.ensureTiers(ctx.tenantId);
  }

  @Get('v1/admin/loyalty/tiers')
  listTiers(@ReqContext() ctx: RequestContext) {
    return this.loyalty.listTiers(ctx.tenantId);
  }

  @Get('v1/admin/loyalty/accounts')
  listAccounts(@ReqContext() ctx: RequestContext, @Query('limit') limit?: string) {
    return this.loyalty.listAccounts(ctx.tenantId, limit ? Number(limit) : 50);
  }

  @Post('v1/admin/loyalty/accounts/ensure')
  ensureAccount(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z.object({ customer_id: z.string().min(1) }).safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid ensure', parsed.error.flatten());
    return this.loyalty.ensureAccount(ctx.tenantId, parsed.data.customer_id, ctx.actorId);
  }

  @Get('v1/admin/loyalty/accounts/:customerId')
  getAccount(@ReqContext() ctx: RequestContext, @Param('customerId') customerId: string) {
    return this.loyalty.getAccount(ctx.tenantId, customerId);
  }

  @Get('v1/admin/loyalty/accounts/:customerId/ledger')
  ledger(
    @ReqContext() ctx: RequestContext,
    @Param('customerId') customerId: string,
    @Query('limit') limit?: string,
  ) {
    return this.loyalty.listLedger(ctx.tenantId, customerId, limit ? Number(limit) : 50);
  }

  @Post('v1/admin/loyalty/quote-redeem')
  quoteRedeem(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        customer_id: z.string().min(1),
        points: z.number().int().positive(),
        subtotal: z.number().nonnegative(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid quote', parsed.error.flatten());
    return this.loyalty.quoteRedeem(
      ctx.tenantId,
      parsed.data.customer_id,
      parsed.data.points,
      parsed.data.subtotal,
    );
  }

  @Post('v1/admin/loyalty/redeem')
  redeem(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        customer_id: z.string().min(1),
        points: z.number().int().positive(),
        subtotal: z.number().nonnegative(),
        order_id: z.string().optional(),
        idempotency_key: z.string().min(1),
        reason: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid redeem', parsed.error.flatten());
    return this.loyalty.redeem(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/loyalty/earn-order/:orderId')
  earnOrder(@ReqContext() ctx: RequestContext, @Param('orderId') orderId: string) {
    return this.loyalty.earnOnOrder(ctx.tenantId, orderId, ctx.actorId);
  }

  @Post('v1/admin/loyalty/adjust')
  adjust(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        customer_id: z.string().min(1),
        points: z.number().int(),
        reason: z.string().min(1),
        idempotency_key: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid adjust', parsed.error.flatten());
    return this.loyalty.adjust(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/loyalty/expire')
  expire(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        customer_id: z.string().min(1),
        points: z.number().int().positive(),
        reason: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid expire', parsed.error.flatten());
    return this.loyalty.expire(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/loyalty/referral/apply')
  applyReferral(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        customer_id: z.string().min(1),
        referral_code: z.string().min(1),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid referral', parsed.error.flatten());
    return this.loyalty.applyReferral(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/loyalty/referrals')
  listReferrals(@ReqContext() ctx: RequestContext, @Query('limit') limit?: string) {
    return this.loyalty.listReferrals(ctx.tenantId, limit ? Number(limit) : 50);
  }
}
