'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

/** Primary product categories — TemplateMonster-style horizontal catalog nav */
const CAT_NAV_VI = [
  { label: 'Tất cả templates', href: '/templates' },
  { label: 'Website bán hàng', href: '/templates?goal=conversion' },
  { label: 'Social & Live', href: '/#channels' },
  { label: 'POS / Cửa hàng', href: '/#channels' },
  { label: 'CRM', href: '/#crm' },
  { label: 'AI Platform', href: '/#ai' },
  { label: 'Margin OS', href: '/#margin' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Resources', href: '/resources' },
  { label: 'Case / ROI', href: '/case-studies' },
];

const CAT_NAV_EN = [
  { label: 'All templates', href: '/templates' },
  { label: 'Commerce sites', href: '/templates?goal=conversion' },
  { label: 'Social & Live', href: '/en#channels' },
  { label: 'POS / Stores', href: '/en#channels' },
  { label: 'CRM', href: '/en#crm' },
  { label: 'AI Platform', href: '/en#ai' },
  { label: 'Margin OS', href: '/en#margin' },
  { label: 'Pricing', href: '/en/pricing' },
  { label: 'Resources', href: '/resources' },
];

export function SiteNav({
  navItems,
  navItemsEn,
}: {
  navItems?: Array<{ label: string; href: string }>;
  navItemsEn?: Array<{ label: string; href: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const isEn = pathname === '/en' || pathname.startsWith('/en/');
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);

  const cats = isEn ? CAT_NAV_EN : CAT_NAV_VI;
  const mega = (isEn ? navItemsEn : navItems)?.length
    ? (isEn ? navItemsEn : navItems)!
    : cats;

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/templates?q=${encodeURIComponent(query)}` : '/templates');
    setMenuOpen(false);
  }

  return (
    <div className="tm-chrome">
      <div className="tm-promo">
        <p>
          {isEn ? (
            <>
              <strong>WebCom Unlimited</strong> — unlimited theme downloads · trial before paywall ·
              VietQR
            </>
          ) : (
            <>
              <strong>WebCom Unlimited</strong> — tải theme không giới hạn · trial trước paywall ·
              VietQR
            </>
          )}
        </p>
        <Link href={isEn ? '/en/pricing' : '/pricing'} className="tm-promo-cta">
          Unlimited Downloads
        </Link>
      </div>

      <header className="tm-header">
        <div className="tm-header-row">
          <button
            type="button"
            className="tm-icon-btn tm-menu-toggle"
            aria-label={isEn ? 'Open menu' : 'Mở menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>

          <Link href={isEn ? '/en' : '/'} className="tm-logo" aria-label="PTT WebCom">
            <span className="tm-logo-mark" aria-hidden>
              P
            </span>
            <span className="tm-logo-text">
              PTT<em>.</em>
            </span>
          </Link>

          <form className="tm-search" onSubmit={onSearch} role="search">
            <div className="tm-search-cats-wrap">
              <button
                type="button"
                className="tm-search-cats"
                aria-expanded={catsOpen}
                aria-haspopup="listbox"
                onClick={() => setCatsOpen((v) => !v)}
              >
                {isEn ? 'Categories' : 'Danh mục'}
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                  <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
              {catsOpen ? (
                <ul className="tm-search-mega" role="listbox">
                  {mega.map((c) => (
                    <li key={c.href + c.label}>
                      <Link
                        href={c.href}
                        onClick={() => {
                          setCatsOpen(false);
                          setMenuOpen(false);
                        }}
                      >
                        {c.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <input
              type="search"
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setCatsOpen(false)}
              placeholder={
                isEn
                  ? 'Search templates, beauty, live drop, POS…'
                  : 'Tìm template, beauty, live drop, POS…'
              }
              aria-label={isEn ? 'Search templates' : 'Tìm template'}
            />
            <button type="submit" className="tm-search-submit" aria-label={isEn ? 'Search' : 'Tìm'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M20 20l-3.5-3.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </form>

          <div className="tm-header-actions">
            <Link
              href={isEn ? '/' : '/en'}
              className="tm-lang"
              hrefLang={isEn ? 'vi' : 'en'}
            >
              {isEn ? 'VI' : 'EN'}
            </Link>
            <Link href={isEn ? '/en/pricing' : '/pricing'} className="tm-btn tm-btn-unlimited">
              Unlimited
            </Link>
            <Link href="/trial" className="tm-btn tm-btn-account">
              {isEn ? 'Sign in' : 'Đăng nhập'}
            </Link>
            <Link href="/#demo" className="tm-btn tm-btn-primary tm-btn-demo-desk">
              {isEn ? 'Book demo' : 'Đặt demo'}
            </Link>
          </div>
        </div>

        <nav
          className={`tm-cat-nav${menuOpen ? ' open' : ''}`}
          aria-label={isEn ? 'Browse categories' : 'Danh mục sản phẩm'}
        >
          {cats.map((c) => (
            <Link key={c.href + c.label} href={c.href} onClick={() => setMenuOpen(false)}>
              {c.label}
            </Link>
          ))}
        </nav>
      </header>
    </div>
  );
}

export function SiteFooter({
  footerItems,
}: {
  footerItems?: Array<{ label: string; href: string }>;
}) {
  return (
    <footer className="tm-footer">
      <div className="tm-footer-inner">
        <div>
          <Link href="/" className="tm-logo tm-logo-footer" aria-label="PTT">
            <span className="tm-logo-mark" aria-hidden>
              P
            </span>
            <span className="tm-logo-text">
              PTT<em>.</em>
            </span>
          </Link>
          <p>
            Kho giao diện website bán hàng & doanh nghiệp — demo live, trial miễn phí, mua license
            one-time. Commerce OS đo contribution margin.
          </p>
        </div>
        <div>
          <h4>Giao diện</h4>
          <ul>
            {footerItems?.length ? (
              footerItems.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))
            ) : (
              <>
                <li>
                  <Link href="/templates">Tất cả giao diện</Link>
                </li>
                <li>
                  <Link href="/templates?license=free">Miễn phí</Link>
                </li>
                <li>
                  <Link href="/templates?goal=conversion">Website bán hàng</Link>
                </li>
                <li>
                  <a href="https://themes.ngoinhahomnay.vn/">Demo storefront</a>
                </li>
              </>
            )}
          </ul>
        </div>
        <div>
          <h4>Bắt đầu</h4>
          <ul>
            <li>
              <Link href="/trial">Trial miễn phí</Link>
            </li>
            <li>
              <Link href="/pricing">Pricing</Link>
            </li>
            <li>
              <Link href="/solutions/website">Solutions</Link>
            </li>
            <li>
              <a href="https://webecom.ngoinhahomnay.vn/console">Admin console</a>
            </li>
          </ul>
        </div>
        <div>
          <h4>Hỗ trợ</h4>
          <ul>
            <li>
              <Link href="/resources">Tài nguyên</Link>
            </li>
            <li>
              <Link href="/case-studies">Case / ROI</Link>
            </li>
            <li>
              <a href="/#demo">Liên hệ sales</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="tm-footer-bottom">
        <span>© {new Date().getFullYear()} PTT · WebCom</span>
        <span>Marketplace UX · brand & content PTT</span>
      </div>
    </footer>
  );
}
