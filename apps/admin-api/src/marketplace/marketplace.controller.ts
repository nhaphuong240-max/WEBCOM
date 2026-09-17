import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { MarketplaceService } from './marketplace.service';

@Controller()
@UseGuards(TenantAuthGuard)
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get('v1/admin/marketplace/status')
  status() {
    return this.marketplace.status();
  }

  @Get('v1/admin/marketplace/accounts')
  listAccounts(@ReqContext() ctx: RequestContext) {
    return this.marketplace.listAccounts(ctx.tenantId);
  }

  @Post('v1/admin/marketplace/accounts/connect')
  connect(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        platform: z.string().optional(),
        shop_id: z.string().optional(),
        shop_name: z.string().optional(),
        storefront_id: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid connect', parsed.error.flatten());
    return this.marketplace.connect(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/marketplace/accounts/:id/disconnect')
  disconnect(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.marketplace.disconnect(ctx.tenantId, id, ctx.actorId);
  }

  @Get('v1/admin/marketplace/listings')
  listListings(@ReqContext() ctx: RequestContext, @Query('account_id') accountId?: string) {
    return this.marketplace.listListings(ctx.tenantId, accountId);
  }

  @Post('v1/admin/marketplace/listings')
  upsertListing(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        account_id: z.string().min(1),
        sku_id: z.string().min(1),
        title: z.string().optional(),
        external_item_id: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid listing', parsed.error.flatten());
    return this.marketplace.upsertListing(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/marketplace/stock/sync')
  syncStock(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        account_id: z.string().min(1),
        listing_id: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid sync', parsed.error.flatten());
    return this.marketplace.syncStock(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/marketplace/orders')
  listOrders(
    @ReqContext() ctx: RequestContext,
    @Query('account_id') accountId?: string,
    @Query('match_status') matchStatus?: string,
    @Query('limit') limit?: string,
  ) {
    return this.marketplace.listOrders(ctx.tenantId, {
      account_id: accountId,
      match_status: matchStatus,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('v1/admin/marketplace/orders/ingest')
  ingestOrder(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        account_id: z.string().min(1),
        external_order_id: z.string().optional(),
        buyer_name: z.string().optional(),
        buyer_phone: z.string().optional(),
        shipping_address: z.string().optional(),
        auto_import: z.boolean().optional(),
        lines: z
          .array(
            z.object({
              sku_id: z.string().optional(),
              external_item_id: z.string().optional(),
              qty: z.number().int().positive(),
              unit_price: z.number().nonnegative().optional(),
            }),
          )
          .min(1),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid order ingest', parsed.error.flatten());
    return this.marketplace.ingestOrder(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/marketplace/orders/:id/import')
  importOrder(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.marketplace.importMatchedOrder(ctx.tenantId, id, ctx.actorId);
  }

  @Get('v1/admin/marketplace/outbox')
  listOutbox(
    @ReqContext() ctx: RequestContext,
    @Query('account_id') accountId?: string,
    @Query('status') status?: string,
  ) {
    return this.marketplace.listOutbox(ctx.tenantId, accountId, status);
  }

  @Post('v1/admin/marketplace/outbox/drain')
  drain(@Body() body: unknown) {
    const parsed = z.object({ limit: z.number().int().positive().optional() }).safeParse(body ?? {});
    return this.marketplace.drain(parsed.success ? parsed.data.limit ?? 50 : 50);
  }

  @Post('v1/admin/marketplace/outbox/retry')
  retry(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z.object({ account_id: z.string().min(1) }).safeParse(body);
    if (!parsed.success) throw AppError.validation('account_id required');
    return this.marketplace.retryFailed(ctx.tenantId, parsed.data.account_id, ctx.actorId);
  }
}
