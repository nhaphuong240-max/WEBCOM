import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { getPlatformStarter, toLegacyFlat } from '@ptt/themes';

const prisma = new PrismaClient();

/** Seed AURA Beauty — matches mockup 08 */
async function main() {
  const adminPasswordHash = await bcrypt.hash('AuraAdmin1!', 10);
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
      roles: ['owner', 'admin'],
      status: 'active',
      passwordHash: adminPasswordHash,
      activatedAt: new Date(),
    },
    update: {
      roles: ['owner', 'admin'],
      status: 'active',
      passwordHash: adminPasswordHash,
    },
  });

  // HR-1 role assignments for owner
  await prisma.userRoleAssignment.deleteMany({ where: { userId: adminId, tenantId } });
  await prisma.userRoleAssignment.create({
    data: {
      id: 'ura_aura_owner',
      tenantId,
      userId: adminId,
      roleCode: 'owner',
      scope: { type: 'tenant' },
    },
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
      primaryDomain: 'themes.ngoinhahomnay.vn',
      seoTitle: 'AURA Beauty · Serum tái tạo da đêm',
      seoDescription: 'Storefront AURA Beauty — Powered by PTT',
    },
    update: {
      name: 'AURA Storefront',
      status: 'staging',
      primaryDomain: 'themes.ngoinhahomnay.vn',
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
      ownerType: 'storefront',
      ownerId: storefrontId,
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
  const {
    hasPackage,
    getPackage,
    packageToThemeConfig,
    packageToPageContent,
    packageToLegacyPageContent,
  } = await import('@ptt/themes');
  console.log(`Seeding ${TEMPLATE_CATALOG.length} marketplace playbooks…`);

  for (const t of TEMPLATE_CATALOG) {
    const fromPkg = hasPackage(t.code);
    const pkg = fromPkg ? getPackage(t.code) : null;
    const themeConfig = pkg
      ? packageToThemeConfig(pkg)
      : {
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
        };
    const pageContent = pkg
      ? (() => {
          const home = packageToPageContent(pkg);
          const legacy = packageToLegacyPageContent(pkg);
          return {
            ...legacy,
            schema_version: 1 as const,
            section_order: home.section_order,
            sections: home.sections,
          };
        })()
      : {
          section_order: ['hero', 'trust', 'featured'],
          hero: {
            eyebrow: t.name,
            headline: t.headline,
            cta: 'Khám phá',
            cta_href: '/search',
          },
          trust: ['COD', 'Đổi trả', 'Chính hãng'],
        };
    const features = pkg
      ? Array.from(new Set([...(t.features || []), ...pkg.manifest.supports]))
      : t.features;

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
        features,
        previewUrl: `https://themes.ngoinhahomnay.vn/?demo=${t.code}`,
        demoUrl: `https://themes.ngoinhahomnay.vn/`,
        themeConfig,
        pageContent,
        playbook: t.playbook,
        active: true,
      },
      update: {
        name: t.name,
        industry: t.industry,
        goal: t.goal,
        license: t.license,
        scores: t.scores,
        features,
        playbook: t.playbook,
        themeConfig,
        pageContent,
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

  // ─── CORP-CMS-0 — Platform CMS interim (ADR-008) ───────────
  const platformTenantId = 'ten_platform';
  const platformBrandId = 'brd_platform';
  const platformSfId = 'sf_platform_webcom';
  const platformSfEnId = 'sf_platform_webcom_en';
  const platformSiteApexId = 'psite_webcom_apex';
  const platformSiteStagingId = 'psite_webcom_staging';
  const platformSiteEnId = 'psite_webcom_en';
  const platformEditorId = 'usr_platform_editor';
  const platformApproverId = 'usr_platform_approver';
  const platformPasswordHash = await bcrypt.hash('PlatformCms1!', 10);

  await prisma.tenant.upsert({
    where: { id: platformTenantId },
    create: {
      id: platformTenantId,
      name: 'WebCom Platform',
      slug: 'webcom-platform',
      status: 'active',
    },
    update: { name: 'WebCom Platform', status: 'active' },
  });

  await prisma.brand.upsert({
    where: { tenantId_code: { tenantId: platformTenantId, code: 'WEBCOM' } },
    create: {
      id: platformBrandId,
      tenantId: platformTenantId,
      name: 'WebCom',
      code: 'WEBCOM',
    },
    update: { name: 'WebCom' },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: platformTenantId, email: 'editor@webcom.local' } },
    create: {
      id: platformEditorId,
      tenantId: platformTenantId,
      email: 'editor@webcom.local',
      name: 'Platform CMS Editor',
      roles: ['platform_cms_editor'],
      status: 'active',
      passwordHash: platformPasswordHash,
      activatedAt: new Date(),
    },
    update: {
      roles: ['platform_cms_editor'],
      status: 'active',
      passwordHash: platformPasswordHash,
    },
  });
  await prisma.userRoleAssignment.deleteMany({
    where: { userId: platformEditorId, tenantId: platformTenantId },
  });
  await prisma.userRoleAssignment.create({
    data: {
      id: 'ura_platform_editor',
      tenantId: platformTenantId,
      userId: platformEditorId,
      roleCode: 'platform_cms_editor',
      scope: { type: 'tenant' },
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: platformTenantId, email: 'approver@webcom.local' } },
    create: {
      id: platformApproverId,
      tenantId: platformTenantId,
      email: 'approver@webcom.local',
      name: 'Platform CMS Approver',
      roles: ['platform_cms_approver'],
      status: 'active',
      passwordHash: platformPasswordHash,
      activatedAt: new Date(),
    },
    update: {
      roles: ['platform_cms_approver'],
      status: 'active',
      passwordHash: platformPasswordHash,
    },
  });
  await prisma.userRoleAssignment.deleteMany({
    where: { userId: platformApproverId, tenantId: platformTenantId },
  });
  await prisma.userRoleAssignment.create({
    data: {
      id: 'ura_platform_approver',
      tenantId: platformTenantId,
      userId: platformApproverId,
      roleCode: 'platform_cms_approver',
      scope: { type: 'tenant' },
    },
  });

  await prisma.storefront.upsert({
    where: { tenantId_slug: { tenantId: platformTenantId, slug: 'platform-webcom' } },
    create: {
      id: platformSfId,
      tenantId: platformTenantId,
      brandId: platformBrandId,
      name: 'WebCom Corporate (interim PlatformSite)',
      slug: 'platform-webcom',
      status: 'published',
      primaryDomain: 'webecom.ngoinhahomnay.vn',
      seoTitle: 'WebCom · Website Commerce Platform',
      seoDescription: 'Platform CMS interim storefront — ADR-008',
    },
    update: {
      name: 'WebCom Corporate (interim PlatformSite)',
      status: 'published',
      primaryDomain: 'webecom.ngoinhahomnay.vn',
      seoTitle: 'WebCom · Website Commerce Platform',
      seoDescription: 'Platform CMS interim storefront — ADR-008',
    },
  });

  const homeStarter = getPlatformStarter('gtm_home')!;
  const pricingStarter = getPlatformStarter('gtm_pricing')!;
  const catalogStarter = getPlatformStarter('gtm_catalog')!;
  const solutionStarter = getPlatformStarter('gtm_solution')!;
  const industryStarter = getPlatformStarter('gtm_industry')!;
  const caseStarter = getPlatformStarter('gtm_case')!;
  const resourcesStarter = getPlatformStarter('gtm_resources')!;
  const resourceDetailStarter = getPlatformStarter('gtm_resource_detail')!;
  const tourStarter = getPlatformStarter('gtm_tour')!;

  const platformHomeContent = {
    ...toLegacyFlat(homeStarter.content),
    schema_version: 1,
    section_order: homeStarter.content.section_order,
    sections: homeStarter.content.sections,
  };
  const platformPricingContent = {
    ...toLegacyFlat(pricingStarter.content),
    schema_version: 1,
    section_order: pricingStarter.content.section_order,
    sections: pricingStarter.content.sections,
  };
  const platformCatalogContent = {
    ...toLegacyFlat(catalogStarter.content),
    schema_version: 1,
    section_order: catalogStarter.content.section_order,
    sections: catalogStarter.content.sections,
  };
  const platformSolutionContent = {
    ...toLegacyFlat(solutionStarter.content),
    schema_version: 1,
    section_order: solutionStarter.content.section_order,
    sections: solutionStarter.content.sections,
  };
  const platformIndustryContent = {
    ...toLegacyFlat(industryStarter.content),
    schema_version: 1,
    section_order: industryStarter.content.section_order,
    sections: industryStarter.content.sections,
  };
  const platformCaseContent = {
    ...toLegacyFlat(caseStarter.content),
    schema_version: 1,
    section_order: caseStarter.content.section_order,
    sections: caseStarter.content.sections,
  };
  const platformResourcesContent = {
    ...toLegacyFlat(resourcesStarter.content),
    schema_version: 1,
    section_order: resourcesStarter.content.section_order,
    sections: resourcesStarter.content.sections,
  };
  const platformResourceDetailContent = {
    ...toLegacyFlat(resourceDetailStarter.content),
    schema_version: 1,
    section_order: resourceDetailStarter.content.section_order,
    sections: resourceDetailStarter.content.sections,
  };
  const platformTourContent = {
    ...toLegacyFlat(tourStarter.content),
    schema_version: 1,
    section_order: tourStarter.content.section_order,
    sections: tourStarter.content.sections,
  };

  await prisma.page.upsert({
    where: { storefrontId_slug: { storefrontId: platformSfId, slug: 'home' } },
    create: {
      id: 'pg_platform_home',
      tenantId: platformTenantId,
      storefrontId: platformSfId,
      ownerType: 'platform',
      ownerId: 'psite_webcom_apex',
      slug: 'home',
      title: 'WebCom Homepage',
      templateKey: 'gtm_home',
      status: 'published',
    },
    update: { title: 'WebCom Homepage', templateKey: 'gtm_home', status: 'published' },
  });
  await prisma.pageVersion.upsert({
    where: { pageId_version: { pageId: 'pg_platform_home', version: 1 } },
    create: {
      id: 'pgv_platform_home_1',
      tenantId: platformTenantId,
      pageId: 'pg_platform_home',
      version: 1,
      status: 'published',
      content: platformHomeContent,
      seo: {
        title: 'WebCom · Website Commerce Platform',
        description: 'Platform homepage stub (CORP-CMS-0)',
      },
    },
    update: {
      status: 'published',
      content: platformHomeContent,
      seo: {
        title: 'WebCom · Website Commerce Platform',
        description: 'Platform homepage stub (CORP-CMS-0)',
      },
    },
  });

  await prisma.page.upsert({
    where: { storefrontId_slug: { storefrontId: platformSfId, slug: 'pricing' } },
    create: {
      id: 'pg_platform_pricing',
      tenantId: platformTenantId,
      storefrontId: platformSfId,
      ownerType: 'platform',
      ownerId: 'psite_webcom_apex',
      slug: 'pricing',
      title: 'WebCom Pricing',
      templateKey: 'gtm_pricing',
      status: 'published',
    },
    update: { title: 'WebCom Pricing', templateKey: 'gtm_pricing', status: 'published' },
  });
  await prisma.pageVersion.upsert({
    where: { pageId_version: { pageId: 'pg_platform_pricing', version: 1 } },
    create: {
      id: 'pgv_platform_pricing_1',
      tenantId: platformTenantId,
      pageId: 'pg_platform_pricing',
      version: 1,
      status: 'published',
      content: platformPricingContent,
      seo: {
        title: 'Bảng giá · WebCom',
        description: 'Pricing stub (CORP-CMS-0)',
      },
    },
    update: {
      status: 'published',
      content: platformPricingContent,
      seo: {
        title: 'Bảng giá · WebCom',
        description: 'Pricing stub (CORP-CMS-0)',
      },
    },
  });

  await prisma.page.upsert({
    where: { storefrontId_slug: { storefrontId: platformSfId, slug: 'templates' } },
    create: {
      id: 'pg_platform_templates',
      tenantId: platformTenantId,
      storefrontId: platformSfId,
      ownerType: 'platform',
      ownerId: 'psite_webcom_apex',
      slug: 'templates',
      title: 'Templates Catalog Intro',
      templateKey: 'gtm_catalog',
      status: 'published',
    },
    update: {
      title: 'Templates Catalog Intro',
      templateKey: 'gtm_catalog',
      status: 'published',
    },
  });
  await prisma.pageVersion.upsert({
    where: { pageId_version: { pageId: 'pg_platform_templates', version: 1 } },
    create: {
      id: 'pgv_platform_templates_1',
      tenantId: platformTenantId,
      pageId: 'pg_platform_templates',
      version: 1,
      status: 'published',
      content: platformCatalogContent,
      seo: {
        title: 'Templates · WebCom',
        description: 'Catalog intro (CORP-CMS-1)',
      },
    },
    update: {
      status: 'published',
      content: platformCatalogContent,
      seo: {
        title: 'Templates · WebCom',
        description: 'Catalog intro (CORP-CMS-1)',
      },
    },
  });

  // CORP-CMS-2 — solution / industry / case + nav
  await prisma.page.upsert({
    where: { storefrontId_slug: { storefrontId: platformSfId, slug: 'solutions/website' } },
    create: {
      id: 'pg_platform_sol_website',
      tenantId: platformTenantId,
      storefrontId: platformSfId,
      ownerType: 'platform',
      ownerId: 'psite_webcom_apex',
      slug: 'solutions/website',
      title: 'Solution · Website Commerce',
      templateKey: 'gtm_solution',
      status: 'published',
    },
    update: {
      title: 'Solution · Website Commerce',
      templateKey: 'gtm_solution',
      status: 'published',
    },
  });
  await prisma.pageVersion.upsert({
    where: { pageId_version: { pageId: 'pg_platform_sol_website', version: 1 } },
    create: {
      id: 'pgv_platform_sol_website_1',
      tenantId: platformTenantId,
      pageId: 'pg_platform_sol_website',
      version: 1,
      status: 'published',
      content: platformSolutionContent,
      seo: {
        title: 'Website Commerce · WebCom',
        description: 'Solution module (CORP-CMS-2)',
      },
    },
    update: {
      status: 'published',
      content: platformSolutionContent,
      seo: {
        title: 'Website Commerce · WebCom',
        description: 'Solution module (CORP-CMS-2)',
      },
    },
  });

  await prisma.page.upsert({
    where: { storefrontId_slug: { storefrontId: platformSfId, slug: 'industries/beauty' } },
    create: {
      id: 'pg_platform_ind_beauty',
      tenantId: platformTenantId,
      storefrontId: platformSfId,
      ownerType: 'platform',
      ownerId: 'psite_webcom_apex',
      slug: 'industries/beauty',
      title: 'Industry · Beauty',
      templateKey: 'gtm_industry',
      status: 'published',
    },
    update: {
      title: 'Industry · Beauty',
      templateKey: 'gtm_industry',
      status: 'published',
    },
  });
  await prisma.pageVersion.upsert({
    where: { pageId_version: { pageId: 'pg_platform_ind_beauty', version: 1 } },
    create: {
      id: 'pgv_platform_ind_beauty_1',
      tenantId: platformTenantId,
      pageId: 'pg_platform_ind_beauty',
      version: 1,
      status: 'published',
      content: platformIndustryContent,
      seo: {
        title: 'Beauty · WebCom',
        description: 'Industry playbook (CORP-CMS-2)',
      },
    },
    update: {
      status: 'published',
      content: platformIndustryContent,
      seo: {
        title: 'Beauty · WebCom',
        description: 'Industry playbook (CORP-CMS-2)',
      },
    },
  });

  await prisma.page.upsert({
    where: {
      storefrontId_slug: { storefrontId: platformSfId, slug: 'case-studies/aura-beauty' },
    },
    create: {
      id: 'pg_platform_case_aura',
      tenantId: platformTenantId,
      storefrontId: platformSfId,
      ownerType: 'platform',
      ownerId: 'psite_webcom_apex',
      slug: 'case-studies/aura-beauty',
      title: 'Case · AURA Beauty',
      templateKey: 'gtm_case',
      status: 'published',
    },
    update: {
      title: 'Case · AURA Beauty',
      templateKey: 'gtm_case',
      status: 'published',
    },
  });
  await prisma.pageVersion.upsert({
    where: { pageId_version: { pageId: 'pg_platform_case_aura', version: 1 } },
    create: {
      id: 'pgv_platform_case_aura_1',
      tenantId: platformTenantId,
      pageId: 'pg_platform_case_aura',
      version: 1,
      status: 'published',
      content: platformCaseContent,
      seo: {
        title: 'AURA Beauty case · WebCom',
        description: 'Case study ≥2 KPI (CORP-CMS-2)',
      },
    },
    update: {
      status: 'published',
      content: platformCaseContent,
      seo: {
        title: 'AURA Beauty case · WebCom',
        description: 'Case study ≥2 KPI (CORP-CMS-2)',
      },
    },
  });

  // CORP-CMS-3 — resources / gated detail / tour
  await prisma.page.upsert({
    where: { storefrontId_slug: { storefrontId: platformSfId, slug: 'resources' } },
    create: {
      id: 'pg_platform_resources',
      tenantId: platformTenantId,
      storefrontId: platformSfId,
      ownerType: 'platform',
      ownerId: 'psite_webcom_apex',
      slug: 'resources',
      title: 'Resources hub',
      templateKey: 'gtm_resources',
      status: 'published',
    },
    update: {
      title: 'Resources hub',
      templateKey: 'gtm_resources',
      status: 'published',
    },
  });
  await prisma.pageVersion.upsert({
    where: { pageId_version: { pageId: 'pg_platform_resources', version: 1 } },
    create: {
      id: 'pgv_platform_resources_1',
      tenantId: platformTenantId,
      pageId: 'pg_platform_resources',
      version: 1,
      status: 'published',
      content: platformResourcesContent,
      seo: { title: 'Resources · WebCom', description: 'Gated resources (CORP-CMS-3)' },
    },
    update: {
      status: 'published',
      content: platformResourcesContent,
      seo: { title: 'Resources · WebCom', description: 'Gated resources (CORP-CMS-3)' },
    },
  });

  await prisma.page.upsert({
    where: {
      storefrontId_slug: { storefrontId: platformSfId, slug: 'resources/golive-checklist' },
    },
    create: {
      id: 'pg_platform_res_golive',
      tenantId: platformTenantId,
      storefrontId: platformSfId,
      ownerType: 'platform',
      ownerId: 'psite_webcom_apex',
      slug: 'resources/golive-checklist',
      title: 'Go-live checklist',
      templateKey: 'gtm_resource_detail',
      status: 'published',
    },
    update: {
      title: 'Go-live checklist',
      templateKey: 'gtm_resource_detail',
      status: 'published',
    },
  });
  await prisma.pageVersion.upsert({
    where: { pageId_version: { pageId: 'pg_platform_res_golive', version: 1 } },
    create: {
      id: 'pgv_platform_res_golive_1',
      tenantId: platformTenantId,
      pageId: 'pg_platform_res_golive',
      version: 1,
      status: 'published',
      content: platformResourceDetailContent,
      seo: { title: 'Go-live checklist · WebCom', description: 'Gated detail (CORP-CMS-3)' },
    },
    update: {
      status: 'published',
      content: platformResourceDetailContent,
      seo: { title: 'Go-live checklist · WebCom', description: 'Gated detail (CORP-CMS-3)' },
    },
  });

  await prisma.page.upsert({
    where: { storefrontId_slug: { storefrontId: platformSfId, slug: 'tour' } },
    create: {
      id: 'pg_platform_tour',
      tenantId: platformTenantId,
      storefrontId: platformSfId,
      ownerType: 'platform',
      ownerId: 'psite_webcom_apex',
      slug: 'tour',
      title: 'Product tour',
      templateKey: 'gtm_tour',
      status: 'published',
    },
    update: { title: 'Product tour', templateKey: 'gtm_tour', status: 'published' },
  });
  await prisma.pageVersion.upsert({
    where: { pageId_version: { pageId: 'pg_platform_tour', version: 1 } },
    create: {
      id: 'pgv_platform_tour_1',
      tenantId: platformTenantId,
      pageId: 'pg_platform_tour',
      version: 1,
      status: 'published',
      content: platformTourContent,
      seo: { title: 'Tour · WebCom', description: 'Interactive tour (CORP-CMS-3)' },
    },
    update: {
      status: 'published',
      content: platformTourContent,
      seo: { title: 'Tour · WebCom', description: 'Interactive tour (CORP-CMS-3)' },
    },
  });

  await prisma.navigationMenu.upsert({
    where: { storefrontId_handle: { storefrontId: platformSfId, handle: 'header' } },
    create: {
      id: 'nav_platform_header',
      tenantId: platformTenantId,
      storefrontId: platformSfId,
      handle: 'header',
      items: [
        { label: 'Website bán hàng', href: '/templates?goal=conversion' },
        { label: 'Beauty & Live', href: '/templates?industry=beauty' },
        { label: 'Solutions', href: '/solutions/website' },
        { label: 'Resources', href: '/resources' },
        { label: 'Tour', href: '/tour' },
        { label: 'Case studies', href: '/case-studies' },
        { label: 'EN', href: '/en' },
      ],
    },
    update: {
      items: [
        { label: 'Website bán hàng', href: '/templates?goal=conversion' },
        { label: 'Beauty & Live', href: '/templates?industry=beauty' },
        { label: 'Solutions', href: '/solutions/website' },
        { label: 'Resources', href: '/resources' },
        { label: 'Tour', href: '/tour' },
        { label: 'Case studies', href: '/case-studies' },
        { label: 'EN', href: '/en' },
      ],
    },
  });
  await prisma.navigationMenu.upsert({
    where: { storefrontId_handle: { storefrontId: platformSfId, handle: 'footer' } },
    create: {
      id: 'nav_platform_footer',
      tenantId: platformTenantId,
      storefrontId: platformSfId,
      handle: 'footer',
      items: [
        { label: 'Templates', href: '/templates' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Resources', href: '/resources' },
        { label: 'Tour', href: '/tour' },
        { label: 'Trial', href: '/trial' },
        { label: 'English', href: '/en' },
      ],
    },
    update: {
      items: [
        { label: 'Templates', href: '/templates' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Resources', href: '/resources' },
        { label: 'Tour', href: '/tour' },
        { label: 'Trial', href: '/trial' },
        { label: 'English', href: '/en' },
      ],
    },
  });

  // PC2-10 — PlatformSite rows (first-class site registry)
  await prisma.platformSite.upsert({
    where: { siteKey: 'webcom_apex' },
    create: {
      id: platformSiteApexId,
      tenantId: platformTenantId,
      siteKey: 'webcom_apex',
      name: 'WebCom Platform',
      primaryHost: 'webecom.ngoinhahomnay.vn',
      defaultLocale: 'vi',
      status: 'live',
      interimStorefrontId: platformSfId,
      seoDefaults: {
        title: 'WebCom · Website Commerce Platform',
        description: 'Theme marketplace · Brand Kit · Go-live gate',
      },
      featureFlags: { cms: true, page_ab: true },
    },
    update: {
      name: 'WebCom Platform',
      primaryHost: 'webecom.ngoinhahomnay.vn',
      defaultLocale: 'vi',
      status: 'live',
      interimStorefrontId: platformSfId,
    },
  });
  await prisma.platformSite.upsert({
    where: { siteKey: 'webcom_staging' },
    create: {
      id: platformSiteStagingId,
      tenantId: platformTenantId,
      siteKey: 'webcom_staging',
      name: 'WebCom Platform (staging)',
      primaryHost: 'staging-webecom.ngoinhahomnay.vn',
      defaultLocale: 'vi',
      status: 'draft',
      interimStorefrontId: platformSfId,
    },
    update: {
      name: 'WebCom Platform (staging)',
      primaryHost: 'staging-webecom.ngoinhahomnay.vn',
      status: 'draft',
      interimStorefrontId: platformSfId,
    },
  });
  await prisma.platformSite.upsert({
    where: { siteKey: 'webcom_en' },
    create: {
      id: platformSiteEnId,
      tenantId: platformTenantId,
      siteKey: 'webcom_en',
      name: 'WebCom Platform (EN)',
      primaryHost: 'en.webecom.ngoinhahomnay.vn',
      defaultLocale: 'en',
      status: 'live',
      interimStorefrontId: platformSfEnId,
      seoDefaults: {
        title: 'WebCom · Website Commerce for Vietnam retail',
        description: 'Theme marketplace · Brand Kit · Go-live gate · Omnichannel POS',
      },
      featureFlags: { cms: true, page_ab: true },
    },
    update: {
      name: 'WebCom Platform (EN)',
      primaryHost: 'en.webecom.ngoinhahomnay.vn',
      defaultLocale: 'en',
      status: 'live',
      interimStorefrontId: platformSfEnId,
    },
  });

  // Tag all apex pages with platform owner (PC2-10)
  await prisma.page.updateMany({
    where: { tenantId: platformTenantId, storefrontId: platformSfId },
    data: { ownerType: 'platform', ownerId: platformSiteApexId },
  });

  // PC3-6 — homepage A/B experiment on interim SF
  await prisma.experiment.upsert({
    where: { storefrontId_code: { storefrontId: platformSfId, code: 'platform_home_hero_v1' } },
    create: {
      id: 'exp_platform_home_hero_v1',
      tenantId: platformTenantId,
      storefrontId: platformSfId,
      code: 'platform_home_hero_v1',
      name: 'Platform homepage hero A/B',
      status: 'running',
      metric: 'purchase_cvr',
      variants: [
        {
          key: 'control',
          weight: 1,
          headline: 'Bán đa kênh — điều hành theo lãi thật.',
          cta: 'Đặt demo',
          cta_href: '/#demo',
        },
        {
          key: 'benefit',
          weight: 1,
          headline: 'Website, Live, POS trên một OS — đo contribution margin.',
          cta: 'Xem templates',
          cta_href: '/templates',
        },
      ],
      startedAt: new Date(),
    },
    update: {
      status: 'running',
      variants: [
        {
          key: 'control',
          weight: 1,
          headline: 'Bán đa kênh — điều hành theo lãi thật.',
          cta: 'Đặt demo',
          cta_href: '/#demo',
        },
        {
          key: 'benefit',
          weight: 1,
          headline: 'Website, Live, POS trên một OS — đo contribution margin.',
          cta: 'Xem templates',
          cta_href: '/templates',
        },
      ],
    },
  });
  await prisma.page.update({
    where: { id: 'pg_platform_home' },
    data: { experimentCode: 'platform_home_hero_v1' },
  });

  // ─── webcom_en — real EN content (separate SF for unique slug) ───
  await prisma.storefront.upsert({
    where: { tenantId_slug: { tenantId: platformTenantId, slug: 'platform-webcom-en' } },
    create: {
      id: platformSfEnId,
      tenantId: platformTenantId,
      brandId: platformBrandId,
      name: 'WebCom Corporate EN (interim)',
      slug: 'platform-webcom-en',
      status: 'published',
      primaryDomain: 'en.webecom.ngoinhahomnay.vn',
      seoTitle: 'WebCom · Website Commerce Platform',
      seoDescription: 'Theme marketplace for Vietnam retail — English',
    },
    update: {
      name: 'WebCom Corporate EN (interim)',
      status: 'published',
      primaryDomain: 'en.webecom.ngoinhahomnay.vn',
      seoTitle: 'WebCom · Website Commerce Platform',
      seoDescription: 'Theme marketplace for Vietnam retail — English',
    },
  });

  const platformHomeEnContent = {
    schema_version: 1,
    section_order: ['announce', 'hero', 'proof', 'modules', 'cta'],
    sections: {
      announce: {
        type: 'announce_bar',
        id: 'sec_announce_en',
        props: {
          text: 'Run omnichannel on contribution margin — not just GMV',
          cta_label: 'Book demo',
          href: '/en#demo',
          cta_code: 'cta_book_demo',
          tone: 'promo',
          ends_at: null,
        },
        style: {},
      },
      hero: {
        type: 'platform_hero',
        id: 'sec_hero_en',
        props: {
          brand: 'PTT',
          headline: 'Sell omnichannel — run the business on real margin.',
          sub: 'Website, Social, Live, POS and marketplaces on one OS. Measure contribution margin, not just GMV.',
          primary_cta: {
            label: 'Book a demo',
            href: '/en#demo',
            cta_code: 'cta_book_demo',
          },
          secondary_cta: {
            label: 'Browse templates',
            href: '/templates',
            cta_code: 'cta_templates',
          },
          search_enabled: false,
        },
        style: {},
      },
      proof: {
        type: 'social_proof',
        id: 'sec_proof_en',
        props: {
          items: [
            { n: '1 OS', label: 'Commerce · Website · AI · Margin' },
            { n: '5+', label: 'Sales channels in sync' },
            { n: '15+', label: 'Carriers & COD' },
            { n: '12+', label: 'Payments / QR' },
          ],
        },
        style: {},
      },
      modules: {
        type: 'module_grid',
        id: 'sec_modules_en',
        props: {
          items: [
            {
              title: 'Website Commerce',
              body: 'CVR-scored themes · Brand Kit · Go-live gate',
              href: '/templates?goal=conversion',
              icon: 'cart',
            },
            {
              title: 'Live & Social',
              body: 'Keyword orders · attribution · margin after show',
              href: '/templates?goal=live',
              icon: 'live',
            },
            {
              title: 'Omnichannel POS',
              body: 'Price · stock · customers web ↔ counter',
              href: '/templates?goal=omnichannel',
              icon: 'pos',
            },
          ],
        },
        style: {},
      },
      cta: {
        type: 'cta_band',
        id: 'sec_cta_en',
        props: {
          headline: 'Book a 30-minute industry demo',
          body: 'Tour Command Center, Go-live, and Social/Live — compare margin vs GMV-only.',
          cta: { label: 'Book a demo', href: '/en#demo', cta_code: 'cta_book_demo' },
        },
        style: {},
      },
    },
  };

  const platformPricingEnContent = {
    schema_version: 1,
    section_order: ['hero', 'pricing', 'faq', 'cta'],
    sections: {
      hero: {
        type: 'platform_hero',
        id: 'sec_pricing_hero_en',
        props: {
          headline: 'Plans that match your stage',
          sub: 'Theme licenses are one-time. Platform plans are separate. Trial first — upgrade when ready.',
          primary_cta: {
            label: 'Book a demo',
            href: '/en#lead',
            cta_code: 'cta_book_demo',
          },
          search_enabled: false,
        },
        style: {},
      },
      pricing: {
        type: 'pricing_table',
        id: 'sec_pricing_en',
        props: {
          theme_note:
            'Theme license (one_time) is paid via VietQR on the Template Marketplace — not bundled into a Platform plan.',
          plans: [
            {
              name: 'Theme license',
              price: 'One-time',
              layer: 'theme',
              featured: false,
              features: [
                'Buy themes on the marketplace',
                'Install into your storefront',
                'Package updates per license',
              ],
              cta: {
                label: 'Browse templates',
                href: '/templates',
                cta_code: 'cta_templates',
              },
            },
            {
              name: 'Platform Growth',
              price: 'Contact',
              layer: 'platform',
              featured: true,
              features: [
                'Analytics & experiments',
                'CRM / RFM / loyalty',
                'Agency preview',
              ],
              cta: {
                label: 'Book a demo',
                href: '/en#lead',
                cta_code: 'cta_book_demo',
              },
            },
            {
              name: 'Platform Enterprise',
              price: 'Contact',
              layer: 'platform',
              featured: false,
              features: ['Headless API', 'SLA 99.9%', 'Dedicated success'],
              cta: {
                label: 'Contact sales',
                href: '/en#lead',
                cta_code: 'cta_book_demo',
              },
            },
          ],
        },
        style: {},
      },
      faq: {
        type: 'faq',
        id: 'sec_pricing_faq_en',
        props: {
          items: [
            {
              q: 'Are theme and Platform the same purchase?',
              a: 'No — themes are one-time on the marketplace; Platform plans cover ops (analytics, SLA…).',
            },
            {
              q: 'Is there a trial?',
              a: 'Yes — self-serve trial before buying a theme or upgrading Platform.',
            },
          ],
        },
        style: {},
      },
      cta: {
        type: 'cta_band',
        id: 'sec_pricing_cta_en',
        props: {
          headline: 'Need a Platform quote?',
          body: 'Sales responds during business hours (first-touch SLA 4h).',
          cta: { label: 'Book a demo', href: '/en#lead', cta_code: 'cta_book_demo' },
        },
        style: {},
      },
    },
  };

  await prisma.page.upsert({
    where: { storefrontId_slug: { storefrontId: platformSfEnId, slug: 'home' } },
    create: {
      id: 'pg_platform_en_home',
      tenantId: platformTenantId,
      storefrontId: platformSfEnId,
      ownerType: 'platform',
      ownerId: platformSiteEnId,
      slug: 'home',
      title: 'WebCom Homepage (EN)',
      templateKey: 'gtm_home',
      status: 'published',
    },
    update: {
      title: 'WebCom Homepage (EN)',
      templateKey: 'gtm_home',
      status: 'published',
      ownerType: 'platform',
      ownerId: platformSiteEnId,
    },
  });
  await prisma.pageVersion.upsert({
    where: { pageId_version: { pageId: 'pg_platform_en_home', version: 1 } },
    create: {
      id: 'pgv_platform_en_home_1',
      tenantId: platformTenantId,
      pageId: 'pg_platform_en_home',
      version: 1,
      status: 'published',
      content: platformHomeEnContent,
      seo: {
        title: 'WebCom · Website Commerce for Vietnam retail',
        description: 'Theme marketplace · Brand Kit · Go-live gate · Omnichannel POS',
      },
    },
    update: {
      status: 'published',
      content: platformHomeEnContent,
      seo: {
        title: 'WebCom · Website Commerce for Vietnam retail',
        description: 'Theme marketplace · Brand Kit · Go-live gate · Omnichannel POS',
      },
    },
  });

  await prisma.page.upsert({
    where: { storefrontId_slug: { storefrontId: platformSfEnId, slug: 'pricing' } },
    create: {
      id: 'pg_platform_en_pricing',
      tenantId: platformTenantId,
      storefrontId: platformSfEnId,
      ownerType: 'platform',
      ownerId: platformSiteEnId,
      slug: 'pricing',
      title: 'WebCom Pricing (EN)',
      templateKey: 'gtm_pricing',
      status: 'published',
    },
    update: {
      title: 'WebCom Pricing (EN)',
      templateKey: 'gtm_pricing',
      status: 'published',
      ownerType: 'platform',
      ownerId: platformSiteEnId,
    },
  });
  await prisma.pageVersion.upsert({
    where: { pageId_version: { pageId: 'pg_platform_en_pricing', version: 1 } },
    create: {
      id: 'pgv_platform_en_pricing_1',
      tenantId: platformTenantId,
      pageId: 'pg_platform_en_pricing',
      version: 1,
      status: 'published',
      content: platformPricingEnContent,
      seo: {
        title: 'WebCom Pricing · Theme vs Platform plans',
        description: 'Theme one-time licenses and Platform plans explained.',
      },
    },
    update: {
      status: 'published',
      content: platformPricingEnContent,
      seo: {
        title: 'WebCom Pricing · Theme vs Platform plans',
        description: 'Theme one-time licenses and Platform plans explained.',
      },
    },
  });

  await prisma.navigationMenu.upsert({
    where: { storefrontId_handle: { storefrontId: platformSfEnId, handle: 'header' } },
    create: {
      id: 'nav_platform_en_header',
      tenantId: platformTenantId,
      storefrontId: platformSfEnId,
      handle: 'header',
      items: [
        { label: 'Home', href: '/en' },
        { label: 'Templates', href: '/templates' },
        { label: 'Pricing', href: '/en/pricing' },
        { label: 'Trial', href: '/trial' },
        { label: 'Tiếng Việt', href: '/' },
      ],
    },
    update: {
      items: [
        { label: 'Home', href: '/en' },
        { label: 'Templates', href: '/templates' },
        { label: 'Pricing', href: '/en/pricing' },
        { label: 'Trial', href: '/trial' },
        { label: 'Tiếng Việt', href: '/' },
      ],
    },
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
        platform_cms: {
          tenant_id: platformTenantId,
          storefront_id: platformSfId,
          storefront_en_id: platformSfEnId,
          site_key: 'webcom_apex',
          site_keys: ['webcom_apex', 'webcom_staging', 'webcom_en'],
          experiment: 'platform_home_hero_v1',
          editor_user_id: platformEditorId,
          approver_user_id: platformApproverId,
          pages: [
            'home',
            'pricing',
            'templates',
            'solutions/website',
            'industries/beauty',
            'case-studies/aura-beauty',
            'resources',
            'resources/golive-checklist',
            'tour',
          ],
          pages_en: ['home', 'pricing'],
        },
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
