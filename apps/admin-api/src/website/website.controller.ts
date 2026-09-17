import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { StorefrontContextGuard } from '../common/storefront-context.guard';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { WebsiteService } from './website.service';

@Controller()
export class WebsiteController {
  constructor(private readonly website: WebsiteService) {}

  @Get('v1/storefronts/:idOrSlug/runtime')
  @UseGuards(StorefrontContextGuard)
  runtime(@ReqContext() ctx: RequestContext, @Param('idOrSlug') idOrSlug: string) {
    return this.website.getRuntime(ctx.tenantId, idOrSlug);
  }

  @Post('v1/admin/storefronts/:id/ensure-aura-lite')
  @UseGuards(TenantAuthGuard)
  ensure(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.website.ensureAuraLite(ctx.tenantId, id, ctx.actorId);
  }

  @Post('v1/admin/storefronts/:id/status')
  @UseGuards(TenantAuthGuard)
  status(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        status: z.enum(['draft', 'staging', 'published', 'maintenance']),
        primary_domain: z.string().optional(),
        seo_title: z.string().optional(),
        seo_description: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid status', parsed.error.flatten());
    return this.website.updateStorefrontStatus(ctx.tenantId, id, parsed.data.status, ctx.actorId, {
      primaryDomain: parsed.data.primary_domain,
      seoTitle: parsed.data.seo_title,
      seoDescription: parsed.data.seo_description,
    });
  }

  @Post('v1/events')
  @UseGuards(StorefrontContextGuard)
  track(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        storefront_id: z.string().min(1),
        name: z.string().min(1),
        session_id: z.string().optional(),
        customer_id: z.string().optional(),
        payload: z.record(z.unknown()).optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid event', parsed.error.flatten());
    return this.website.trackEvent(ctx.tenantId, {
      storefrontId: parsed.data.storefront_id,
      name: parsed.data.name,
      sessionId: parsed.data.session_id,
      customerId: parsed.data.customer_id,
      payload: parsed.data.payload as Record<string, string | number | boolean | null> | undefined,
    });
  }

  @Get('v1/admin/storefronts/:id/events')
  @UseGuards(TenantAuthGuard)
  events(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.website.listEvents(ctx.tenantId, id, limit ? Number(limit) : 50);
  }

  @Get('v1/shipping/quotes')
  @UseGuards(StorefrontContextGuard)
  quotes(@Query('city') city?: string) {
    return this.website.shippingQuotes(city);
  }

  @Post('v1/vouchers/validate')
  @UseGuards(StorefrontContextGuard)
  voucher(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        storefront_id: z.string().min(1),
        code: z.string().min(1),
        subtotal: z.number().nonnegative(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid voucher', parsed.error.flatten());
    return this.website.validateVoucher(
      ctx.tenantId,
      parsed.data.storefront_id,
      parsed.data.code,
      parsed.data.subtotal,
    );
  }

  @Post('v1/leads')
  @UseGuards(StorefrontContextGuard)
  lead(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        company: z.string().optional(),
        channel: z.string().optional(),
        message: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid lead', parsed.error.flatten());
    return this.website.createLead(ctx.tenantId, parsed.data);
  }
}
