import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ShippingService } from '../shipping/shipping.service';

const AURA_LITE_CONFIG = {
  code: 'aura-commerce-lite',
  tokens: {
    rose: '#c45a6a',
    ink: '#1a1214',
    muted: '#6b5559',
    cream: '#faf6f4',
    accent: '#c45a6a',
  },
  sections: {
    home: ['hero', 'collections', 'featured', 'trust'],
    pdp: ['gallery', 'info', 'variants', 'trust', 'related'],
  },
  collections: [
    { slug: 'serum-dem', title: 'Serum đêm' },
    { slug: 'lam-sang', title: 'Làm sáng' },
    { slug: 'duong-am', title: 'Dưỡng ẩm' },
    { slug: 'chong-lao-hoa', title: 'Chống lão hóa' },
  ],
};

@Injectable()
export class WebsiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly shipping: ShippingService,
  ) {}

  async getRuntime(tenantId: string, storefrontIdOrSlug: string) {
    const sf = await this.prisma.db.storefront.findFirst({
      where: {
        tenantId,
        OR: [{ id: storefrontIdOrSlug }, { slug: storefrontIdOrSlug }],
      },
    });
    if (!sf) throw AppError.notFound('Storefront not found');

    let themeVersion = sf.publishedThemeVersionId
      ? await this.prisma.db.themeVersion.findFirst({
          where: { id: sf.publishedThemeVersionId, tenantId },
          include: { theme: true },
        })
      : null;

    if (!themeVersion) {
      themeVersion = await this.prisma.db.themeVersion.findFirst({
        where: { tenantId, theme: { storefrontId: sf.id }, status: 'published' },
        include: { theme: true },
        orderBy: { version: 'desc' },
      });
    }

    const menus = await this.prisma.db.navigationMenu.findMany({
      where: { tenantId, storefrontId: sf.id },
    });
    const home = await this.prisma.db.page.findFirst({
      where: { tenantId, storefrontId: sf.id, slug: 'home' },
      include: { versions: { where: { status: 'published' }, orderBy: { version: 'desc' }, take: 1 } },
    });

    return {
      storefront: {
        id: sf.id,
        name: sf.name,
        slug: sf.slug,
        status: sf.status,
        primary_domain: sf.primaryDomain,
        seo_title: sf.seoTitle,
        seo_description: sf.seoDescription,
        gtm_container_id: sf.gtmContainerId,
        meta_pixel_id: sf.metaPixelId,
      },
      theme: themeVersion
        ? {
            code: themeVersion.theme.code,
            name: themeVersion.theme.name,
            version: themeVersion.version,
            config: themeVersion.config,
          }
        : { code: 'aura-commerce-lite', name: 'Aura Commerce Lite', version: 0, config: AURA_LITE_CONFIG },
      navigation: Object.fromEntries(menus.map((m) => [m.handle, m.items])),
      home: home?.versions[0]
        ? {
            title: home.title,
            content: home.versions[0].content,
            seo: home.versions[0].seo,
            experiment_code: home.experimentCode,
          }
        : null,
    };
  }

  async getPublishedPage(tenantId: string, storefrontIdOrSlug: string, slug: string) {
    const sf = await this.prisma.db.storefront.findFirst({
      where: {
        tenantId,
        OR: [{ id: storefrontIdOrSlug }, { slug: storefrontIdOrSlug }],
      },
    });
    if (!sf) throw AppError.notFound('Storefront not found');
    const page = await this.prisma.db.page.findFirst({
      where: { tenantId, storefrontId: sf.id, slug },
      include: {
        versions: { where: { status: 'published' }, orderBy: { version: 'desc' }, take: 1 },
      },
    });
    if (!page || !page.versions[0]) throw AppError.notFound('Page not found');
    return {
      slug: page.slug,
      title: page.title,
      template_key: page.templateKey,
      experiment_code: page.experimentCode,
      content: page.versions[0].content,
      seo: page.versions[0].seo,
    };
  }

  async listPublishedBlog(tenantId: string, storefrontIdOrSlug: string) {
    const sf = await this.prisma.db.storefront.findFirst({
      where: {
        tenantId,
        OR: [{ id: storefrontIdOrSlug }, { slug: storefrontIdOrSlug }],
      },
    });
    if (!sf) throw AppError.notFound('Storefront not found');
    const pages = await this.prisma.db.page.findMany({
      where: { tenantId, storefrontId: sf.id, templateKey: 'blog_post' },
      include: {
        versions: { where: { status: 'published' }, orderBy: { version: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return pages
      .filter((p) => p.versions[0])
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        template_key: p.templateKey,
        seo: p.versions[0].seo,
        href: `/blog/${p.slug}`,
        updated_at: p.updatedAt.toISOString(),
      }));
  }

  async ensureAuraLite(tenantId: string, storefrontId: string, actorId?: string) {
    const sf = await this.prisma.db.storefront.findFirst({ where: { id: storefrontId, tenantId } });
    if (!sf) throw AppError.notFound('Storefront not found');

    let theme = await this.prisma.db.theme.findUnique({
      where: { storefrontId_code: { storefrontId, code: 'aura-commerce-lite' } },
    });
    if (!theme) {
      theme = await this.prisma.db.theme.create({
        data: {
          id: createId('thm'),
          tenantId,
          storefrontId,
          code: 'aura-commerce-lite',
          name: 'Aura Commerce Lite',
          status: 'installed',
        },
      });
    }

    let version = await this.prisma.db.themeVersion.findFirst({
      where: { themeId: theme.id, version: 1 },
    });
    if (!version) {
      version = await this.prisma.db.themeVersion.create({
        data: {
          id: createId('thv'),
          tenantId,
          themeId: theme.id,
          version: 1,
          status: 'published',
          config: AURA_LITE_CONFIG,
        },
      });
    } else {
      version = await this.prisma.db.themeVersion.update({
        where: { id: version.id },
        data: { status: 'published', config: AURA_LITE_CONFIG },
      });
    }

    await this.prisma.db.storefront.update({
      where: { id: storefrontId },
      data: {
        publishedThemeVersionId: version.id,
        status: sf.status === 'draft' ? 'staging' : sf.status,
        seoTitle: sf.seoTitle ?? 'AURA Beauty · Serum tái tạo da đêm',
        seoDescription:
          sf.seoDescription ?? 'Storefront AURA Beauty — Powered by PTT Commerce Intelligence OS',
        primaryDomain: sf.primaryDomain ?? 'webecom.ngoinhahomnay.vn',
      },
    });

    await this.prisma.db.navigationMenu.upsert({
      where: { storefrontId_handle: { storefrontId, handle: 'bottom' } },
      create: {
        id: createId('nav'),
        tenantId,
        storefrontId,
        handle: 'bottom',
        items: [
          { label: 'Home', href: '/' },
          { label: 'Search', href: '/search' },
          { label: 'Account', href: '/account' },
          { label: 'Cart', href: '/cart' },
        ],
      },
      update: {},
    });

    await this.prisma.db.navigationMenu.upsert({
      where: { storefrontId_handle: { storefrontId, handle: 'header' } },
      create: {
        id: createId('nav'),
        tenantId,
        storefrontId,
        handle: 'header',
        items: [
          { label: 'Serum đêm', href: '/collections/serum-dem' },
          { label: 'Làm sáng', href: '/collections/lam-sang' },
        ],
      },
      update: {},
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
          title: 'AURA Home',
          templateKey: 'home',
          status: 'published',
        },
      });
      await this.prisma.db.pageVersion.create({
        data: {
          id: createId('pgv'),
          tenantId,
          pageId: page.id,
          version: 1,
          status: 'published',
          content: {
            hero: {
              eyebrow: 'AURA Beauty',
              headline: 'Serum tái tạo da đêm',
              cta: 'Mua ngay',
              cta_href: '/products/glow-serum-30ml',
            },
            trust: ['COD toàn quốc', 'Đổi trả 7 ngày', 'Hàng chính hãng'],
          },
          seo: {
            title: 'AURA Beauty — Serum tái tạo da đêm | Powered by PTT',
            description: 'Mua serum AURA trên storefront PTT — COD, giao nhanh.',
          },
        },
      });
    }

    await this.prisma.db.voucher.upsert({
      where: { storefrontId_code: { storefrontId, code: 'AURA10' } },
      create: {
        id: createId('vch'),
        tenantId,
        storefrontId,
        code: 'AURA10',
        type: 'percent',
        value: 10,
        active: true,
      },
      update: { active: true },
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'theme.ensure_aura_lite',
      entity: 'storefront',
      entityId: storefrontId,
    });

    return this.getRuntime(tenantId, storefrontId);
  }

  async updateStorefrontStatus(
    tenantId: string,
    storefrontId: string,
    status: string,
    actorId: string,
    extras?: { primaryDomain?: string; seoTitle?: string; seoDescription?: string },
  ) {
    const allowed = ['draft', 'staging', 'published', 'maintenance'];
    if (!allowed.includes(status)) throw AppError.validation('Invalid status');
    const sf = await this.prisma.db.storefront.update({
      where: { id: storefrontId },
      data: {
        status,
        ...(extras?.primaryDomain !== undefined ? { primaryDomain: extras.primaryDomain } : {}),
        ...(extras?.seoTitle !== undefined ? { seoTitle: extras.seoTitle } : {}),
        ...(extras?.seoDescription !== undefined ? { seoDescription: extras.seoDescription } : {}),
      },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'storefront.status',
      entity: 'storefront',
      entityId: storefrontId,
      payload: { status },
    });
    return sf;
  }

  async trackEvent(
    tenantId: string,
    input: {
      storefrontId: string;
      name: string;
      sessionId?: string;
      customerId?: string;
      payload?: Prisma.InputJsonValue;
    },
  ) {
    const row = await this.prisma.db.storefrontEvent.create({
      data: {
        id: createId('evt'),
        tenantId,
        storefrontId: input.storefrontId,
        name: input.name,
        sessionId: input.sessionId,
        customerId: input.customerId,
        payload: input.payload ?? {},
      },
    });
    return { id: row.id, name: row.name, created_at: row.createdAt.toISOString() };
  }

  async listEvents(tenantId: string, storefrontId: string, limit = 50) {
    const rows = await this.prisma.db.storefrontEvent.findMany({
      where: { tenantId, storefrontId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      session_id: r.sessionId,
      payload: r.payload,
      created_at: r.createdAt.toISOString(),
    }));
  }

  async shippingQuotes(city?: string) {
    return this.shipping.quotes(city);
  }

  async validateVoucher(tenantId: string, storefrontId: string, code: string, subtotal: number) {
    const v = await this.prisma.db.voucher.findFirst({
      where: { tenantId, storefrontId, code: code.toUpperCase(), active: true },
    });
    if (!v) throw AppError.notFound('Voucher not found');
    const value = Number(v.value);
    const discount =
      v.type === 'percent' ? Math.round((subtotal * value) / 100) : Math.min(subtotal, value);
    return {
      code: v.code,
      type: v.type,
      value: value,
      discount_amount: discount,
    };
  }

  async createLead(
    tenantId: string,
    input: {
      name: string;
      email: string;
      phone?: string;
      company?: string;
      channel?: string;
      message?: string;
      cta_code?: string;
      landing_slug?: string;
      consent?: boolean;
      unlock_href?: string;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
    },
  ) {
    let unlockHref: string | null = null;
    if (input.unlock_href) {
      const u = input.unlock_href.trim();
      if (u.startsWith('/') || /^https:\/\//i.test(u)) {
        unlockHref = u;
      } else {
        throw AppError.validation('unlock_href must be relative path or https URL');
      }
    }
    const meta = [
      input.cta_code ? `cta_code=${input.cta_code}` : null,
      input.landing_slug ? `landing=${input.landing_slug}` : null,
      input.consent ? 'consent=1' : null,
      unlockHref ? `unlock=${unlockHref}` : null,
      input.utm_source ? `utm_source=${input.utm_source}` : null,
      input.utm_medium ? `utm_medium=${input.utm_medium}` : null,
      input.utm_campaign ? `utm_campaign=${input.utm_campaign}` : null,
      `consent_at=${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join(' ');
    const message = [meta, input.message ?? ''].filter(Boolean).join('\n').trim();
    const lead = await this.prisma.db.lead.create({
      data: {
        id: createId('lead'),
        tenantId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        company: input.company,
        channel: input.channel ?? 'corporate',
        message,
      },
    });
    // eslint-disable-next-line no-console
    console.log('[lead.notify]', {
      id: lead.id,
      email: lead.email,
      channel: lead.channel,
      cta_code: input.cta_code,
      landing_slug: input.landing_slug,
      unlock_href: unlockHref,
    });
    return {
      id: lead.id,
      status: lead.status,
      cta_code: input.cta_code || null,
      unlock_href: unlockHref,
      unlocked: Boolean(unlockHref),
    };
  }

  // ─── A1 Domain connect ─────────────────────────────────────

  private featureDomainTls() {
    const v = process.env.FEATURE_DOMAIN_TLS;
    if (v === undefined || v === '') return true;
    return v === '1' || v.toLowerCase() === 'true';
  }

  private mapDomain(d: {
    id: string;
    hostname: string;
    kind: string;
    dnsStatus: string;
    tlsStatus: string;
    verificationToken: string;
    isPrimary: boolean;
    lastCheckedAt: Date | null;
    storefrontId: string;
  }) {
    const apex = process.env.PLATFORM_APEX_DOMAIN || 'ptt.shop';
    return {
      id: d.id,
      hostname: d.hostname,
      kind: d.kind,
      dns_status: d.dnsStatus,
      tls_status: d.tlsStatus,
      verification_token: d.verificationToken,
      is_primary: d.isPrimary,
      last_checked_at: d.lastCheckedAt?.toISOString() ?? null,
      storefront_id: d.storefrontId,
      dns_instructions:
        d.kind === 'subdomain'
          ? { type: 'CNAME', host: d.hostname, value: `edge.${apex}`, note: 'Managed platform subdomain' }
          : {
              type: 'TXT',
              host: `_ptt-verify.${d.hostname}`,
              value: d.verificationToken,
              cname: { host: d.hostname, value: `edge.${apex}` },
            },
      feature_domain_tls: this.featureDomainTls(),
    };
  }

  async listDomains(tenantId: string, storefrontId: string) {
    await this.requireSf(tenantId, storefrontId);
    const rows = await this.prisma.db.storefrontDomain.findMany({
      where: { tenantId, storefrontId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    return { domains: rows.map((d) => this.mapDomain(d)) };
  }

  async addDomain(
    tenantId: string,
    storefrontId: string,
    input: { hostname: string; kind?: 'subdomain' | 'custom' },
    actorId?: string,
  ) {
    const sf = await this.requireSf(tenantId, storefrontId);
    const apex = process.env.PLATFORM_APEX_DOMAIN || 'ptt.shop';
    let hostname = input.hostname.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    let kind = input.kind || 'custom';

    if (kind === 'subdomain' || hostname.endsWith(`.${apex}`)) {
      kind = 'subdomain';
      if (!hostname.includes('.')) {
        hostname = `${sf.slug}.${apex}`;
      }
      if (!hostname.endsWith(`.${apex}`)) {
        throw AppError.validation(`Subdomain must end with .${apex}`);
      }
    }

    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(hostname)) {
      throw AppError.validation('Invalid hostname');
    }

    const existing = await this.prisma.db.storefrontDomain.findUnique({ where: { hostname } });
    if (existing && existing.storefrontId !== storefrontId) {
      throw AppError.validation('Hostname already connected to another storefront');
    }

    const token = `ptt-verify-${createId('dom').slice(0, 12)}`;
    const isFirst =
      (await this.prisma.db.storefrontDomain.count({ where: { storefrontId } })) === 0;

    let row =
      existing ??
      (await this.prisma.db.storefrontDomain.create({
        data: {
          id: createId('dom'),
          tenantId,
          storefrontId,
          hostname,
          kind,
          dnsStatus: kind === 'subdomain' ? 'verified' : 'pending',
          tlsStatus: kind === 'subdomain' && this.featureDomainTls() ? 'active' : 'pending',
          verificationToken: token,
          isPrimary: isFirst,
          lastCheckedAt: kind === 'subdomain' ? new Date() : null,
        },
      }));

    if (existing) {
      row = await this.prisma.db.storefrontDomain.update({
        where: { id: existing.id },
        data: {
          kind,
          dnsStatus: kind === 'subdomain' ? 'verified' : existing.dnsStatus,
          tlsStatus:
            kind === 'subdomain' && this.featureDomainTls() ? 'active' : existing.tlsStatus,
          lastCheckedAt: kind === 'subdomain' ? new Date() : existing.lastCheckedAt,
        },
      });
    }

    if (row.isPrimary || isFirst) {
      await this.prisma.db.storefront.update({
        where: { id: storefrontId },
        data: { primaryDomain: row.hostname },
      });
      if (!row.isPrimary) {
        row = await this.prisma.db.storefrontDomain.update({
          where: { id: row.id },
          data: { isPrimary: true },
        });
      }
    }

    await this.audit.write({
      tenantId,
      actorId,
      action: 'domain.add',
      entity: 'storefront_domain',
      entityId: row.id,
      payload: { hostname: row.hostname, kind: row.kind },
    });

    return this.mapDomain(row);
  }

  async verifyDomain(tenantId: string, storefrontId: string, domainId: string, actorId?: string) {
    const row = await this.prisma.db.storefrontDomain.findFirst({
      where: { id: domainId, tenantId, storefrontId },
    });
    if (!row) throw AppError.notFound('Domain not found');

    // Staging automation: accept verify when FEATURE_DOMAIN_TLS on (stub DNS).
    // Force fail with DOMAIN_FORCE_FAIL_DNS=1 for go-live tests.
    const forceFail = process.env.DOMAIN_FORCE_FAIL_DNS === '1';
    const dnsOk = !forceFail;
    const tlsOn = this.featureDomainTls();

    const updated = await this.prisma.db.storefrontDomain.update({
      where: { id: row.id },
      data: {
        dnsStatus: dnsOk ? 'verified' : 'failed',
        tlsStatus: dnsOk && tlsOn ? 'active' : dnsOk ? 'pending' : 'failed',
        lastCheckedAt: new Date(),
      },
    });

    if (updated.dnsStatus === 'verified' && updated.isPrimary) {
      await this.prisma.db.storefront.update({
        where: { id: storefrontId },
        data: { primaryDomain: updated.hostname },
      });
    }

    await this.audit.write({
      tenantId,
      actorId,
      action: 'domain.verify',
      entity: 'storefront_domain',
      entityId: updated.id,
      payload: { dns_status: updated.dnsStatus, tls_status: updated.tlsStatus },
    });

    return this.mapDomain(updated);
  }

  async setPrimaryDomain(tenantId: string, storefrontId: string, domainId: string, actorId?: string) {
    const row = await this.prisma.db.storefrontDomain.findFirst({
      where: { id: domainId, tenantId, storefrontId },
    });
    if (!row) throw AppError.notFound('Domain not found');
    if (row.dnsStatus !== 'verified') {
      throw AppError.validation('Domain DNS must be verified before primary');
    }

    await this.prisma.db.storefrontDomain.updateMany({
      where: { storefrontId },
      data: { isPrimary: false },
    });
    const updated = await this.prisma.db.storefrontDomain.update({
      where: { id: row.id },
      data: { isPrimary: true },
    });
    await this.prisma.db.storefront.update({
      where: { id: storefrontId },
      data: { primaryDomain: updated.hostname },
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'domain.set_primary',
      entity: 'storefront_domain',
      entityId: updated.id,
      payload: { hostname: updated.hostname },
    });

    return this.mapDomain(updated);
  }

  /** Public host → tenant/storefront resolution for multi-tenant storefront. */
  async resolveHost(hostnameRaw: string) {
    const hostname = hostnameRaw.trim().toLowerCase().split(':')[0];
    const apex = process.env.PLATFORM_APEX_DOMAIN || 'ptt.shop';
    const demoHosts = (
      process.env.DEMO_HOSTS ||
      'themes.ngoinhahomnay.vn,demo.webecom.ngoinhahomnay.vn'
    )
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);

    // Platform demo sandbox → default AURA storefront
    if (demoHosts.includes(hostname)) {
      const demoId = process.env.DEMO_STOREFRONT_ID || 'sf_aura';
      const sf =
        (await this.prisma.db.storefront.findFirst({ where: { id: demoId } })) ||
        (await this.prisma.db.storefront.findFirst({ where: { slug: 'aura' } }));
      if (sf) {
        return {
          tenant_id: sf.tenantId,
          brand_id: sf.brandId,
          storefront_id: sf.id,
          slug: sf.slug,
          hostname,
          primary_domain: sf.primaryDomain,
          status: sf.status,
          source: 'demo_host' as const,
        };
      }
    }

    const byDomain = await this.prisma.db.storefrontDomain.findFirst({
      where: {
        hostname,
        dnsStatus: 'verified',
      },
      include: { storefront: true },
    });
    if (byDomain) {
      return {
        tenant_id: byDomain.tenantId,
        brand_id: byDomain.storefront.brandId,
        storefront_id: byDomain.storefrontId,
        slug: byDomain.storefront.slug,
        hostname: byDomain.hostname,
        primary_domain: byDomain.storefront.primaryDomain,
        status: byDomain.storefront.status,
        source: 'domain' as const,
      };
    }

    const byPrimary = await this.prisma.db.storefront.findFirst({
      where: { primaryDomain: hostname },
    });
    if (byPrimary) {
      return {
        tenant_id: byPrimary.tenantId,
        brand_id: byPrimary.brandId,
        storefront_id: byPrimary.id,
        slug: byPrimary.slug,
        hostname,
        primary_domain: byPrimary.primaryDomain,
        status: byPrimary.status,
        source: 'primary_domain' as const,
      };
    }

    if (hostname.endsWith(`.${apex}`)) {
      const slug = hostname.slice(0, -(apex.length + 1));
      const sf = await this.prisma.db.storefront.findFirst({
        where: { slug },
      });
      if (sf) {
        return {
          tenant_id: sf.tenantId,
          brand_id: sf.brandId,
          storefront_id: sf.id,
          slug: sf.slug,
          hostname,
          primary_domain: sf.primaryDomain,
          status: sf.status,
          source: 'subdomain_slug' as const,
        };
      }
    }

    throw AppError.notFound(`No storefront for host ${hostname}`);
  }

  private async requireSf(tenantId: string, storefrontId: string) {
    const sf = await this.prisma.db.storefront.findFirst({
      where: { id: storefrontId, tenantId },
    });
    if (!sf) throw AppError.notFound('Storefront not found');
    return sf;
  }
}
