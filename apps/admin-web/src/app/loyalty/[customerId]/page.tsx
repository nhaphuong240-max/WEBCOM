import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader, Panel, Badge } from '@ptt/ui';
import { apiGet } from '../../../lib/api';

export const dynamic = 'force-dynamic';

type Account = {
  customer_id: string;
  points_balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  tier_code: string;
  referral_code: string;
};

type Ledger = {
  id: string;
  type: string;
  points: number;
  balance_after: number;
  reason: string;
  order_id: string | null;
  created_at: string;
};

export default async function LoyaltyLedgerPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  let account: Account | null = null;
  let ledger: Ledger[] = [];
  let error = '';
  try {
    account = await apiGet(`/v1/admin/loyalty/accounts/${customerId}`);
    ledger = await apiGet(`/v1/admin/loyalty/accounts/${customerId}/ledger?limit=100`);
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }
  if (!account && !error) notFound();

  return (
    <>
      <PageHeader
        title="Loyalty ledger"
        description={account ? `${account.tier_code} · ${account.points_balance} pts · ${account.referral_code}` : customerId}
        actions={
          <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <Link href={`/customers/${customerId}`}>Customer 360</Link>
            <Link href="/loyalty">← Loyalty</Link>
          </div>
        }
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}
      {account ? (
        <Panel title="Account">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
            <Badge tone="accent">{account.tier_code}</Badge>
            <span>Balance {account.points_balance}</span>
            <span>Earned {account.lifetime_earned}</span>
            <span>Redeemed {account.lifetime_redeemed}</span>
          </div>
        </Panel>
      ) : null}
      <Panel title="Ledger (immutable)">
        <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
          {ledger.map((e) => (
            <li
              key={e.id}
              style={{
                borderTop: '1px solid var(--ptt-line)',
                padding: '8px 0',
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <Badge tone={e.points >= 0 ? 'accent' : 'warn'}>{e.type}</Badge>
              <strong>
                {e.points >= 0 ? '+' : ''}
                {e.points}
              </strong>
              <span>→ {e.balance_after}</span>
              <span style={{ opacity: 0.7 }}>{e.reason}</span>
              {e.order_id ? <span style={{ opacity: 0.6 }}>{e.order_id}</span> : null}
              <span style={{ marginLeft: 'auto', opacity: 0.6 }}>{e.created_at.slice(0, 19)}</span>
            </li>
          ))}
          {!ledger.length ? <li style={{ opacity: 0.6 }}>Empty ledger.</li> : null}
        </ul>
      </Panel>
    </>
  );
}
