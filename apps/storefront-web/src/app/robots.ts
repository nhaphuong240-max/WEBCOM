import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://webecom.ngoinhahomnay.vn';
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/checkout', '/account'] },
    sitemap: `${base}/sitemap.xml`,
  };
}
