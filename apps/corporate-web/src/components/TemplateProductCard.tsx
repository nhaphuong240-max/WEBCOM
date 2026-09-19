import Link from 'next/link';
import type { TemplateCard } from '../lib/marketplace';
import { buyUrl, demoUrl, trialUrl } from '../lib/marketplace';

const INDUSTRY_ACCENT: Record<string, [string, string]> = {
  beauty: ['#2a1520', '#c45a6a'],
  fashion: ['#1a1428', '#7c6cf0'],
  fnb: ['#1a2210', '#8f9a4a'],
  sports: ['#0f1f24', '#2bb3a3'],
  pets: ['#1f1810', '#d4a017'],
  home: ['#14201c', '#4a9b7a'],
  kids: ['#201828', '#e07a9a'],
  edu: ['#121c2e', '#4a7fd4'],
  books: ['#1c1610', '#b8895a'],
  b2b: ['#101820', '#5a7a9a'],
  health: ['#10201c', '#3d9b7a'],
  electronics: ['#0e1624', '#3d6fd4'],
  auto: ['#18181c', '#6b7280'],
  jewelry: ['#1c1420', '#c9a227'],
  organic: ['#142018', '#5a9e6f'],
  travel: ['#102028', '#3d9bc4'],
  social: ['#1a1024', '#a855f7'],
  realestate: ['#141820', '#64748b'],
  services: ['#12161c', '#475569'],
  agency: ['#10141c', '#334155'],
};

function previewGradient(code: string, industry: string) {
  if (INDUSTRY_ACCENT[industry]) {
    const [a, b] = INDUSTRY_ACCENT[industry];
    return `linear-gradient(155deg, ${a} 0%, ${b} 100%)`;
  }
  const hues = [
    ['#1e3a5f', '#3d7ea6'],
    ['#2d1b2e', '#c45a6a'],
    ['#1a2e1a', '#5a9e6f'],
    ['#2a2210', '#c4a35a'],
    ['#102030', '#4a7ab0'],
  ];
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h + code.charCodeAt(i) * (i + 1)) % hues.length;
  const [a, b] = hues[h];
  return `linear-gradient(155deg, ${a}, ${b})`;
}

function scoreTone(n?: number) {
  if (n == null) return 'muted';
  if (n >= 88) return 'high';
  if (n >= 80) return 'mid';
  return 'muted';
}

export function TemplateProductCard({
  t,
  badge,
  compact,
}: {
  t: TemplateCard;
  badge?: string;
  compact?: boolean;
}) {
  const href = `/templates/${encodeURIComponent(t.code)}`;
  const isFree = t.license === 'free' || t.license_tier === 'free';
  const price = isFree ? 'Miễn phí' : t.license === 'one_time' ? 'One-time' : t.license;
  const cvr = t.scores?.cvr;
  const mobile = t.scores?.mobile;
  const seo = t.scores?.seo;

  return (
    <article className={`tm-product${compact ? '' : ' tm-product-pro'}`}>
      <Link
        href={href}
        className="tm-product-preview"
        style={{ background: previewGradient(t.code, t.industry) }}
      >
        {badge ? <span className="tm-product-badge">{badge}</span> : null}
        <span className="tm-product-frame" aria-hidden>
          <span className="tm-product-dots">
            <i />
            <i />
            <i />
          </span>
          <span className="tm-product-screen">
            <span className="tm-product-screen-bar" />
            <span className="tm-product-screen-hero" />
            <span className="tm-product-screen-row">
              <span />
              <span />
              <span />
            </span>
          </span>
        </span>
        <span className="tm-product-preview-meta">
          <span className="tm-product-preview-label">{t.industry}</span>
          <span className="tm-product-preview-title">{t.name}</span>
        </span>
        <span className="tm-product-hover-cta">Xem chi tiết</span>
      </Link>

      <div className="tm-product-body">
        <div className="tm-product-tags">
          <span className="tm-tag">{t.goal}</span>
          {t.has_package ? <span className="tm-tag tm-tag-soft">Package</span> : null}
        </div>
        <h3>
          <Link href={href}>{t.name}</Link>
        </h3>
        <div className="tm-score-row" aria-label="Điểm chất lượng">
          <span className={`tm-score tm-score-${scoreTone(cvr)}`} title="Conversion">
            CVR <b>{cvr ?? '—'}</b>
          </span>
          <span className={`tm-score tm-score-${scoreTone(mobile)}`} title="Mobile">
            Mob <b>{mobile ?? '—'}</b>
          </span>
          <span className={`tm-score tm-score-${scoreTone(seo)}`} title="SEO">
            SEO <b>{seo ?? '—'}</b>
          </span>
        </div>
        <div className="tm-product-foot">
          <span className={`tm-product-price${isFree ? ' is-free' : ''}`}>{price}</span>
          <div className="tm-product-actions">
            <a href={demoUrl(t.code)} target="_blank" rel="noreferrer" className="tm-act tm-act-ghost">
              Demo
            </a>
            <a href={trialUrl(t.code)} className="tm-act tm-act-ghost">
              Trial
            </a>
            <a href={buyUrl(t.code)} className="tm-act tm-act-solid">
              Mua
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
