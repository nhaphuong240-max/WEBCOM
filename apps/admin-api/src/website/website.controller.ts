import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import { StorefrontContextGuard } from '../common/storefront-context.guard';
import { TenantAuthGuard } from '../common/tenant-auth.guard';
import { ReqContext } from '../common/req-context.decorator';
import { WebsiteService } from './website.service';
import { PlatformService } from './platform.service';
import { HrIamService } from '../hr/hr-iam.service';

@Controller()
export class WebsiteController {
  constructor(
    private readonly website: WebsiteService,
    private readonly platform: PlatformService,
    private readonly hr: HrIamService,
  ) {}

  @Get('v1/storefronts/:idOrSlug/runtime')
  @UseGuards(StorefrontContextGuard)
  async runtime(
    @ReqContext() ctx: RequestContext,
    @Param('idOrSlug') idOrSlug: string,
    @Query('preview') preview?: string,
  ) {
    const runtime = await this.website.getRuntime(ctx.tenantId, idOrSlug);
    if (preview) {
      await this.platform.resolvePreview(ctx.tenantId, preview);
    }
    try {
      const brand = await this.platform.getBrandKitResolved(ctx.tenantId, runtime.storefront.id);
      return { ...runtime, brand_kit: brand.tokens };
    } catch {
      return { ...runtime, brand_kit: null };
    }
  }

  @Get('v1/storefronts/:idOrSlug/pages/:slug')
  @UseGuards(StorefrontContextGuard)
  publishedPage(
    @ReqContext() ctx: RequestContext,
    @Param('idOrSlug') idOrSlug: string,
    @Param('slug') slug: string,
  ) {
    return this.website.getPublishedPage(ctx.tenantId, idOrSlug, slug);
  }

  @Get('v1/storefronts/:idOrSlug/blog')
  @UseGuards(StorefrontContextGuard)
  blogList(@ReqContext() ctx: RequestContext, @Param('idOrSlug') idOrSlug: string) {
    return this.website.listPublishedBlog(ctx.tenantId, idOrSlug);
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
        cta_code: z.string().optional(),
        landing_slug: z.string().optional(),
        consent: z.boolean().optional(),
        /** CORP-CMS-3 — relative path or https URL unlocked after lead */
        unlock_href: z.string().optional(),
        utm_source: z.string().optional(),
        utm_medium: z.string().optional(),
        utm_campaign: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid lead', parsed.error.flatten());
    if (parsed.data.consent === false) {
      throw AppError.validation('Consent required');
    }
    return this.website.createLead(ctx.tenantId, parsed.data);
  }

  // ─── W3 Brand Kit ──────────────────────────────────────────

  @Get('v1/admin/storefronts/:id/brand-kit')
  @UseGuards(TenantAuthGuard)
  brandKit(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.platform.getBrandKitResolved(ctx.tenantId, id);
  }

  @Put('v1/admin/storefronts/:id/brand-kit')
  @UseGuards(TenantAuthGuard)
  putBrandKit(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        scope: z.enum(['tenant', 'brand', 'storefront']).default('storefront'),
        brand_id: z.string().optional(),
        tokens: z.record(z.unknown()),
        publish: z.boolean().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid brand kit', parsed.error.flatten());
    return this.platform.upsertBrandKit(
      ctx.tenantId,
      {
        storefrontId: id,
        brandId: parsed.data.brand_id,
        scope: parsed.data.scope,
        tokens: parsed.data.tokens as never,
        publish: parsed.data.publish,
      },
      ctx.actorId,
    );
  }

  @Post('v1/admin/storefronts/:id/brand-kit/apply')
  @UseGuards(TenantAuthGuard)
  applyBrandKit(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.platform.applyBrandKitToTheme(ctx.tenantId, id, ctx.actorId);
  }

  // ─── W3 Marketplace ────────────────────────────────────────

  @Get('v1/admin/templates')
  @UseGuards(TenantAuthGuard)
  templates(
    @Query('industry') industry?: string,
    @Query('goal') goal?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
    @Query('license') license?: string,
  ) {
    return this.platform.listTemplates({ industry, goal, q, sort, license });
  }

