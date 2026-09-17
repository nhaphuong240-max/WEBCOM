import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Syne } from 'next/font/google';
import '@ptt/ui/styles.css';

const body = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

const display = Syne({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'AURA Beauty · Powered by PTT',
  description: 'W0 storefront shell — PDP/checkout lands in W2',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${body.variable} ${display.variable}`}>
      <body
        style={
          {
            ['--ptt-font-body' as string]: 'var(--font-body), "Be Vietnam Pro", sans-serif',
            ['--ptt-font-display' as string]: 'var(--font-display), Syne, sans-serif',
            background: '#faf8f6',
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
