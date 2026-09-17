import Link from 'next/link';
import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const SF = process.env.NEXT_PUBLIC_STOREFRONT_ID || 'sf_aura';
const SKU = process.env.NEXT_PUBLIC_SKU_ID || 'sku_aura_glow_30';

type Account = {
  id: string;
  platform: string;
  shop_id: string;
  shop_name: string;
  status: string;
  mode: string;
  last_sync_at: string | null;
};

type Listing = {
  id: string;
  account_id: string;
  sku_id: string;
  external_item_id: string;
  title: string;
  stock_local: number;
  stock_remote: number;
  last_lag_ms: number | null;
  within_slo: boolean | null;
};

type MktOrder = {
  id: string;
  external_order_id: string;
  match_status: string;
  import_status: string;
  order_id: string | null;
  total: string;
  exception_reason: string | null;
};

type Outbox = {
  id: string;
  job_type: string;
  status: string;
  lag_ms: number | null;
  within_slo: boolean | null;
};

async function connectShop(formData: FormData) {
  'use server';
  await apiJson('/v1/admin/marketplace/accounts/connect', 'POST', {
    platform: 'shopee',
    shop_name: String(formData.get('shop_name') || 'AURA Shopee Stub'),
    shop_id: String(formData.get('shop_id') || '') || undefined,
    storefront_id: SF,
  });
  revalidatePath('/marketplace');
}

async function upsertListing(formData: FormData) {
  'use server';
  await apiJson('/v1/admin/marketplace/listings', 'POST', {
    account_id: String(formData.get('account_id')),
    sku_id: String(formData.get('sku_id') || SKU),
    title: String(formData.get('title') || 'AURA Glow Serum'),
  });
  revalidatePath('/marketplace');
}

async function syncStock(formData: FormData) {
  'use server';
  await apiJson('/v1/admin/marketplace/stock/sync', 'POST', {
    account_id: String(formData.get('account_id')),
  });
  revalidatePath('/marketplace');
}

async function ingestMatched(formData: FormData) {
  'use server';
  const accountId = String(formData.get('account_id'));
  const listingId = String(formData.get('listing_id') || '');
  let externalItemId = String(formData.get('external_item_id') || '');
  if (!externalItemId && listingId) {
    // listing_id used only for display; sku path preferred
  }
  await apiJson('/v1/admin/marketplace/orders/ingest', 'POST', {
    account_id: accountId,
    buyer_name: String(formData.get('buyer_name') || 'Shopee Guest'),
    buyer_phone: '0912345678',
    shipping_address: '123 Shopee Street, Q1',
    auto_import: true,
    lines: [
      {
        sku_id: String(formData.get('sku_id') || SKU),
        external_item_id: externalItemId || undefined,
        qty: Number(formData.get('qty') || 1),
      },
    ],
  });
  revalidatePath('/marketplace');
}

async function ingestUnmatched(formData: FormData) {
  'use server';
  await apiJson('/v1/admin/marketplace/orders/ingest', 'POST', {
    account_id: String(formData.get('account_id')),
    external_order_id: `UNMATCH-${Date.now()}`,
    buyer_name: 'Unknown Buyer',
    lines: [{ external_item_id: 'sp_item_unknown_xyz', qty: 1, unit_price: 99000 }],
    auto_import: false,
  });
  revalidatePath('/marketplace');
}

async function disconnect(formData: FormData) {
  'use server';
  await apiJson(`/v1/admin/marketplace/accounts/${String(formData.get('account_id'))}/disconnect`, 'POST', {});
  revalidatePath('/marketplace');
}

