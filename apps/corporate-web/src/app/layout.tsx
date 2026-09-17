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
  weight: ['700', '800'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'PTT Commerce Intelligence OS',
  description: 'Omnichannel có lãi — Website Commerce + CRM + Revenue Intelligence',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${body.variable} ${display.variable}`}>
      <body
        style={
          {
            ['--ptt-font-body' as string]: 'var(--font-body), sans-serif',
            ['--ptt-font-display' as string]: 'var(--font-display), Syne, sans-serif',
            margin: 0,
            background: '#0b1420',
            color: '#f4f7fb',
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
