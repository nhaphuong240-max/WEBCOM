import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { CxService } from './cx.service';

@Controller()
@UseGuards(TenantAuthGuard)
export class CxController {
  constructor(private readonly cx: CxService) {}

  @Get('v1/admin/cx/status')
  status() {
    return this.cx.status();
  }

  @Get('v1/admin/cx/tickets')
  listTickets(
    @ReqContext() ctx: RequestContext,
    @Query('customer_id') customerId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cx.listTickets(ctx.tenantId, {
      customer_id: customerId,
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('v1/admin/cx/tickets')
  createTicket(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        customer_id: z.string().min(1),
        order_id: z.string().optional(),
        conversation_id: z.string().optional(),
        subject: z.string().min(1),
        description: z.string().optional(),
        priority: z.string().optional(),
        playbook_code: z.string().optional(),
        trigger_type: z.string().optional(),
        evidence: z.record(z.unknown()).optional(),
        owner_id: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid ticket', parsed.error.flatten());
    return this.cx.createTicket(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/cx/tickets/:id')
  getTicket(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.cx.getTicket(ctx.tenantId, id);
  }

  @Patch('v1/admin/cx/tickets/:id')
  updateTicket(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        status: z.string().optional(),
        priority: z.string().optional(),
        owner_id: z.string().nullable().optional(),
        description: z.string().optional(),
        care_reply_draft: z.string().nullable().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid ticket update', parsed.error.flatten());
    return this.cx.updateTicket(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/cx/playbooks/scan')
  scan(@ReqContext() ctx: RequestContext) {
    return this.cx.scanPlaybooks(ctx.tenantId, ctx.actorId);
  }

  @Post('v1/admin/cx/nba/suggest')
  suggestNba(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        customer_id: z.string().min(1),
        ticket_id: z.string().optional(),
        owner_id: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid NBA suggest', parsed.error.flatten());
    return this.cx.suggestNba(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/cx/nba/suggest-ai')
  suggestNbaAi(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        customer_id: z.string().min(1),
        ticket_id: z.string().optional(),
        storefront_id: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid NBA AI', parsed.error.flatten());
    return this.cx.suggestNbaAi(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/cx/nba')
  listNba(
    @ReqContext() ctx: RequestContext,
    @Query('customer_id') customerId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cx.listNba(ctx.tenantId, {
      customer_id: customerId,
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch('v1/admin/cx/nba/:id')
  updateNba(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        status: z.string().optional(),
        owner_id: z.string().nullable().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid NBA update', parsed.error.flatten());
    return this.cx.updateNba(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/cx/nba/:id/apply')
  applyNba(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.cx.applyNba(ctx.tenantId, id, ctx.actorId);
  }

  @Post('v1/admin/cx/tickets/:id/care-reply')
  careReply(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        tone: z.string().optional(),
        storefront_id: z.string().optional(),
      })
      .safeParse(body ?? {});
    if (!parsed.success) throw AppError.validation('Invalid care reply', parsed.error.flatten());
    return this.cx.suggestCareReply(
      ctx.tenantId,
      { ticket_id: id, ...parsed.data },
      ctx.actorId,
    );
  }
}
