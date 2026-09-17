import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AppError, createId } from '@ptt/shared-kernel';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PricingService } from '../catalog/catalog.service';
import { ShopeeConnector } from './shopee.connector';

function money(n: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(n).toFixed(2);
}

function lagSloMs() {
  return Number(process.env.MARKETPLACE_STOCK_LAG_SLO_MS || 60_000);
}

@Injectable()
export class MarketplaceService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(MarketplaceService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private processed = 0;
  private failed = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pricing: PricingService,
    private readonly shopee: ShopeeConnector,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.drain(30), 250);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  status() {
    return {
      wave: 'B5',
      connector: this.shopee.status(),
      outbox: { processed: this.processed, failed: this.failed },
      features: {
        account_connect: true,
        listing_map: true,
        stock_sync_outbox: true,
        order_pull: true,
        exception_queue: true,
        lag_slo_ms: lagSloMs(),
      },
    };
  }

  async listAccounts(tenantId: string) {
    const rows = await this.prisma.db.marketplaceAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.mapAccount(r));
  }

  async connect(
    tenantId: string,
    input: {
      platform?: string;
      shop_id?: string;
      shop_name?: string;
      storefront_id?: string;
    },
    actorId?: string,
  ) {
    const platform = (input.platform || 'shopee').toLowerCase();
    if (platform !== 'shopee') {
      throw AppError.validation('B5 connector #1 supports shopee only (stub)');
    }
    if (input.storefront_id) {
      const sf = await this.prisma.db.storefront.findFirst({
        where: { id: input.storefront_id, tenantId },
      });
      if (!sf) throw AppError.notFound('Storefront not found');
    }

    const stub = this.shopee.connectStub({
      shop_id: input.shop_id,
      shop_name: input.shop_name,
    });

    const existing = await this.prisma.db.marketplaceAccount.findFirst({
      where: { tenantId, platform: 'shopee', shopId: stub.shop_id },
    });

    const row = existing
      ? await this.prisma.db.marketplaceAccount.update({
          where: { id: existing.id },
          data: {
            status: 'connected',
            shopName: stub.shop_name,
            storefrontId: input.storefront_id ?? existing.storefrontId,
            credentials: stub.credentials as Prisma.InputJsonValue,
            metadata: stub.metadata as Prisma.InputJsonValue,
            connectedAt: new Date(),
          },
        })
      : await this.prisma.db.marketplaceAccount.create({
          data: {
            id: createId('mkt'),
            tenantId,
            storefrontId: input.storefront_id,
            platform: 'shopee',
            shopId: stub.shop_id,
            shopName: stub.shop_name,
            status: 'connected',
            credentials: stub.credentials as Prisma.InputJsonValue,
            metadata: stub.metadata as Prisma.InputJsonValue,
            connectedAt: new Date(),
          },
        });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'marketplace.connect',
      entity: 'marketplace_account',
      entityId: row.id,
      payload: { platform: 'shopee', shop_id: row.shopId },
    });

    return this.mapAccount(row);
  }

  async disconnect(tenantId: string, id: string, actorId?: string) {
    const row = await this.requireAccount(tenantId, id);
    const updated = await this.prisma.db.marketplaceAccount.update({
      where: { id: row.id },
      data: { status: 'disconnected' },
    });
    await this.audit.write({
      tenantId,
      actorId,
      action: 'marketplace.disconnect',
      entity: 'marketplace_account',
      entityId: id,
    });
    return this.mapAccount(updated);
  }

  async listListings(tenantId: string, accountId?: string) {
    const where: Prisma.MarketplaceListingWhereInput = { tenantId };
    if (accountId) where.accountId = accountId;
    const rows = await this.prisma.db.marketplaceListing.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => this.mapListing(r));
  }

  /** Push PIM SKU → Shopee listing (creates mapping + enqueues stock sync). */
  async upsertListing(
    tenantId: string,
    input: {
      account_id: string;
      sku_id: string;
      title?: string;
      external_item_id?: string;
    },
    actorId?: string,
  ) {
    const account = await this.requireAccount(tenantId, input.account_id);
    if (account.status !== 'connected') throw AppError.conflict('Account not connected');

    const sku = await this.prisma.db.sku.findFirst({
      where: { id: input.sku_id, tenantId, status: 'active' },
      include: { inventory: true, variant: { include: { product: true } } },
    });
    if (!sku) throw AppError.notFound('SKU not found');

    const price = await this.pricing.resolveUnitPrice(tenantId, sku.id);
    const stockLocal = Math.max(0, (sku.inventory?.onHand ?? 0) - (sku.inventory?.reserved ?? 0));
    const title = input.title || sku.variant.product.title;

    const remote = await this.shopee.upsertListing({
      shop_id: account.shopId,
      sku_code: sku.code,
      title,
      price: Number(price.unitPrice),
      stock: stockLocal,
      external_item_id: input.external_item_id,
    });

    const existing = await this.prisma.db.marketplaceListing.findFirst({
      where: { accountId: account.id, skuId: sku.id },
    });

    const listing = existing
      ? await this.prisma.db.marketplaceListing.update({
          where: { id: existing.id },
          data: {
            externalItemId: remote.external_item_id,
            externalSku: remote.external_sku,
            title: remote.title,
            status: 'active',
            priceRemote: remote.price_remote,
            stockRemote: remote.stock_remote,
            stockLocal,
          },
        })
      : await this.prisma.db.marketplaceListing.create({
          data: {
            id: createId('mlst'),
            tenantId,
            accountId: account.id,
            skuId: sku.id,
            externalItemId: remote.external_item_id,
            externalSku: remote.external_sku,
            title: remote.title,
            status: 'active',
            priceRemote: remote.price_remote,
            stockRemote: remote.stock_remote,
            stockLocal,
          },
        });

    await this.enqueueStockSync(tenantId, account.id, listing.id, actorId);
    await this.drain(50);

    const fresh = await this.prisma.db.marketplaceListing.findFirstOrThrow({
      where: { id: listing.id },
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'marketplace.listing_upsert',
      entity: 'marketplace_listing',
      entityId: listing.id,
      payload: { sku_id: sku.id, external_item_id: remote.external_item_id },
    });

    return this.mapListing(fresh);
  }

  /** Enqueue stock push for one listing (or all on account). */
  async syncStock(
    tenantId: string,
    input: { account_id: string; listing_id?: string },
    actorId?: string,
  ) {
    const account = await this.requireAccount(tenantId, input.account_id);
    const listings = await this.prisma.db.marketplaceListing.findMany({
      where: {
        tenantId,
        accountId: account.id,
        status: 'active',
        ...(input.listing_id ? { id: input.listing_id } : {}),
      },
    });
    if (!listings.length) throw AppError.notFound('No listings to sync');

    const jobIds: string[] = [];
    for (const l of listings) {
      const id = await this.enqueueStockSync(tenantId, account.id, l.id, actorId);
      if (id) jobIds.push(id);
    }
    const drained = await this.drain(100);
    const updated = await this.prisma.db.marketplaceListing.findMany({
      where: { id: { in: listings.map((l) => l.id) } },
    });

    return {
      enqueued: jobIds.length,
      drained,
      lag_slo_ms: lagSloMs(),
      listings: updated.map((l) => this.mapListing(l)),
      within_slo: updated.every((l) => (l.lastLagMs ?? 0) <= lagSloMs()),
    };
  }

  /**
   * Pull / ingest marketplace order stub.
   * Matched if all line SKUs map to listings; else exception queue (unmatched).
   */
  async ingestOrder(
    tenantId: string,
    input: {
      account_id: string;
      external_order_id?: string;
      buyer_name?: string;
      buyer_phone?: string;
      shipping_address?: string;
      lines: Array<{ sku_id?: string; external_item_id?: string; qty: number; unit_price?: number }>;
      auto_import?: boolean;
    },
    actorId?: string,
  ) {
    const account = await this.requireAccount(tenantId, input.account_id);
    if (!input.lines?.length) throw AppError.validation('lines required');

    const externalOrderId = input.external_order_id || `SPX-${Date.now()}`;
    const existing = await this.prisma.db.marketplaceOrder.findFirst({
      where: { accountId: account.id, externalOrderId },
    });
    if (existing) {
      return { deduped: true, order: this.mapMktOrder(existing) };
    }

    const resolvedLines: Array<{
      sku_id: string | null;
      external_item_id: string | null;
      qty: number;
      unit_price: string;
      title: string;
    }> = [];
    let unmatched = false;
    let total = new Prisma.Decimal(0);

    for (const line of input.lines) {
      let skuId = line.sku_id || null;
      let externalItemId = line.external_item_id || null;
      let title = 'Unknown';

      if (!skuId && externalItemId) {
        const listing = await this.prisma.db.marketplaceListing.findFirst({
          where: { accountId: account.id, externalItemId },
        });
        skuId = listing?.skuId ?? null;
        title = listing?.title || title;
      }
      if (skuId) {
        const listing = await this.prisma.db.marketplaceListing.findFirst({
          where: { accountId: account.id, skuId },
        });
        if (listing) {
          externalItemId = listing.externalItemId;
          title = listing.title || title;
        } else {
          const sku = await this.prisma.db.sku.findFirst({
            where: { id: skuId, tenantId },
            include: { variant: { include: { product: true } } },
          });
          if (!sku) {
            unmatched = true;
            skuId = null;
          } else {
            title = sku.variant.product.title;
            // no listing map → still unmatched for marketplace attribution
            unmatched = true;
          }
        }
      } else {
        unmatched = true;
      }

      const unit =
        line.unit_price != null
          ? new Prisma.Decimal(line.unit_price)
          : skuId
            ? (await this.pricing.resolveUnitPrice(tenantId, skuId)).unitPrice
            : new Prisma.Decimal(0);
      total = total.add(unit.mul(line.qty));
      resolvedLines.push({
        sku_id: skuId,
        external_item_id: externalItemId,
        qty: line.qty,
        unit_price: money(unit),
        title,
      });
    }

    const matchStatus = unmatched ? 'unmatched' : 'matched';
    const exceptionReason = unmatched
      ? 'One or more lines missing SKU↔listing map'
      : null;

    let mktOrder = await this.prisma.db.marketplaceOrder.create({
      data: {
        id: createId('mord'),
        tenantId,
        accountId: account.id,
        externalOrderId,
        matchStatus,
        importStatus: 'pending',
        currency: 'VND',
        totalAmount: total,
        buyerName: input.buyer_name || 'Shopee Buyer',
        buyerPhone: input.buyer_phone || '0900000000',
        shippingAddress: input.shipping_address || 'Shopee address',
        linesSnapshot: resolvedLines as unknown as Prisma.InputJsonValue,
        exceptionReason,
        rawPayload: input as unknown as Prisma.InputJsonValue,
        placedAt: new Date(),
      },
    });

    if (matchStatus === 'unmatched') {
      mktOrder = await this.prisma.db.marketplaceOrder.update({
        where: { id: mktOrder.id },
        data: { matchStatus: 'exception', importStatus: 'failed' },
      });
      await this.audit.write({
        tenantId,
        actorId,
        action: 'marketplace.order_exception',
        entity: 'marketplace_order',
        entityId: mktOrder.id,
        payload: { external_order_id: externalOrderId, reason: exceptionReason },
      });
      return { deduped: false, order: this.mapMktOrder(mktOrder), oms: null };
    }

    if (input.auto_import !== false) {
      const oms = await this.importMatchedOrder(tenantId, mktOrder.id, actorId);
      return { deduped: false, order: oms.marketplace_order, oms: oms.order };
    }

    return { deduped: false, order: this.mapMktOrder(mktOrder), oms: null };
  }

  async importMatchedOrder(tenantId: string, marketplaceOrderId: string, actorId?: string) {
    const mkt = await this.prisma.db.marketplaceOrder.findFirst({
      where: { id: marketplaceOrderId, tenantId },
      include: { account: true },
    });
    if (!mkt) throw AppError.notFound('Marketplace order not found');
    if (mkt.matchStatus === 'exception' || mkt.matchStatus === 'unmatched') {
      throw AppError.conflict('Cannot import unmatched/exception order — map listings first');
    }
    if (mkt.orderId) {
      const existing = await this.prisma.db.order.findFirst({ where: { id: mkt.orderId, tenantId } });
      return {
        marketplace_order: this.mapMktOrder(mkt),
        order: existing
          ? { order_id: existing.id, status: existing.status, total: money(existing.totalAmount) }
          : null,
      };
    }

    const lines = mkt.linesSnapshot as Array<{
      sku_id: string;
      qty: number;
      unit_price: string;
      title: string;
    }>;
    if (lines.some((l) => !l.sku_id)) {
      throw AppError.conflict('Lines missing sku_id');
    }

    const skuRows = await this.prisma.db.sku.findMany({
      where: { tenantId, id: { in: lines.map((l) => l.sku_id) } },
    });
    const skuCodeById = new Map(skuRows.map((s) => [s.id, s.code]));

    const sf =
      (mkt.account.storefrontId &&
        (await this.prisma.db.storefront.findFirst({
          where: { id: mkt.account.storefrontId, tenantId },
        }))) ||
      (await this.prisma.db.storefront.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' } }));
    if (!sf) throw AppError.notFound('Storefront required');

    const orderId = createId('ord');
    const created = await this.prisma.db.$transaction(async (tx) => {
      for (const line of lines) {
        const bal = await tx.inventoryBalance.findFirst({
          where: { tenantId, skuId: line.sku_id },
        });
        if (!bal) throw AppError.notFound(`Inventory missing for ${line.sku_id}`);
        const avail = Math.max(0, bal.onHand - bal.reserved);
        if (avail < line.qty) {
          throw AppError.insufficientStock('Insufficient stock for marketplace import', {
            sku_id: line.sku_id,
            available: avail,
            requested: line.qty,
          });
        }
      }

      const order = await tx.order.create({
        data: {
          id: orderId,
          tenantId,
          storefrontId: sf.id,
          status: 'CONFIRMED',
          currency: mkt.currency,
          subtotalAmount: mkt.totalAmount,
          discountAmount: 0,
          shippingAmount: 0,
          totalAmount: mkt.totalAmount,
          paymentMethod: 'COD',
          paymentStatus: 'pending',
          shippingName: mkt.buyerName,
          shippingPhone: mkt.buyerPhone,
          shippingAddress: mkt.shippingAddress,
          shippingCity: '',
          note: `Shopee ${mkt.externalOrderId}`,
          attributionChannel: 'marketplace/shopee',
          attributionProvider: 'shopee',
          attributionThreadId: mkt.externalOrderId,
          idempotencyKey: `shopee-${mkt.accountId}-${mkt.externalOrderId}`,
          lines: {
            create: lines.map((l) => ({
              id: createId('oline'),
              tenantId,
              skuId: l.sku_id,
              skuCode: skuCodeById.get(l.sku_id) || l.sku_id,
              title: l.title,
              qty: l.qty,
              unitPrice: l.unit_price,
              lineTotal: money(new Prisma.Decimal(l.unit_price).mul(l.qty)),
            })),
          },
        },
      });

      for (const line of lines) {
        const bal = await tx.inventoryBalance.findFirst({
          where: { tenantId, skuId: line.sku_id },
        });
        if (!bal) continue;
        await tx.inventoryBalance.update({
          where: { id: bal.id },
          data: { reserved: bal.reserved + line.qty },
        });
        await tx.stockReservation.create({
          data: {
            id: createId('rsv'),
            tenantId,
            skuId: line.sku_id,
            orderId,
            qty: line.qty,
            status: 'active',
          },
        });
        await tx.stockLedger.create({
          data: {
            id: createId('ldg'),
            tenantId,
            skuId: line.sku_id,
            delta: -line.qty,
            reason: 'reserve',
            refType: 'marketplace',
            refId: mkt.id,
            actorId,
          },
        });
      }

      const updated = await tx.marketplaceOrder.update({
        where: { id: mkt.id },
        data: {
          orderId,
          importStatus: 'imported',
          importedAt: new Date(),
          matchStatus: 'matched',
        },
      });

      return { order, marketplace: updated };
    });

    await this.prisma.db.marketplaceAccount.update({
      where: { id: mkt.accountId },
      data: { lastSyncAt: new Date() },
    });

    await this.audit.write({
      tenantId,
      actorId,
      action: 'marketplace.order_import',
      entity: 'marketplace_order',
      entityId: mkt.id,
      payload: { order_id: orderId, external_order_id: mkt.externalOrderId },
    });

    // Push stock after reserve
    const listings = await this.prisma.db.marketplaceListing.findMany({
      where: { accountId: mkt.accountId, skuId: { in: lines.map((l) => l.sku_id) } },
    });
    for (const l of listings) {
      await this.enqueueStockSync(tenantId, mkt.accountId, l.id, actorId);
    }
    await this.drain(50);

    return {
      marketplace_order: this.mapMktOrder(created.marketplace),
      order: {
        order_id: created.order.id,
        status: created.order.status,
        total: money(created.order.totalAmount),
      },
    };
  }

  async listOrders(
    tenantId: string,
    query: { account_id?: string; match_status?: string; limit?: number },
  ) {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
    const where: Prisma.MarketplaceOrderWhereInput = { tenantId };
    if (query.account_id) where.accountId = query.account_id;
    if (query.match_status) where.matchStatus = query.match_status;
    const rows = await this.prisma.db.marketplaceOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => this.mapMktOrder(r));
  }

  async listOutbox(tenantId: string, accountId?: string, status?: string) {
    const where: Prisma.MarketplaceOutboxWhereInput = { tenantId };
    if (accountId) where.accountId = accountId;
    if (status) where.status = status;
    const rows = await this.prisma.db.marketplaceOutbox.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      account_id: r.accountId,
      job_type: r.jobType,
      aggregate_id: r.aggregateId,
      status: r.status,
      lag_ms: r.lagMs,
      within_slo: r.lagMs != null ? r.lagMs <= lagSloMs() : null,
      attempts: r.attempts,
      last_error: r.lastError,
      processed_at: r.processedAt?.toISOString() ?? null,
      created_at: r.createdAt.toISOString(),
    }));
  }

  async retryFailed(tenantId: string, accountId: string, actorId?: string) {
    const failed = await this.prisma.db.marketplaceOutbox.findMany({
      where: { tenantId, accountId, status: 'failed' },
      take: 50,
    });
    for (const j of failed) {
      await this.prisma.db.marketplaceOutbox.update({
        where: { id: j.id },
        data: { status: 'pending', lastError: null },
      });
    }
    const drained = await this.drain(100);
    await this.audit.write({
      tenantId,
      actorId,
      action: 'marketplace.outbox_retry',
      entity: 'marketplace_account',
      entityId: accountId,
      payload: { retried: failed.length, drained },
    });
    return { retried: failed.length, drained };
  }

  async drain(limit = 30) {
    const jobs = await this.prisma.db.marketplaceOutbox.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: { account: true },
    });
    let n = 0;
    for (const job of jobs) {
      try {
        await this.processJob(job);
        n += 1;
        this.processed += 1;
      } catch (e) {
        this.failed += 1;
        const msg = e instanceof Error ? e.message : String(e);
        this.log.warn(`marketplace outbox ${job.id}: ${msg}`);
        await this.prisma.db.marketplaceOutbox.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            attempts: { increment: 1 },
            lastError: msg.slice(0, 500),
          },
        });
      }
    }
    return n;
  }

  private async enqueueStockSync(
    tenantId: string,
    accountId: string,
    listingId: string,
    _actorId?: string,
  ) {
    const listing = await this.prisma.db.marketplaceListing.findFirst({
      where: { id: listingId, tenantId },
    });
    if (!listing) return null;

    const bal = await this.prisma.db.inventoryBalance.findFirst({
      where: { tenantId, skuId: listing.skuId },
    });
    const stockLocal = Math.max(0, (bal?.onHand ?? 0) - (bal?.reserved ?? 0));
    await this.prisma.db.marketplaceListing.update({
      where: { id: listingId },
      data: { stockLocal },
    });

    const row = await this.prisma.db.marketplaceOutbox.create({
      data: {
        id: createId('mox'),
        tenantId,
        accountId,
        jobType: 'stock',
        aggregateType: 'listing',
        aggregateId: listingId,
        op: 'upsert',
        payload: {
          external_item_id: listing.externalItemId,
          stock: stockLocal,
        } as Prisma.InputJsonValue,
        status: 'pending',
      },
    });
    return row.id;
  }

  private async processJob(
    job: {
      id: string;
      tenantId: string;
      accountId: string;
      jobType: string;
      aggregateId: string;
      payload: Prisma.JsonValue;
      createdAt: Date;
      account: { shopId: string };
    },
  ) {
    const started = Date.now();
    if (job.jobType === 'stock') {
      const payload = job.payload as { external_item_id: string; stock: number };
      const result = await this.shopee.pushStock({
        shop_id: job.account.shopId,
        external_item_id: payload.external_item_id,
        stock: payload.stock,
      });
      const lagMs = Date.now() - job.createdAt.getTime();
      await this.prisma.db.marketplaceListing.update({
        where: { id: job.aggregateId },
        data: {
          stockRemote: result.stock_remote,
          lastSyncedAt: new Date(),
          lastLagMs: lagMs,
        },
      });
      await this.prisma.db.marketplaceOutbox.update({
        where: { id: job.id },
        data: {
          status: 'processed',
          processedAt: new Date(),
          lagMs,
          attempts: { increment: 1 },
        },
      });
      await this.prisma.db.marketplaceAccount.update({
        where: { id: job.accountId },
        data: { lastSyncAt: new Date() },
      });
      return;
    }
    // mark unknown types processed to avoid stuck queue
    await this.prisma.db.marketplaceOutbox.update({
      where: { id: job.id },
      data: {
        status: 'processed',
        processedAt: new Date(),
        lagMs: Date.now() - started,
        attempts: { increment: 1 },
      },
    });
  }

  private async requireAccount(tenantId: string, id: string) {
    const row = await this.prisma.db.marketplaceAccount.findFirst({ where: { id, tenantId } });
    if (!row) throw AppError.notFound('Marketplace account not found');
    return row;
  }

  private mapAccount(r: {
    id: string;
    platform: string;
    shopId: string;
    shopName: string;
    status: string;
    storefrontId: string | null;
    connectedAt: Date | null;
    lastSyncAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: r.id,
      platform: r.platform,
      shop_id: r.shopId,
      shop_name: r.shopName,
      status: r.status,
      storefront_id: r.storefrontId,
      mode: this.shopee.mode(),
      connected_at: r.connectedAt?.toISOString() ?? null,
      last_sync_at: r.lastSyncAt?.toISOString() ?? null,
      created_at: r.createdAt.toISOString(),
    };
  }

  private mapListing(r: {
    id: string;
    accountId: string;
    skuId: string;
    externalItemId: string;
    externalSku: string;
    title: string;
    status: string;
    priceRemote: Prisma.Decimal | null;
    stockRemote: number;
    stockLocal: number;
    lastSyncedAt: Date | null;
    lastLagMs: number | null;
  }) {
    return {
      id: r.id,
      account_id: r.accountId,
      sku_id: r.skuId,
      external_item_id: r.externalItemId,
      external_sku: r.externalSku,
      title: r.title,
      status: r.status,
      price_remote: r.priceRemote != null ? money(r.priceRemote) : null,
      stock_remote: r.stockRemote,
      stock_local: r.stockLocal,
      last_synced_at: r.lastSyncedAt?.toISOString() ?? null,
      last_lag_ms: r.lastLagMs,
      within_slo: r.lastLagMs != null ? r.lastLagMs <= lagSloMs() : null,
    };
  }

  private mapMktOrder(r: {
    id: string;
    accountId: string;
    externalOrderId: string;
    matchStatus: string;
    importStatus: string;
    orderId: string | null;
    currency: string;
    totalAmount: Prisma.Decimal;
    buyerName: string;
    buyerPhone: string;
    shippingAddress: string;
    linesSnapshot: Prisma.JsonValue;
    exceptionReason: string | null;
    placedAt: Date | null;
    importedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: r.id,
      account_id: r.accountId,
      external_order_id: r.externalOrderId,
      match_status: r.matchStatus,
      import_status: r.importStatus,
      order_id: r.orderId,
      currency: r.currency,
      total: money(r.totalAmount),
      buyer_name: r.buyerName,
      buyer_phone: r.buyerPhone,
      shipping_address: r.shippingAddress,
      lines: r.linesSnapshot,
      exception_reason: r.exceptionReason,
      placed_at: r.placedAt?.toISOString() ?? null,
      imported_at: r.importedAt?.toISOString() ?? null,
      created_at: r.createdAt.toISOString(),
    };
  }
}
