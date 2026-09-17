import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { LiveService } from './live.service';

@Controller()
@UseGuards(TenantAuthGuard)
export class LiveController {
  constructor(private readonly live: LiveService) {}

  @Get('v1/admin/live/status')
  status() {
    return this.live.status();
  }

  @Get('v1/admin/live/sessions')
  list(@ReqContext() ctx: RequestContext, @Query('status') status?: string) {
    return this.live.listSessions(ctx.tenantId, status);
  }

  @Post('v1/admin/live/sessions')
  create(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        title: z.string().min(1),
        host_name: z.string().optional(),
        platform: z.string().optional(),
        storefront_id: z.string().optional(),
        script_notes: z.string().optional(),
        gmv_target: z.number().nonnegative().optional(),
        stock_alert_threshold: z.number().int().nonnegative().optional(),
        scheduled_at: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid session', parsed.error.flatten());
    return this.live.createSession(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/live/sessions/:id')
  get(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.live.getSession(ctx.tenantId, id);
  }

  @Post('v1/admin/live/sessions/:id/items')
  addItem(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        sku_id: z.string().min(1),
        keyword: z.string().min(1),
        deal_price: z.number().nonnegative().optional(),
        sort_order: z.number().int().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid item', parsed.error.flatten());
    return this.live.addItem(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/live/sessions/:id/start')
  start(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.live.startSession(ctx.tenantId, id, ctx.actorId);
  }

  @Post('v1/admin/live/sessions/:id/end')
  end(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.live.endSession(ctx.tenantId, id, ctx.actorId);
  }

  @Post('v1/admin/live/sessions/:id/viewers')
  viewers(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z.object({ viewers: z.number().int().nonnegative() }).safeParse(body);
    if (!parsed.success) throw AppError.validation('viewers required');
    return this.live.updateViewers(ctx.tenantId, id, parsed.data.viewers);
  }

  @Post('v1/admin/live/sessions/:id/comments')
  ingestComment(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        body: z.string().min(1),
        author_name: z.string().optional(),
        author_handle: z.string().optional(),
        external_id: z.string().optional(),
        auto_convert: z.boolean().optional(),
        shipping_name: z.string().optional(),
        shipping_phone: z.string().optional(),
        shipping_address: z.string().optional(),
        shipping_city: z.string().optional(),
        payment_method: z.enum(['COD', 'TRANSFER']).optional(),
        qty: z.number().int().positive().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid comment', parsed.error.flatten());
    return this.live.ingestComment(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/live/sessions/:id/comments')
  listComments(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.live.listComments(ctx.tenantId, id);
  }

  @Get('v1/admin/live/sessions/:id/alerts')
  listAlerts(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Query('unresolved') unresolved?: string,
  ) {
    return this.live.listAlerts(ctx.tenantId, id, unresolved === '1' || unresolved === 'true');
  }

  @Post('v1/admin/live/alerts/:id/resolve')
  resolveAlert(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.live.resolveAlert(ctx.tenantId, id, ctx.actorId);
  }

  @Get('v1/admin/live/sessions/:id/recovery')
  recovery(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.live.recoveryList(ctx.tenantId, id);
  }
}
