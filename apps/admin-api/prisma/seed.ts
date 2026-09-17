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
      status: 'draft',
    },
    update: { name: 'AURA Storefront', status: 'draft' },
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
