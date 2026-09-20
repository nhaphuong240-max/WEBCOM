import { Injectable } from '@nestjs/common';
import { AppError, type RequestContext } from '@ptt/shared-kernel';
import {
  assertCasePublishReady,
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

/** Seed bootstrap / fallback when PlatformSite row missing (PC2-10). */
export const PLATFORM_SITES_FALLBACK: Record<
  string,
  {
    id: string;
    tenantId: string;
    storefrontId: string;
    name: string;
    primaryHost: string;
    status: 'draft' | 'live';
    locale: string;
  }
> = {
  webcom_apex: {
    id: 'psite_webcom_apex',
    tenantId: 'ten_platform',
    storefrontId: 'sf_platform_webcom',
    name: 'WebCom Platform',
    primaryHost: 'webecom.ngoinhahomnay.vn',
    status: 'live',
    locale: 'vi',
  },
  webcom_staging: {
    id: 'psite_webcom_staging',
    tenantId: 'ten_platform',
    storefrontId: 'sf_platform_webcom',
    name: 'WebCom Platform (staging)',
    primaryHost: 'staging-webecom.ngoinhahomnay.vn',
    status: 'draft',
    locale: 'vi',
  },
  webcom_en: {
    id: 'psite_webcom_en',
    tenantId: 'ten_platform',
    storefrontId: 'sf_platform_webcom_en',
    name: 'WebCom Platform (EN)',
    primaryHost: 'en.webecom.ngoinhahomnay.vn',
    status: 'live',
    locale: 'en',
  },
};

/** @deprecated use PLATFORM_SITES_FALLBACK — kept for import compatibility */
export const PLATFORM_SITES = PLATFORM_SITES_FALLBACK;

export type ResolvedPlatformSite = {
  siteKey: string;
  id: string;
  tenantId: string;
  storefrontId: string;
  name: string;
  primaryHost: string;
  status: string;
  locale: string;
  ownerType: 'platform';
  ownerId: string;
};

type PlatformTransitionTarget = 'draft' | 'review' | 'published';

function featurePlatformCms(fallback = true): boolean {
  const raw = process.env.FEATURE_PLATFORM_CMS;
  if (raw === undefined) return fallback;
  return raw === '1' || raw === 'true';
}

function featureCmsPageAb(fallback = true): boolean {
  const raw = process.env.FEATURE_CMS_PAGE_AB;
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

  /** Resolve PlatformSite from DB (PC2-10), fallback to code registry. */
  async resolveSiteAsync(siteKey: string): Promise<ResolvedPlatformSite> {
    const row = await this.prisma.db.platformSite.findUnique({ where: { siteKey } });
    if (row) {
      const fb = PLATFORM_SITES_FALLBACK[siteKey];
      const storefrontId = row.interimStorefrontId || fb?.storefrontId || 'sf_platform_webcom';
      return {
        siteKey,
        id: row.id,
        tenantId: row.tenantId,
        storefrontId,
        name: row.name,
        primaryHost: row.primaryHost,
        status: row.status,
        locale: row.defaultLocale || 'vi',
        ownerType: 'platform',
        ownerId: row.id,
      };
    }
    const fb = PLATFORM_SITES_FALLBACK[siteKey];
    if (!fb) throw AppError.notFound(`Unknown platform site_key: ${siteKey}`);
    return {
      siteKey,
      id: fb.id,
      tenantId: fb.tenantId,
      storefrontId: fb.storefrontId,
      name: fb.name,
      primaryHost: fb.primaryHost,
      status: fb.status,
      locale: fb.locale,
      ownerType: 'platform',
      ownerId: fb.id,
    };
  }

  /** Sync resolve for legacy callers — prefer resolveSiteAsync. */
  resolveSite(siteKey: string): ResolvedPlatformSite {
    const fb = PLATFORM_SITES_FALLBACK[siteKey];
    if (!fb) throw AppError.notFound(`Unknown platform site_key: ${siteKey}`);
    return {
      siteKey,
      id: fb.id,
      tenantId: fb.tenantId,
      storefrontId: fb.storefrontId,
      name: fb.name,
      primaryHost: fb.primaryHost,
      status: fb.status,
      locale: fb.locale,
      ownerType: 'platform',
      ownerId: fb.id,
    };
  }

  async listSites() {
    const rows = await this.prisma.db.platformSite.findMany({ orderBy: { siteKey: 'asc' } });
    if (rows.length) {
      return rows.map((r) => ({
        site_key: r.siteKey,
        name: r.name,
        primary_host: r.primaryHost,
        status: r.status,
        tenant_id: r.tenantId,
        interim_storefront_id: r.interimStorefrontId,
        owner: 'platform_site',
        owner_id: r.id,
        locale: r.defaultLocale || 'vi',
      }));
    }
    return Object.entries(PLATFORM_SITES_FALLBACK).map(([site_key, s]) => ({
      site_key,
      name: s.name,
      primary_host: s.primaryHost,
      status: s.status,
      tenant_id: s.tenantId,
      interim_storefront_id: s.storefrontId,
      owner: 'platform_site_fallback',
      owner_id: s.id,
      locale: s.locale,
    }));
  }

  async listSitesForActor(ctx: RequestContext) {
    await assertPermission(this.prisma, ctx, 'platform.cms.read');
    const all = await this.listSites();
    return all.filter((s) => s.tenant_id === ctx.tenantId);
  }

  async getSite(siteKey: string) {
    const s = await this.resolveSiteAsync(siteKey);
    return {
      site_key: siteKey,
      name: s.name,
      primary_host: s.primaryHost,
      status: s.status,
      default_locale: s.locale,
      tenant_id: s.tenantId,
      interim_storefront_id: s.storefrontId,
      owner: 'platform_site',
      owner_id: s.ownerId,
      seo_defaults: {
        title_template: '%s · WebCom',
        og_image: null,
      },
    };
  }

  async getSiteForActor(ctx: RequestContext, siteKey: string) {
    await assertPermission(this.prisma, ctx, 'platform.cms.read');
    await this.assertCtxTenant(ctx, siteKey);
    return this.getSite(siteKey);
  }

  private async assertCtxTenant(ctx: RequestContext, siteKey: string) {
    const site = await this.resolveSiteAsync(siteKey);
    if (ctx.tenantId !== site.tenantId) {
      throw AppError.forbidden('Platform site belongs to a different tenant');
    }
    return site;
  }

  /** Ensure page rows carry platform owner (PC2-10). */
  private async tagPlatformOwner(site: ResolvedPlatformSite, slug: string) {
    await this.prisma.db.page.updateMany({
      where: { tenantId: site.tenantId, storefrontId: site.storefrontId, slug },
      data: { ownerType: 'platform', ownerId: site.ownerId },
    });
  }

  async listPages(ctx: RequestContext, siteKey: string) {
    await assertPermission(this.prisma, ctx, 'platform.cms.read');
    const site = await this.assertCtxTenant(ctx, siteKey);
    const pages = await this.platform.listPages(site.tenantId, site.storefrontId);
    return (pages as Array<Record<string, unknown>>).map((p) => ({
      ...p,
      owner_type: 'platform',
      owner_id: site.ownerId,
    }));
  }

  async getPageDraft(ctx: RequestContext, siteKey: string, slugRaw: string) {
    await assertPermission(this.prisma, ctx, 'platform.cms.read');
    const site = await this.assertCtxTenant(ctx, siteKey);
    const slug = normalizePlatformSlug(slugRaw);
    const draft = await this.platform.getPageDraft(site.tenantId, site.storefrontId, slug);
    const page = await this.prisma.db.page.findFirst({
      where: { tenantId: site.tenantId, storefrontId: site.storefrontId, slug },
      include: {
        versions: { orderBy: { version: 'desc' }, select: { version: true, status: true } },
      },
    });
    return {
      ...draft,
      site_key: siteKey,
      path: slug === 'home' ? '/' : `/${slug}`,
      owner_type: 'platform',
      owner_id: site.ownerId,
      versions: (page?.versions || []).map((v) => ({ version: v.version, status: v.status })),
    };
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
      experiment_code?: string | null;
    },
  ) {
    await assertPermission(this.prisma, ctx, 'platform.cms.write');
    const site = await this.assertCtxTenant(ctx, siteKey);
    const slug = normalizePlatformSlug(slugRaw);
    const result = await this.platform.savePageDraft(
      site.tenantId,
      site.storefrontId,
      slug,
      {
        ...input,
        template_key: input.template_key || (slug === 'home' ? 'gtm_home' : 'gtm_static'),
        experiment_code: featureCmsPageAb() ? input.experiment_code : undefined,
      },
      ctx.actorId,
    );
    await this.tagPlatformOwner(site, slug);
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
      payload: { site_key: siteKey, slug, owner_id: site.ownerId },
    });
    return {
      ...result,
      site_key: siteKey,
      path: slug === 'home' ? '/' : `/${slug}`,
      owner_type: 'platform',
      owner_id: site.ownerId,
    };
  }

  /**
   * draft → review (write) · review|draft → published (publish).
   * Optional publish_at (ISO) → status scheduled until due (PC3-5).
   * Editor without publish gets 403 on published (AC-P2).
   */
  async transition(
    ctx: RequestContext,
    siteKey: string,
    slugRaw: string,
    target: PlatformTransitionTarget,
    checklist?: Record<string, boolean> | null,
    publishAt?: string | null,
  ) {
    const site = await this.assertCtxTenant(ctx, siteKey);
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
      if (from !== 'draft' && from !== 'review' && from !== 'published' && from !== 'scheduled') {
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
      const caseGate = assertCasePublishReady(v1, {
        templateKey: page.templateKey,
        slug: page.slug,
      });
      if (caseGate) {
        throw AppError.validation(caseGate, { code: 'CASE_KPI_GATE' });
      }
      if (checklist) {
        for (const k of ['seo_ok', 'cta_codes_ok', 'legal_ok'] as const) {
          if (!checklist[k]) {
            throw AppError.validation(`Publish checklist incomplete: ${k}`);
          }
        }
      }

      const when = publishAt ? new Date(publishAt) : null;
      if (when && Number.isNaN(when.getTime())) {
        throw AppError.validation('Invalid publish_at');
      }
      const scheduleFuture = when && when.getTime() > Date.now() + 5_000;

      if (scheduleFuture) {
        const seo = {
          ...((latest.seo as Record<string, unknown>) || {}),
          publish_at: when!.toISOString(),
        };
        await this.prisma.db.pageVersion.update({
          where: { id: latest.id },
          data: { status: 'scheduled', seo },
        });
        await this.prisma.db.page.update({
          where: { id: page.id },
          data: { status: 'scheduled' },
        });
        await this.audit.write({
          tenantId: site.tenantId,
          actorId: ctx.actorId,
          action: 'platform_cms.page_scheduled',
          entity: 'page',
          entityId: page.id,
          payload: { site_key: siteKey, slug, publish_at: when!.toISOString(), version: latest.version },
        });
        return {
          site_key: siteKey,
          slug,
          path: slug === 'home' ? '/' : `/${slug}`,
          title: page.title,
          template_key: page.templateKey,
          status: 'scheduled',
          version: latest.version,
          from,
          publish_at: when!.toISOString(),
          checklist: checklist || null,
        };
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
      await this.triggerCorporateRevalidate(siteKey, slug);
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

  /** Public published page — filters expired announce_bar (AC-B9); auto-flush due schedules. */
  async getPublishedPage(siteKey: string, slugRaw: string) {
    const site = await this.resolveSiteAsync(siteKey);
    const slug = normalizePlatformSlug(slugRaw);
    let page = await this.prisma.db.page.findFirst({
      where: { tenantId: site.tenantId, storefrontId: site.storefrontId, slug },
      include: {
        versions: { where: { status: 'published' }, orderBy: { version: 'desc' }, take: 1 },
      },
    });
    if (!page?.versions[0]) {
      const scheduled = await this.prisma.db.page.findFirst({
        where: { tenantId: site.tenantId, storefrontId: site.storefrontId, slug },
        include: {
          versions: { where: { status: 'scheduled' }, orderBy: { version: 'desc' }, take: 1 },
        },
      });
      if (scheduled?.versions[0]) {
        const seo = (scheduled.versions[0].seo as Record<string, unknown>) || {};
        const at = seo.publish_at ? new Date(String(seo.publish_at)) : null;
        if (at && !Number.isNaN(at.getTime()) && at.getTime() <= Date.now()) {
          await this.prisma.db.pageVersion.updateMany({
            where: { pageId: scheduled.id, status: 'published', id: { not: scheduled.versions[0].id } },
            data: { status: 'archived' },
          });
          await this.prisma.db.pageVersion.update({
            where: { id: scheduled.versions[0].id },
            data: { status: 'published' },
          });
          await this.prisma.db.page.update({
            where: { id: scheduled.id },
            data: { status: 'published' },
          });
          page = await this.prisma.db.page.findFirst({
            where: { id: scheduled.id },
            include: {
              versions: { where: { status: 'published' }, orderBy: { version: 'desc' }, take: 1 },
            },
          });
        }
      }
    }
    if (!page || !page.versions[0]) throw AppError.notFound('Page not found');
    const raw = (page.versions[0].content as Record<string, unknown>) || {};
    const contentV1 = filterExpiredAnnounceBars(normalizeContent(raw));
    let experiment: Record<string, unknown> | null = null;
    if (featureCmsPageAb() && page.experimentCode) {
      const exp = await this.prisma.db.experiment.findFirst({
        where: {
          tenantId: site.tenantId,
          storefrontId: site.storefrontId,
          code: page.experimentCode,
          status: 'running',
        },
      });
      if (exp) {
        experiment = {
          code: exp.code,
          status: exp.status,
          variants: exp.variants,
        };
      }
    }
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
      experiment_code: page.experimentCode || null,
      experiment,
      owner_type: 'platform',
      owner_id: site.ownerId,
      interim_storefront_id: site.storefrontId,
      feature_platform_cms: featurePlatformCms(true),
      locale: site.locale || 'vi',
    };
  }

  async createPreviewToken(ctx: RequestContext, siteKey: string, hours = 24) {
    await assertPermission(this.prisma, ctx, 'platform.cms.write');
    const site = await this.assertCtxTenant(ctx, siteKey);
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
    const site = await this.resolveSiteAsync(siteKey);
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
    return (
      [
        'gtm_home',
        'gtm_pricing',
        'gtm_catalog',
        'gtm_solution',
        'gtm_industry',
        'gtm_case',
        'gtm_resources',
        'gtm_resource_detail',
        'gtm_tour',
      ] as const
    ).map((key) => {
      const s = getPlatformStarter(key);
      return { key, title: s?.title || key, section_order: s?.content.section_order || [] };
    });
  }

  getStarter(key: string) {
    const s = getPlatformStarter(key);
    if (!s) throw AppError.notFound('Starter not found');
    return { key, title: s.title, content: s.content };
  }

  /** PC3-5 — promote due scheduled versions to published. */
  async flushScheduled(ctx: RequestContext, siteKey: string) {
    await assertPermission(this.prisma, ctx, 'platform.cms.publish');
    const site = await this.assertCtxTenant(ctx, siteKey);
    const rows = await this.prisma.db.pageVersion.findMany({
      where: { tenantId: site.tenantId, status: 'scheduled' },
      include: { page: true },
      orderBy: { version: 'desc' },
    });
    const now = Date.now();
    const flushed: Array<{ slug: string; version: number }> = [];
    for (const v of rows) {
      if (v.page.storefrontId !== site.storefrontId) continue;
      const seo = (v.seo as Record<string, unknown>) || {};
      const at = seo.publish_at ? new Date(String(seo.publish_at)) : null;
      if (!at || Number.isNaN(at.getTime()) || at.getTime() > now) continue;
      await this.prisma.db.pageVersion.updateMany({
        where: { pageId: v.pageId, status: 'published', id: { not: v.id } },
        data: { status: 'archived' },
      });
      await this.prisma.db.pageVersion.update({
        where: { id: v.id },
        data: { status: 'published' },
      });
      await this.prisma.db.page.update({
        where: { id: v.pageId },
        data: { status: 'published' },
      });
      await this.triggerCorporateRevalidate(siteKey, v.page.slug);
      flushed.push({ slug: v.page.slug, version: v.version });
    }
    return { site_key: siteKey, flushed, count: flushed.length };
  }

  /** AC-P3 — republish archived/draft version N; archive current published. */
  async rollback(
    ctx: RequestContext,
    siteKey: string,
    slugRaw: string,
    version: number,
  ) {
    await assertPermission(this.prisma, ctx, 'platform.cms.publish');
    const site = await this.assertCtxTenant(ctx, siteKey);
    const slug = normalizePlatformSlug(slugRaw);
    const page = await this.prisma.db.page.findFirst({
      where: { tenantId: site.tenantId, storefrontId: site.storefrontId, slug },
    });
    if (!page) throw AppError.notFound('Page not found');
    const target = await this.prisma.db.pageVersion.findFirst({
      where: { pageId: page.id, version },
    });
    if (!target) throw AppError.notFound(`Version ${version} not found`);

    await this.prisma.db.pageVersion.updateMany({
      where: { pageId: page.id, status: 'published', id: { not: target.id } },
      data: { status: 'archived' },
    });
    await this.prisma.db.pageVersion.update({
      where: { id: target.id },
      data: { status: 'published' },
    });
    await this.prisma.db.page.update({
      where: { id: page.id },
      data: { status: 'published' },
    });

    await this.audit.write({
      tenantId: site.tenantId,
      actorId: ctx.actorId,
      action: 'platform_cms.page_rollback',
      entity: 'page',
      entityId: page.id,
      payload: { site_key: siteKey, slug, version },
    });
    await this.triggerCorporateRevalidate(siteKey, slug);

    const contentV1 = normalizeContent((target.content as object) || {});
    return {
      site_key: siteKey,
      slug,
      status: 'published',
      version: target.version,
      content_hash: simpleHash(JSON.stringify(contentV1)),
      content_v1: contentV1,
    };
  }

  async listNav(ctx: RequestContext, siteKey: string) {
    await assertPermission(this.prisma, ctx, 'platform.cms.read');
    const site = await this.assertCtxTenant(ctx, siteKey);
    return this.platform.listNavigation(site.tenantId, site.storefrontId);
  }

  async upsertNav(
    ctx: RequestContext,
    siteKey: string,
    handle: string,
    items: Array<{ label: string; href: string }>,
  ) {
    await assertPermission(this.prisma, ctx, 'platform.cms.write');
    const site = await this.assertCtxTenant(ctx, siteKey);
    return this.platform.upsertNavigation(
      site.tenantId,
      site.storefrontId,
      handle,
      items,
      ctx.actorId,
    );
  }

  async getPublicNav(siteKey: string) {
    const site = await this.resolveSiteAsync(siteKey);
    const menus = await this.platform.listNavigation(site.tenantId, site.storefrontId);
    const out: Record<string, unknown> = { site_key: siteKey };
    for (const m of menus as Array<{ handle: string; items: unknown }>) {
      out[m.handle] = m.items;
    }
    return out;
  }

  /** Fire-and-forget Next on-demand revalidate (AC-P1). */
  private async triggerCorporateRevalidate(siteKey: string, slug: string) {
    const url =
      process.env.CORPORATE_REVALIDATE_URL?.replace(/\/$/, '') ||
      process.env.CORPORATE_PUBLIC_URL?.replace(/\/$/, '');
    const secret = process.env.CORPORATE_REVALIDATE_SECRET || '';
    if (!url) return;
    const path = slug === 'home' ? '/' : `/${slug}`;
    const endpoint = url.includes('/api/revalidate')
      ? url
      : `${url}/api/revalidate`;
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(secret ? { 'x-revalidate-secret': secret } : {}),
        },
        body: JSON.stringify({
          site_key: siteKey,
          paths: [path, '/'],
          tags: [`platform:${siteKey}`, `platform:${siteKey}:${slug}`],
        }),
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[platform-cms] revalidate failed', err);
    }
  }
}

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `h${(h >>> 0).toString(16)}`;
}

export type { PlatformTransitionTarget };
export { featurePlatformCms };
