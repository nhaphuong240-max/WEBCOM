import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Syne } from 'next/font/google';
import '@ptt/ui/styles.css';
import { AdminShell } from '@/components/AdminShell';

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
  title: 'PTT Admin · Commerce Intelligence OS',
  description: 'W0 Admin Command Center shell',
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
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
