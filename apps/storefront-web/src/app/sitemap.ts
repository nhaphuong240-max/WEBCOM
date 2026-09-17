import { getProducts } from '../lib/api';

export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://webecom.ngoinhahomnay.vn';
  const products = await getProducts().catch(() => []);
  return [
    { url: `${base}/`, changeFrequency: 'daily' as const, priority: 1 },
    { url: `${base}/search`, changeFrequency: 'weekly' as const, priority: 0.5 },
    { url: `${base}/cart`, changeFrequency: 'weekly' as const, priority: 0.3 },
    ...products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ];
}
