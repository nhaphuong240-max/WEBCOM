import { Injectable } from '@nestjs/common';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import {
  filterExpiredAnnounceBars,
  getPlatformStarter,
  normalizeContent,
  toLegacyFlat,
  validateContentV1,
} from '@ptt/themes';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertPermission } from '../hr/hr-access';
import { PlatformService } from './platform.service';

/** Interim PlatformSite registry (ADR-008). CORP-CMS-2 → PlatformSite table. */
export const PLATFORM_SITES: Record<
  string,
  { tenantId: string; storefrontId: string; name: string; primaryHost: string; status: 'draft' | 'live' }
> = {
  webcom_apex: {
    tenantId: 'ten_platform',
    storefrontId: 'sf_platform_webcom',
    name: 'WebCom Platform',
    primaryHost: 'webecom.ngoinhahomnay.vn',
    status: 'live',
  },
  webcom_staging: {
    tenantId: 'ten_platform',
    storefrontId: 'sf_platform_webcom',
    name: 'WebCom Platform (staging)',
    primaryHost: 'staging-webecom.ngoinhahomnay.vn',
    status: 'draft',
  },
};

type PlatformTransitionTarget = 'draft' | 'review' | 'published';

function featurePlatformCms(fallback = true): boolean {
  const raw = process.env.FEATURE_PLATFORM_CMS;
  if (raw === undefined) return fallback;
  return raw === '1' || raw === 'true';
}

