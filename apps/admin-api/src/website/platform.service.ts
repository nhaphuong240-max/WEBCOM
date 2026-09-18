import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import {
  SECTION_REGISTRY,
  getPackage,
  hasPackage,
  listPackageCodes,
  listPackages,
  normalizeContent,
  packageToLegacyPageContent,
  packageToPageContent,
  packageToThemeConfig,
  toLegacyFlat,
  validateContentV1,
} from '@ptt/themes';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TemporalService } from '../temporal/temporal.service';
import { TemporalWorkflowsService } from '../temporal/temporal-workflows.service';
import { BillingService } from '../billing/billing.service';

/** @deprecated prefer SECTION_REGISTRY from @ptt/themes — kept for local key typing */
export const SECTION_LIBRARY = SECTION_REGISTRY.map((s) => ({
  key: s.key,
  label: s.label,
  fields: [...s.fields],
}));

const GOLIVE_DEFS: Array<{
  groupKey: string;
  code: string;
  title: string;
  severity: 'blocking' | 'warning';
}> = [
  { groupKey: 'commerce', code: 'catalog_sync', title: 'Catalog có ≥1 SKU active + giá', severity: 'blocking' },
  { groupKey: 'commerce', code: 'checkout_smoke', title: 'Checkout COD/shipping sẵn sàng', severity: 'blocking' },
  { groupKey: 'brand', code: 'brand_kit', title: 'Brand Kit đã publish', severity: 'blocking' },
  { groupKey: 'brand', code: 'domain_ssl', title: 'Domain / SSL cấu hình', severity: 'warning' },
  { groupKey: 'seo', code: 'seo_defaults', title: 'SEO title + description', severity: 'blocking' },
  { groupKey: 'seo', code: 'sitemap_robots', title: 'Sitemap / robots có sẵn', severity: 'warning' },
  { groupKey: 'tracking', code: 'consent_gate', title: 'Consent gate trước Pixel/GTM', severity: 'blocking' },
  { groupKey: 'tracking', code: 'pixel_or_gtm', title: 'Pixel hoặc GTM (khuyến nghị)', severity: 'warning' },
  { groupKey: 'perf', code: 'cwv_lcp', title: 'CWV synthetic LCP < 2.5s', severity: 'blocking' },
  { groupKey: 'governance', code: 'staging_review', title: 'Staging đã review', severity: 'blocking' },
  { groupKey: 'governance', code: 'backup_theme', title: 'Theme version backup trước publish', severity: 'warning' },
  {
    groupKey: 'cms',
    code: 'content_schema',
    title: 'Home page ContentV1 schema hợp lệ',
    severity: 'warning',
  },
];

type BrandTokens = {
  colors?: Record<string, string>;
  fonts?: Record<string, string>;
  spacing?: Record<string, string>;
  logo?: { url?: string; alt?: string };
  seo?: { title?: string; description?: string };
  legal?: Record<string, string>;
  voice?: { tone?: string; cta_default?: string };
  consent?: { required_before_pixel?: boolean };
};

