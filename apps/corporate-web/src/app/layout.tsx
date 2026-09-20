import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Plus_Jakarta_Sans } from 'next/font/google';
import '@ptt/ui/styles.css';
import './globals.css';
import { SiteNav, SiteFooter } from '../components/SiteChrome';
import { fetchPlatformNav } from '../lib/platform-cms';

const body = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

const display = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'WebCom — Template & Theme Marketplace | Commerce OS',
  description:
    'Chọn theme → demo live → trial → mua. Marketplace template bán hàng đa kênh cho Việt Nam.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nav = await fetchPlatformNav();
  return (
    <html lang="vi" className={`${body.variable} ${display.variable}`}>
      <body
        style={
          {
            ['--ptt-font-body' as string]:
              'var(--font-body), "Be Vietnam Pro", system-ui, sans-serif',
            ['--ptt-font-display' as string]:
              'var(--font-display), "Plus Jakarta Sans", system-ui, sans-serif',
          } as React.CSSProperties
        }
      >
        <SiteNav navItems={nav.header} />
        {children}
        <SiteFooter footerItems={nav.footer} />
      </body>
    </html>
  );
}