/** Map public path "/" → CMS slug "home". */
export function normalizePlatformSlug(raw: string): string {
  const s = decodeURIComponent(raw || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
  if (!s || s === 'index' || s === '/') return 'home';
  return s;
}

@Injectable()
export class PlatformCmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly platform: PlatformService,
  ) {}

  resolveSite(siteKey: string) {
    const site = PLATFORM_SITES[siteKey];
    if (!site) throw AppError.notFound(`Unknown platform site_key: ${siteKey}`);
    return { siteKey, ...site };
  }

  listSites() {
    return Object.entries(PLATFORM_SITES).map(([site_key, s]) => ({
      site_key,
      name: s.name,
      primary_host: s.primaryHost,
      status: s.status,
      tenant_id: s.tenantId,
      interim_storefront_id: s.storefrontId,
      owner: 'interim_storefront',
    }));
  }

  async listSitesForActor(ctx: RequestContext) {
    await assertPermission(this.prisma, ctx, 'platform.cms.read');
    return this.listSites().filter((s) => s.tenant_id === ctx.tenantId);
  }

  getSite(siteKey: string) {
    const s = this.resolveSite(siteKey);
    return {
      site_key: siteKey,
      name: s.name,
      primary_host: s.primaryHost,
      status: s.status,
      default_locale: 'vi',
      tenant_id: s.tenantId,
      interim_storefront_id: s.storefrontId,
      owner: 'interim_storefront',
      seo_defaults: {
        title_template: '%s · WebCom',
        og_image: null,
      },
    };
  }

  async getSiteForActor(ctx: RequestContext, siteKey: string) {
    await assertPermission(this.prisma, ctx, 'platform.cms.read');
    this.assertCtxTenant(ctx, siteKey);
    return this.getSite(siteKey);
  }

  private assertCtxTenant(ctx: RequestContext, siteKey: string) {
    const site = this.resolveSite(siteKey);
    if (ctx.tenantId !== site.tenantId) {
      throw AppError.forbidden('Platform site belongs to a different tenant');
    }
    return site;
  }

  async listPages(ctx: RequestContext, siteKey: string) {
    await assertPermission(this.prisma, ctx, 'platform.cms.read');
    const site = this.assertCtxTenant(ctx, siteKey);
    return this.platform.listPages(site.tenantId, site.storefrontId);
  }

  async getPageDraft(ctx: RequestContext, siteKey: string, slugRaw: string) {
    await assertPermission(this.prisma, ctx, 'platform.cms.read');
    const site = this.assertCtxTenant(ctx, siteKey);
    const slug = normalizePlatformSlug(slugRaw);
    const draft = await this.platform.getPageDraft(site.tenantId, site.storefrontId, slug);
    return { ...draft, site_key: siteKey, path: slug === 'home' ? '/' : `/${slug}` };
  }

  async savePageDraft(
    ctx: RequestContext,
    siteKey: string,
    slugRaw: string,
    input: {
      title?: string;
      content: Record<string, unknown>;
      seo?: Record<string, unknown>;
      expected_version?: number;
      create_if_missing?: boolean;
      template_key?: string;
    },
  ) {
    await assertPermission(this.prisma, ctx, 'platform.cms.write');
    const site = this.assertCtxTenant(ctx, siteKey);
    const slug = normalizePlatformSlug(slugRaw);
    const result = await this.platform.savePageDraft(
      site.tenantId,
      site.storefrontId,
      slug,
      {
        ...input,
        template_key: input.template_key || (slug === 'home' ? 'gtm_home' : 'gtm_static'),
      },
      ctx.actorId,
    );
    const page = await this.prisma.db.page.findFirst({
      where: { tenantId: site.tenantId, storefrontId: site.storefrontId, slug },
    });
    if (page && page.status !== 'draft') {
      await this.prisma.db.page.update({
        where: { id: page.id },
        data: { status: 'draft' },
      });
    }
    await this.audit.write({
      tenantId: site.tenantId,
      actorId: ctx.actorId,
      action: 'platform_cms.page_save',
      entity: 'page',
      entityId: result.page_id,
      payload: { site_key: siteKey, slug },
    });
    return { ...result, site_key: siteKey, path: slug === 'home' ? '/' : `/${slug}` };
  }

  /**
   * draft → review (write) · review|draft → published (publish).
   * Editor without publish gets 403 on published (AC-P2).
   */
  async transition(
    ctx: RequestContext,
    siteKey: string,
    slugRaw: string,
    target: PlatformTransitionTarget,
    checklist?: Record<string, boolean> | null,
  ) {
    const site = this.assertCtxTenant(ctx, siteKey);
    const slug = normalizePlatformSlug(slugRaw);

    if (target === 'published') {
      await assertPermission(this.prisma, ctx, 'platform.cms.publish');
    } else if (target === 'review' || target === 'draft') {
      await assertPermission(this.prisma, ctx, 'platform.cms.write');
    } else {
      throw AppError.validation(`Invalid transition target: ${target}`);
    }

    const page = await this.prisma.db.page.findFirst({
      where: { tenantId: site.tenantId, storefrontId: site.storefrontId, slug },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!page) throw AppError.notFound('Page not found');
    const latest = page.versions[0];
    if (!latest) throw AppError.validation('Page has no versions');

    const from = latest.status;

    if (target === 'review') {
      if (from !== 'draft' && from !== 'review') {
        throw AppError.validation(`Cannot transition ${from} → review`);
      }
      await this.prisma.db.pageVersion.update({
        where: { id: latest.id },
        data: { status: 'review' },
      });
      await this.prisma.db.page.update({
        where: { id: page.id },
        data: { status: 'review' },
      });
    } else if (target === 'draft') {
      await this.prisma.db.pageVersion.update({
        where: { id: latest.id },
        data: { status: 'draft' },
      });
      await this.prisma.db.page.update({
        where: { id: page.id },
        data: { status: 'draft' },
      });
    } else {
      if (from !== 'draft' && from !== 'review' && from !== 'published') {
        throw AppError.validation(`Cannot transition ${from} → published`);
      }
      const raw = (latest.content as Record<string, unknown>) || {};
      const v1 = normalizeContent(raw);
      const issues = validateContentV1(v1);
      if (issues.length) {
        throw AppError.validation(
          `Cannot publish: ${issues.map((i) => `${i.path} ${i.message}`).join('; ')}`,
          { issues },
        );
      }
      if (checklist) {
        for (const k of ['seo_ok', 'cta_codes_ok', 'legal_ok'] as const) {
          if (!checklist[k]) {
            throw AppError.validation(`Publish checklist incomplete: ${k}`);
          }
        }
      }
      await this.prisma.db.pageVersion.updateMany({
        where: { pageId: page.id, status: 'published', id: { not: latest.id } },
        data: { status: 'archived' },
      });
      await this.prisma.db.pageVersion.update({
        where: { id: latest.id },
        data: { status: 'published' },
      });
      await this.prisma.db.page.update({
        where: { id: page.id },
        data: { status: 'published' },
      });
    }

    await this.audit.write({
      tenantId: site.tenantId,
      actorId: ctx.actorId,
      action: 'platform_cms.page_transition',
      entity: 'page',
      entityId: page.id,
      payload: {
        site_key: siteKey,
        slug,
        from,
        to: target,
        version: latest.version,
        checklist: checklist || null,
      },
    });

    return {
      site_key: siteKey,
      slug,
      path: slug === 'home' ? '/' : `/${slug}`,
      title: page.title,
      template_key: page.templateKey,
      status: target,
      version: latest.version,
      from,
      checklist: checklist || null,
    };
  }

  /** Public published page — filters expired announce_bar (AC-B9). */
  async getPublishedPage(siteKey: string, slugRaw: string) {
    const site = this.resolveSite(siteKey);
    const slug = normalizePlatformSlug(slugRaw);
    const page = await this.prisma.db.page.findFirst({
      where: { tenantId: site.tenantId, storefrontId: site.storefrontId, slug },
      include: {
        versions: { where: { status: 'published' }, orderBy: { version: 'desc' }, take: 1 },
      },
    });
    if (!page || !page.versions[0]) throw AppError.notFound('Page not found');
    const raw = (page.versions[0].content as Record<string, unknown>) || {};
    const contentV1 = filterExpiredAnnounceBars(normalizeContent(raw));
    return {
      site_key: siteKey,
      slug: page.slug,
      path: slug === 'home' ? '/' : `/${slug}`,
      title: page.title,
      template_key: page.templateKey,
      status: 'published',
      version: page.versions[0].version,
      schema_version: 1,
      content_v1: contentV1,
      content: toLegacyFlat(contentV1),
      seo: page.versions[0].seo ?? {},
      feature_platform_cms: featurePlatformCms(true),
    };
  }

  async createPreviewToken(ctx: RequestContext, siteKey: string, hours = 24) {
    await assertPermission(this.prisma, ctx, 'platform.cms.write');
    const site = this.assertCtxTenant(ctx, siteKey);
    const token = await this.platform.createPreviewToken(site.tenantId, site.storefrontId, hours);
    const corp =
      process.env.CORPORATE_PUBLIC_URL?.replace(/\/$/, '') || 'https://webecom.ngoinhahomnay.vn';
    return {
      ...token,
      preview_url: `${corp}/?preview=${encodeURIComponent(token.token)}`,
      site_key: siteKey,
    };
  }

  async getPreviewPage(siteKey: string, token: string, slugRaw: string) {
    const site = this.resolveSite(siteKey);
    await this.platform.resolvePreview(site.tenantId, token);
    const slug = normalizePlatformSlug(slugRaw);
    const draft = await this.platform.getPageDraft(site.tenantId, site.storefrontId, slug);
    const contentV1 = filterExpiredAnnounceBars(
      normalizeContent((draft.content_v1 as object) || draft.content || {}),
    );
    return {
      site_key: siteKey,
      slug,
      path: slug === 'home' ? '/' : `/${slug}`,
      title: draft.title,
      template_key: draft.template_key,
      status: 'preview',
      version: draft.version,
      schema_version: 1,
      content_v1: contentV1,
      content: toLegacyFlat(contentV1),
      seo: draft.seo ?? {},
      preview: true,
    };
  }

  listStarters() {
    return (['gtm_home', 'gtm_pricing', 'gtm_catalog'] as const).map((key) => {
      const s = getPlatformStarter(key);
      return { key, title: s?.title || key, section_order: s?.content.section_order || [] };
    });
  }

  getStarter(key: string) {
    const s = getPlatformStarter(key);
    if (!s) throw AppError.notFound('Starter not found');
    return { key, title: s.title, content: s.content };
  }
}

export type { PlatformTransitionTarget };
export { featurePlatformCms };
