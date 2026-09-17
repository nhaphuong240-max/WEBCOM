import Link from 'next/link';
import { PageHeader, Panel, Badge, Button } from '@ptt/ui';
import { apiGet, apiJson } from '../../lib/api';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

type Account = {
  id: string;
  customer_id: string;
  points_balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  tier_code: string;
  referral_code: string;
  customer?: { id: string; name: string; phone: string | null; email: string | null };
};

type Tier = {
  code: string;
  name: string;
  min_points: number;
  earn_multiplier: number;
};

type Referral = {
  id: string;
  code_used: string;
  status: string;
  fraud_flags: string[];
  bonus_points: number;
  referee_customer_id: string;
};

async function ensureTiers() {
  'use server';
  await apiJson('/v1/admin/loyalty/tiers/ensure', 'POST', {});
  revalidatePath('/loyalty');
}

async function ensureForCustomer(formData: FormData) {
  'use server';
  await apiJson('/v1/admin/loyalty/accounts/ensure', 'POST', {
    customer_id: String(formData.get('customer_id')),
  });
  revalidatePath('/loyalty');
}

async function adjustPoints(formData: FormData) {
  'use server';
  await apiJson('/v1/admin/loyalty/adjust', 'POST', {
    customer_id: String(formData.get('customer_id')),
    points: Number(formData.get('points') || 0),
    reason: String(formData.get('reason') || 'admin_adjust'),
  });
  revalidatePath('/loyalty');
}

async function applyReferral(formData: FormData) {
  'use server';
  await apiJson('/v1/admin/loyalty/referral/apply', 'POST', {
    customer_id: String(formData.get('customer_id')),
    referral_code: String(formData.get('referral_code')),
  });
  revalidatePath('/loyalty');
}

export default async function LoyaltyPage() {
  let accounts: Account[] = [];
  let tiers: Tier[] = [];
  let referrals: Referral[] = [];
  let status: { wave: string; defaults?: Record<string, number> } | null = null;
  let error = '';

  try {
    status = await apiGet('/v1/admin/loyalty/status');
    tiers = await apiGet('/v1/admin/loyalty/tiers');
    accounts = await apiGet('/v1/admin/loyalty/accounts?limit=50');
    referrals = await apiGet('/v1/admin/loyalty/referrals?limit=20');
  } catch (e) {
    error = e instanceof Error ? e.message : 'API error';
  }

  return (
    <>
      <PageHeader
        title="Loyalty"
        description="C4 — points ledger · tiers · referral (1-level) · checkout redeem stub."
        actions={<Badge tone="accent">{status?.wave || 'C4'}</Badge>}
      />
      {error ? (
        <Panel title="API">
          <p style={{ color: 'crimson' }}>{error}</p>
        </Panel>
      ) : null}

      <Panel title="Program defaults">
        <div style={{ fontSize: 13, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <span>1pt / {status?.defaults?.vndPerPoint ?? 1000}₫ earn</span>
          <span>1pt = {status?.defaults?.vndPerRedeemPoint ?? 100}₫ redeem</span>
          <span>max {((status?.defaults?.maxRedeemRatio ?? 0.5) * 100).toFixed(0)}% subtotal</span>
          <span>referral bonus {status?.defaults?.referralBonus ?? 100}pt</span>
          <form action={ensureTiers}>
            <Button type="submit" size="sm">
              Ensure tiers
            </Button>
          </form>
        </div>
      </Panel>

      <Panel title="Tiers">
        <ul style={{ listStyle: 'none', padding: 0, fontSize: 13, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {tiers.map((t) => (
            <li key={t.code}>
              <Badge tone="accent">
                {t.name} · ≥{t.min_points} · ×{t.earn_multiplier}
              </Badge>
            </li>
          ))}
          {!tiers.length ? <li style={{ opacity: 0.6 }}>No tiers — Ensure tiers.</li> : null}
        </ul>
      </Panel>

      <Panel title="Ensure account">
        <form action={ensureForCustomer} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input name="customer_id" placeholder="customer_id" required style={{ padding: 8, flex: 1 }} />
          <Button type="submit" variant="primary">
            Ensure
          </Button>
        </form>
      </Panel>

      <Panel title="Adjust points">
        <form action={adjustPoints} style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
          <input name="customer_id" placeholder="customer_id" required style={{ padding: 8 }} />
          <input name="points" type="number" defaultValue={100} style={{ padding: 8 }} />
          <input name="reason" defaultValue="admin_adjust" style={{ padding: 8 }} />
          <Button type="submit">Post adjust</Button>
        </form>
      </Panel>

      <Panel title="Apply referral">
        <form action={applyReferral} style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
          <input name="customer_id" placeholder="referee customer_id" required style={{ padding: 8 }} />
          <input name="referral_code" placeholder="REF…" required style={{ padding: 8 }} />
          <Button type="submit" variant="primary">
            Apply code
          </Button>
        </form>
      </Panel>

      <Panel title={`Accounts (${accounts.length})`}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--ptt-line)' }}>
              <th style={{ padding: 8 }}>Customer</th>
              <th>Tier</th>
              <th>Balance</th>
              <th>Earned</th>
              <th>Code</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} style={{ borderBottom: '1px solid var(--ptt-line)' }}>
                <td style={{ padding: 8 }}>
                  <Link href={`/customers/${a.customer_id}`}>
                    {a.customer?.name || a.customer_id}
                  </Link>
                  <div style={{ opacity: 0.65, fontSize: 11 }}>{a.customer?.phone || '—'}</div>
                </td>
                <td>
                  <Badge>{a.tier_code}</Badge>
                </td>
                <td>{a.points_balance}</td>
                <td>{a.lifetime_earned}</td>
                <td>
                  <code>{a.referral_code}</code>
                </td>
                <td>
                  <Link href={`/loyalty/${a.customer_id}`} style={{ fontSize: 12 }}>
                    Ledger →
                  </Link>
                </td>
              </tr>
            ))}
            {!accounts.length ? (
              <tr>
                <td colSpan={6} style={{ padding: 12, opacity: 0.6 }}>
                  No accounts yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Panel>

      <Panel title="Referrals">
        <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
          {referrals.map((r) => (
            <li
              key={r.id}
              style={{ borderTop: '1px solid var(--ptt-line)', padding: '8px 0', display: 'flex', gap: 8 }}
            >
              <Badge tone={r.status === 'rewarded' ? 'accent' : 'warn'}>{r.status}</Badge>
              <code>{r.code_used}</code>
              <Link href={`/customers/${r.referee_customer_id}`}>referee</Link>
              <span>+{r.bonus_points}</span>
              {r.fraud_flags?.length ? (
                <span style={{ color: 'crimson' }}>{r.fraud_flags.join(', ')}</span>
              ) : null}
            </li>
          ))}
          {!referrals.length ? <li style={{ opacity: 0.6 }}>No referrals yet.</li> : null}
        </ul>
      </Panel>
    </>
  );
}
