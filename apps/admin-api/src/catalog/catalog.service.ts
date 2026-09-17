import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SearchService } from '../search/search.service';
import { SearchIndexerService } from '../search/search-indexer.service';

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
    @Inject(forwardRef(() => SearchService))
    private readonly search: SearchService,
    @Inject(forwardRef(() => SearchIndexerService))
    private readonly indexer: SearchIndexerService,
  ) {}

  async listProducts(
    tenantId: string,
    opts?: {
      brandId?: string;
      q?: string;
      collection?: string;
      sort?: 'price_asc' | 'price_desc' | 'newest';
    },
  ) {
    const searched = await this.searchProducts(tenantId, opts);
    return searched.items;
  }

  /**
   * A5 search: OpenSearch IDs → hydrate from Postgres; fallback full PG scan.
   */
  async searchProducts(
    tenantId: string,
    opts?: {
      brandId?: string;
      q?: string;
      collection?: string;
      sort?: 'price_asc' | 'price_desc' | 'newest';
    },
  ) {
    const brandId = opts?.brandId;
    const osHit = await this.search.searchIds({
      tenantId,
      brandId,
      q: opts?.q,
      collection: opts?.collection,
    });

    let products;
    let source: 'opensearch' | 'opensearch_stub' | 'postgres' = 'postgres';
    let latencyMs = 0;

    if (osHit && (opts?.q?.trim() || opts?.collection?.trim())) {
      source = osHit.source;
      latencyMs = osHit.latency_ms;
      if (osHit.ids.length === 0) {
        return {
          items: [] as Awaited<ReturnType<CatalogService['mapProducts']>>,
          meta: { source, latency_ms: latencyMs, engine: osHit.mode, count: 0 },
        };
      }
      products = await this.prisma.db.product.findMany({
        where: {
          tenantId,
          id: { in: osHit.ids },
          status: 'active',
          ...(brandId ? { brandId } : {}),
        },
        include: {
          media: { orderBy: { sortOrder: 'asc' } },
          variants: { include: { skus: { include: { inventory: true } } } },
        },
      });
      // Preserve OS relevance order
      const order = new Map(osHit.ids.map((id, i) => [id, i]));
      products.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    } else {
      products = await this.prisma.db.product.findMany({
        where: {
          tenantId,
          status: 'active',
          ...(brandId ? { brandId } : {}),
          ...(opts?.q
            ? {
                OR: [
                  { title: { contains: opts.q, mode: 'insensitive' } },
                  { description: { contains: opts.q, mode: 'insensitive' } },
                  { slug: { contains: opts.q, mode: 'insensitive' } },
                ],
              }
            : {}),
          ...(opts?.collection
            ? {
                OR: [
                  {
                    title: {
                      contains: opts.collection.replace(/-/g, ' '),
                      mode: 'insensitive',
                    },
                  },
                  {
                    description: {
                      contains: opts.collection.replace(/-/g, ' '),
                      mode: 'insensitive',
                    },
                  },
                  { slug: { contains: opts.collection, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        include: {
          media: { orderBy: { sortOrder: 'asc' } },
          variants: { include: { skus: { include: { inventory: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
      source = 'postgres';
    }

    const mapped = await this.mapProducts(tenantId, products);
    if (opts?.sort === 'price_asc') {
      mapped.sort((a, b) => Number(a.min_price ?? 0) - Number(b.min_price ?? 0));
    } else if (opts?.sort === 'price_desc') {
      mapped.sort((a, b) => Number(b.min_price ?? 0) - Number(a.min_price ?? 0));
    }

    return {
      items: mapped,
      meta: {
        source,
        latency_ms: latencyMs,
        engine: source === 'postgres' ? 'postgres' : source === 'opensearch' ? 'live' : 'stub',
        count: mapped.length,
        within_slo: latencyMs <= Number(process.env.SEARCH_P95_SLO_MS || 200),
      },
    };
  }

  private async mapProducts(
    tenantId: string,
    products: Array<{
      id: string;
      title: string;
      slug: string;
      description: string;
      brandId: string;
      media: Array<{ url: string; alt: string | null }>;
      variants: Array<{
        id: string;
        title: string;
        skus: Array<{
          id: string;
          code: string;
          variantId: string;
          inventory: { onHand: number; reserved: number } | null;
        }>;
      }>;
    }>,
  ) {
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
              variant_title: p.variants.find((v) => v.id === s.variantId)?.title ?? 'Default',
              unit_price: price ? money(price.unitPrice) : null,
              list_price: price ? money(price.listAmount) : null,
              discount_percent: price?.discountPercent ? Number(price.discountPercent) : null,
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
          min_price: priced[0]?.unit_price ?? null,
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
    const list = await this.listProducts(tenantId, { brandId: product.brandId });
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

    await this.indexer.enqueueProductUpsert(tenantId, product.id).catch(() => undefined);

    return this.getProduct(tenantId, product.id);
  }
}
