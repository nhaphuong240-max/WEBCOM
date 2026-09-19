import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { PlatformCmsService } from './platform-cms.service';

@Controller()
export class PlatformCmsController {
  constructor(private readonly cms: PlatformCmsService) {}

  @Get('v1/admin/platform/sites')
  @UseGuards(TenantAuthGuard)
  listSites(@ReqContext() ctx: RequestContext) {
    return this.cms.listSitesForActor(ctx);
  }

  @Get('v1/admin/platform/sites/:siteKey')
  @UseGuards(TenantAuthGuard)
  getSite(@ReqContext() ctx: RequestContext, @Param('siteKey') siteKey: string) {
    return this.cms.getSiteForActor(ctx, siteKey);
  }

  @Get('v1/admin/platform/starters')
  @UseGuards(TenantAuthGuard)
  listStarters() {
    return this.cms.listStarters();
  }

  @Get('v1/admin/platform/starters/:key')
  @UseGuards(TenantAuthGuard)
  getStarter(@Param('key') key: string) {
    return this.cms.getStarter(key);
  }

  @Get('v1/admin/platform/sites/:siteKey/pages')
  @UseGuards(TenantAuthGuard)
  listPages(@ReqContext() ctx: RequestContext, @Param('siteKey') siteKey: string) {
    return this.cms.listPages(ctx, siteKey);
  }

  @Get('v1/admin/platform/sites/:siteKey/pages/:slug')
  @UseGuards(TenantAuthGuard)
  getDraft(
    @ReqContext() ctx: RequestContext,
    @Param('siteKey') siteKey: string,
    @Param('slug') slug: string,
  ) {
    return this.cms.getPageDraft(ctx, siteKey, slug);
  }

  @Put('v1/admin/platform/sites/:siteKey/pages/:slug')
  @UseGuards(TenantAuthGuard)
  putDraft(
    @ReqContext() ctx: RequestContext,
    @Param('siteKey') siteKey: string,
    @Param('slug') slug: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        title: z.string().optional(),
        content: z.record(z.unknown()),
        seo: z.record(z.unknown()).optional(),
        expected_version: z.number().optional(),
        create_if_missing: z.boolean().optional(),
        template_key: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid page draft', parsed.error.flatten());
    return this.cms.savePageDraft(ctx, siteKey, slug, parsed.data);
  }

  @Post('v1/admin/platform/sites/:siteKey/pages/:slug/transition')
  @UseGuards(TenantAuthGuard)
  transition(
    @ReqContext() ctx: RequestContext,
    @Param('siteKey') siteKey: string,
    @Param('slug') slug: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        target: z.enum(['draft', 'review', 'published']),
        checklist: z
          .object({
            seo_ok: z.boolean().optional(),
            cta_codes_ok: z.boolean().optional(),
            legal_ok: z.boolean().optional(),
          })
          .optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid transition', parsed.error.flatten());
    return this.cms.transition(
      ctx,
      siteKey,
      slug,
      parsed.data.target,
      parsed.data.checklist || null,
    );
  }

  @Post('v1/admin/platform/sites/:siteKey/preview-token')
  @UseGuards(TenantAuthGuard)
  previewToken(
    @ReqContext() ctx: RequestContext,
    @Param('siteKey') siteKey: string,
    @Body() body: unknown,
  ) {
    const parsed = z.object({ hours: z.number().optional() }).safeParse(body ?? {});
    if (!parsed.success) throw AppError.validation('Invalid body', parsed.error.flatten());
    return this.cms.createPreviewToken(ctx, siteKey, parsed.data.hours ?? 24);
  }

  /** Published only — no tenant header required. */
  @Get('v1/public/platform/:siteKey/pages/:slug')
  publicPage(@Param('siteKey') siteKey: string, @Param('slug') slug: string) {
    return this.cms.getPublishedPage(siteKey, slug);
  }

  /** Draft preview with token (AC-P7). */
  @Get('v1/public/platform/:siteKey/preview')
  publicPreview(
    @Param('siteKey') siteKey: string,
    @Query('token') token?: string,
    @Query('slug') slug?: string,
  ) {
    if (!token) throw AppError.unauthorized('Preview token required');
    return this.cms.getPreviewPage(siteKey, token, slug || 'home');
  }
}
