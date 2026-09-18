import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Syne } from 'next/font/google';
import '@ptt/ui/styles.css';
import './globals.css';
import { SiteNav, SiteFooter } from '../components/SiteChrome';

const body = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});
const display = Syne({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'PTT — Giải pháp bán hàng đa kênh có lãi | Commerce Intelligence OS',
  description:
    'Website Commerce + Omnichannel + CRM + AI — điều hành theo contribution margin, không chỉ GMV.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${body.variable} ${display.variable}`}>
      <body
        style={
          {
            ['--ptt-font-body' as string]: 'var(--font-body), "Be Vietnam Pro", sans-serif',
            ['--ptt-font-display' as string]: 'var(--font-display), Syne, sans-serif',
          } as React.CSSProperties
        }
      >
        <SiteNav />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
