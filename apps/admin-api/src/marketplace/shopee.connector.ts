import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';

export type MarketplacePlatform = 'shopee';

function featureLive() {
  const v = process.env.FEATURE_SHOPEE_LIVE;
  if (v === undefined || v === '') return false;
  return v === '1' || v.toLowerCase() === 'true';
}

/**
 * Shopee partner API stub (B5). Live mode optional via FEATURE_SHOPEE_LIVE + SHOPEE_PARTNER_ID.
 */
@Injectable()
export class ShopeeConnector {
  mode(): 'stub' | 'live' {
    if (!featureLive()) return 'stub';
    if (process.env.SHOPEE_PARTNER_ID) return 'live';
    return 'stub';
  }

  status() {
    return {
      platform: 'shopee' as const,
      mode: this.mode(),
      lag_slo_ms: Number(process.env.MARKETPLACE_STOCK_LAG_SLO_MS || 60_000),
      feature_shopee_live: featureLive(),
    };
  }

  connectStub(input: { shop_id?: string; shop_name?: string }) {
    const shopId = input.shop_id || `shopee_${randomBytes(4).toString('hex')}`;
    const token = `stub_${randomBytes(12).toString('hex')}`;
    return {
      shop_id: shopId,
      shop_name: input.shop_name || `Shopee Shop ${shopId.slice(-6)}`,
      credentials: {
        mode: 'stub',
        token_fingerprint: createHash('sha256').update(token).digest('hex').slice(0, 24),
        bound_at: new Date().toISOString(),
      },
      metadata: { sandbox: true, platform: 'shopee' },
    };
  }

  /** Stub push stock to Shopee — returns remote stock echo + simulated network ms. */
  async pushStock(input: {
    shop_id: string;
    external_item_id: string;
    stock: number;
  }): Promise<{ ok: true; stock_remote: number; remote_updated_at: string; simulated_ms: number }> {
    const simulated = 5 + Math.floor(Math.random() * 25);
    await new Promise((r) => setTimeout(r, Math.min(simulated, 5))); // keep e2e fast
    return {
      ok: true,
      stock_remote: input.stock,
      remote_updated_at: new Date().toISOString(),
      simulated_ms: simulated,
    };
  }

  /** Stub create/update listing on Shopee. */
  async upsertListing(input: {
    shop_id: string;
    sku_code: string;
    title: string;
    price: number;
    stock: number;
    external_item_id?: string;
  }) {
    const itemId = input.external_item_id || `sp_item_${randomBytes(5).toString('hex')}`;
    return {
      external_item_id: itemId,
      external_sku: input.sku_code,
      title: input.title,
      price_remote: input.price,
      stock_remote: input.stock,
      mode: this.mode(),
    };
  }
}
