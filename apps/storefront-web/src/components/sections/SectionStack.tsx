import Link from 'next/link';
import type { DemoContentV1 } from '../../lib/demo-package';
import { HeroBlock } from '../HeroBlock';
import { CollectionStrip, TrustGrid } from '../ProductHero';

export function SectionStack({
  content,
  accent,
  collections,
  productsSlot,
  experimentCode,
}: {
  content: DemoContentV1 | null;
  accent: string;
  collections?: Array<{ slug: string; title: string }>;
  productsSlot?: React.ReactNode;
  experimentCode?: string | null;
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
              experimentCode={experimentCode}
            />
          );
        }

        if (node.type === 'trust') {
          const raw = Array.isArray(props.items) ? props.items : [];
          const items = raw.map((t) => {
            if (typeof t === 'string') {
              const parts = t.split(/[·•|–-]/).map((s) => s.trim()).filter(Boolean);
              return { title: parts[0] || t, sub: parts[1] || '' };
            }
            const obj = t as { title?: string; sub?: string; label?: string };
            return {
              title: String(obj.title || obj.label || ''),
              sub: String(obj.sub || ''),
            };
          }).filter((t) => t.title);
          return (
            <section key={key} style={{ padding: '8px clamp(14px, 3vw, 48px) 0' }}>
              <TrustGrid items={items.length ? items : undefined} />
            </section>
          );
        }

        if (node.type === 'collections' && collections?.length) {
          return (
            <CollectionStrip
              key={key}
              items={collections.map((c) => ({
                label: c.title,
                href: `/collections/${c.slug}`,
              }))}
            />
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

        if (node.type === 'announcement') {
          const text = String(props.text || '');
          const href = String(props.href || '');
          return (
            <div
              key={key}
              style={{
                padding: '10px 14px',
                background: accent,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              {href ? (
                <Link href={href} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {text}
                </Link>
              ) : (
                text
              )}
            </div>
          );
        }

        if (node.type === 'testimonial') {
          const items = Array.isArray(props.items)
            ? (props.items as Array<{ quote?: string; author?: string; role?: string }>)
            : [];
          return (
            <section
              key={key}
              style={{
                padding: '20px clamp(14px, 3vw, 48px)',
                display: 'grid',
                gap: 12,
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              }}
            >
              {items.map((it, i) => (
                <blockquote
                  key={i}
                  style={{
                    margin: 0,
                    padding: 16,
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid rgba(26,18,20,0.08)',
                  }}
                >
                  <p style={{ margin: '0 0 10px', fontStyle: 'italic', color: '#3a2a2e' }}>
                    “{it.quote}”
                  </p>
                  <footer style={{ fontSize: 13, fontWeight: 700 }}>
                    {it.author}
                    {it.role ? <span style={{ fontWeight: 400, opacity: 0.7 }}> · {it.role}</span> : null}
                  </footer>
                </blockquote>
              ))}
            </section>
          );
        }

        if (node.type === 'video') {
          const url = String(props.url || '');
          return (
            <section key={key} style={{ padding: '16px clamp(14px, 3vw, 48px)' }}>
              {url ? (
                <div
                  style={{
                    position: 'relative',
                    paddingBottom: '56.25%',
                    height: 0,
                    overflow: 'hidden',
                    borderRadius: 12,
                    background: '#111',
                  }}
                >
                  <iframe
                    title={String(props.caption || 'Video')}
                    src={url}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      border: 0,
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : null}
              {props.caption ? (
                <p style={{ fontSize: 13, color: '#6b5559', marginTop: 8 }}>{String(props.caption)}</p>
              ) : null}
            </section>
          );
        }

        if (node.type === 'product_grid' && productsSlot) {
          return <div key={key}>{productsSlot}</div>;
        }

        // legacy / unsupported — hide on storefront
        return null;
      })}
    </>
  );
}
