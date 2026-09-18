'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`corp-site-nav${scrolled ? ' scrolled' : ''}`}>
      <Link href="/" className="corp-brand">
        <span className="dot" aria-hidden />
        PTT
      </Link>
      <nav className="corp-nav-links" aria-label="Primary">
        <a href="/#solutions">Giải pháp</a>
        <Link href="/templates">Templates</Link>
        <a href="/#crm">CRM</a>
        <Link href="/pricing">Pricing</Link>
        <Link href="/case-studies">Case / ROI</Link>
        <Link href="/resources">Resources</Link>
      </nav>
      <div className="corp-nav-cta">
        <Link href="/trial" className="corp-btn corp-btn-ghost corp-btn-sm">
          Dùng thử
        </Link>
        <Link href="/#demo" className="corp-btn corp-btn-primary">
          Đặt demo
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="corp-footer">
      <div className="corp-footer-grid">
        <div>
          <div className="corp-brand" style={{ color: '#fff', marginBottom: 12 }}>
            <span className="dot" aria-hidden />
            PTT
          </div>
          <p style={{ maxWidth: '32ch', lineHeight: 1.55 }}>
            Commerce Intelligence OS — website, omnichannel, CRM và margin, không chỉ GMV.
          </p>
        </div>
        <div>
          <h4>Sản phẩm</h4>
          <ul>
            <li>
              <Link href="/templates">Template Marketplace</Link>
            </li>
            <li>
              <a href="https://themes.ngoinhahomnay.vn/">Demo storefront</a>
            </li>
            <li>
              <Link href="/trial">Self-serve trial</Link>
            </li>
            <li>
              <a href="https://webecom.ngoinhahomnay.vn/console">Admin console</a>
            </li>
          </ul>
        </div>
        <div>
          <h4>Giải pháp</h4>
          <ul>
            <li>
              <a href="/#solutions">Website Commerce</a>
            </li>
            <li>
              <a href="/#crm">CRM & Loyalty</a>
            </li>
            <li>
              <a href="/#ai">AI có approval</a>
            </li>
            <li>
              <Link href="/pricing">Pricing</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4>Tài nguyên</h4>
          <ul>
            <li>
              <Link href="/case-studies">Case / ROI</Link>
            </li>
            <li>
              <Link href="/resources">Resources</Link>
            </li>
            <li>
              <a href="/#demo">Book demo</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="corp-footer-bottom">
        <span>© {new Date().getFullYear()} PTT Commerce Intelligence OS</span>
        <span>webecom.ngoinhahomnay.vn</span>
      </div>
    </footer>
  );
}
