import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Outfit } from 'next/font/google';
import '@ptt/ui/styles.css';
import './globals.css';
import { SiteNav, SiteFooter } from '../components/SiteChrome';
import { UnregisterLegacySw } from '../components/UnregisterLegacySw';
import { fetchPlatformNav } from '../lib/platform-cms';

const body = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

const display = Outfit({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'PTT — Giải pháp bán hàng đa kênh có lãi | Commerce Intelligence OS',
  description:
    'Omnichannel + Website + Social/Live + POS + Sàn + CRM + AI — điều hành theo contribution margin, không chỉ GMV.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [nav, navEn] = await Promise.all([
    fetchPlatformNav(),
    fetchPlatformNav('webcom_en'),
  ]);
  return (
    <html lang="vi" className={`${body.variable} ${display.variable}`}>
      <body
        style={
          {
            ['--ptt-font-body' as string]:
              'var(--font-body), "Be Vietnam Pro", system-ui, sans-serif',
            ['--ptt-font-display' as string]:
              'var(--font-display), Outfit, "Be Vietnam Pro", system-ui, sans-serif',
          } as React.CSSProperties
        }
      >
        <UnregisterLegacySw />
        <SiteNav navItems={nav.header} navItemsEn={navEn.header} />
        {children}
        <SiteFooter footerItems={nav.footer} />
      </body>
    </html>
  );
}
