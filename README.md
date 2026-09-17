# PTT Commerce Intelligence OS

Monorepo theo **SRS v5.1**, **Architecture v3**, **Kế hoạch WebCom** — Phase **W1 Commerce Core** đã có API bán 1 SKU end-to-end.

## Stack

| App / Package | Port | Mô tả |
|---|---|---|
| `apps/admin-api` | 3001 | NestJS: catalog, cart, checkout, OMS, inventory |
| `apps/admin-web` | 3000 | Admin: products / orders / inventory CRUD thô |
| `apps/storefront-web` | 3002 | AURA storefront: browse → cart → COD |
| `packages/shared-kernel` | — | Result, Id, errors, context |
| `packages/ui` | — | Design tokens + components |

## Quick start

```bash
pnpm install
docker compose up -d
pnpm --filter @ptt/shared-kernel build
pnpm --filter @ptt/ui build
pnpm --filter @ptt/admin-api exec prisma generate
pnpm --filter @ptt/admin-api exec prisma migrate deploy
pnpm --filter @ptt/admin-api seed
pnpm dev
```

- Admin products: http://localhost:3000/products  
- Storefront: http://localhost:3002  
- API health: http://localhost:3001/api/health  
- OpenAPI: `docs/openapi-w1.yaml`  
- Bruno: `docs/bruno/WebCom-W1.bru`  
- E2E: `./scripts/e2e-w1.sh`

### Seed AURA Beauty

```bash
pnpm --filter @ptt/admin-api seed
# tenant_id=ten_aura brand_id=brd_aura storefront_id=sf_aura sku=AURA-GLOW-30
```

### Checkout (idempotent)

```bash
curl -s http://localhost:3001/api/v1/checkout \
  -H 'content-type: application/json' \
  -H 'x-tenant-id: ten_aura' \
  -H 'Idempotency-Key: demo-1' \
  -d '{"cart_id":"...","payment_method":"COD","shipping_name":"A","shipping_phone":"0901234567","shipping_address":"1 St","client_total":1}'
```

## W1 exit checklist

- [x] OpenAPI catalog/cart/checkout/orders
- [x] Idempotency-Key trên checkout
- [x] Reservation + Redis lock (fallback DB nếu Redis down)
- [x] Admin CRUD product/stock
- [x] Bruno + contract tests + e2e script
- [x] Seed AURA Beauty
