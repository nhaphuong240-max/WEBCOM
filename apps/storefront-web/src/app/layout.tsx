import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Be_Vietnam_Pro, Syne } from 'next/font/google';
import '@ptt/ui/styles.css';
import { CartProvider } from '../lib/cart';
import { getRuntime } from '../lib/api';
import { PwaRegister } from '../components/PwaRegister';
import { ThemePreviewChrome } from '../components/ThemePreviewChrome';

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

export async function generateMetadata(): Promise<Metadata> {
  try {
    const rt = await getRuntime();
    return {
      title: String(
        rt.storefront.seo_title ||
          (rt.home?.seo as { title?: string } | null)?.title ||
          'AURA Beauty · PTT',
      ),
      description:
        rt.storefront.seo_description ||
        (rt.home?.seo as { description?: string })?.description ||
        'AURA Beauty storefront',
      manifest: '/manifest.webmanifest',
      appleWebApp: { capable: true, title: 'AURA' },
      themeColor: '#c45a6a',
      openGraph: {
        title: String(rt.storefront.seo_title || 'AURA Beauty'),
        description: rt.storefront.seo_description || undefined,
        type: 'website',
      },
    };
  } catch {
    return {
      title: 'AURA Beauty · Powered by PTT',
      description: 'W5 storefront — Aura Commerce Lite + PWA',
      manifest: '/manifest.webmanifest',
    };
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${body.variable} ${display.variable}`}>
      <body
        style={
          {
            ['--ptt-font-body' as string]: 'var(--font-body), "Be Vietnam Pro", sans-serif',
            ['--ptt-font-display' as string]: 'var(--font-display), Syne, sans-serif',
            background: '#d8dde4',
            margin: 0,
          } as React.CSSProperties
        }
      >
        <CartProvider>
          <Suspense fallback={children}>
            <ThemePreviewChrome>{children}</ThemePreviewChrome>
          </Suspense>
          <PwaRegister />
        </CartProvider>
      </body>
    </html>
  );
}
