# PTT Commerce Intelligence OS

Monorepo theo **SRS v5.1** / **Architecture v3** — Phase **W2 Website Foundation** (bán được trên storefront).

## Apps

| App | Port | Mô tả |
|---|---|---|
| `admin-api` | 3001 | Commerce + website runtime APIs |
| `admin-web` | 3000 | Admin products/orders/theme/analytics |
| `corporate-web` | 3003 | Platform GTM + template gallery (apex) |
| `storefront-web` | 3002 | Demo sandbox / merchant shop |

## W2 quick start

```bash
pnpm install
docker compose up -d
pnpm --filter @ptt/shared-kernel build && pnpm --filter @ptt/ui build
pnpm --filter @ptt/admin-api exec prisma generate
pnpm --filter @ptt/admin-api exec prisma migrate deploy
pnpm --filter @ptt/admin-api seed
pnpm dev
```

- Storefront: http://localhost:3002  
- PDP: http://localhost:3002/products/glow-serum-30ml  
- Corporate: http://localhost:3003  
- OpenAPI: `docs/openapi-w2.yaml`

## W2 checklist

- [x] Theme / Page / Nav / Events / Voucher / Lead
- [x] Aura Commerce Lite runtime SSR
- [x] Catalog search/collection + PDP sticky ATC
- [x] Cart / checkout (ship quotes, voucher, COD/QR stub)
- [x] Account OTP/password + consent before pixels
- [x] SEO sitemap/robots/JSON-LD
- [x] Corporate lead API + UI
