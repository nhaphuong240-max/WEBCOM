import Link from 'next/link';
import type { TemplateCard } from '../lib/marketplace';
import { buyUrl, demoUrl, trialUrl } from '../lib/marketplace';

const INDUSTRY_ACCENT: Record<string, [string, string]> = {
  beauty: ['#fce7f3', '#db2777'],
  fashion: ['#0f172a', '#334155'],
  fnb: ['#14532d', '#84cc16'],
  sports: ['#0c4a6e', '#0ea5e9'],
  pets: ['#78350f', '#f59e0b'],
  home: ['#ecfdf5', '#059669'],
  kids: ['#fdf2f8', '#ec4899'],
  edu: ['#eff6ff', '#2563eb'],
  books: ['#fff7ed', '#c2410c'],
  b2b: ['#0f172a', '#64748b'],
  health: ['#ecfeff', '#0891b2'],
  electronics: ['#020617', '#3b82f6'],
  auto: ['#111827', '#6b7280'],
  jewelry: ['#1c1917', '#d4a017'],
  organic: ['#f0fdf4', '#16a34a'],
  travel: ['#eff6ff', '#0284c7'],
  social: ['#faf5ff', '#9333ea'],
  realestate: ['#f8fafc', '#475569'],
  services: ['#f1f5f9', '#334155'],
  agency: ['#0b1220', '#94a3b8'],
};

function previewGradient(_code: string, industry: string) {
  const pair = INDUSTRY_ACCENT[industry] || ['#e2e8f0', '#64748b'];
  return `linear-gradient(165deg, ${pair[0]} 0%, ${pair[1]} 100%)`;
}

/** Visual price for catalog (Haravan-style VND) when no commerce price on card. */
export function displayPrice(t: TemplateCard): string {
  if (t.license === 'free' || t.license_tier === 'free') return 'Miễn phí';
  let h = 0;
  for (let i = 0; i < t.code.length; i++) h += t.code.charCodeAt(i) * (i + 3);
  const base = 1700000 + (h % 13) * 100000;
  return `${base.toLocaleString('vi-VN')}₫`;
}

export function TemplateProductCard({
  t,
  badge,
}: {
  t: TemplateCard;
  badge?: string;
}) {
  const href = `/templates/${encodeURIComponent(t.code)}`;
  const price = displayPrice(t);
  const isFree = price === 'Miễn phí';

  return (
    <article className="hv-card">
      <div
        className="hv-card-media"
        style={{ background: previewGradient(t.code, t.industry) }}
      >
        {badge ? <span className="hv-card-badge">{badge}</span> : null}
        <div className="hv-card-mock" aria-hidden>
          <div className="hv-mock-top">
            <span />
            <span />
            <span />
          </div>
          <div className="hv-mock-hero" />
          <div className="hv-mock-grid">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="hv-mock-band" />
        </div>
        <div className="hv-card-overlay">
          <a href={demoUrl(t.code)} target="_blank" rel="noreferrer" className="hv-btn hv-btn-primary">
            Xem thực tế
          </a>
          <Link href={href} className="hv-btn hv-btn-light">
            Chi tiết
          </Link>
        </div>
      </div>
      <div className="hv-card-info">
        <h3>
          <Link href={href}>{t.name}</Link>
        </h3>
        <p className={`hv-card-price${isFree ? ' is-free' : ''}`}>{price}</p>
        <div className="hv-card-links">
          <a href={trialUrl(t.code)}>Dùng thử</a>
          <a href={buyUrl(t.code)}>Mua theme</a>
        </div>
      </div>
    </article>
  );
}
