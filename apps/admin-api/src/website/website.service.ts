import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

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
        ? { title: home.title, content: home.versions[0].content, seo: home.versions[0].seo }
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
      content: page.versions[0].content,
      seo: page.versions[0].seo,
    };
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
    const base = city?.toLowerCase().includes('hcm') || city?.toLowerCase().includes('hồ chí minh') ? 25000 : 35000;
    return [
      { carrier: 'GHN', service: 'Standard', eta_days: 2, amount: String(base) },
      { carrier: 'GHTK', service: 'Economy', eta_days: 3, amount: String(Math.max(15000, base - 5000)) },
      { carrier: 'ViettelPost', service: 'Express', eta_days: 1, amount: String(base + 15000) },
    ];
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
    },
  ) {
    const lead = await this.prisma.db.lead.create({
      data: {
        id: createId('lead'),
        tenantId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        company: input.company,
        channel: input.channel ?? 'corporate',
        message: input.message ?? '',
      },
    });
    // Notify stub — log for sales
    // eslint-disable-next-line no-console
    console.log('[lead.notify]', { id: lead.id, email: lead.email, channel: lead.channel });
    return { id: lead.id, status: lead.status };
  }
}
