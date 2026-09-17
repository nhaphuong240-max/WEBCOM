import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { SocialService } from './social.service';
import { SocialDraftService } from './social-draft.service';

const lineSchema = z.object({
  sku_id: z.string().min(1),
  qty: z.number().int().positive(),
});

@Controller()
@UseGuards(TenantAuthGuard)
export class SocialController {
  constructor(
    private readonly social: SocialService,
    private readonly drafts: SocialDraftService,
  ) {}

  @Get('v1/admin/social/status')
  status() {
    return this.social.status();
  }

  @Get('v1/admin/social/channels')
  listChannels(@ReqContext() ctx: RequestContext) {
    return this.social.listChannels(ctx.tenantId);
  }

  @Post('v1/admin/social/channels/bind')
  bind(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        provider: z.enum(['meta', 'zalo']),
        channel_type: z.string().min(1),
        storefront_id: z.string().optional(),
        external_id: z.string().optional(),
        display_name: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid bind payload', parsed.error.flatten());
    return this.social.bindChannel(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/social/channels/:id/disconnect')
  disconnect(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.social.disconnectChannel(ctx.tenantId, id, ctx.actorId);
  }

  @Get('v1/admin/social/inbox')
  listInbox(
    @ReqContext() ctx: RequestContext,
    @Query('status') status?: string,
    @Query('channel_id') channelId?: string,
    @Query('owner_id') ownerId?: string,
    @Query('tag') tag?: string,
    @Query('limit') limit?: string,
  ) {
    return this.social.listInbox(ctx.tenantId, {
      status,
      channel_id: channelId,
      owner_id: ownerId,
      tag,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('v1/admin/social/inbox/:id')
  getInbox(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.social.getConversation(ctx.tenantId, id);
  }

  @Post('v1/admin/social/inbox/:id/assign')
  assign(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        owner_id: z.string().nullable().optional(),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
        status: z.enum(['open', 'pending', 'closed']).optional(),
        sla_minutes: z.number().int().positive().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid assign payload', parsed.error.flatten());
    return this.social.assignConversation(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/social/inbox/:id/reply')
  reply(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z.object({ body: z.string().min(1).max(4000) }).safeParse(body);
    if (!parsed.success) throw AppError.validation('body required');
    return this.social.reply(ctx.tenantId, id, parsed.data.body, ctx.actorId);
  }

  /** B6 — AI reply draft (pending_approval); send via AI approve+apply */
  @Post('v1/admin/social/inbox/:id/ai-reply')
  aiReply(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        tone: z.string().optional(),
        upsell_sku_code: z.string().optional(),
        intent: z.string().optional(),
        storefront_id: z.string().optional(),
      })
      .safeParse(body ?? {});
    if (!parsed.success) throw AppError.validation('Invalid ai-reply', parsed.error.flatten());
    return this.social.suggestAiReply(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/social/inbox/:id/ai-replies')
  listAiReplies(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.social.listAiReplies(ctx.tenantId, id);
  }

  @Post('v1/admin/social/webhooks/:provider')
  webhook(
    @ReqContext() ctx: RequestContext,
    @Param('provider') provider: string,
    @Body() body: unknown,
  ) {
    if (typeof body !== 'object' || body === null) {
      throw AppError.validation('JSON body required');
    }
    return this.social.ingestWebhook(
      ctx.tenantId,
      provider,
      body as Record<string, unknown>,
      ctx.actorId,
    );
  }

  @Post('v1/admin/social/sla/refresh')
  refreshSla(@ReqContext() ctx: RequestContext) {
    return this.social.refreshSla(ctx.tenantId);
  }

  // ─── B2: product picker + order drafts ─────────────────────────────

  @Get('v1/admin/social/products')
  searchProducts(
    @ReqContext() ctx: RequestContext,
    @Query('q') q?: string,
    @Query('brand_id') brandId?: string,
  ) {
    return this.drafts.searchProducts(ctx.tenantId, q, brandId ?? ctx.brandId);
  }

  @Get('v1/admin/social/drafts')
  listDrafts(
    @ReqContext() ctx: RequestContext,
    @Query('conversation_id') conversationId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.drafts.listDrafts(ctx.tenantId, {
      conversation_id: conversationId,
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('v1/admin/social/drafts/:id')
  getDraft(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.drafts.getDraft(ctx.tenantId, id);
  }

  @Post('v1/admin/social/drafts')
  createDraft(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        conversation_id: z.string().min(1),
        message_id: z.string().optional(),
        lines: z.array(lineSchema).min(1),
        source: z.enum(['comment', 'chat', 'messenger_cart']).optional(),
        storefront_id: z.string().optional(),
        contact_phone: z.string().optional(),
        shipping_name: z.string().optional(),
        shipping_phone: z.string().optional(),
        shipping_address: z.string().optional(),
        shipping_city: z.string().optional(),
        payment_method: z.enum(['COD', 'TRANSFER']).optional(),
        note: z.string().optional(),
        post_id: z.string().optional(),
        reel_id: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid draft', parsed.error.flatten());
    return this.drafts.createDraft(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/social/inbox/:id/drafts')
  createDraftOnThread(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        message_id: z.string().optional(),
        lines: z.array(lineSchema).min(1),
        source: z.enum(['comment', 'chat', 'messenger_cart']).optional(),
        storefront_id: z.string().optional(),
        contact_phone: z.string().optional(),
        shipping_name: z.string().optional(),
        shipping_phone: z.string().optional(),
        shipping_address: z.string().optional(),
        shipping_city: z.string().optional(),
        payment_method: z.enum(['COD', 'TRANSFER']).optional(),
        note: z.string().optional(),
        post_id: z.string().optional(),
        reel_id: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid draft', parsed.error.flatten());
    return this.drafts.createDraft(
      ctx.tenantId,
      { ...parsed.data, conversation_id: id },
      ctx.actorId,
    );
  }

  @Post('v1/admin/social/comments/:messageId/order-draft')
  createFromComment(
    @ReqContext() ctx: RequestContext,
    @Param('messageId') messageId: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        conversation_id: z.string().min(1),
        lines: z.array(lineSchema).min(1),
        storefront_id: z.string().optional(),
        shipping_name: z.string().optional(),
        shipping_phone: z.string().optional(),
        shipping_address: z.string().optional(),
        shipping_city: z.string().optional(),
        payment_method: z.enum(['COD', 'TRANSFER']).optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid comment draft', parsed.error.flatten());
    return this.drafts.createFromComment(
      ctx.tenantId,
      { ...parsed.data, message_id: messageId },
      ctx.actorId,
    );
  }

  @Post('v1/admin/social/drafts/:id/send-cart')
  sendCart(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.drafts.sendCart(ctx.tenantId, id, ctx.actorId);
  }

  @Post('v1/admin/social/drafts/:id/convert')
  convert(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        payment_method: z.enum(['COD', 'TRANSFER']).optional(),
        shipping_name: z.string().optional(),
        shipping_phone: z.string().optional(),
        shipping_address: z.string().optional(),
        shipping_city: z.string().optional(),
        shipping_carrier: z.string().optional(),
        voucher_code: z.string().optional(),
        note: z.string().optional(),
        send_confirmation: z.boolean().optional(),
      })
      .safeParse(body ?? {});
    if (!parsed.success) throw AppError.validation('Invalid convert payload', parsed.error.flatten());
    return this.drafts.convert(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/social/drafts/:id/cancel')
  cancel(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.drafts.cancel(ctx.tenantId, id, ctx.actorId);
  }
}
