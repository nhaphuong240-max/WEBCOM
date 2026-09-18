import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buyUrl, demoUrl, fetchTemplateDetail, trialUrl } from '../../../lib/marketplace';

export const dynamic = 'force-dynamic';

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const t = await fetchTemplateDetail(code);
  if (!t) notFound();

  const demo = t.demo_url || t.cta?.demo || demoUrl(t.code);
  const trial = t.trial_url || t.cta?.trial || trialUrl(t.code);
  const buy = t.buy_theme_url || t.cta?.buy || buyUrl(t.code);
  const accent = t.tokens?.accent || '#ff5c1a';

  return (
    <main className="corp-page mkt-detail">
      <Link href="/templates" className="mkt-back">
        ← Marketplace
      </Link>

      <header className="mkt-detail-hero" style={{ ['--mkt-accent' as string]: accent }}>
        <div className="corp-eyebrow">ThemePackage · {t.code}</div>
        <h1>{t.name}</h1>
        {t.starter_headline ? (
          <p className="mkt-headline">{t.starter_headline}</p>
        ) : (
          <p className="mkt-headline">
            Template {t.industry} · tối ưu {t.goal} — dùng chung CMS, khác layout &amp; supports.
          </p>
        )}
        <div className="meta" style={{ marginTop: 16 }}>
          <span className="tag">{t.industry}</span>
          <span className="tag tag-accent">{t.goal}</span>
          <span className="tag">{t.license_tier || t.license}</span>
          {t.has_package ? (
            <span className="tag">pkg v{t.package_version || '1'}</span>
          ) : (
            <span className="tag">catalog only</span>
          )}
        </div>
      </header>

      <div className="mkt-cta-row">
        <a href={demo} target="_blank" rel="noreferrer" className="corp-btn corp-btn-ghost">
          Xem demo live
        </a>
        <a href={trial} className="corp-btn corp-btn-primary">
          Dùng thử miễn phí
        </a>
        <a href={buy} className="corp-btn corp-btn-ink">
          Mua theme
        </a>
      </div>
      <p className="mkt-cta-note">
        Demo mở trên themes host (<code>?demo={t.code}</code>). Trial tạo tenant trước paywall —
        mua theme qua console (VietQR).
      </p>

      <section className="mkt-detail-grid">
        <div>
          <h2>Scores</h2>
          <ul className="mkt-score-list">
            <li>
              <strong>CVR</strong> {t.scores?.cvr ?? '—'}
            </li>
            <li>
              <strong>Mobile</strong> {t.scores?.mobile ?? '—'}
            </li>
            <li>
              <strong>SEO</strong> {t.scores?.seo ?? '—'}
            </li>
          </ul>
        </div>
        <div>
          <h2>Supports</h2>
          {t.supports && t.supports.length ? (
            <div className="corp-chip-row">
              {t.supports.map((s) => (
                <span key={s} className="corp-chip">
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>
              Chưa có ThemePackage trên disk — install dùng starter catalog.
            </p>
          )}
        </div>
        <div>
          <h2>Home layout</h2>
          {t.layouts?.home?.length ? (
            <ol className="mkt-layout-list">
              {t.layouts.home.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ol>
          ) : (
            <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>—</p>
          )}
        </div>
      </section>

      {Array.isArray(t.playbook) && t.playbook.length ? (
        <section style={{ marginTop: 40 }}>
          <h2>Conversion playbook</h2>
          <ul className="mkt-playbook">
            {t.playbook.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {Array.isArray(t.features) && t.features.length ? (
        <section style={{ marginTop: 32 }}>
          <h2>Features</h2>
          <div className="corp-chip-row">
            {t.features.map((f) => (
              <span key={f} className="corp-chip">
                {f}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
