import { Injectable } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

function money(n: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(n).toFixed(2);
}

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveUnitPrice(tenantId: string, skuId: string) {
    const item = await this.prisma.db.priceListItem.findFirst({
      where: {
        tenantId,
        skuId,
        priceList: { tenantId, isDefault: true },
      },
      include: { priceList: true },
    });
    if (!item) throw AppError.notFound(`No price for sku ${skuId}`);

    let amount = new Prisma.Decimal(item.amount);
    if (item.discountPercent) {
      const pct = new Prisma.Decimal(item.discountPercent).div(100);
      amount = amount.mul(new Prisma.Decimal(1).sub(pct));
    }
    return {
      unitPrice: amount,
      currency: item.priceList.currency,
      listAmount: item.amount,
      discountPercent: item.discountPercent,
    };
  }
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pricing: PricingService,
  ) {}

  async listProducts(tenantId: string, brandId?: string) {
    const products = await this.prisma.db.product.findMany({
      where: {
        tenantId,
        status: 'active',
        ...(brandId ? { brandId } : {}),
      },
      include: {
        media: { orderBy: { sortOrder: 'asc' } },
        variants: { include: { skus: { include: { inventory: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      products.map(async (p) => {
        const skus = p.variants.flatMap((v) => v.skus);
        const priced = await Promise.all(
          skus.map(async (s) => {
            const price = await this.pricing.resolveUnitPrice(tenantId, s.id).catch(() => null);
            const onHand = s.inventory?.onHand ?? 0;
            const reserved = s.inventory?.reserved ?? 0;
            return {
              id: s.id,
              code: s.code,
              variant_id: s.variantId,
              unit_price: price ? money(price.unitPrice) : null,
              currency: price?.currency ?? 'VND',
              available: Math.max(0, onHand - reserved),
            };
          }),
        );
        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          description: p.description,
          brand_id: p.brandId,
          media: p.media.map((m) => ({ url: m.url, alt: m.alt })),
          skus: priced,
        };
      }),
    );
  }

  async getProduct(tenantId: string, idOrSlug: string) {
    const product = await this.prisma.db.product.findFirst({
      where: {
        tenantId,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        media: { orderBy: { sortOrder: 'asc' } },
        variants: { include: { skus: { include: { inventory: true } } } },
      },
    });
    if (!product) throw AppError.notFound('Product not found');
    const list = await this.listProducts(tenantId, product.brandId);
    return list.find((p) => p.id === product.id) ?? list[0];
  }

  async createProduct(
    tenantId: string,
    actorId: string,
    input: {
      brandId: string;
      title: string;
      slug: string;
      description?: string;
      skuCode: string;
      price: number;
      discountPercent?: number;
      onHand?: number;
      mediaUrl?: string;
    },
  ) {
    const existing = await this.prisma.db.sku.findUnique({
      where: { tenantId_code: { tenantId, code: input.skuCode } },
    });
    if (existing) throw AppError.conflict(`SKU ${input.skuCode} already exists`);

    const productId = createId('prd');
    const variantId = createId('var');
    const skuId = createId('sku');

    const product = await this.prisma.db.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          id: productId,
          tenantId,
          brandId: input.brandId,
          title: input.title,
          slug: input.slug,
          description: input.description ?? '',
        },
      });
      await tx.productVariant.create({
        data: {
          id: variantId,
          tenantId,
          productId,
          title: 'Default',
          options: {},
        },
      });
      await tx.sku.create({
        data: { id: skuId, tenantId, variantId, code: input.skuCode },
      });
      let priceList = await tx.priceList.findFirst({
        where: { tenantId, brandId: input.brandId, isDefault: true },
      });
      if (!priceList) {
        priceList = await tx.priceList.create({
          data: {
            id: createId('pl'),
            tenantId,
            brandId: input.brandId,
            name: 'Default',
            isDefault: true,
          },
        });
      }
      await tx.priceListItem.create({
        data: {
          id: createId('pli'),
          tenantId,
          priceListId: priceList.id,
          skuId,
          amount: input.price,
          discountPercent: input.discountPercent ?? null,
        },
      });
      await tx.inventoryBalance.create({
        data: {
          id: createId('inv'),
          tenantId,
          skuId,
          onHand: input.onHand ?? 0,
          reserved: 0,
        },
      });
      if (input.mediaUrl) {
        await tx.productMedia.create({
          data: {
            id: createId('med'),
            tenantId,
            productId,
            url: input.mediaUrl,
            alt: input.title,
          },
        });
      }
      return p;
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'product.create',
      entity: 'product',
      entityId: product.id,
      payload: { skuCode: input.skuCode, price: input.price },
    });

    return this.getProduct(tenantId, product.id);
  }
}
