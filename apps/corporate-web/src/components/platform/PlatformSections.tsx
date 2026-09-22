'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { usePlatformAb, type PlatformExperimentPayload } from '../../lib/platform-ab';

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

export function PlatformHero({
  props,
  ab,
}: {
  props: Record<string, unknown>;
  ab?: {
    code?: string | null;
    experiment?: PlatformExperimentPayload | null;
    storefrontId?: string | null;
  };
}) {
  const variant = usePlatformAb(ab?.code, ab?.experiment, ab?.storefrontId);
  const abHeadline = String(variant?.headline || '').trim();
  const abCta = String(variant?.cta || '').trim();
  // Ignore truncated / broken assign payloads (e.g. "Keep", "T")
  const safeAb =
    abHeadline.length >= 12 && abCta.length >= 3
      ? variant
      : null;
  const headline = String(safeAb?.headline || props.headline || '');
  const sub = String(props.sub || '');
  const brand = String(props.brand || '');
  const primaryBase = (props.primary_cta || {}) as Cta;
  const primary: Cta = {
    ...primaryBase,
    label: safeAb?.cta || primaryBase.label,
    href: safeAb?.cta_href || primaryBase.href,
  };
  const secondary = props.secondary_cta as Cta | undefined;
  return (
    <section className={`pcms-hero${brand ? ' pcms-hero-brand' : ''}`}>
      <div className="pcms-hero-copy">
        {brand ? (
          <div className="pcms-hero-brand">
            {brand}
            <em>.</em>
          </div>
        ) : null}
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

export function PageHeader({ props }: { props: Record<string, unknown> }) {
  return (
    <section className="pcms-page-header">
      {props.eyebrow ? <div className="pcms-eyebrow">{String(props.eyebrow)}</div> : null}
      <h1>{String(props.title || '')}</h1>
      {props.body ? <p>{String(props.body)}</p> : null}
    </section>
  );
}

export function ProblemWorkflow({ props }: { props: Record<string, unknown> }) {
  const steps = Array.isArray(props.steps)
    ? (props.steps as Array<{ title: string; body?: string }>)
    : [];
  return (
    <section className="pcms-workflow">
      <p className="pcms-workflow-problem">{String(props.problem || '')}</p>
      <ol className="pcms-workflow-steps">
        {steps.map((s, i) => (
          <li key={`${s.title}-${i}`}>
            <strong>{s.title}</strong>
            {s.body ? <span>{s.body}</span> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function KpiRow({ props }: { props: Record<string, unknown> }) {
  const items = Array.isArray(props.items)
    ? (props.items as Array<{ label: string; value: string }>)
    : [];
  if (!items.length) return null;
  return (
    <section className="pcms-kpi-row">
      {items.map((it) => (
        <div key={it.label} className="pcms-kpi-item">
          <div className="pcms-proof-n">{it.value}</div>
          <div className="pcms-proof-label">{it.label}</div>
        </div>
      ))}
    </section>
  );
}

export function UiShowcase({ props }: { props: Record<string, unknown> }) {
  const bullets = Array.isArray(props.bullets) ? (props.bullets as string[]) : [];
  return (
    <section className="pcms-showcase">
      <h2>{String(props.title || '')}</h2>
      {props.body ? <p>{String(props.body)}</p> : null}
      {bullets.length ? (
        <ul>
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function UseCaseCards({ props }: { props: Record<string, unknown> }) {
  const items = Array.isArray(props.items)
    ? (props.items as Array<{ title: string; body: string; href?: string; icon?: string }>)
    : [];
  if (!items.length) return null;
  return <ModuleGrid props={{ items }} />;
}

export function CaseHero({ props }: { props: Record<string, unknown> }) {
  return (
    <section className="pcms-case-hero">
      <div className="pcms-eyebrow">
        {String(props.customer || '')}
        {props.industry ? ` · ${String(props.industry)}` : ''}
      </div>
      <h1>{String(props.title || '')}</h1>
      {props.hero_metric ? <div className="pcms-case-metric">{String(props.hero_metric)}</div> : null}
    </section>
  );
}

export function BeforeAfterKpi({ props }: { props: Record<string, unknown> }) {
  const metrics = Array.isArray(props.metrics)
    ? (props.metrics as Array<{ label: string; before: string; after: string }>)
    : [];
  if (!metrics.length) return null;
  return (
    <section className="pcms-ba">
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Before</th>
            <th>After</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.label}>
              <td>{m.label}</td>
              <td>{m.before}</td>
              <td className="after">{m.after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function CapabilityMatrix({ props }: { props: Record<string, unknown> }) {
  const peer =
    String(props.peer_column_label || 'Omnichannel phổ biến').trim() || 'Omnichannel phổ biến';
  const rows = Array.isArray(props.rows)
    ? (props.rows as Array<{ feature: string; webcom: string; peer_label: string }>)
    : [];
  if (!rows.length) return null;
  return (
    <section className="pcms-matrix">
      <table>
        <thead>
          <tr>
            <th>Capability</th>
            <th>WebCom</th>
            <th>{peer}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.feature}>
              <td>{r.feature}</td>
              <td>{r.webcom}</td>
              <td>{r.peer_label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function RoiAssumptions({ props }: { props: Record<string, unknown> }) {
  const assumptions = Array.isArray(props.assumptions)
    ? (props.assumptions as Array<{ label: string; value: string; note?: string }>)
    : [];
  const disclaimer = String(props.disclaimer || '');
  if (!assumptions.length) return null;
  return (
    <section className="pcms-roi">
      <h2>Giả định ROI</h2>
      <ul className="pcms-roi-list">
        {assumptions.map((a) => (
          <li key={a.label}>
            <strong>{a.label}</strong>
            <span className="pcms-roi-value">{a.value}</span>
            {a.note ? <span className="pcms-roi-note">{a.note}</span> : null}
          </li>
        ))}
      </ul>
      {disclaimer ? <p className="pcms-roi-disclaimer">{disclaimer}</p> : null}
    </section>
  );
}

const UNLOCK_KEY = 'pcms_unlocked';

function readUnlocked(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(UNLOCK_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeUnlocked(href: string) {
  const next = Array.from(new Set([...readUnlocked(), href]));
  sessionStorage.setItem(UNLOCK_KEY, JSON.stringify(next));
}

export function ResourceList({ props }: { props: Record<string, unknown> }) {
  const items = Array.isArray(props.items)
    ? (props.items as Array<{
        title: string;
        type: string;
        href: string;
        gated?: boolean;
        summary?: string;
      }>)
    : [];
  const [unlocked, setUnlocked] = useState<string[]>([]);
  useEffect(() => {
    setUnlocked(readUnlocked());
  }, []);

  if (!items.length) return null;
  return (
    <section className="pcms-resources">
      {props.headline ? <h2>{String(props.headline)}</h2> : null}
      <ul className="pcms-resources-list">
        {items.map((it) => {
          const isOpen = !it.gated || unlocked.includes(it.href);
          return (
            <li key={it.href} className={it.gated && !isOpen ? 'gated' : ''}>
              <div>
                <span className="pcms-res-type">{it.type}</span>
                <h3>{it.title}</h3>
                {it.summary ? <p>{it.summary}</p> : null}
              </div>
              {isOpen ? (
                <a href={it.href} className="hv-btn hv-btn-outline pcms-motion-lift">
                  Mở →
                </a>
              ) : (
                <a href="#pcms-gate" className="hv-btn hv-btn-outline">
                  Gated — mở khóa
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function GatedForm({ props }: { props: Record<string, unknown> }) {
  const API = process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
  const unlockHref = String(props.unlock_href || '');
  const fields = Array.isArray(props.fields)
    ? (props.fields as string[])
    : ['name', 'email', 'company'];
  const ctaCode = String(props.cta_code || 'cta_resource_unlock');
  const submitLabel = String(props.submit_label || 'Mở khóa');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [unlockedHref, setUnlockedHref] = useState<string | null>(null);

  useEffect(() => {
    if (unlockHref && readUnlocked().includes(unlockHref)) setUnlockedHref(unlockHref);
  }, [unlockHref]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!consent) {
      setMsg('Vui lòng đồng ý điều khoản / privacy.');
      return;
    }
    setBusy(true);
    setMsg('');
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch(`${API}/api/v1/leads`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-tenant-id': process.env.NEXT_PUBLIC_TENANT_ID || 'ten_platform',
        },
        body: JSON.stringify({
          name: fd.get('name') || fd.get('email') || 'Guest',
          email: fd.get('email'),
          phone: fd.get('phone') || undefined,
          company: fd.get('company') || undefined,
          channel: 'website',
          message: fd.get('message') || undefined,
          cta_code: ctaCode,
          landing_slug: typeof window !== 'undefined' ? window.location.pathname : '/resources',
          consent: true,
          unlock_href: unlockHref || undefined,
        }),
      });
      const data = (await res.json()) as {
        id?: string;
        unlock_href?: string;
        error?: { message?: string };
        message?: string;
      };
      if (!res.ok) throw new Error(data?.error?.message || data?.message || 'Failed');
      const href = data.unlock_href || unlockHref;
      if (href) {
        writeUnlocked(href);
        setUnlockedHref(href);
      }
      setMsg('Đã mở khóa — tải tài liệu bên dưới.');
      e.currentTarget.reset();
      setConsent(false);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Lỗi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="pcms-gated" id="pcms-gate">
      <h2>{String(props.headline || 'Gated content')}</h2>
      {props.body ? <p>{String(props.body)}</p> : null}
      {unlockedHref ? (
        <p className="pcms-gated-unlocked">
          <a href={unlockedHref} className="hv-btn hv-btn-primary pcms-motion-lift">
            Tải / mở tài liệu →
          </a>
        </p>
      ) : (
        <form className="tm-lead pcms-gated-form" onSubmit={onSubmit}>
          {fields.includes('name') ? <input name="name" placeholder="Họ tên" required /> : null}
          {fields.includes('email') !== false ? (
            <input name="email" type="email" placeholder="Email công việc" required />
          ) : null}
          {fields.includes('phone') ? <input name="phone" placeholder="SĐT" /> : null}
          {fields.includes('company') ? <input name="company" placeholder="Công ty" /> : null}
          {fields.includes('message') ? <input name="message" placeholder="Nhu cầu" /> : null}
          <label className="tm-lead-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(ev) => setConsent(ev.target.checked)}
              required
            />
            {String(props.consent_label || 'Tôi đồng ý để WebCom liên hệ (privacy).')}
          </label>
          <button type="submit" className="tm-btn tm-btn-primary" disabled={busy || !consent}>
            {busy ? 'Đang gửi…' : submitLabel}
          </button>
          {msg ? <p className="tm-lead-msg">{msg}</p> : null}
        </form>
      )}
    </section>
  );
}

export function TourSteps({ props }: { props: Record<string, unknown> }) {
  const steps = Array.isArray(props.steps)
    ? (props.steps as Array<{
        title: string;
        body: string;
        media?: string;
        cta_label?: string;
        cta_href?: string;
      }>)
    : [];
  const [idx, setIdx] = useState(0);
  if (!steps.length) return null;
  const step = steps[Math.min(idx, steps.length - 1)]!;
  return (
    <section className="pcms-tour">
      {props.title ? <h2>{String(props.title)}</h2> : null}
      <div className="pcms-tour-nav" role="tablist">
        {steps.map((s, i) => (
          <button
            key={s.title}
            type="button"
            role="tab"
            aria-selected={i === idx}
            className={i === idx ? 'active' : ''}
            onClick={() => setIdx(i)}
          >
            {i + 1}. {s.title}
          </button>
        ))}
      </div>
      <div className="pcms-tour-panel" role="tabpanel">
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        {step.media ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={step.media} alt="" className="pcms-tour-media" />
        ) : null}
        {step.cta_label && step.cta_href ? (
          <Link href={step.cta_href} className="hv-btn hv-btn-primary pcms-motion-lift">
            {step.cta_label}
          </Link>
        ) : null}
        <div className="pcms-tour-controls">
          <button type="button" disabled={idx === 0} onClick={() => setIdx((v) => Math.max(0, v - 1))}>
            ← Trước
          </button>
          <span>
            {idx + 1} / {steps.length}
          </span>
          <button
            type="button"
            disabled={idx >= steps.length - 1}
            onClick={() => setIdx((v) => Math.min(steps.length - 1, v + 1))}
          >
            Sau →
          </button>
        </div>
      </div>
    </section>
  );
}
