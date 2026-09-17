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
