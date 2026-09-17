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
    create: {
      id: skuId,
      tenantId,
      variantId,
      code: 'AURA-GLOW-30',
      barcode: '8938501234567',
      status: 'active',
    },
    update: { status: 'active', barcode: '8938501234567' },
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

  // C1/C2: Customer 360 + identity demo
  const customerId = 'cus_aura_lan';
  await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId, phone: '0901234567' } },
    create: {
      id: customerId,
      tenantId,
      phone: '0901234567',
      email: 'lan@aura.local',
      name: 'Lan Nguyen',
      consentMarketing: true,
      consentEmail: true,
      consentSms: true,
      consentZns: false,
      consentMessenger: true,
      tags: ['vip', 'beauty'],
      notes: 'AURA demo customer C1–C3',
      addresses: [
        {
          label: 'Home',
          line1: '1 Nguyen Hue',
          city: 'HCM',
          phone: '0901234567',
          is_default: true,
        },
      ],
      status: 'active',
      lifetimeOrders: 3,
      lifetimeSpend: 1_250_000,
      lastOrderAt: new Date(),
    },
    update: {
      name: 'Lan Nguyen',
      email: 'lan@aura.local',
      consentMarketing: true,
      consentEmail: true,
      consentSms: true,
      consentMessenger: true,
      tags: ['vip', 'beauty'],
      notes: 'AURA demo customer C1–C3',
      status: 'active',
      mergedIntoId: null,
      mergedAt: null,
      lifetimeOrders: 3,
      lifetimeSpend: 1_250_000,
      lastOrderAt: new Date(),
    },
  });

  // C2: second profile sharing phone signal for match demo (different email)
  const customerDupId = 'cus_aura_lan_dup';
  await prisma.customer.upsert({
    where: { tenantId_email: { tenantId, email: 'lan.messenger@aura.local' } },
    create: {
      id: customerDupId,
      tenantId,
      phone: null,
      email: 'lan.messenger@aura.local',
      name: 'Lan (Messenger)',
      consentMarketing: true,
      consentEmail: true,
      consentSms: false,
      consentMessenger: true,
      tags: ['inbox'],
      notes: 'C2 duplicate candidate — share meta PSID with Lan',
      addresses: [],
      status: 'active',
    },
    update: {
      name: 'Lan (Messenger)',
      notes: 'C2 duplicate candidate — share meta PSID with Lan',
      status: 'active',
      mergedIntoId: null,
      mergedAt: null,
      tags: ['inbox'],
    },
  });

  for (const row of [
    {
      id: 'cid_lan_phone',
      customerId,
      type: 'phone',
      value: '0901234567',
      normalizedValue: '0901234567',
    },
    {
      id: 'cid_lan_email',
      customerId,
      type: 'email',
      value: 'lan@aura.local',
      normalizedValue: 'lan@aura.local',
    },
    {
      id: 'cid_lan_meta',
      customerId,
      type: 'meta',
      value: 'psid_lan_aura',
      normalizedValue: 'psid_lan_aura',
    },
    {
      id: 'cid_dup_meta',
      customerId: customerDupId,
      type: 'meta',
      value: 'psid_lan_aura',
      normalizedValue: 'psid_lan_aura',
    },
  ] as const) {
    // meta shared intentionally — unique constraint: only one can exist; seed survivor + match via scan
    if (row.id === 'cid_dup_meta') continue;
    await prisma.customerIdentity.upsert({
      where: {
        tenantId_type_normalizedValue: {
          tenantId,
          type: row.type,
          normalizedValue: row.normalizedValue,
        },
      },
      create: {
        id: row.id,
        tenantId,
        customerId: row.customerId,
        type: row.type,
        value: row.value,
        normalizedValue: row.normalizedValue,
        verified: true,
        metadata: { source: 'seed' },
      },
      update: {
        customerId: row.customerId,
        value: row.value,
        verified: true,
      },
    });
  }

  // Dup gets zalo identity that scan won't auto-collide; e2e creates conflict via addIdentity
  await prisma.customerIdentity.upsert({
    where: {
      tenantId_type_normalizedValue: {
        tenantId,
        type: 'zalo',
        normalizedValue: 'zalo_lan_dup',
      },
    },
    create: {
      id: 'cid_dup_zalo',
      tenantId,
      customerId: customerDupId,
      type: 'zalo',
      value: 'zalo_lan_dup',
      normalizedValue: 'zalo_lan_dup',
      verified: false,
      metadata: { source: 'seed' },
    },
    update: { customerId: customerDupId },
  });

  // C3: demo segment (VIP tag OR consent email) — materialize via admin/e2e
  await prisma.segment.upsert({
    where: { tenantId_name: { tenantId, name: 'VIP beauty' } },
    create: {
      id: 'seg_aura_vip',
      tenantId,
      name: 'VIP beauty',
      description: 'Seed C3 — tag vip',
      logic: 'AND',
      status: 'draft',
      rules: {
        create: [
          {
            id: 'sgr_aura_vip_tag',
            tenantId,
            field: 'tags',
            op: 'has_tag',
            value: 'vip',
            sortOrder: 0,
          },
        ],
      },
    },
    update: {
      description: 'Seed C3 — tag vip',
      status: 'draft',
    },
  });

  // C4: loyalty tiers + Lan account
  for (const t of [
    { id: 'ltr_bronze', code: 'bronze', name: 'Bronze', min: 0, mult: 1, sort: 0 },
    { id: 'ltr_silver', code: 'silver', name: 'Silver', min: 500, mult: 1.2, sort: 1 },
    { id: 'ltr_gold', code: 'gold', name: 'Gold', min: 2000, mult: 1.5, sort: 2 },
  ]) {
    await prisma.loyaltyTier.upsert({
      where: { tenantId_code: { tenantId, code: t.code } },
      create: {
        id: t.id,
        tenantId,
        code: t.code,
        name: t.name,
        minPoints: t.min,
        earnMultiplier: t.mult,
        sortOrder: t.sort,
      },
      update: {
        name: t.name,
        minPoints: t.min,
        earnMultiplier: t.mult,
        sortOrder: t.sort,
      },
    });
  }
  await prisma.loyaltyAccount.upsert({
    where: { tenantId_customerId: { tenantId, customerId } },
    create: {
      id: 'lya_aura_lan',
      tenantId,
      customerId,
      pointsBalance: 200,
      lifetimeEarned: 200,
      lifetimeRedeemed: 0,
      tierCode: 'bronze',
      referralCode: 'REFAURALAN',
    },
    update: {
      pointsBalance: 200,
      lifetimeEarned: 200,
      tierCode: 'bronze',
      referralCode: 'REFAURALAN',
      status: 'active',
    },
  });

  // C5: welcome journey (draft — activate in admin/e2e)
  await prisma.journey.upsert({
    where: { tenantId_name: { tenantId, name: 'Welcome AURA' } },
    create: {
      id: 'jrn_aura_welcome',
      tenantId,
      name: 'Welcome AURA',
      description: 'Seed C5 onboarding stub',
      category: 'onboarding',
      status: 'draft',
      triggerType: 'manual',
      requiredConsent: ['email', 'marketing'],
      frequencyCapDays: 7,
      frequencyCapCount: 1,
      steps: {
        create: [
          {
            id: 'jst_welcome_trigger',
            tenantId,
            sortOrder: 0,
            kind: 'trigger',
            config: { type: 'manual' },
          },
          {
            id: 'jst_welcome_tag',
            tenantId,
            sortOrder: 1,
            kind: 'action',
            config: { type: 'tag', tag: 'journey_welcome' },
          },
          {
            id: 'jst_welcome_email',
            tenantId,
            sortOrder: 2,
            kind: 'action',
            config: { type: 'send_email', template: 'Welcome to AURA' },
          },
          {
            id: 'jst_welcome_exit',
            tenantId,
            sortOrder: 3,
            kind: 'exit',
            config: { reason: 'done' },
          },
        ],
      },
    },
    update: {
      description: 'Seed C5 onboarding stub',
      status: 'draft',
    },
  });

  // B3/B6: POS ≥2 stores + location stock (sum = global 100)
  const posLocId = 'ploc_aura_q1';
  const posRegId = 'preg_aura_1';
  const posLoc2Id = 'ploc_aura_q3';
  const posReg2Id = 'preg_aura_q3_1';
  await prisma.posLocation.upsert({
    where: { tenantId_code: { tenantId, code: 'store_q1' } },
    create: {
      id: posLocId,
      tenantId,
      code: 'store_q1',
      name: 'AURA Store Q1',
      address: '1 Nguyen Hue',
      city: 'HCM',
      status: 'active',
    },
    update: { name: 'AURA Store Q1', status: 'active' },
  });
  await prisma.posRegister.upsert({
    where: { locationId_code: { locationId: posLocId, code: 'reg_1' } },
    create: {
      id: posRegId,
      tenantId,
      locationId: posLocId,
      code: 'reg_1',
      name: 'Register 1',
      status: 'active',
    },
    update: { status: 'active' },
  });
  await prisma.locationInventory.upsert({
    where: { locationId_skuId: { locationId: posLocId, skuId } },
    create: { id: 'linv_glow_q1', tenantId, locationId: posLocId, skuId, onHand: 60 },
    update: { onHand: 60 },
  });

  await prisma.posLocation.upsert({
    where: { tenantId_code: { tenantId, code: 'store_q3' } },
    create: {
      id: posLoc2Id,
      tenantId,
      code: 'store_q3',
      name: 'AURA Store Q3',
      address: '90 Le Loi',
      city: 'HCM',
      status: 'active',
    },
    update: { name: 'AURA Store Q3', status: 'active' },
  });
  await prisma.posRegister.upsert({
    where: { locationId_code: { locationId: posLoc2Id, code: 'reg_1' } },
    create: {
      id: posReg2Id,
      tenantId,
      locationId: posLoc2Id,
      code: 'reg_1',
      name: 'Register 1',
      status: 'active',
    },
    update: { status: 'active' },
  });
  await prisma.locationInventory.upsert({
    where: { locationId_skuId: { locationId: posLoc2Id, skuId } },
    create: { id: 'linv_glow_q3', tenantId, locationId: posLoc2Id, skuId, onHand: 40 },
    update: { onHand: 40 },
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

  const { TEMPLATE_CATALOG } = await import('./data/templates-catalog');
  console.log(`Seeding ${TEMPLATE_CATALOG.length} marketplace playbooks…`);

  for (const t of TEMPLATE_CATALOG) {
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
        playbook: t.playbook,
        active: true,
      },
      update: {
        name: t.name,
        industry: t.industry,
        goal: t.goal,
        license: t.license,
        scores: t.scores,
        features: t.features,
        playbook: t.playbook,
        active: true,
      },
    });
  }

  // A1 — primary domain for AURA (verified + TLS active for go-live)
  await prisma.storefrontDomain.upsert({
    where: { hostname: 'aura.ptt.shop' },
    create: {
      id: 'dom_aura_sub',
      tenantId,
      storefrontId,
      hostname: 'aura.ptt.shop',
      kind: 'subdomain',
      dnsStatus: 'verified',
      tlsStatus: 'active',
      verificationToken: 'ptt-verify-aura-seed',
      isPrimary: true,
      lastCheckedAt: new Date(),
    },
    update: {
      dnsStatus: 'verified',
      tlsStatus: 'active',
      isPrimary: true,
    },
  });
  await prisma.storefront.update({
    where: { id: storefrontId },
    data: { primaryDomain: 'aura.ptt.shop' },
  });

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

  // ─── W4 Analytics seed ─────────────────────────────────────
  await prisma.experiment.upsert({
    where: { storefrontId_code: { storefrontId, code: 'hero_cta_v1' } },
    create: {
      id: 'exp_hero_cta_v1',
      tenantId,
      storefrontId,
      code: 'hero_cta_v1',
      name: 'Hero CTA A/B',
      status: 'running',
      metric: 'purchase_cvr',
      variants: [
        { key: 'control', weight: 1, headline: 'Serum tái tạo da đêm', cta: 'Mua ngay' },
        {
          key: 'benefit',
          weight: 1,
          headline: 'Serum tái tạo da đêm — kết quả sau 7 đêm',
          cta: 'Dùng thử',
        },
      ],
      startedAt: new Date(),
    },
    update: { status: 'running' },
  });

  await prisma.cwvSnapshot.deleteMany({ where: { storefrontId, source: 'baseline' } });
  await prisma.cwvSnapshot.create({
    data: {
      id: 'cwv_aura_baseline',
      tenantId,
      storefrontId,
      source: 'baseline',
      path: '/',
      device: 'mobile',
      lcpMs: 1750,
      inpMs: 72,
      cls: 0.03,
    },
  });

  const sampleEvents: Array<{ name: string; path: string; session: string; total?: number }> = [
    { name: 'page_view', path: '/', session: 'ses_seed_1' },
    { name: 'page_view', path: '/', session: 'ses_seed_2' },
    { name: 'page_view', path: '/products/glow-serum-30ml', session: 'ses_seed_3' },
    { name: 'view_item', path: '/products/glow-serum-30ml', session: 'ses_seed_1' },
    { name: 'view_item', path: '/products/glow-serum-30ml', session: 'ses_seed_2' },
    { name: 'add_to_cart', path: '/products/glow-serum-30ml', session: 'ses_seed_1' },
    { name: 'begin_checkout', path: '/checkout', session: 'ses_seed_1' },
    { name: 'purchase', path: '/', session: 'ses_seed_1', total: 413100 },
    { name: 'experiment_exposed', path: '/', session: 'ses_seed_1' },
    { name: 'experiment_exposed', path: '/', session: 'ses_seed_2' },
  ];
  await prisma.storefrontEvent.deleteMany({
    where: { id: { startsWith: 'evt_w4_seed_' } },
  });
  for (const [i, e] of sampleEvents.entries()) {
    await prisma.storefrontEvent.create({
      data: {
        id: `evt_w4_seed_${i}`,
        tenantId,
        storefrontId,
        name: e.name,
        sessionId: e.session,
        landingPath: e.path,
        consentState: 'granted',
        experimentId: e.name.startsWith('experiment') || e.name === 'purchase' ? 'exp_hero_cta_v1' : null,
        variantKey: e.session === 'ses_seed_1' ? 'control' : e.name === 'experiment_exposed' ? 'benefit' : null,
        payload: e.total ? { total: e.total } : {},
      },
    });
  }

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
        templates_seeded: TEMPLATE_CATALOG.length,
        brand_kit: 'bkit_aura_sf_1',
        experiment: 'hero_cta_v1',
        phase: 'W5',
        wave: 'A1',
        primary_domain: 'aura.ptt.shop',
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
