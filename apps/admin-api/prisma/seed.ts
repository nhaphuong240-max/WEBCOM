import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Seed AURA Beauty — matches mockup 08 */
async function main() {
  const tenantId = 'ten_aura';
  const brandId = 'brd_aura';
  const storefrontId = 'sf_aura';
  const productId = 'prd_glow_serum';
  const variantId = 'var_glow_default';
  const skuId = 'sku_aura_glow_30';
  const priceListId = 'pl_aura_default';
  const adminId = 'usr_aura_admin';

  await prisma.tenant.upsert({
    where: { id: tenantId },
    create: { id: tenantId, name: 'AURA Beauty VN', slug: 'aura-beauty', status: 'active' },
    update: { name: 'AURA Beauty VN' },
  });

  await prisma.brand.upsert({
    where: { tenantId_code: { tenantId, code: 'AURA' } },
    create: { id: brandId, tenantId, name: 'AURA Beauty', code: 'AURA' },
    update: { name: 'AURA Beauty' },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId, email: 'admin@aura.local' } },
    create: {
      id: adminId,
      tenantId,
      email: 'admin@aura.local',
      name: 'AURA Admin',
      roles: ['admin'],
    },
    update: { roles: ['admin'] },
  });

  await prisma.storefront.upsert({
    where: { tenantId_slug: { tenantId, slug: 'aura-shop' } },
    create: {
      id: storefrontId,
      tenantId,
      brandId,
      name: 'AURA Storefront',
      slug: 'aura-shop',
      status: 'staging',
      primaryDomain: 'webecom.ngoinhahomnay.vn',
      seoTitle: 'AURA Beauty · Serum tái tạo da đêm',
      seoDescription: 'Storefront AURA Beauty — Powered by PTT',
    },
    update: {
      name: 'AURA Storefront',
      status: 'staging',
      primaryDomain: 'webecom.ngoinhahomnay.vn',
      seoTitle: 'AURA Beauty · Serum tái tạo da đêm',
      seoDescription: 'Storefront AURA Beauty — Powered by PTT',
    },
  });

  await prisma.product.upsert({
    where: { tenantId_slug: { tenantId, slug: 'glow-serum-30ml' } },
    create: {
      id: productId,
      tenantId,
      brandId,
      title: 'Glow Serum 30ml',
      slug: 'glow-serum-30ml',
      description: 'Serum dưỡng sáng da — hero SKU AURA Beauty (W1 seed).',
      status: 'active',
    },
    update: { title: 'Glow Serum 30ml' },
  });

  await prisma.productVariant.upsert({
    where: { id: variantId },
    create: {
      id: variantId,
      tenantId,
      productId,
      title: '30ml',
      options: { size: '30ml' },
    },
    update: { title: '30ml' },
  });

  await prisma.sku.upsert({
    where: { tenantId_code: { tenantId, code: 'AURA-GLOW-30' } },
    create: { id: skuId, tenantId, variantId, code: 'AURA-GLOW-30', status: 'active' },
    update: { status: 'active' },
  });

  await prisma.productMedia.deleteMany({ where: { productId } });
  await prisma.productMedia.create({
    data: {
      id: 'med_glow_1',
      tenantId,
      productId,
      url: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=800',
      alt: 'Glow Serum',
      sortOrder: 0,
    },
  });

  await prisma.priceList.upsert({
    where: { id: priceListId },
    create: {
      id: priceListId,
      tenantId,
      brandId,
      name: 'AURA Retail',
      currency: 'VND',
      isDefault: true,
    },
    update: { isDefault: true },
  });

  await prisma.priceListItem.upsert({
    where: { priceListId_skuId: { priceListId, skuId } },
    create: {
      id: 'pli_glow',
      tenantId,
      priceListId,
      skuId,
      amount: 459000,
      compareAtAmount: 520000,
      discountPercent: 10,
    },
    update: { amount: 459000, discountPercent: 10 },
  });

  await prisma.inventoryBalance.upsert({
    where: { skuId },
    create: { id: 'inv_glow', tenantId, skuId, onHand: 100, reserved: 0 },
    update: { onHand: 100, reserved: 0 },
  });

  // W2: Aura Commerce Lite theme + nav + home + voucher
  const themeId = 'thm_aura_lite';
  const themeVersionId = 'thv_aura_lite_1';
  await prisma.theme.upsert({
    where: { storefrontId_code: { storefrontId, code: 'aura-commerce-lite' } },
    create: {
      id: themeId,
      tenantId,
      storefrontId,
      code: 'aura-commerce-lite',
      name: 'Aura Commerce Lite',
      status: 'installed',
    },
    update: { name: 'Aura Commerce Lite' },
  });
  await prisma.themeVersion.upsert({
    where: { themeId_version: { themeId, version: 1 } },
    create: {
      id: themeVersionId,
      tenantId,
      themeId,
      version: 1,
      status: 'published',
      config: {
        code: 'aura-commerce-lite',
        tokens: { rose: '#c45a6a', ink: '#1a1214', cream: '#faf6f4' },
        collections: [
          { slug: 'serum-dem', title: 'Serum đêm' },
          { slug: 'lam-sang', title: 'Làm sáng' },
          { slug: 'duong-am', title: 'Dưỡng ẩm' },
          { slug: 'chong-lao-hoa', title: 'Chống lão hóa' },
        ],
      },
    },
    update: { status: 'published' },
  });
  await prisma.storefront.update({
    where: { id: storefrontId },
    data: { publishedThemeVersionId: themeVersionId },
  });
  await prisma.navigationMenu.upsert({
    where: { storefrontId_handle: { storefrontId, handle: 'bottom' } },
    create: {
      id: 'nav_aura_bottom',
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
  const pageId = 'pg_aura_home';
  await prisma.page.upsert({
    where: { storefrontId_slug: { storefrontId, slug: 'home' } },
    create: {
      id: pageId,
      tenantId,
      storefrontId,
      slug: 'home',
      title: 'AURA Home',
      templateKey: 'home',
      status: 'published',
    },
    update: { status: 'published' },
  });
  await prisma.pageVersion.upsert({
    where: { pageId_version: { pageId, version: 1 } },
    create: {
      id: 'pgv_aura_home_1',
      tenantId,
      pageId,
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
    update: { status: 'published' },
  });
  await prisma.voucher.upsert({
    where: { storefrontId_code: { storefrontId, code: 'AURA10' } },
    create: {
      id: 'vch_aura10',
      tenantId,
      storefrontId,
      code: 'AURA10',
      type: 'percent',
      value: 10,
      active: true,
    },
    update: { active: true },
  });

  // ─── W3 Brand Kit + Templates + Onboarding ─────────────────
  await prisma.brandKit.upsert({
    where: { id: 'bkit_aura_sf_1' },
    create: {
      id: 'bkit_aura_sf_1',
      tenantId,
      brandId,
      storefrontId,
      scope: 'storefront',
      version: 1,
      status: 'published',
      tokens: {
        colors: {
          accent: '#c45a6a',
          rose: '#c45a6a',
          ink: '#1a1214',
          muted: '#6b5559',
          cream: '#faf6f4',
          surface: '#faf6f4',
        },
        fonts: { display: 'Syne', body: 'Be Vietnam Pro' },
        spacing: { radius: '8px' },
        logo: { url: '', alt: 'AURA Beauty' },
        seo: {
          title: 'AURA Beauty · Serum tái tạo da đêm',
          description: 'Storefront AURA Beauty — Powered by PTT',
        },
        legal: {
          return_policy: 'Đổi trả 7 ngày',
          privacy: 'Không bán dữ liệu khách hàng',
        },
        voice: { tone: 'warm_premium', cta_default: 'Mua ngay' },
        consent: { required_before_pixel: true },
      },
    },
    update: { status: 'published' },
  });

  const templates: Array<{
    id: string;
    code: string;
    name: string;
    industry: string;
    goal: string;
    license: string;
    scores: { cvr: number; mobile: number; seo: number };
    features: string[];
    accent: string;
    headline: string;
  }> = [
    {
      id: 'tpl_aura_beauty',
      code: 'aura-commerce-lite',
      name: 'Aura Commerce Lite',
      industry: 'beauty',
      goal: 'conversion',
      license: 'free',
      scores: { cvr: 88, mobile: 92, seo: 84 },
      features: ['sticky-atc', 'trust-badges', 'collections'],
      accent: '#c45a6a',
      headline: 'Serum tái tạo da đêm',
    },
    {
      id: 'tpl_lumen_fashion',
      code: 'lumen-fashion',
      name: 'Lumen Fashion',
      industry: 'fashion',
      goal: 'conversion',
      license: 'free',
      scores: { cvr: 82, mobile: 90, seo: 80 },
      features: ['lookbook', 'size-guide', 'megamenu'],
      accent: '#1a1a1a',
      headline: 'New season essentials',
    },
    {
      id: 'tpl_harvest_fnb',
      code: 'harvest-fnb',
      name: 'Harvest F&B',
      industry: 'fnb',
      goal: 'local',
      license: 'free',
      scores: { cvr: 79, mobile: 88, seo: 76 },
      features: ['menu-grid', 'delivery-eta'],
      accent: '#c45c26',
      headline: 'Đặt món hôm nay',
    },
    {
      id: 'tpl_forge_b2b',
      code: 'forge-b2b',
      name: 'Forge B2B',
      industry: 'b2b',
      goal: 'lead',
      license: 'one_time',
      scores: { cvr: 74, mobile: 85, seo: 90 },
      features: ['rfq', 'catalog-pdf', 'megamenu'],
      accent: '#0f3d68',
      headline: 'Giải pháp bán sỉ',
    },
    {
      id: 'tpl_nest_home',
      code: 'nest-home',
      name: 'Nest Home',
      industry: 'home',
      goal: 'conversion',
      license: 'free',
      scores: { cvr: 81, mobile: 87, seo: 82 },
      features: ['room-sets', 'trust-badges'],
      accent: '#5c7a5a',
      headline: 'Không gian sống ấm',
    },
    {
      id: 'tpl_pulse_gadget',
      code: 'pulse-gadget',
      name: 'Pulse Gadget',
      industry: 'electronics',
      goal: 'conversion',
      license: 'free',
      scores: { cvr: 77, mobile: 91, seo: 85 },
      features: ['spec-table', 'sticky-atc'],
      accent: '#2563eb',
      headline: 'Công nghệ mỗi ngày',
    },
    {
      id: 'tpl_bloom_kids',
      code: 'bloom-kids',
      name: 'Bloom Kids',
      industry: 'kids',
      goal: 'conversion',
      license: 'free',
      scores: { cvr: 80, mobile: 89, seo: 78 },
      features: ['age-filter', 'trust-badges'],
      accent: '#e8a0bf',
      headline: 'Đồ chơi & mẹ và bé',
    },
    {
      id: 'tpl_zen_wellness',
      code: 'zen-wellness',
      name: 'Zen Wellness',
      industry: 'beauty',
      goal: 'brand',
      license: 'free',
      scores: { cvr: 75, mobile: 86, seo: 88 },
      features: ['editorial', 'collections'],
      accent: '#7d8f69',
      headline: 'Chăm sóc từ gốc',
    },
    {
      id: 'tpl_spark_promo',
      code: 'spark-promo',
      name: 'Spark Promo Landing',
      industry: 'general',
      goal: 'campaign',
      license: 'free',
      scores: { cvr: 90, mobile: 93, seo: 70 },
      features: ['countdown', 'cta-banner'],
      accent: '#dc2626',
      headline: 'Flash sale cuối tuần',
    },
    {
      id: 'tpl_ledger_services',
      code: 'ledger-services',
      name: 'Ledger Services',
      industry: 'services',
      goal: 'lead',
      license: 'one_time',
      scores: { cvr: 72, mobile: 84, seo: 91 },
      features: ['booking', 'trust-badges'],
      accent: '#334155',
      headline: 'Đặt lịch tư vấn',
    },
  ];

  for (const t of templates) {
    await prisma.templateCatalog.upsert({
      where: { code: t.code },
      create: {
        id: t.id,
        code: t.code,
        name: t.name,
        industry: t.industry,
        goal: t.goal,
        license: t.license,
        scores: t.scores,
        features: t.features,
        previewUrl: `https://webecom.ngoinhahomnay.vn/?demo=${t.code}`,
        demoUrl: `https://webecom.ngoinhahomnay.vn/`,
        themeConfig: {
          code: t.code,
          tokens: {
            accent: t.accent,
            rose: t.accent,
            ink: '#1a1214',
            cream: '#faf6f4',
          },
          sections: { home: ['hero', 'collections', 'featured', 'trust'] },
          collections: [
            { slug: 'noi-bat', title: 'Nổi bật' },
            { slug: 'moi', title: 'Mới' },
          ],
        },
        pageContent: {
          section_order: ['hero', 'trust', 'featured'],
          hero: {
            eyebrow: t.name,
            headline: t.headline,
            cta: 'Khám phá',
            cta_href: '/search',
          },
          trust: ['COD', 'Đổi trả', 'Chính hãng'],
        },
        playbook: [
          'Publish Brand Kit với màu accent template',
          'Install template vào Theme Library',
          'Sửa hero trong Site Builder',
          'Promote staging → Pass Go-live → Publish',
        ],
        active: true,
      },
      update: {
        name: t.name,
        scores: t.scores,
        features: t.features,
        active: true,
      },
    });
  }

  await prisma.onboardingProgress.upsert({
    where: { storefrontId },
    create: {
      id: 'onb_aura_1',
      tenantId,
      storefrontId,
      currentStep: 'theme_match',
      completed: { brand_kit: true, catalog: true },
    },
    update: {},
  });

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        tenant_id: tenantId,
        brand_id: brandId,
        storefront_id: storefrontId,
        product_id: productId,
        sku_id: skuId,
        sku_code: 'AURA-GLOW-30',
        theme: 'aura-commerce-lite',
        storefront_status: 'staging',
        templates_seeded: templates.length,
        brand_kit: 'bkit_aura_sf_1',
        phase: 'W3',
        list_price: 459000,
        discount_percent: 10,
        unit_price_after_discount: 413100,
        on_hand: 100,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
