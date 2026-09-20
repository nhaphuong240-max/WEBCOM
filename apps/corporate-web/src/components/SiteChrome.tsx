'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const DEFAULT_NAV = [
  { label: 'Đa kênh', href: '/#channels' },
  { label: 'CRM', href: '/#crm' },
  { label: 'AI', href: '/#ai' },
  { label: 'Vận hành', href: '/#ops' },
  { label: 'Margin', href: '/#margin' },
  { label: 'Templates', href: '/templates' },
];

const DEFAULT_NAV_EN = [
  { label: 'Channels', href: '/en#channels' },
  { label: 'CRM', href: '/en#crm' },
  { label: 'AI', href: '/en#ai' },
  { label: 'Ops', href: '/en#ops' },
  { label: 'Templates', href: '/templates' },
  { label: 'Tiếng Việt', href: '/' },
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
  const light = pathname.startsWith('/templates') || pathname.startsWith('/trial');
  const isGtmHome = pathname === '/' || pathname === '/en';
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const NAV = isGtmHome
    ? isEn
      ? DEFAULT_NAV_EN
      : DEFAULT_NAV
    : isEn
      ? navItemsEn?.length
        ? navItemsEn
        : DEFAULT_NAV_EN
      : navItems?.length
        ? navItems
        : DEFAULT_NAV;

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/templates?q=${encodeURIComponent(query)}` : '/templates');
  }

  if (isGtmHome) {
    return (
      <header className="gtm-nav">
        <Link href={isEn ? '/en' : '/'} className="gtm-nav-brand" aria-label="PTT">
          <span className="dot" aria-hidden />
          PTT
        </Link>
        <nav className="gtm-nav-links" aria-label="Primary">
          {NAV.filter((n) => !n.href.includes('Tiếng') && n.label !== 'Tiếng Việt').map((n) => (
            <Link key={n.href + n.label} href={n.href}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="gtm-nav-cta">
          {isEn ? (
            <Link href="/" className="gtm-btn gtm-btn-ghost-ink">
              VI
            </Link>
          ) : (
            <Link href="/en" className="gtm-btn gtm-btn-ghost-ink">
              EN
            </Link>
          )}
          <Link href="/templates" className="gtm-btn gtm-btn-ghost-ink">
            {isEn ? 'Tour' : 'Xem tour'}
          </Link>
          <a href="#demo" className="gtm-btn gtm-btn-primary">
            {isEn ? 'Book demo' : 'Đặt demo'}
          </a>
        </div>
      </header>
    );
  }

  if (light) {
    return (
      <header className="hv-nav">
        <div className="hv-nav-inner">
          <button
            type="button"
            className="hv-menu-btn"
            aria-label="Menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>

          <Link href="/" className="hv-logo" aria-label="WebCom">
            <span className="hv-logo-mark" aria-hidden>
              W
            </span>
            webcom
          </Link>

          <form className="hv-search" onSubmit={onSearch} role="search">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm giao diện"
              aria-label="Tìm giao diện"
            />
            <button type="submit" aria-label="Tìm kiếm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </form>

          <nav className={`hv-nav-links${menuOpen ? ' open' : ''}`} aria-label="Danh mục">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setMenuOpen(false)}>
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="hv-nav-actions">
            <Link href="/trial" className="hv-btn hv-btn-outline">
              Đăng nhập
            </Link>
            <Link href="/trial" className="hv-btn hv-btn-primary">
              Bắt đầu miễn phí
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <div className="tm-chrome">
      <div className="tm-promo">
        <p>
          {isEn ? (
            <>
              <strong>WebCom Unlimited</strong> — unlimited theme downloads · trial before paywall · VietQR
            </>
          ) : (
            <>
              <strong>WebCom Unlimited</strong> — tải theme không giới hạn · trial trước paywall · VietQR
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
            aria-label="Mở menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>

          <Link href={isEn ? '/en' : '/'} className="tm-logo" aria-label="WebCom home">
            <span className="tm-logo-mark" aria-hidden>
              W
            </span>
            <span className="tm-logo-text">
              WebCom<em>.</em>
            </span>
          </Link>

          <form className="tm-search" onSubmit={onSearch} role="search">
            <Link href="/templates" className="tm-search-cats" title="Categories">
              Categories
            </Link>
            <input
              type="search"
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={isEn ? 'e.g. beauty, live drop, pos' : 'vd. "beauty", "live drop", "pos"'}
              aria-label={isEn ? 'Search templates' : 'Tìm template'}
            />
            <button type="submit" className="tm-search-submit" aria-label="Search">
              ⌕
            </button>
          </form>

          <div className="tm-header-actions">
            <Link href={isEn ? '/en/pricing' : '/pricing'} className="tm-btn tm-btn-unlimited">
              Unlimited
            </Link>
            <Link href="/trial" className="tm-btn tm-btn-account">
              {isEn ? 'Sign in' : 'Đăng nhập'}
            </Link>
          </div>
        </div>

        <nav className={`tm-cat-nav${menuOpen ? ' open' : ''}`} aria-label={isEn ? 'Product categories' : 'Danh mục sản phẩm'}>
          {NAV.map((c) => (
            <Link key={c.href} href={c.href} onClick={() => setMenuOpen(false)}>
              {c.label}
            </Link>
          ))}
          {!isEn ? (
            <>
              <Link href="/case-studies">Case / ROI</Link>
              <Link href="/resources">Resources</Link>
            </>
          ) : null}
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
    <footer className="hv-footer">
      <div className="hv-footer-inner">
        <div>
          <Link href="/" className="hv-logo hv-logo-foot">
            <span className="hv-logo-mark" aria-hidden>
              W
            </span>
            webcom
          </Link>
          <p>
            Kho giao diện website bán hàng & doanh nghiệp — demo live, trial miễn phí, mua license
            one-time.
          </p>
        </div>
        <div>
          <h4>Giao diện</h4>
          <ul>
            {footerItems?.length
              ? footerItems.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href}>{l.label}</Link>
                  </li>
                ))
              : (
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
              <a href="/#lead">Liên hệ sales</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="hv-footer-bottom">
        <span>© {new Date().getFullYear()} WebCom</span>
        <span>Layout inspired by marketplace UX · brand & content WebCom</span>
      </div>
    </footer>
  );
}
