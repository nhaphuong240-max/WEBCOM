import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OpenSearchClient, type ProductSearchDoc } from './opensearch.client';

@Injectable()
export class SearchIndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(SearchIndexerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private processed = 0;
  private failed = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly os: OpenSearchClient,
  ) {}

  onModuleInit() {
    if (!this.os.status().enabled) return;
    this.timer = setInterval(() => void this.drain(), 200);
    if (typeof this.timer.unref === 'function') this.timer.unref();
    void this.backfill().catch((e) => this.log.warn(`search backfill: ${e}`));
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  status() {
    return {
      processed: this.processed,
      failed: this.failed,
      opensearch: this.os.status(),
    };
  }

  async enqueueProductUpsert(tenantId: string, productId: string, payload?: ProductSearchDoc) {
    if (!this.os.status().enabled) return null;
    const row = await this.prisma.db.searchOutbox.create({
      data: {
        id: createId('sox'),
        tenantId,
        aggregateType: 'product',
        aggregateId: productId,
        op: 'upsert',
        payload: (payload ?? {}) as Prisma.InputJsonValue,
        status: 'pending',
      },
    });
    // Near-realtime for same-request search (e2e)
    await this.drain(20);
    return row.id;
  }

  async buildProductDoc(tenantId: string, productId: string): Promise<ProductSearchDoc | null> {
    const p = await this.prisma.db.product.findFirst({
      where: { id: productId, tenantId },
      include: {
        variants: { include: { skus: { include: { prices: true } } } },
      },
    });
    if (!p) return null;
    const amounts = p.variants
      .flatMap((v) => v.skus)
      .flatMap((s) => s.prices.map((x) => Number(x.amount)));
    const minPrice = amounts.length ? Math.min(...amounts) : 0;
    const tags = [
      ...p.slug.split('-').filter((t) => t.length > 2),
      ...p.title.toLowerCase().split(/\s+/).filter((t) => t.length > 2),
    ];
    return {
      product_id: p.id,
      tenant_id: p.tenantId,
      brand_id: p.brandId,
      title: p.title,
      slug: p.slug,
      description: p.description,
      status: p.status,
      collection_tags: [...new Set(tags)],
      min_price: minPrice,
      updated_at: p.updatedAt.toISOString(),
    };
  }

  async drain(limit = 50) {
    const rows = await this.prisma.db.searchOutbox.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    for (const row of rows) {
      try {
        if (row.op === 'delete') {
          await this.os.remove(row.tenantId, row.aggregateId);
        } else {
          const payload = row.payload as Partial<ProductSearchDoc>;
          const doc =
            payload?.product_id && payload.title
              ? (payload as ProductSearchDoc)
              : await this.buildProductDoc(row.tenantId, row.aggregateId);
          if (doc) await this.os.index(doc);
        }
        await this.prisma.db.searchOutbox.update({
          where: { id: row.id },
          data: { status: 'processed', processedAt: new Date(), attempts: row.attempts + 1 },
        });
        this.processed += 1;
      } catch (e) {
        this.failed += 1;
        await this.prisma.db.searchOutbox.update({
          where: { id: row.id },
          data: {
            status: row.attempts >= 5 ? 'failed' : 'pending',
            attempts: row.attempts + 1,
            lastError: e instanceof Error ? e.message : String(e),
          },
        });
      }
    }
  }

  async backfill() {
    const raw = process.env.FEATURE_SEARCH_BACKFILL;
    const enabled = raw === undefined || raw === '' || raw === '1' || raw === 'true';
    if (!enabled) return;
    const products = await this.prisma.db.product.findMany({
      where: { status: 'active' },
      take: Number(process.env.SEARCH_BACKFILL_LIMIT || 2000),
      select: { id: true, tenantId: true },
    });
    let n = 0;
    for (const p of products) {
      const doc = await this.buildProductDoc(p.tenantId, p.id);
      if (doc) {
        await this.os.index(doc);
        n += 1;
      }
    }
    this.log.log(`Search backfill indexed ${n} products`);
  }

  async reindexTenant(tenantId: string) {
    const products = await this.prisma.db.product.findMany({
      where: { tenantId, status: 'active' },
      select: { id: true },
    });
    for (const p of products) {
      await this.enqueueProductUpsert(tenantId, p.id);
    }
    await this.drain(products.length + 10);
    return { indexed: products.length, opensearch: this.os.status() };
  }
}