export default async function MarketplacePage() {
  let status: { wave: string; connector: { mode: string; lag_slo_ms: number } } | null = null;
  let accounts: Account[] = [];
  let listings: Listing[] = [];
  let orders: MktOrder[] = [];
  let exceptions: MktOrder[] = [];
  let outbox: Outbox[] = [];
  let error = '';

  try {
    status = await apiGet('/v1/admin/marketplace/status');
    accounts = await apiGet('/v1/admin/marketplace/accounts');
    const active = accounts.find((a) => a.status === 'connected') || accounts[0];
    if (active) {
      listings = await apiGet(`/v1/admin/marketplace/listings?account_id=${active.id}`);
      orders = await apiGet(`/v1/admin/marketplace/orders?account_id=${active.id}&limit=20`);
      exceptions = await apiGet(
        `/v1/admin/marketplace/orders?account_id=${active.id}&match_status=exception&limit=20`,
      );
      outbox = await apiGet(`/v1/admin/marketplace/outbox?account_id=${active.id}`);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  const account = accounts.find((a) => a.status === 'connected') || accounts[0];
  const listing = listings[0];

  return (
    <>
      <PageHeader
        title="Marketplace"
        description="B5 — Shopee connector stub · listing map · stock outbox lag ≤60s · order import / exception."
        actions={<Badge tone="accent">B5</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Connector status">
        <p style={{ fontSize: 13 }}>
          Wave {status?.wave} · mode <Badge tone="accent">{status?.connector.mode || '—'}</Badge> · lag
          SLO {status?.connector.lag_slo_ms ?? 60000}ms
        </p>
      </Panel>

      <Panel title="Kết nối Shopee (stub)">
        <form action={connectShop} style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
          <input name="shop_name" defaultValue="AURA Official Shopee" style={{ padding: 8 }} />
          <input name="shop_id" placeholder="shop_id (optional)" style={{ padding: 8 }} />
          <Button type="submit" variant="primary">
            Connect Shopee
          </Button>
        </form>
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 12, fontSize: 13 }}>
          {accounts.map((a) => (
            <li key={a.id} style={{ borderTop: '1px solid var(--ptt-line)', padding: '8px 0' }}>
              <strong>{a.shop_name}</strong> · {a.shop_id} · <Badge tone="accent">{a.status}</Badge> ·{' '}
              {a.mode}
              {a.status === 'connected' ? (
                <form action={disconnect} style={{ display: 'inline', marginLeft: 8 }}>
                  <input type="hidden" name="account_id" value={a.id} />
                  <Button type="submit" variant="ghost">
                    Disconnect
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </Panel>

      {account ? (
        <>
          <Panel title="Listing ↔ SKU">
            <form action={upsertListing} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input type="hidden" name="account_id" value={account.id} />
              <input name="sku_id" defaultValue={SKU} style={{ padding: 8, minWidth: 200 }} />
              <input name="title" defaultValue="AURA Glow Serum 30ml" style={{ padding: 8 }} />
              <Button type="submit" variant="primary">
                Upsert listing
              </Button>
            </form>
            <form action={syncStock} style={{ marginTop: 8 }}>
              <input type="hidden" name="account_id" value={account.id} />
              <Button type="submit">Sync stock (outbox)</Button>
            </form>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: 12, fontSize: 13 }}>
              {listings.map((l) => (
                <li key={l.id} style={{ borderTop: '1px solid var(--ptt-line)', padding: '8px 0' }}>
                  {l.title} · SKU {l.sku_id} · remote {l.external_item_id}
                  <br />
                  stock local {l.stock_local} → remote {l.stock_remote} · lag{' '}
                  {l.last_lag_ms ?? '—'}ms{' '}
                  {l.within_slo === true ? (
                    <Badge tone="accent">within SLO</Badge>
                  ) : l.within_slo === false ? (
                    <Badge>SLO miss</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Ingest order">
            <form action={ingestMatched} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <input type="hidden" name="account_id" value={account.id} />
              <input type="hidden" name="sku_id" value={SKU} />
              <input
                type="hidden"
                name="external_item_id"
                value={listing?.external_item_id || ''}
              />
              <input name="qty" type="number" defaultValue={1} style={{ padding: 8, width: 80 }} />
              <Button type="submit" variant="primary">
                Ingest matched → OMS
              </Button>
            </form>
            <form action={ingestUnmatched}>
              <input type="hidden" name="account_id" value={account.id} />
              <Button type="submit">Ingest unmatched (exception)</Button>
            </form>
          </Panel>

          <Panel title="Orders">
            <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
              {orders.map((o) => (
                <li key={o.id} style={{ borderTop: '1px solid var(--ptt-line)', padding: '8px 0' }}>
                  {o.external_order_id} · <Badge tone="accent">{o.match_status}</Badge> ·{' '}
                  {o.import_status} · {o.total} VND
                  {o.order_id ? (
                    <>
                      {' '}
                      → <Link href="/orders">{o.order_id}</Link>
                    </>
                  ) : null}
                  {o.exception_reason ? (
                    <div style={{ color: 'crimson' }}>{o.exception_reason}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Exception queue">
            {exceptions.length === 0 ? (
              <p style={{ fontSize: 13, opacity: 0.7 }}>Không có exception.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
                {exceptions.map((o) => (
                  <li key={o.id} style={{ borderTop: '1px solid var(--ptt-line)', padding: '8px 0' }}>
                    {o.external_order_id} — {o.exception_reason}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Stock outbox">
            <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
              {outbox.slice(0, 15).map((j) => (
                <li key={j.id} style={{ borderTop: '1px solid var(--ptt-line)', padding: '6px 0' }}>
                  {j.job_type} · {j.status} · lag {j.lag_ms ?? '—'}ms
                  {j.within_slo === true ? ' ✓' : j.within_slo === false ? ' ✗' : ''}
                </li>
              ))}
            </ul>
          </Panel>
        </>
      ) : null}
    </>
  );
}
