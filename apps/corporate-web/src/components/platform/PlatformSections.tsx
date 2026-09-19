'use client';

import Link from 'next/link';
import { useCallback } from 'react';

type Cta = { label?: string; href?: string; cta_code?: string };

function trackCta(cta_code: string | undefined, href: string) {
  if (typeof window === 'undefined') return;
  const w = window as Window & { dataLayer?: unknown[]; __pttConsent?: string };
  if (w.__pttConsent === 'denied') return;
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({
    event: 'platform_cta_click',
    cta_code: cta_code || 'unknown',
    href,
  });
}

export function PlatformCtaLink({
  cta,
  className,
  children,
}: {
  cta: Cta;
  className?: string;
  children?: React.ReactNode;
}) {
  const href = cta.href || '#';
  const onClick = useCallback(() => trackCta(cta.cta_code, href), [cta.cta_code, href]);
  return (
    <Link href={href} className={className} onClick={onClick} data-cta-code={cta.cta_code || ''}>
      {children || cta.label || 'Go'}
    </Link>
  );
}

export function AnnounceBar({ props }: { props: Record<string, unknown> }) {
  const text = String(props.text || '');
  const ctaLabel = props.cta_label ? String(props.cta_label) : '';
  const href = String(props.href || '#');
  const tone = String(props.tone || 'info');
  if (!text) return null;
  return (
    <div className={`pcms-announce tone-${tone}`}>
      <span>{text}</span>
      {ctaLabel ? (
        <PlatformCtaLink
          cta={{ label: ctaLabel, href, cta_code: String(props.cta_code || '') }}
          className="pcms-announce-cta"
        />
      ) : null}
    </div>
  );
}

export function PlatformHero({ props }: { props: Record<string, unknown> }) {
  const headline = String(props.headline || '');
  const sub = String(props.sub || '');
  const primary = (props.primary_cta || {}) as Cta;
  const secondary = props.secondary_cta as Cta | undefined;
  return (
    <section className="pcms-hero">
      <div className="pcms-hero-copy">
        <h1 className="pcms-hero-title">{headline}</h1>
        {sub ? <p className="pcms-hero-sub">{sub}</p> : null}
        <div className="pcms-hero-ctas">
          {primary.label ? (
            <PlatformCtaLink cta={primary} className="hv-btn hv-btn-primary pcms-motion-lift" />
          ) : null}
          {secondary?.label ? (
            <PlatformCtaLink cta={secondary} className="hv-btn hv-btn-outline pcms-motion-lift" />
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function ProofStrip({ props }: { props: Record<string, unknown> }) {
  const items = Array.isArray(props.items) ? (props.items as Array<{ n: string; label: string }>) : [];
  if (!items.length) return null;
  return (
    <section className="pcms-proof">
      {items.map((it) => (
        <div key={`${it.n}-${it.label}`} className="pcms-proof-item">
          <div className="pcms-proof-n">{it.n}</div>
          <div className="pcms-proof-label">{it.label}</div>
        </div>
      ))}
    </section>
  );
}

export function ModuleGrid({ props }: { props: Record<string, unknown> }) {
  const items = Array.isArray(props.items)
    ? (props.items as Array<{ title: string; body: string; href?: string; icon?: string }>)
    : [];
  if (!items.length) return null;
  return (
    <section className="pcms-modules">
      <div className="pcms-modules-grid">
        {items.map((it) => (
          <Link key={it.title} href={it.href || '#'} className="pcms-module pcms-motion-lift">
            {it.icon ? <span className="pcms-module-icon" data-icon={it.icon} aria-hidden /> : null}
            <h3>{it.title}</h3>
            <p>{it.body}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function IndustryStrip({ props }: { props: Record<string, unknown> }) {
  const items = Array.isArray(props.items)
    ? (props.items as Array<{ key: string; label: string; href?: string }>)
    : [];
  if (!items.length) return null;
  return (
    <section className="pcms-industry">
      <div className="pcms-industry-grid">
        {items.map((it) => (
          <Link
            key={it.key}
            href={it.href || `/templates?industry=${encodeURIComponent(it.key)}`}
            className="pcms-industry-item pcms-motion-lift"
          >
            <span className="pcms-industry-ico" data-icon={it.key} aria-hidden />
            <span>{it.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function PricingTable({ props }: { props: Record<string, unknown> }) {
  const plans = Array.isArray(props.plans)
    ? (props.plans as Array<{
        name: string;
        price: string;
        features: string[];
        cta: Cta;
        featured?: boolean;
        layer?: string;
      }>)
    : [];
  const note = props.theme_note ? String(props.theme_note) : '';
  if (!plans.length) return null;
  return (
    <section className="pcms-pricing">
      <div className="pcms-pricing-grid">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`pcms-price-card${p.featured ? ' featured' : ''}`}
            data-layer={p.layer || ''}
          >
            {p.layer ? <div className="pcms-price-layer">{p.layer}</div> : null}
            <h3>{p.name}</h3>
            <div className="pcms-price-amount">{p.price}</div>
            <ul>
              {(p.features || []).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <PlatformCtaLink
              cta={p.cta || {}}
              className={`hv-btn ${p.featured ? 'hv-btn-primary' : 'hv-btn-outline'}`}
            />
          </div>
        ))}
      </div>
      {note ? <p className="pcms-pricing-note">{note}</p> : null}
    </section>
  );
}

export function CatalogIntro({ props }: { props: Record<string, unknown> }) {
  const headline = String(props.headline || '');
  const body = String(props.body || '');
  if (!headline) return null;
  return (
    <section className="pcms-catalog-intro">
      <h1>{headline}</h1>
      {body ? <p>{body}</p> : null}
    </section>
  );
}

export function FaqBlock({ props }: { props: Record<string, unknown> }) {
  const items = Array.isArray(props.items) ? (props.items as Array<{ q: string; a: string }>) : [];
  if (!items.length) return null;
  return (
    <section className="pcms-faq">
      {items.map((it) => (
        <details key={it.q} className="pcms-faq-item">
          <summary>{it.q}</summary>
          <p>{it.a}</p>
        </details>
      ))}
    </section>
  );
}

export function CtaBand({ props }: { props: Record<string, unknown> }) {
  const headline = String(props.headline || '');
  const body = String(props.body || '');
  const cta = (props.cta || {}) as Cta;
  return (
    <section className="pcms-cta-band">
      <h2>{headline}</h2>
      {body ? <p>{body}</p> : null}
      {cta.label ? <PlatformCtaLink cta={cta} className="hv-btn hv-btn-primary pcms-motion-lift" /> : null}
    </section>
  );
}
