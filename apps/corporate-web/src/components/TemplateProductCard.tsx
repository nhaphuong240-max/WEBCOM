import Link from 'next/link';
import type { TemplateCard } from '../lib/marketplace';
import { buyUrl, demoUrl, trialUrl } from '../lib/marketplace';

function previewGradient(code: string) {
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
  return `linear-gradient(145deg, ${a}, ${b})`;
}

export function TemplateProductCard({
  t,
  badge,
}: {
  t: TemplateCard;
  badge?: string;
}) {
  const href = `/templates/${encodeURIComponent(t.code)}`;
  const price =
    t.license === 'free' || t.license_tier === 'free'
      ? 'Free'
      : t.license === 'one_time'
        ? 'One-time'
        : t.license;

  return (
    <article className="tm-product">
      <Link href={href} className="tm-product-preview" style={{ background: previewGradient(t.code) }}>
        {badge ? <span className="tm-product-badge">{badge}</span> : null}
        <span className="tm-product-preview-label">{t.industry}</span>
        <span className="tm-product-preview-title">{t.name}</span>
      </Link>
      <div className="tm-product-body">
        <h3>
          <Link href={href}>{t.name}</Link>
        </h3>
        <p className="tm-product-meta">
          CVR {t.scores?.cvr ?? '—'} · Mobile {t.scores?.mobile ?? '—'} · SEO {t.scores?.seo ?? '—'}
        </p>
        <div className="tm-product-foot">
          <span className="tm-product-price">{price}</span>
          <div className="tm-product-links">
            <a href={demoUrl(t.code)} target="_blank" rel="noreferrer">
              Live demo
            </a>
            <a href={trialUrl(t.code)}>Trial</a>
            <a href={buyUrl(t.code)}>Buy</a>
          </div>
        </div>
      </div>
    </article>
  );
}
