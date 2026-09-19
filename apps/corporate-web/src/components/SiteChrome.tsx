'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  { label: 'Website Templates', href: '/templates?goal=conversion' },
  { label: 'Beauty & Fashion', href: '/templates?industry=beauty' },
  { label: 'Live Commerce', href: '/templates?goal=live' },
  { label: 'POS & Omnichannel', href: '/templates?goal=omnichannel' },
  { label: 'Landing Pages', href: '/templates?goal=leadgen' },
  { label: 'CRM Ready', href: '/templates?goal=retention' },
  { label: 'Sale', href: '/templates?license=one_time' },
];

export function SiteNav() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/templates?q=${encodeURIComponent(query)}` : '/templates');
  }

  return (
    <div className="tm-chrome">
      <div className="tm-promo">
        <p>
          <strong>WebCom Unlimited</strong> — tải theme không giới hạn · trial trước paywall · VietQR
        </p>
        <Link href="/pricing" className="tm-promo-cta">
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

          <Link href="/" className="tm-logo" aria-label="WebCom trang chủ">
            <span className="tm-logo-mark" aria-hidden>
              W
            </span>
            <span className="tm-logo-text">
              WebCom<em>.</em>
            </span>
          </Link>

          <form className="tm-search" onSubmit={onSearch} role="search">
            <Link href="/templates" className="tm-search-cats" title="Danh mục">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <rect x="1" y="1" width="6" height="6" rx="1.2" fill="currentColor" />
                <rect x="9" y="1" width="6" height="6" rx="1.2" fill="currentColor" />
                <rect x="1" y="9" width="6" height="6" rx="1.2" fill="currentColor" />
                <rect x="9" y="9" width="6" height="6" rx="1.2" fill="currentColor" />
              </svg>
              Categories
            </Link>
            <input
              type="search"
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='vd. "beauty", "live drop", "pos"'
              aria-label="Tìm template"
            />
            <button type="submit" className="tm-search-submit" aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </form>

          <div className="tm-header-actions">
            <span className="tm-lang" title="Ngôn ngữ">
              VI
            </span>
            <Link href="/pricing" className="tm-btn tm-btn-unlimited">
              Unlimited
            </Link>
            <Link href="/trial" className="tm-btn tm-btn-account">
              Đăng nhập
            </Link>
            <Link href="/templates" className="tm-icon-btn tm-cart" aria-label="Catalog">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="20" r="1.2" fill="currentColor" />
                <circle cx="17" cy="20" r="1.2" fill="currentColor" />
              </svg>
            </Link>
          </div>
        </div>

        <nav className={`tm-cat-nav${menuOpen ? ' open' : ''}`} aria-label="Danh mục sản phẩm">
          {CATEGORIES.map((c) => (
            <Link key={c.href + c.label} href={c.href} onClick={() => setMenuOpen(false)}>
              {c.label}
            </Link>
          ))}
          <Link href="/case-studies" onClick={() => setMenuOpen(false)}>
            Case / ROI
          </Link>
          <Link href="/resources" onClick={() => setMenuOpen(false)}>
            Resources
          </Link>
        </nav>
      </header>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="tm-footer">
      <div className="tm-footer-inner">
        <div className="tm-footer-brand">
          <Link href="/" className="tm-logo tm-logo-footer">
            <span className="tm-logo-mark" aria-hidden>
              W
            </span>
            <span className="tm-logo-text">
              WebCom<em>.</em>
            </span>
          </Link>
          <p>
            Digital marketplace theme & playbook cho bán hàng đa kênh Việt Nam — demo live, trial
            self-serve, mua license one-time.
          </p>
        </div>
        <div>
          <h4>Marketplace</h4>
          <ul>
            <li>
              <Link href="/templates">Browse templates</Link>
            </li>
            <li>
              <a href="https://themes.ngoinhahomnay.vn/">Demo storefront</a>
            </li>
            <li>
              <Link href="/trial">Self-serve trial</Link>
            </li>
            <li>
              <Link href="/pricing">Unlimited & pricing</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4>Platform</h4>
          <ul>
            <li>
              <a href="/#categories">Website Commerce</a>
            </li>
            <li>
              <a href="/#bestsellers">Bestsellers</a>
            </li>
            <li>
              <a href="https://webecom.ngoinhahomnay.vn/console">Admin console</a>
            </li>
            <li>
              <a href="/#lead">Book demo</a>
            </li>
          </ul>
        </div>
        <div>
          <h4>Resources</h4>
          <ul>
            <li>
              <Link href="/case-studies">Case / ROI</Link>
            </li>
            <li>
              <Link href="/resources">Guides</Link>
            </li>
            <li>
              <Link href="/pricing">Pricing</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="tm-footer-bottom">
        <span>© {new Date().getFullYear()} WebCom · ngoinhahomnay.vn</span>
        <span>Inspired marketplace UX · original WebCom product & content</span>
      </div>
    </footer>
  );
}
