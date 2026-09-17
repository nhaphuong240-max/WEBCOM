import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { StorefrontContextGuard } from '../common/storefront-context.guard';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { AnalyticsService } from './analytics.service';

@Controller()
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('v1/events')
  @UseGuards(StorefrontContextGuard)
  track(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        storefront_id: z.string().min(1),
        name: z.string().min(1),
        session_id: z.string().optional(),
        customer_id: z.string().optional(),
        landing_path: z.string().optional(),
        consent_state: z.enum(['granted', 'denied', 'unknown']).optional(),
        experiment_id: z.string().optional(),
        variant_key: z.string().optional(),
        payload: z.record(z.unknown()).optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid event', parsed.error.flatten());
    return this.analytics.collectEvent(ctx.tenantId, {
      storefrontId: parsed.data.storefront_id,
      name: parsed.data.name,
      sessionId: parsed.data.session_id,
      customerId: parsed.data.customer_id,
      landingPath: parsed.data.landing_path,
      consentState: parsed.data.consent_state,
      experimentId: parsed.data.experiment_id,
      variantKey: parsed.data.variant_key,
      payload: parsed.data.payload as Record<string, string | number | boolean | null> | undefined,
    });
  }

  @Get('v1/admin/storefronts/:id/analytics')
  @UseGuards(TenantAuthGuard)
  dashboard(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Query('days') days?: string,
  ) {
    return this.analytics.getDashboard(ctx.tenantId, id, days ? Number(days) : 7);
  }

  @Get('v1/admin/analytics/pipeline')
  @UseGuards(TenantAuthGuard)
  pipeline() {
    return this.analytics.pipelineStatus();
  }

  @Get('v1/admin/storefronts/:id/analytics/landings')
  @UseGuards(TenantAuthGuard)
  landings(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Query('days') days?: string,
  ) {
    return this.analytics.contributionByLanding(ctx.tenantId, id, days ? Number(days) : 7);
  }

  @Get('v1/admin/storefronts/:id/cwv')
  @UseGuards(TenantAuthGuard)
  cwv(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.analytics.getCwvSummary(ctx.tenantId, id);
  }

  @Post('v1/admin/storefronts/:id/cwv')
  @UseGuards(TenantAuthGuard)
  recordCwv(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        source: z.string().optional(),
        path: z.string().optional(),
        device: z.string().optional(),
        lcp_ms: z.number().positive(),
        inp_ms: z.number().optional(),
        cls: z.number().optional(),
        publish_job_id: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid CWV', parsed.error.flatten());
    return this.analytics.recordCwv(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/storefronts/:id/health-window')
  @UseGuards(TenantAuthGuard)
  healthWindow(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        publish_job_id: z.string().optional(),
        synthetic_lcp_ms: z.number().optional(),
      })
      .safeParse(body ?? {});
    if (!parsed.success) throw AppError.validation('Invalid health window', parsed.error.flatten());
    return this.analytics.runPublishHealthWindow(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/storefronts/:id/experiments')
  @UseGuards(TenantAuthGuard)
  experiments(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.analytics.listExperiments(ctx.tenantId, id);
  }

  @Post('v1/admin/storefronts/:id/experiments')
  @UseGuards(TenantAuthGuard)
  upsertExp(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        code: z.string().min(1),
        name: z.string().min(1),
        metric: z.string().optional(),
        status: z.enum(['draft', 'running', 'paused', 'completed']).optional(),
        variants: z
          .array(
            z.object({
              key: z.string(),
              weight: z.number().optional(),
              headline: z.string().optional(),
              cta: z.string().optional(),
              cta_href: z.string().optional(),
            }),
          )
          .min(1),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid experiment', parsed.error.flatten());
    return this.analytics.upsertExperiment(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/storefronts/:id/experiments/:code/stats')
  @UseGuards(TenantAuthGuard)
  expStats(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Param('code') code: string,
  ) {
    return this.analytics.experimentStats(ctx.tenantId, id, code);
  }

  @Get('v1/storefronts/:id/experiments/:code/assign')
  @UseGuards(StorefrontContextGuard)
  assign(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Param('code') code: string,
    @Query('session_id') sessionId?: string,
  ) {
    if (!sessionId) throw AppError.validation('session_id required');
    return this.analytics.assignVariant(ctx.tenantId, id, code, sessionId);
  }
}