  @Post('v1/admin/templates/match')
  @UseGuards(TenantAuthGuard)
  match(@Body() body: unknown) {
    const parsed = z
      .object({
        industry: z.string().optional(),
        goal: z.string().optional(),
        channel: z.string().optional(),
        catalog_size: z.number().optional(),
        style: z.string().optional(),
        budget: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid match input', parsed.error.flatten());
    return this.platform.matchTemplates(parsed.data);
  }

  @Post('v1/admin/storefronts/:id/templates/:templateId/install')
  @UseGuards(TenantAuthGuard)
  install(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Param('templateId') templateId: string,
  ) {
    return this.platform.installTemplate(ctx.tenantId, id, templateId, ctx.actorId);
  }

  // ─── W3 Theme Library ──────────────────────────────────────

  @Get('v1/admin/storefronts/:id/themes')
  @UseGuards(TenantAuthGuard)
  themes(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.platform.listThemes(ctx.tenantId, id);
  }

  @Post('v1/admin/storefronts/:id/theme-versions/:vid/promote')
  @UseGuards(TenantAuthGuard)
  promote(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Param('vid') vid: string,
    @Body() body: unknown,
  ) {
    const parsed = z.object({ target: z.enum(['staging', 'draft']) }).safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid promote', parsed.error.flatten());
    return this.platform.promoteThemeVersion(ctx.tenantId, id, vid, parsed.data.target, ctx.actorId);
  }

  @Post('v1/admin/storefronts/:id/theme-versions/:vid/clone')
  @UseGuards(TenantAuthGuard)
  clone(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Param('vid') vid: string,
  ) {
    return this.platform.cloneThemeVersion(ctx.tenantId, id, vid, ctx.actorId);
  }

  @Post('v1/admin/storefronts/:id/preview-token')
  @UseGuards(TenantAuthGuard)
  previewToken(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z.object({ hours: z.number().min(1).max(168).optional() }).safeParse(body ?? {});
    if (!parsed.success) throw AppError.validation('Invalid preview', parsed.error.flatten());
    return this.platform.createPreviewToken(ctx.tenantId, id, parsed.data.hours ?? 24);
  }

  // ─── W3 Builder / CMS ──────────────────────────────────────

  @Get('v1/admin/builder/sections')
  @UseGuards(TenantAuthGuard)
  sections(@Query('scope') scope?: string) {
    return this.platform.sectionLibrary(scope);
  }

  @Get('v1/admin/storefronts/:id/pages')
  @UseGuards(TenantAuthGuard)
  async pages(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Query('template_key') templateKey?: string,
  ) {
    await this.hr.assertStorefrontAccess(ctx, id);
    return this.platform.listPages(ctx.tenantId, id, {
      template_key: templateKey,
    });
  }

  @Post('v1/admin/storefronts/:id/pages')
  @UseGuards(TenantAuthGuard)
  async createPage(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    await this.hr.assertStorefrontAccess(ctx, id);
    const parsed = z
      .object({
        slug: z.string().min(1),
        title: z.string().optional(),
        template_key: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid page', parsed.error.flatten());
    return this.platform.createPage(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/storefronts/:id/pages/:slug')
  @UseGuards(TenantAuthGuard)
  pageDraft(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Param('slug') slug: string,
  ) {
    return this.platform.getPageDraft(ctx.tenantId, id, slug);
  }

  @Post('v1/admin/storefronts/:id/themes/compatibility-check')
  @UseGuards(TenantAuthGuard)
  compatibilityCheck(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z.object({ template_code: z.string().min(1) }).safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid body', parsed.error.flatten());
    return this.platform.compatibilityCheck(ctx.tenantId, id, parsed.data.template_code);
  }

  @Put('v1/admin/storefronts/:id/pages/:slug')
  @UseGuards(TenantAuthGuard)
  savePage(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
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
        experiment_code: z.string().nullable().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid page draft', parsed.error.flatten());
    return this.platform.savePageDraft(
      ctx.tenantId,
      id,
      slug,
      {
        title: parsed.data.title,
        content: parsed.data.content,
        seo: parsed.data.seo,
        expected_version: parsed.data.expected_version,
        create_if_missing: parsed.data.create_if_missing,
        template_key: parsed.data.template_key,
        experiment_code: parsed.data.experiment_code,
      },
      ctx.actorId,
    );
  }

  @Post('v1/admin/storefronts/:id/pages/:slug/promote')
  @UseGuards(TenantAuthGuard)
  promotePage(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Param('slug') slug: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({ target: z.enum(['staging', 'published']).default('published') })
      .safeParse(body ?? {});
    if (!parsed.success) throw AppError.validation('Invalid promote body', parsed.error.flatten());
    return this.platform.promotePage(
      ctx.tenantId,
      id,
      slug,
      parsed.data.target,
      ctx.actorId,
    );
  }

  // ─── CMS-2 Media / Navigation ──────────────────────────────

  @Get('v1/admin/media')
  @UseGuards(TenantAuthGuard)
  listMedia(@ReqContext() ctx: RequestContext) {
    return this.platform.listMedia(ctx.tenantId);
  }

  @Post('v1/admin/media')
  @UseGuards(TenantAuthGuard)
  createMedia(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({
        url: z.string().url(),
        alt: z.string().optional(),
        mime_type: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid media', parsed.error.flatten());
    return this.platform.createMedia(ctx.tenantId, parsed.data);
  }

  @Get('v1/admin/storefronts/:id/navigation')
  @UseGuards(TenantAuthGuard)
  listNav(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.platform.listNavigation(ctx.tenantId, id);
  }

  @Put('v1/admin/storefronts/:id/navigation/:handle')
  @UseGuards(TenantAuthGuard)
  upsertNav(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Param('handle') handle: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        items: z.array(z.object({ label: z.string().min(1), href: z.string().min(1) })),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid navigation', parsed.error.flatten());
    return this.platform.upsertNavigation(
      ctx.tenantId,
      id,
      handle,
      parsed.data.items,
      ctx.actorId,
    );
  }

  // ─── CMS-3 Saved blocks / AI copy ──────────────────────────

  @Get('v1/admin/storefronts/:id/saved-blocks')
  @UseGuards(TenantAuthGuard)
  listBlocks(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.platform.listSavedBlocks(ctx.tenantId, id);
  }

  @Post('v1/admin/storefronts/:id/saved-blocks')
  @UseGuards(TenantAuthGuard)
  createBlock(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        name: z.string().min(1),
        section_type: z.string().min(1),
        content: z.record(z.unknown()),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid saved block', parsed.error.flatten());
    return this.platform.createSavedBlock(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Delete('v1/admin/storefronts/:id/saved-blocks/:blockId')
  @UseGuards(TenantAuthGuard)
  deleteBlock(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Param('blockId') blockId: string,
  ) {
    return this.platform.deleteSavedBlock(ctx.tenantId, id, blockId, ctx.actorId);
  }

  @Post('v1/admin/storefronts/:id/builder/ai-copy')
  @UseGuards(TenantAuthGuard)
  aiCopy(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        headline: z.string().optional(),
        field: z.string().optional(),
      })
      .safeParse(body ?? {});
    if (!parsed.success) throw AppError.validation('Invalid ai-copy body', parsed.error.flatten());
    return this.platform.suggestBuilderCopy(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  // ─── CMS-3 Could — Creator Portal stub ─────────────────────

  @Post('v1/admin/creator/packages/validate')
  @UseGuards(TenantAuthGuard)
  validateCreatorPackage(@Body() body: unknown) {
    const parsed = z
      .object({ files: z.record(z.string()) })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid package body', parsed.error.flatten());
    return this.platform.validateCreatorPackage(parsed.data);
  }

  @Post('v1/admin/creator/packages')
  @UseGuards(TenantAuthGuard)
  submitCreatorPackage(@ReqContext() ctx: RequestContext, @Body() body: unknown) {
    const parsed = z
      .object({ files: z.record(z.string()) })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid package body', parsed.error.flatten());
    return this.platform.submitCreatorPackage(ctx.tenantId, parsed.data, ctx.actorId);
  }

  @Get('v1/admin/creator/packages')
  @UseGuards(TenantAuthGuard)
  listCreatorPackages(@ReqContext() ctx: RequestContext) {
    return this.platform.listCreatorSubmissions(ctx.tenantId);
  }

  // ─── W3 Go-live / Publish ──────────────────────────────────

  @Get('v1/admin/storefronts/:id/golive')
  @UseGuards(TenantAuthGuard)
  golive(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.platform.evaluateChecklist(ctx.tenantId, id);
  }

  @Post('v1/admin/storefronts/:id/golive/evaluate')
  @UseGuards(TenantAuthGuard)
  goliveEval(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.platform.ensureChecklist(ctx.tenantId, id).then(() =>
      this.platform.runGoLiveValidationWorkflow(ctx.tenantId, id, ctx.actorId),
    );
  }

  @Post('v1/admin/storefronts/:id/golive/waive')
  @UseGuards(TenantAuthGuard)
  waive(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({ code: z.string().min(1), reason: z.string().min(5) })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid waiver', parsed.error.flatten());
    return this.platform.waiveChecklistItem(
      ctx.tenantId,
      id,
      parsed.data.code,
      parsed.data.reason,
      ctx.actorId || 'admin',
    );
  }

  @Post('v1/admin/storefronts/:id/publish')
  @UseGuards(TenantAuthGuard)
  async publish(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    await this.hr.assertWebsitePublish(ctx);
    await this.hr.assertStorefrontAccess(ctx, id);
    return this.platform.publishStorefront(ctx.tenantId, id, ctx.actorId || 'admin');
  }

  @Post('v1/admin/storefronts/:id/rollback')
  @UseGuards(TenantAuthGuard)
  rollback(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.platform.rollbackPublish(ctx.tenantId, id, ctx.actorId || 'admin');
  }

  // ─── W3 Onboarding ─────────────────────────────────────────

  @Get('v1/admin/storefronts/:id/onboarding')
  @UseGuards(TenantAuthGuard)
  onboarding(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.platform.getOnboarding(ctx.tenantId, id);
  }

  @Post('v1/admin/storefronts/:id/onboarding/advance')
  @UseGuards(TenantAuthGuard)
  advanceOnboarding(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = z
      .object({
        step: z.enum([
          'brand_kit',
          'catalog',
          'theme_match',
          'domain',
          'payment',
          'golive',
          'done',
        ]),
        done: z.boolean().default(true),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid onboarding', parsed.error.flatten());
    return this.platform.advanceOnboarding(
      ctx.tenantId,
      id,
      parsed.data.step,
      parsed.data.done,
      ctx.actorId,
    );
  }

  // ─── A1 Domain connect ─────────────────────────────────────

  @Get('v1/admin/storefronts/:id/domains')
  @UseGuards(TenantAuthGuard)
  domains(@ReqContext() ctx: RequestContext, @Param('id') id: string) {
    return this.website.listDomains(ctx.tenantId, id);
  }

  @Post('v1/admin/storefronts/:id/domains')
  @UseGuards(TenantAuthGuard)
  addDomain(@ReqContext() ctx: RequestContext, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        hostname: z.string().min(3),
        kind: z.enum(['subdomain', 'custom']).optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid domain', parsed.error.flatten());
    return this.website.addDomain(ctx.tenantId, id, parsed.data, ctx.actorId);
  }

  @Post('v1/admin/storefronts/:id/domains/:domainId/verify')
  @UseGuards(TenantAuthGuard)
  verifyDomain(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Param('domainId') domainId: string,
  ) {
    return this.website.verifyDomain(ctx.tenantId, id, domainId, ctx.actorId);
  }

  @Post('v1/admin/storefronts/:id/domains/:domainId/primary')
  @UseGuards(TenantAuthGuard)
  primaryDomain(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: string,
    @Param('domainId') domainId: string,
  ) {
    return this.website.setPrimaryDomain(ctx.tenantId, id, domainId, ctx.actorId);
  }

  @Get('v1/public/host-resolve')
  hostResolve(@Query('host') host?: string) {
    if (!host) throw AppError.validation('host query required');
    return this.website.resolveHost(host);
  }

  /** P1 / MKT-1 — public template gallery (no auth). */
  @Get('v1/public/templates')
  publicTemplates(
    @Query('industry') industry?: string,
    @Query('goal') goal?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
    @Query('license') license?: string,
  ) {
    return this.platform.listTemplates({ industry, goal, q, sort, license });
  }

  @Get('v1/public/templates/facets')
  publicTemplateFacets() {
    return this.platform.listTemplateFacets();
  }

  @Get('v1/public/templates/:codeOrId')
  publicTemplate(@Param('codeOrId') codeOrId: string) {
    return this.platform.getPublicTemplate(codeOrId);
  }

  @Get('v1/public/templates/:codeOrId/reviews')
  publicTemplateReviews(@Param('codeOrId') codeOrId: string) {
    return this.platform.listTemplateReviews(codeOrId);
  }

  @Post('v1/public/templates/:codeOrId/reviews')
  createPublicTemplateReview(@Param('codeOrId') codeOrId: string, @Body() body: unknown) {
    const parsed = z
      .object({
        author_name: z.string().min(1).max(80),
        author_email: z.string().email().optional(),
        rating: z.number().min(1).max(5),
        body: z.string().max(2000).optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw AppError.validation('Invalid review', parsed.error.flatten());
    return this.platform.createTemplateReview(codeOrId, parsed.data);
  }

  /** CMS-0 — ThemePackage filesystem catalog */
  @Get('v1/public/theme-packages')
  publicThemePackages() {
    return this.platform.listPublicThemePackages();
  }

  @Get('v1/public/theme-packages/:code')
  publicThemePackage(@Param('code') code: string) {
    return this.platform.getPublicThemePackage(code);
  }
}