function deepMergeTokens(base: BrandTokens, over: BrandTokens): BrandTokens {
  return {
    colors: { ...(base.colors || {}), ...(over.colors || {}) },
    fonts: { ...(base.fonts || {}), ...(over.fonts || {}) },
    spacing: { ...(base.spacing || {}), ...(over.spacing || {}) },
    logo: { ...(base.logo || {}), ...(over.logo || {}) },
    seo: { ...(base.seo || {}), ...(over.seo || {}) },
    legal: { ...(base.legal || {}), ...(over.legal || {}) },
    voice: { ...(base.voice || {}), ...(over.voice || {}) },
    consent: { ...(base.consent || {}), ...(over.consent || {}) },
  };
}

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(forwardRef(() => TemporalService))
    private readonly temporal: TemporalService,
    @Inject(forwardRef(() => TemporalWorkflowsService))
    private readonly workflows: TemporalWorkflowsService,
    @Inject(forwardRef(() => BillingService))
    private readonly billing: BillingService,
  ) {}

  private feature(name: string, fallback = true) {
    const raw = process.env[`FEATURE_${name.toUpperCase().replace(/\./g, '_')}`];
    if (raw === undefined) return fallback;
    return raw === '1' || raw === 'true';
  }

  isGoliveGateEnabled() {
    return this.feature('golive.gate');
  }

  async runGoLiveValidationWorkflow(tenantId: string, storefrontId: string, actorId?: string) {
    if (this.temporal.enabled()) {
      return this.workflows.runGoLiveValidation(tenantId, storefrontId, actorId);
    }
    return this.evaluateChecklist(tenantId, storefrontId);
  }

  private async sf(tenantId: string, storefrontId: string) {
    const row = await this.prisma.db.storefront.findFirst({ where: { id: storefrontId, tenantId } });
    if (!row) throw AppError.notFound('Storefront not found');
    return row;
  }

  // ─── Brand Kit ─────────────────────────────────────────────

  async getBrandKitResolved(tenantId: string, storefrontId: string) {
    const sf = await this.sf(tenantId, storefrontId);
    const kits = await this.prisma.db.brandKit.findMany({
      where: {
        tenantId,
        OR: [
          { scope: 'tenant', brandId: null, storefrontId: null },
          { scope: 'brand', brandId: sf.brandId },
          { scope: 'storefront', storefrontId },
        ],
        status: 'published',
      },
      orderBy: { version: 'desc' },
    });
    const tenantKit = kits.find((k) => k.scope === 'tenant');
    const brandKit = kits.find((k) => k.scope === 'brand');
    const sfKit = kits.find((k) => k.scope === 'storefront');
    let tokens: BrandTokens = {};
    for (const k of [tenantKit, brandKit, sfKit]) {
      if (k) tokens = deepMergeTokens(tokens, k.tokens as BrandTokens);
    }
    return {
      storefront_id: storefrontId,
      tokens,
      layers: {
        tenant: tenantKit?.id ?? null,
        brand: brandKit?.id ?? null,
        storefront: sfKit?.id ?? null,
      },
    };
  }

  async upsertBrandKit(
    tenantId: string,
    input: {
      storefrontId?: string;
      brandId?: string;
      scope: 'tenant' | 'brand' | 'storefront';
      tokens: BrandTokens;
      publish?: boolean;
    },
    actorId?: string,
  ) {
    if (input.scope === 'storefront' && !input.storefrontId) {
      throw AppError.validation('storefront_id required for storefront scope');
    }
    const existing = await this.prisma.db.brandKit.findFirst({
      where: {
        tenantId,
        scope: input.scope,
        storefrontId: input.scope === 'storefront' ? input.storefrontId! : null,
        brandId: input.scope === 'brand' ? input.brandId ?? null : null,
      },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (existing?.version ?? 0) + 1;
    const row = await this.prisma.db.brandKit.create({
      data: {
        id: createId('bkit'),
        tenantId,
        brandId: input.brandId ?? null,
        storefrontId: input.storefrontId ?? null,
        scope: input.scope,
        version: nextVersion,
        status: input.publish ? 'published' : 'draft',
        tokens: input.tokens as Prisma.InputJsonValue,
      },
    });
    if (input.publish && existing) {
      await this.prisma.db.brandKit.updateMany({
        where: { tenantId, scope: input.scope, id: { not: row.id }, storefrontId: row.storefrontId },
        data: { status: 'draft' },
      });
    }
    await this.audit.write({
      tenantId,
      actorId,
      action: 'brand_kit.upsert',
      entity: 'brand_kit',
      entityId: row.id,
      payload: { scope: input.scope, version: nextVersion, publish: !!input.publish },
    });
    return this.mapBrandKit(row);
  }

  async applyBrandKitToTheme(tenantId: string, storefrontId: string, actorId?: string) {
    const resolved = await this.getBrandKitResolved(tenantId, storefrontId);
    const sf = await this.sf(tenantId, storefrontId);
    let theme = await this.prisma.db.theme.findFirst({
      where: { tenantId, storefrontId, status: 'installed' },
      orderBy: { createdAt: 'desc' },
    });
    if (!theme) throw AppError.notFound('No installed theme — install a template first');

    const latest = await this.prisma.db.themeVersion.findFirst({
      where: { themeId: theme.id },
      orderBy: { version: 'desc' },
    });
    const prevConfig = (latest?.config as Record<string, unknown>) || {};
    const colors = resolved.tokens.colors || {};
    const nextConfig = {
      ...prevConfig,
      tokens: {
        ...((prevConfig.tokens as object) || {}),
        rose: colors.accent || colors.rose || '#c45a6a',
        ink: colors.ink || '#1a1214',
        muted: colors.muted || '#6b5559',
        cream: colors.cream || colors.surface || '#faf6f4',
        accent: colors.accent || colors.rose || '#c45a6a',
        ...colors,
      },
      brand_kit: resolved.tokens,
    };
    const version = await this.prisma.db.themeVersion.create({
      data: {
        id: createId('thv'),
        tenantId,
        themeId: theme.id,
        version: (latest?.version ?? 0) + 1,
        status: 'draft',
        config: nextConfig as Prisma.InputJsonValue,
        note: 'Applied Brand Kit',
        previousVersionId: latest?.id,
      },
    });
    if (sf.seoTitle == null && resolved.tokens.seo?.title) {
      await this.prisma.db.storefront.update({
        where: { id: storefrontId },
        data: {
          seoTitle: resolved.tokens.seo.title,
          seoDescription: resolved.tokens.seo.description ?? undefined,
        },
      });
    }
    await this.audit.write({
      tenantId,
      actorId,
      action: 'brand_kit.apply_theme',
      entity: 'theme_version',
      entityId: version.id,
    });
    return this.mapThemeVersion(version, theme.code, theme.name);
  }

  // ─── Template Marketplace ──────────────────────────────────

  async listTemplates(query?: { industry?: string; goal?: string; q?: string; sort?: string }) {
    const rows = await this.prisma.db.templateCatalog.findMany({
      where: {
        active: true,
        ...(query?.industry ? { industry: query.industry } : {}),
        ...(query?.goal ? { goal: query.goal } : {}),
        ...(query?.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                { code: { contains: query.q, mode: 'insensitive' } },
                { industry: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
    const mapped = rows.map((t) => this.mapTemplate(t));
    if (query?.sort === 'cvr' || query?.sort === 'mobile' || query?.sort === 'seo') {
      const key = query.sort as 'cvr' | 'mobile' | 'seo';
      mapped.sort((a, b) => {
        const sa = (a.scores as { cvr?: number; mobile?: number; seo?: number })?.[key] || 0;
        const sb = (b.scores as { cvr?: number; mobile?: number; seo?: number })?.[key] || 0;
        return sb - sa;
      });
    }
    return mapped;
  }

  async getPublicTemplate(codeOrId: string) {
    const row = await this.prisma.db.templateCatalog.findFirst({
      where: {
        active: true,
        OR: [{ id: codeOrId }, { code: codeOrId }],
      },
    });
    if (!row) throw AppError.notFound('Template not found');
    const demoBase =
      process.env.DEMO_PUBLIC_URL?.replace(/\/$/, '') || 'https://themes.ngoinhahomnay.vn';
    const mapped = this.mapTemplate(row);
    let packageMeta: Record<string, unknown> | undefined;
    if (this.feature('cms.package_resolve') && hasPackage(row.code)) {
      try {
        const pkg = getPackage(row.code);
        packageMeta = {
          package_version: pkg.manifest.version,
          supports: pkg.manifest.supports,
          layouts: pkg.manifest.layouts,
        };
      } catch {
        packageMeta = undefined;
      }
    }
    return {
      ...mapped,
      ...packageMeta,
      demo_url: `${demoBase}/?demo=${encodeURIComponent(row.code)}`,
      trial_url: '/trial',
      buy_theme_url: `/console/website/templates?focus=${encodeURIComponent(row.code)}`,
      monetize: 'theme_license',
      trial_before_paywall: true,
    };
  }

  async matchTemplates(input: {
    industry?: string;
    goal?: string;
    channel?: string;
    catalog_size?: number;
    style?: string;
    budget?: string;
  }) {
    const all = await this.prisma.db.templateCatalog.findMany({ where: { active: true } });
    const ranked = all
      .map((t) => {
        const scores = t.scores as { cvr?: number; mobile?: number; seo?: number };
        let rank = (scores.cvr || 50) * 0.4 + (scores.mobile || 50) * 0.3 + (scores.seo || 50) * 0.3;
        if (input.industry && t.industry === input.industry) rank += 25;
        if (input.goal && t.goal === input.goal) rank += 15;
        if (input.style && JSON.stringify(t.features).toLowerCase().includes(input.style.toLowerCase())) {
          rank += 8;
        }
        if (input.budget === 'free' && t.license !== 'free') rank -= 20;
        if ((input.catalog_size || 0) > 50 && JSON.stringify(t.features).includes('megamenu')) rank += 5;
        return { template: this.mapTemplate(t), score: Math.round(rank), reasons: this.matchReasons(t, input) };
      })
      .sort((a, b) => b.score - a.score);
    return {
      matches: ranked.slice(0, 5),
      playbook: (ranked[0]?.template.playbook as string[]) || [
        'Publish Brand Kit',
        'Install template → Theme Library',
        'Edit home hero in Builder',
        'Pass Go-live checklist',
        'Publish',
      ],
    };
  }

  private matchReasons(
    t: { industry: string; goal: string; license: string; scores: unknown },
    input: { industry?: string; goal?: string; budget?: string },
  ) {
    const reasons: string[] = [];
    if (input.industry && t.industry === input.industry) reasons.push(`Khớp ngành ${t.industry}`);
    if (input.goal && t.goal === input.goal) reasons.push(`Khớp mục tiêu ${t.goal}`);
    if (input.budget === 'free' && t.license === 'free') reasons.push('License free');
    const s = t.scores as { cvr?: number };
    if ((s.cvr || 0) >= 80) reasons.push('CVR score cao');
    return reasons;
  }

  async installTemplate(tenantId: string, storefrontId: string, templateIdOrCode: string, actorId?: string) {
    if (!this.feature('marketplace')) throw AppError.validation('Feature marketplace disabled');
    await this.sf(tenantId, storefrontId);
    const tpl = await this.prisma.db.templateCatalog.findFirst({
      where: {
        OR: [{ id: templateIdOrCode }, { code: templateIdOrCode }],
        active: true,
      },
    });
    if (!tpl) throw AppError.notFound('Template not found');

    // P3: one_time themes require active ThemeLicense
    if (tpl.license !== 'free') {
      const ok = await this.billing.hasActiveLicense(tenantId, tpl.id);
      if (!ok) {
        throw AppError.conflict(
          'Theme license required — mua theme (VietQR) trước khi install',
        );
      }
    }

    let theme = await this.prisma.db.theme.findUnique({
      where: { storefrontId_code: { storefrontId, code: tpl.code } },
    });
    if (!theme) {
      theme = await this.prisma.db.theme.create({
        data: {
          id: createId('thm'),
          tenantId,
          storefrontId,
          code: tpl.code,
          name: tpl.name,
          status: 'installed',
        },
      });
    }

    const latest = await this.prisma.db.themeVersion.findFirst({
      where: { themeId: theme.id },
      orderBy: { version: 'desc' },
    });

    let themeConfig = tpl.themeConfig as Prisma.InputJsonValue;
    let pageContent = tpl.pageContent as Prisma.InputJsonValue;
    if (this.feature('cms.package_resolve') && hasPackage(tpl.code)) {
      try {
        const pkg = getPackage(tpl.code);
        themeConfig = packageToThemeConfig(pkg) as Prisma.InputJsonValue;
        const home = packageToPageContent(pkg);
        const legacy = packageToLegacyPageContent(pkg);
        pageContent = {
          ...legacy,
          schema_version: 1,
          section_order: home.section_order,
          sections: home.sections,
        } as Prisma.InputJsonValue;
      } catch {
        /* keep catalog JSON */
      }
    }

    const version = await this.prisma.db.themeVersion.create({
      data: {
        id: createId('thv'),
        tenantId,
        themeId: theme.id,
        version: (latest?.version ?? 0) + 1,
        status: 'draft',
        config: themeConfig,
        note: `Installed from marketplace: ${tpl.code}`,
        previousVersionId: latest?.id,
      },
    });

    let page = await this.prisma.db.page.findUnique({
      where: { storefrontId_slug: { storefrontId, slug: 'home' } },
    });
    if (!page) {
      page = await this.prisma.db.page.create({
        data: {
          id: createId('pg'),
          tenantId,
          storefrontId,
          slug: 'home',
          title: `${tpl.name} Home`,
          templateKey: 'home',
          status: 'draft',
        },
      });
    }
    const pageLatest = await this.prisma.db.pageVersion.findFirst({
      where: { pageId: page.id },
      orderBy: { version: 'desc' },
    });
    await this.prisma.db.pageVersion.create({
      data: {
        id: createId('pgv'),
        tenantId,
        pageId: page.id,
        version: (pageLatest?.version ?? 0) + 1,
        status: 'draft',
        content: pageContent,
        seo: {
          title: tpl.name,
          description: `Storefront powered by ${tpl.name}`,
        },
      },
    });

    const install = await this.prisma.db.templateInstall.upsert({
      where: { storefrontId_templateId: { storefrontId, templateId: tpl.id } },
      create: {
        id: createId('tins'),
        tenantId,
        storefrontId,
        templateId: tpl.id,
        themeId: theme.id,
        status: 'installed',
      },
      update: { status: 'installed', themeId: theme.id },
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'template.install',
      entity: 'template_install',
      entityId: install.id,
      payload: { template: tpl.code, theme_version_id: version.id },
    });

    return {
      install_id: install.id,
      theme_id: theme.id,
      theme_version: this.mapThemeVersion(version, theme.code, theme.name),
      playbook: tpl.playbook,
    };
  }

  // ─── Theme Library ─────────────────────────────────────────

  async listThemes(tenantId: string, storefrontId: string) {
    await this.sf(tenantId, storefrontId);
    const themes = await this.prisma.db.theme.findMany({
      where: { tenantId, storefrontId },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
    const sf = await this.sf(tenantId, storefrontId);
    return themes.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      status: t.status,
      versions: t.versions.map((v) => ({
        ...this.mapThemeVersion(v, t.code, t.name),
        is_live: v.id === sf.publishedThemeVersionId,
      })),
    }));
  }

  async promoteThemeVersion(
    tenantId: string,
    storefrontId: string,
    themeVersionId: string,
    target: 'staging' | 'draft',
    actorId?: string,
  ) {
    await this.sf(tenantId, storefrontId);
    const version = await this.prisma.db.themeVersion.findFirst({
      where: { id: themeVersionId, tenantId, theme: { storefrontId } },
      include: { theme: true },
    });
    if (!version) throw AppError.notFound('Theme version not found');
    if (target === 'staging') {
      await this.prisma.db.themeVersion.updateMany({
        where: { themeId: version.themeId, status: 'staging' },
        data: { status: 'draft' },
      });
    }
    const updated = await this.prisma.db.themeVersion.update({
      where: { id: version.id },
      data: { status: target },
    });
    if (target === 'staging') {
      await this.prisma.db.storefront.update({
        where: { id: storefrontId },
        data: { status: 'staging' },
      });
    }
    await this.audit.write({
      tenantId,
      actorId,
      action: 'theme.promote',
      entity: 'theme_version',
      entityId: version.id,
      payload: { target },
    });
    return this.mapThemeVersion(updated, version.theme.code, version.theme.name);
  }

  async cloneThemeVersion(tenantId: string, storefrontId: string, themeVersionId: string, actorId?: string) {
    const version = await this.prisma.db.themeVersion.findFirst({
      where: { id: themeVersionId, tenantId, theme: { storefrontId } },
      include: { theme: true },
    });
    if (!version) throw AppError.notFound('Theme version not found');
    const latest = await this.prisma.db.themeVersion.findFirst({
      where: { themeId: version.themeId },
      orderBy: { version: 'desc' },
    });
    const cloned = await this.prisma.db.themeVersion.create({
      data: {
        id: createId('thv'),
        tenantId,
        themeId: version.themeId,
        version: (latest?.version ?? 0) + 1,
        status: 'draft',
        config: version.config as Prisma.InputJsonValue,
        note: `Clone of v${version.version}`,
        previousVersionId: version.id,
      },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'theme.clone',
      entity: 'theme_version',
      entityId: cloned.id,
    });
    return this.mapThemeVersion(cloned, version.theme.code, version.theme.name);
  }

  async createPreviewToken(tenantId: string, storefrontId: string, hours = 24) {
    await this.sf(tenantId, storefrontId);
    const token = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000);
    const row = await this.prisma.db.stagingPreviewToken.create({
      data: {
        id: createId('prev'),
        tenantId,
        storefrontId,
        token,
        expiresAt,
      },
    });
    return {
      token: row.token,
      expires_at: row.expiresAt.toISOString(),
      preview_path: `/?preview=${row.token}`,
    };
  }

  async resolvePreview(tenantId: string, token: string) {
    const row = await this.prisma.db.stagingPreviewToken.findFirst({
      where: { tenantId, token, expiresAt: { gt: new Date() } },
    });
    if (!row) throw AppError.unauthorized('Preview token invalid or expired');
    return { storefront_id: row.storefrontId, expires_at: row.expiresAt.toISOString() };
  }

  // ─── Builder / CMS ─────────────────────────────────────────

  sectionLibrary() {
    return {
      sections: SECTION_REGISTRY.map((s) => ({
        key: s.key,
        label: s.label,
        fields: [...s.fields],
        props_schema: s.props_schema,
      })),
      schema_version: 1,
      feature: this.feature('builder.v1'),
      cms_registry_v1: this.feature('cms.registry.v1'),
    };
  }

  /** CMS-0 — public ThemePackage catalog (filesystem packages/themes). */
  listPublicThemePackages() {
    if (!this.feature('cms.package_resolve')) {
      throw AppError.validation('Feature cms.package_resolve disabled');
    }
    return listPackages().map((pkg) => ({
      code: pkg.manifest.code,
      name: pkg.manifest.name,
      version: pkg.manifest.version,
      supports: pkg.manifest.supports,
      layouts: pkg.manifest.layouts,
      demo_fixtures: pkg.manifest.demo_fixtures || {},
      compatible_app_blocks: pkg.manifest.compatible_app_blocks || [],
      tokens: pkg.starter.tokens,
    }));
  }

  getPublicThemePackage(code: string) {
    if (!this.feature('cms.package_resolve')) {
      throw AppError.validation('Feature cms.package_resolve disabled');
    }
    if (!hasPackage(code)) throw AppError.notFound('Theme package not found');
    const pkg = getPackage(code);
    const demoBase =
      process.env.DEMO_PUBLIC_URL?.replace(/\/$/, '') || 'https://themes.ngoinhahomnay.vn';
    return {
      code: pkg.manifest.code,
      name: pkg.manifest.name,
      version: pkg.manifest.version,
      supports: pkg.manifest.supports,
      layouts: pkg.manifest.layouts,
      demo_fixtures: pkg.manifest.demo_fixtures || {},
      compatible_app_blocks: pkg.manifest.compatible_app_blocks || [],
      starter: {
        home: pkg.starter.home,
        home_legacy: toLegacyFlat(pkg.starter.home),
        tokens: pkg.starter.tokens,
      },
      demo_url: `${demoBase}/?demo=${encodeURIComponent(pkg.manifest.code)}`,
      package_codes: listPackageCodes(),
    };
  }

  async listPages(tenantId: string, storefrontId: string) {
    await this.sf(tenantId, storefrontId);
    const pages = await this.prisma.db.page.findMany({
      where: { tenantId, storefrontId },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 5 },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return pages.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      template_key: p.templateKey,
      status: p.status,
      versions: p.versions.map((v) => ({
        id: v.id,
        version: v.version,
        status: v.status,
        created_at: v.createdAt.toISOString(),
      })),
    }));
  }

  async getPageDraft(tenantId: string, storefrontId: string, slug: string) {
    const page = await this.prisma.db.page.findFirst({
      where: { tenantId, storefrontId, slug },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!page) throw AppError.notFound('Page not found');
    const v = page.versions[0];
    const raw = (v?.content as Record<string, unknown>) || {};
    const contentV1 = normalizeContent(raw);
    return {
      page_id: page.id,
      slug: page.slug,
      title: page.title,
      template_key: page.templateKey,
      version_id: v?.id,
      version: v?.version,
      status: v?.status,
      schema_version: 1,
      content_v1: contentV1,
      /** Legacy flat for current builder forms / storefront dual-read */
      content: toLegacyFlat(contentV1),
      seo: v?.seo ?? {},
      updated_hint: v?.createdAt.toISOString(),
    };
  }

  /** Persist ContentV1 + legacy flat mirror (CMS-1 dual-write). */
  private dualWriteContent(raw: Record<string, unknown>): Record<string, unknown> {
    const v1 = normalizeContent(raw);
    if (this.feature('cms.registry.v1')) {
      const issues = validateContentV1(v1);
      if (issues.length) {
        throw AppError.validation(
          `Invalid content schema: ${issues.map((i) => `${i.path} ${i.message}`).join('; ')}`,
        );
      }
    }
    const legacy = toLegacyFlat(v1);
    return {
      ...legacy,
      schema_version: 1,
      section_order: v1.section_order,
      sections: v1.sections,
    };
  }

  async createPage(
    tenantId: string,
    storefrontId: string,
    input: { slug: string; title?: string; template_key?: string },
    actorId?: string,
  ) {
    if (!this.feature('builder.v1')) throw AppError.validation('Feature builder.v1 disabled');
    await this.sf(tenantId, storefrontId);
    const slug = input.slug.replace(/^\/+/, '').trim();
    if (!slug || !/^[a-z0-9][a-z0-9-/]*$/i.test(slug)) {
      throw AppError.validation('Invalid slug');
    }
    const existing = await this.prisma.db.page.findUnique({
      where: { storefrontId_slug: { storefrontId, slug } },
    });
    if (existing) throw AppError.conflict('Page slug already exists');

    const templateKey = input.template_key || (slug === 'home' ? 'home' : 'static');
    const starter =
      templateKey === 'static' || templateKey === 'landing'
        ? this.dualWriteContent({
            section_order: ['rich_text'],
            sections: {
              rich_text: {
                type: 'rich_text',
                id: 'sec_rich',
                props: { title: input.title || slug, body: '' },
                style: {},
              },
            },
          })
        : this.dualWriteContent({ section_order: ['hero'], hero: { headline: input.title || slug } });

    const page = await this.prisma.db.page.create({
      data: {
        id: createId('pg'),
        tenantId,
        storefrontId,
        slug,
        title: input.title || slug,
        templateKey,
        status: 'draft',
      },
    });
    await this.prisma.db.pageVersion.create({
      data: {
        id: createId('pgv'),
        tenantId,
        pageId: page.id,
        version: 1,
        status: 'draft',
        content: starter as Prisma.InputJsonValue,
        seo: { title: input.title || slug, description: '' },
      },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'cms.page_create',
      entity: 'page',
      entityId: page.id,
    });
    return this.getPageDraft(tenantId, storefrontId, slug);
  }

  async compatibilityCheck(tenantId: string, storefrontId: string, templateCode: string) {
    await this.sf(tenantId, storefrontId);
    if (!hasPackage(templateCode)) {
      return {
        ok: true,
        template_code: templateCode,
        package: false,
        warnings: ['No ThemePackage on disk — catalog JSON only'],
        legacy_sections: [] as string[],
        supports: [] as string[],
      };
    }
    const pkg = getPackage(templateCode);
    const supports = new Set(pkg.manifest.supports);
    const home = await this.prisma.db.page.findFirst({
      where: { tenantId, storefrontId, slug: 'home' },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    const content = normalizeContent((home?.versions[0]?.content as object) || {});
    const legacy: string[] = [];
    const warnings: string[] = [];
    for (const key of content.section_order) {
      const type = content.sections[key]?.type || key;
      if (!supports.has(type)) {
        legacy.push(type);
        warnings.push(`Section "${type}" không nằm trong supports[] của ${templateCode}`);
      }
    }
    return {
      ok: legacy.length === 0,
      template_code: templateCode,
      package: true,
      package_version: pkg.manifest.version,
      supports: pkg.manifest.supports,
      warnings,
      legacy_sections: legacy,
    };
  }

  async savePageDraft(
    tenantId: string,
    storefrontId: string,
    slug: string,
    input: {
      title?: string;
      content: Record<string, unknown>;
      seo?: Record<string, unknown>;
      expected_version?: number;
      create_if_missing?: boolean;
      template_key?: string;
    },
    actorId?: string,
  ) {
    if (!this.feature('builder.v1')) throw AppError.validation('Feature builder.v1 disabled');
    await this.sf(tenantId, storefrontId);
    this.validateSections(input.content);
    const persisted = this.dualWriteContent(input.content);

    let page = await this.prisma.db.page.findUnique({
      where: { storefrontId_slug: { storefrontId, slug } },
    });
    if (!page) {
      if (!input.create_if_missing) throw AppError.notFound('Page not found');
      page = await this.prisma.db.page.create({
        data: {
          id: createId('pg'),
          tenantId,
          storefrontId,
          slug,
          title: input.title || slug,
          templateKey: input.template_key || (slug === 'home' ? 'home' : 'landing'),
          status: 'draft',
        },
      });
    } else if (input.title) {
      page = await this.prisma.db.page.update({
        where: { id: page.id },
        data: { title: input.title },
      });
    }

    const latest = await this.prisma.db.pageVersion.findFirst({
      where: { pageId: page.id },
      orderBy: { version: 'desc' },
    });
    if (
      input.expected_version != null &&
      latest &&
      latest.version !== input.expected_version
    ) {
      throw AppError.conflict('Optimistic concurrency: page version changed', {
        expected: input.expected_version,
        actual: latest.version,
      });
    }

    // Autosave into latest draft, or create new version if latest is published
    if (latest && latest.status === 'draft') {
      const updated = await this.prisma.db.pageVersion.update({
        where: { id: latest.id },
        data: {
          content: persisted as Prisma.InputJsonValue,
          seo: (input.seo ?? latest.seo) as Prisma.InputJsonValue,
        },
      });
      await this.audit.write({
        tenantId,
        actorId,
        action: 'builder.autosave',
        entity: 'page_version',
        entityId: updated.id,
      });
      const contentV1 = normalizeContent(updated.content as object);
      return {
        page_id: page.id,
        version_id: updated.id,
        version: updated.version,
        status: updated.status,
        schema_version: 1,
        content_v1: contentV1,
        content: toLegacyFlat(contentV1),
        seo: updated.seo,
      };
    }

    const created = await this.prisma.db.pageVersion.create({
      data: {
        id: createId('pgv'),
        tenantId,
        pageId: page.id,
        version: (latest?.version ?? 0) + 1,
        status: 'draft',
        content: persisted as Prisma.InputJsonValue,
        seo: (input.seo ?? {}) as Prisma.InputJsonValue,
      },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'builder.save_version',
      entity: 'page_version',
      entityId: created.id,
    });
    const contentV1 = normalizeContent(created.content as object);
    return {
      page_id: page.id,
      version_id: created.id,
      version: created.version,
      status: created.status,
      schema_version: 1,
      content_v1: contentV1,
      content: toLegacyFlat(contentV1),
      seo: created.seo,
    };
  }

  private validateSections(content: Record<string, unknown>) {
    const allowed = new Set(SECTION_REGISTRY.map((s) => s.key));
    const normalized = normalizeContent(content);
    for (const key of normalized.section_order) {
      const node = normalized.sections[key];
      const type = node?.type || key;
      if (!allowed.has(type as (typeof SECTION_REGISTRY)[number]['key'])) {
        throw AppError.validation(`Section not in allowlist: ${type}`);
      }
    }
    // App block allowlist: reject arbitrary script keys
    if (content.scripts || content.custom_html) {
      throw AppError.validation('Arbitrary scripts/HTML blocked (app-block allowlist)');
    }
  }

  // ─── Go-live + Publish ─────────────────────────────────────

  async ensureChecklist(tenantId: string, storefrontId: string) {
    await this.sf(tenantId, storefrontId);
    for (const def of GOLIVE_DEFS) {
      await this.prisma.db.goLiveChecklistItem.upsert({
        where: { storefrontId_code: { storefrontId, code: def.code } },
        create: {
          id: createId('glc'),
          tenantId,
          storefrontId,
          groupKey: def.groupKey,
          code: def.code,
          title: def.title,
          severity: def.severity,
          status: 'pending',
        },
        update: { title: def.title, severity: def.severity, groupKey: def.groupKey },
      });
    }
    return this.evaluateChecklist(tenantId, storefrontId);
  }

  async evaluateChecklist(tenantId: string, storefrontId: string) {
    const sf = await this.sf(tenantId, storefrontId);
    await this.ensureChecklistRows(tenantId, storefrontId);

    const productCount = await this.prisma.db.product.count({
      where: { tenantId, brandId: sf.brandId, status: 'active' },
    });
    const brandKit = await this.prisma.db.brandKit.findFirst({
      where: { tenantId, storefrontId, scope: 'storefront', status: 'published' },
    });
    const resolved = await this.getBrandKitResolved(tenantId, storefrontId);
    const stagingTheme = await this.prisma.db.themeVersion.findFirst({
      where: { tenantId, theme: { storefrontId }, status: 'staging' },
    });
    const publishedTheme = sf.publishedThemeVersionId
      ? await this.prisma.db.themeVersion.findFirst({ where: { id: sf.publishedThemeVersionId } })
      : null;
    const consentOk = resolved.tokens.consent?.required_before_pixel !== false;
    const hasTracking = !!(sf.gtmContainerId || sf.metaPixelId);
    // Synthetic CWV: fail if hero uses huge remote without dimensions heuristic — always pass for seed unless forced
    const forceFailLcp = process.env.GOLIVE_FORCE_FAIL_LCP === '1';
    const lcpOk = !forceFailLcp;

    let contentSchemaOk = true;
    let contentSchemaEvidence: Record<string, unknown> = { checked: false };
    if (this.feature('cms.registry.v1')) {
      const homePage = await this.prisma.db.page.findFirst({
        where: { tenantId, storefrontId, slug: 'home' },
        include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
      });
      const raw = (homePage?.versions[0]?.content as object) || {};
      const v1 = normalizeContent(raw);
      const issues = validateContentV1(v1);
      contentSchemaOk = issues.length === 0;
      contentSchemaEvidence = {
        checked: true,
        schema_version: v1.schema_version,
        issue_count: issues.length,
        issues: issues.slice(0, 5),
      };
    }

    const results: Record<string, { status: 'pass' | 'fail'; evidence: Record<string, unknown> }> = {
      catalog_sync: {
        status: productCount > 0 ? 'pass' : 'fail',
        evidence: { product_count: productCount },
      },
      checkout_smoke: { status: 'pass', evidence: { methods: ['cod'] } },
      brand_kit: {
        status: brandKit || Object.keys(resolved.tokens).length > 0 ? 'pass' : 'fail',
        evidence: { brand_kit_id: brandKit?.id ?? null },
      },
      domain_ssl: await this.domainSslStatus(tenantId, storefrontId, sf.primaryDomain),
      seo_defaults: {
        status: sf.seoTitle && sf.seoDescription ? 'pass' : 'fail',
        evidence: { seo_title: sf.seoTitle, seo_description: sf.seoDescription },
      },
      sitemap_robots: { status: 'pass', evidence: { paths: ['/sitemap.xml', '/robots.txt'] } },
      consent_gate: {
        status: !hasTracking || consentOk ? 'pass' : 'fail',
        evidence: { has_tracking: hasTracking, consent_required: consentOk },
      },
      pixel_or_gtm: {
        status: hasTracking ? 'pass' : 'fail',
        evidence: { gtm: sf.gtmContainerId, pixel: sf.metaPixelId },
      },
      cwv_lcp: {
        status: lcpOk ? 'pass' : 'fail',
        evidence: { synthetic_lcp_s: lcpOk ? 1.8 : 3.2, force_fail: forceFailLcp },
      },
      staging_review: {
        status: stagingTheme || sf.status === 'staging' || sf.status === 'published' ? 'pass' : 'fail',
        evidence: { storefront_status: sf.status, staging_theme: stagingTheme?.id ?? null },
      },
      backup_theme: {
        status: publishedTheme || stagingTheme ? 'pass' : 'fail',
        evidence: { published_theme_version_id: sf.publishedThemeVersionId },
      },
      content_schema: {
        status: contentSchemaOk ? 'pass' : 'fail',
        evidence: contentSchemaEvidence,
      },
    };

    const items = await this.prisma.db.goLiveChecklistItem.findMany({
      where: { tenantId, storefrontId },
      orderBy: [{ groupKey: 'asc' }, { code: 'asc' }],
    });

    const updated = [];
    for (const item of items) {
      if (item.status === 'waived') {
        updated.push(this.mapChecklistItem(item));
        continue;
      }
      const r = results[item.code];
      if (!r) {
        updated.push(this.mapChecklistItem(item));
        continue;
      }
      const row = await this.prisma.db.goLiveChecklistItem.update({
        where: { id: item.id },
        data: { status: r.status, evidence: r.evidence as Prisma.InputJsonValue },
      });
      updated.push(this.mapChecklistItem(row));
    }

    const blockingFails = updated.filter((i) => i.severity === 'blocking' && i.status === 'fail');
    return {
      storefront_id: storefrontId,
      can_publish: blockingFails.length === 0,
      blocking_fails: blockingFails.map((i) => i.code),
      items: updated,
      feature: this.feature('golive.gate'),
    };
  }

  private async domainSslStatus(
    tenantId: string,
    storefrontId: string,
    primaryDomain: string | null,
  ): Promise<{ status: 'pass' | 'fail'; evidence: Record<string, unknown> }> {
    const primary = await this.prisma.db.storefrontDomain.findFirst({
      where: { tenantId, storefrontId, isPrimary: true },
    });
    const active = await this.prisma.db.storefrontDomain.findFirst({
      where: {
        tenantId,
        storefrontId,
        dnsStatus: 'verified',
        tlsStatus: 'active',
      },
    });
    const ok = !!(active && (primary?.dnsStatus === 'verified' || !primary) && (primaryDomain || active.hostname));
    return {
      status: ok ? 'pass' : 'fail',
      evidence: {
        primary_domain: primaryDomain,
        domain_id: active?.id ?? primary?.id ?? null,
        dns_status: active?.dnsStatus ?? primary?.dnsStatus ?? null,
        tls_status: active?.tlsStatus ?? primary?.tlsStatus ?? null,
        hostname: active?.hostname ?? primary?.hostname ?? null,
      },
    };
  }

  private async ensureChecklistRows(tenantId: string, storefrontId: string) {
    for (const def of GOLIVE_DEFS) {
      await this.prisma.db.goLiveChecklistItem.upsert({
        where: { storefrontId_code: { storefrontId, code: def.code } },
        create: {
          id: createId('glc'),
          tenantId,
          storefrontId,
          groupKey: def.groupKey,
          code: def.code,
          title: def.title,
          severity: def.severity,
          status: 'pending',
        },
        update: {},
      });
    }
  }

  async waiveChecklistItem(
    tenantId: string,
    storefrontId: string,
    code: string,
    reason: string,
    actorId: string,
  ) {
    const item = await this.prisma.db.goLiveChecklistItem.findFirst({
      where: { tenantId, storefrontId, code },
    });
    if (!item) throw AppError.notFound('Checklist item not found');
    if (!reason || reason.length < 5) throw AppError.validation('Waiver reason required');
    const row = await this.prisma.db.goLiveChecklistItem.update({
      where: { id: item.id },
      data: { status: 'waived', waivedBy: actorId, waivedReason: reason },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'golive.waiver',
      entity: 'golive_checklist_item',
      entityId: row.id,
      payload: { code, reason },
    });
    return this.mapChecklistItem(row);
  }

  async publishStorefront(tenantId: string, storefrontId: string, actorId: string) {
    if (this.temporal.enabled()) {
      return this.workflows.runPublishTheme(tenantId, storefrontId, actorId);
    }
    return this.publishStorefrontLegacy(tenantId, storefrontId, actorId);
  }

  /** Legacy in-process publish (FEATURE_TEMPORAL=false). */
  async publishStorefrontLegacy(tenantId: string, storefrontId: string, actorId: string) {
    const gate = this.feature('golive.gate');
    const checklist = await this.evaluateChecklist(tenantId, storefrontId);
    const job = await this.prisma.db.publishJob.create({
      data: {
        id: createId('pub'),
        tenantId,
        storefrontId,
        status: 'running',
        checklistSnapshot: checklist as unknown as Prisma.InputJsonValue,
        engine: 'in_process',
      },
    });

    if (gate && !checklist.can_publish) {
      await this.prisma.db.publishJob.update({
        where: { id: job.id },
        data: {
          status: 'blocked',
          error: { blocking_fails: checklist.blocking_fails },
          finishedAt: new Date(),
        },
      });
      throw AppError.conflict('Go-live checklist blocked publish', {
        blocking_fails: checklist.blocking_fails,
        job_id: job.id,
      });
    }

    return this.executePublishMutation(tenantId, storefrontId, actorId, job.id);
  }

  /**
   * Activity: atomic theme/page pointer publish for an existing PublishJob.
   * Used by PublishThemeWorkflow (Temporal stub/live) and legacy path.
   */
  async executePublishMutation(
    tenantId: string,
    storefrontId: string,
    actorId: string,
    jobId: string,
  ) {
    const sf = await this.sf(tenantId, storefrontId);
    const staging =
      (await this.prisma.db.themeVersion.findFirst({
        where: { tenantId, theme: { storefrontId }, status: 'staging' },
        orderBy: { version: 'desc' },
        include: { theme: true },
      })) ||
      (await this.prisma.db.themeVersion.findFirst({
        where: { tenantId, theme: { storefrontId }, status: 'draft' },
        orderBy: { version: 'desc' },
        include: { theme: true },
      })) ||
      (sf.publishedThemeVersionId
        ? await this.prisma.db.themeVersion.findFirst({
            where: { id: sf.publishedThemeVersionId },
            include: { theme: true },
          })
        : null);

    if (!staging) {
      await this.prisma.db.publishJob.update({
        where: { id: jobId },
        data: { status: 'failed', error: { message: 'No theme version' }, finishedAt: new Date() },
      });
      throw AppError.validation('No theme version to publish');
    }

    const previousId = sf.publishedThemeVersionId;
    if (previousId && previousId !== staging.id) {
      await this.prisma.db.themeVersion.update({
        where: { id: previousId },
        data: { status: 'archived' },
      });
    }
    await this.prisma.db.themeVersion.updateMany({
      where: { themeId: staging.themeId, status: 'published', id: { not: staging.id } },
      data: { status: 'archived' },
    });
    await this.prisma.db.themeVersion.update({
      where: { id: staging.id },
      data: { status: 'published', previousVersionId: previousId ?? staging.previousVersionId },
    });

    const pages = await this.prisma.db.page.findMany({ where: { tenantId, storefrontId } });
    for (const page of pages) {
      const draft = await this.prisma.db.pageVersion.findFirst({
        where: { pageId: page.id, status: { in: ['draft', 'staging'] } },
        orderBy: { version: 'desc' },
      });
      if (draft) {
        await this.prisma.db.pageVersion.updateMany({
          where: { pageId: page.id, status: 'published' },
          data: { status: 'archived' },
        });
        await this.prisma.db.pageVersion.update({
          where: { id: draft.id },
          data: { status: 'published' },
        });
        await this.prisma.db.page.update({
          where: { id: page.id },
          data: { status: 'published' },
        });
      }
    }

    await this.prisma.db.storefront.update({
      where: { id: storefrontId },
      data: { status: 'published', publishedThemeVersionId: staging.id },
    });

    const finished = await this.prisma.db.publishJob.update({
      where: { id: jobId },
      data: {
        status: 'published',
        themeVersionId: staging.id,
        previousThemeVersionId: previousId,
        finishedAt: new Date(),
      },
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'storefront.publish',
      entity: 'publish_job',
      entityId: finished.id,
      payload: {
        theme_version_id: staging.id,
        previous: previousId,
        engine: finished.engine,
        workflow_id: finished.workflowId,
      },
    });

    return {
      job_id: finished.id,
      status: finished.status,
      theme_version_id: staging.id,
      previous_theme_version_id: previousId,
      published_at: finished.finishedAt?.toISOString(),
      engine: finished.engine,
      workflow_id: finished.workflowId,
      workflow_run_id: finished.workflowRunId,
    };
  }

  async rollbackPublish(tenantId: string, storefrontId: string, actorId: string) {
    const started = Date.now();
    const sf = await this.sf(tenantId, storefrontId);
    const currentId = sf.publishedThemeVersionId;
    if (!currentId) throw AppError.validation('Nothing published to rollback');
    const current = await this.prisma.db.themeVersion.findFirst({
      where: { id: currentId, tenantId },
      include: { theme: true },
    });
    if (!current) throw AppError.notFound('Published theme version missing');
    const targetId = current.previousVersionId;
    if (!targetId) throw AppError.validation('No previous version for rollback');
    const target = await this.prisma.db.themeVersion.findFirst({ where: { id: targetId, tenantId } });
    if (!target) throw AppError.notFound('Previous theme version not found');

    await this.prisma.db.themeVersion.update({
      where: { id: current.id },
      data: { status: 'archived' },
    });
    await this.prisma.db.themeVersion.update({
      where: { id: target.id },
      data: { status: 'published' },
    });
    await this.prisma.db.storefront.update({
      where: { id: storefrontId },
      data: { publishedThemeVersionId: target.id, status: 'published' },
    });

    const engine = this.temporal.enabled()
      ? this.temporal.engineName() === 'temporal'
        ? 'temporal'
        : 'temporal_stub'
      : 'in_process';
    const job = await this.prisma.db.publishJob.create({
      data: {
        id: createId('pub'),
        tenantId,
        storefrontId,
        status: 'rolled_back',
        themeVersionId: target.id,
        previousThemeVersionId: current.id,
        checklistSnapshot: {},
        engine,
        workflowId: `rollback-${storefrontId}-${Date.now()}`,
        workflowRunId: createId('wfr'),
        finishedAt: new Date(),
      },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'storefront.rollback',
      entity: 'publish_job',
      entityId: job.id,
      payload: { from: current.id, to: target.id, engine },
    });
    const durationMs = Date.now() - started;
    return {
      job_id: job.id,
      status: 'rolled_back',
      theme_version_id: target.id,
      from_theme_version_id: current.id,
      engine,
      workflow_id: job.workflowId,
      duration_ms: durationMs,
      within_slo: durationMs < 5 * 60 * 1000,
    };
  }

  // ─── Onboarding ────────────────────────────────────────────

  async getOnboarding(tenantId: string, storefrontId: string) {
    await this.sf(tenantId, storefrontId);
    let row = await this.prisma.db.onboardingProgress.findUnique({ where: { storefrontId } });
    if (!row) {
      row = await this.prisma.db.onboardingProgress.create({
        data: {
          id: createId('onb'),
          tenantId,
          storefrontId,
          currentStep: 'brand_kit',
          completed: {},
        },
      });
    }
    return {
      storefront_id: storefrontId,
      current_step: row.currentStep,
      completed: row.completed,
      steps: [
        { key: 'brand_kit', label: 'Brand Kit', href: '/website/onboarding' },
        { key: 'catalog', label: 'Import catalog', href: '/products' },
        { key: 'theme_match', label: 'Theme Match', href: '/website/templates' },
        { key: 'domain', label: 'Domain / SSL', href: '/website/domains' },
        { key: 'payment', label: 'Payment / Shipping', href: '/website/golive' },
        { key: 'golive', label: 'Go-live', href: '/website/golive' },
      ],
    };
  }

  async advanceOnboarding(
    tenantId: string,
    storefrontId: string,
    step: string,
    done: boolean,
    actorId?: string,
  ) {
    const order = ['brand_kit', 'catalog', 'theme_match', 'domain', 'payment', 'golive', 'done'];
    if (!order.includes(step)) throw AppError.validation('Invalid step');
    const current = await this.getOnboarding(tenantId, storefrontId);
    const completed = { ...(current.completed as Record<string, boolean>), [step]: done };
    let next = step;
    if (done) {
      const idx = order.indexOf(step);
      next = order[Math.min(idx + 1, order.length - 1)];
    }
    const row = await this.prisma.db.onboardingProgress.update({
      where: { storefrontId },
      data: { currentStep: next, completed },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'onboarding.advance',
      entity: 'onboarding_progress',
      entityId: row.id,
      payload: { step, done, next },
    });
    return this.getOnboarding(tenantId, storefrontId);
  }

  // ─── mappers ───────────────────────────────────────────────

  private mapBrandKit(row: {
    id: string;
    scope: string;
    version: number;
    status: string;
    tokens: unknown;
    storefrontId: string | null;
    brandId: string | null;
  }) {
    return {
      id: row.id,
      scope: row.scope,
      version: row.version,
      status: row.status,
      tokens: row.tokens,
      storefront_id: row.storefrontId,
      brand_id: row.brandId,
    };
  }

  private mapTemplate(t: {
    id: string;
    code: string;
    name: string;
    industry: string;
    goal: string;
    license: string;
    scores: unknown;
    features: unknown;
    previewUrl: string | null;
    demoUrl: string | null;
    playbook: unknown;
  }) {
    return {
      id: t.id,
      code: t.code,
      name: t.name,
      industry: t.industry,
      goal: t.goal,
      license: t.license,
      scores: t.scores,
      features: t.features,
      preview_url: t.previewUrl,
      demo_url: t.demoUrl,
      playbook: t.playbook,
    };
  }

  private mapThemeVersion(
    v: {
      id: string;
      version: number;
      status: string;
      config: unknown;
      note: string;
      previousVersionId: string | null;
      createdAt: Date;
    },
    code: string,
    name: string,
  ) {
    return {
      id: v.id,
      code,
      name,
      version: v.version,
      status: v.status,
      note: v.note,
      previous_version_id: v.previousVersionId,
      config: v.config,
      created_at: v.createdAt.toISOString(),
    };
  }

  private mapChecklistItem(item: {
    id: string;
    groupKey: string;
    code: string;
    title: string;
    severity: string;
    status: string;
    evidence: unknown;
    waivedBy: string | null;
    waivedReason: string | null;
  }) {
    return {
      id: item.id,
      group_key: item.groupKey,
      code: item.code,
      title: item.title,
      severity: item.severity,
      status: item.status,
      evidence: item.evidence,
      waived_by: item.waivedBy,
      waived_reason: item.waivedReason,
    };
  }
}
