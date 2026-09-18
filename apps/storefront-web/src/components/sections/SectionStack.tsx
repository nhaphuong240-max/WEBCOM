import Link from 'next/link';
import type { DemoContentV1 } from '../../lib/demo-package';
import { HeroBlock } from '../HeroBlock';

export function SectionStack({
  content,
  accent,
  collections,
  productsSlot,
}: {
  content: DemoContentV1 | null;
  accent: string;
  collections?: Array<{ slug: string; title: string }>;
  productsSlot?: React.ReactNode;
}) {
  if (!content?.section_order?.length) return null;

  return (
    <>
      {content.section_order.map((key) => {
        const node = content.sections[key];
        if (!node) return null;
        const props = node.props || {};

        if (node.type === 'hero') {
          return (
            <HeroBlock
              key={key}
              eyebrow={String(props.eyebrow || '')}
              headline={String(props.headline || '')}
              cta={String(props.cta || 'Mua ngay')}
              ctaHref={String(props.cta_href || '/search')}
              accent={accent}
            />
          );
        }

        if (node.type === 'trust') {
          const items = Array.isArray(props.items) ? (props.items as string[]) : [];
          return (
            <section
              key={key}
              style={{
                padding: '8px clamp(14px, 3vw, 48px) 24px',
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              {items.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 12,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: `${accent}1a`,
                    color: accent,
                    fontWeight: 600,
                  }}
                >
                  {t}
                </span>
              ))}
            </section>
          );
        }

        if (node.type === 'collections' && collections?.length) {
          return (
            <div
              key={key}
              style={{
                padding: '14px clamp(14px, 3vw, 48px) 8px',
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
              }}
            >
              {collections.map((c) => (
                <Link
                  key={c.slug}
                  href={`/collections/${c.slug}`}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '8px 12px',
                    borderRadius: 999,
                    border: '1px solid rgba(26,18,20,0.1)',
                    background: '#fff',
                    color: '#1a1214',
                    fontSize: 13,
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  {c.title}
                </Link>
              ))}
            </div>
          );
        }

        if (node.type === 'featured' && productsSlot) {
          return <div key={key}>{productsSlot}</div>;
        }

        if (node.type === 'cta_banner') {
          return (
            <section
              key={key}
              style={{
                margin: '12px clamp(14px, 3vw, 48px)',
                padding: '20px 18px',
                borderRadius: 12,
                background: accent,
                color: '#fff',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 10 }}>
                {String(props.title || '')}
              </div>
              <Link
                href={String(props.cta_href || '/cart')}
                style={{
                  display: 'inline-flex',
                  height: 40,
                  alignItems: 'center',
                  padding: '0 14px',
                  background: '#fff',
                  color: accent,
                  borderRadius: 8,
                  fontWeight: 700,
                  textDecoration: 'none',
                  fontSize: 14,
                }}
              >
                {String(props.cta || 'Mua ngay')}
              </Link>
            </section>
          );
        }

        if (node.type === 'rich_text') {
          return (
            <section key={key} style={{ padding: '16px clamp(14px, 3vw, 48px)' }}>
              {props.title ? (
                <h2 style={{ fontFamily: 'var(--ptt-font-display)', margin: '0 0 8px' }}>
                  {String(props.title)}
                </h2>
              ) : null}
              <p style={{ margin: 0, color: '#6b5559', whiteSpace: 'pre-wrap' }}>
                {String(props.body || '')}
              </p>
            </section>
          );
        }

        if (node.type === 'faq') {
          const items = Array.isArray(props.items)
            ? (props.items as Array<{ q?: string; a?: string }>)
            : [];
          return (
            <section key={key} style={{ padding: '16px clamp(14px, 3vw, 48px)' }}>
              {items.map((it, i) => (
                <details key={i} style={{ marginBottom: 8 }}>
                  <summary style={{ fontWeight: 600 }}>{it.q}</summary>
                  <p style={{ color: '#6b5559', margin: '6px 0 0' }}>{it.a}</p>
                </details>
              ))}
            </section>
          );
        }

        if (node.type === 'countdown') {
          return (
            <section
              key={key}
              style={{
                margin: '8px clamp(14px, 3vw, 48px)',
                padding: '12px 14px',
                borderRadius: 10,
                border: `1px solid ${accent}44`,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {String(props.label || 'Countdown')} · {String(props.ends_at || '')}
            </section>
          );
        }

        if (node.type === 'footer_links') {
          const columns = Array.isArray(props.columns)
            ? (props.columns as Array<{
                title?: string;
                links?: Array<{ label?: string; href?: string }>;
              }>)
            : [];
          return (
            <footer
              key={key}
              style={{
                marginTop: 24,
                padding: '24px clamp(14px, 3vw, 48px)',
                borderTop: '1px solid rgba(26,18,20,0.08)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 16,
              }}
            >
              {columns.map((col, i) => (
                <div key={i}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{col.title}</div>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {(col.links || []).map((l, j) => (
                      <li key={j} style={{ marginBottom: 6 }}>
                        <Link
                          href={String(l.href || '/')}
                          style={{ color: '#6b5559', textDecoration: 'none', fontSize: 13 }}
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </footer>
          );
        }

        // legacy / unsupported — hide on storefront
        return null;
      })}
    </>
  );
}
