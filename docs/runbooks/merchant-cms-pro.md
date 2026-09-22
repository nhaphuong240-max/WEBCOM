# Runbook — Merchant CMS Pro

| Env | Flag |
|---|---|
| `FEATURE_CMS_SITE_SETTINGS_V1` | Site Settings API/UI |
| `FEATURE_CMS_ARCHETYPE_V1` | Archetype cart gate |
| `FEATURE_CMS_COMMERCE_MERCH_V1` | Commerce merch sections |
| `FEATURE_CMS_SECTION_PARITY_V1` | CI parity script |

## Migrate

```bash
cd /var/www/webecom
pnpm --filter @ptt/admin-api exec prisma migrate deploy
```

## Console (merchant)

- `/console/website/settings` — Thiết lập website (Chung / Floating / Bán hàng / Popup)
- `/console/website/builder` — Site Builder
- `/console/website/collections` — Merch banner/SEO
- `/console/website/nav` — Mega menu merch
- `/console/website/campaigns` — Promo landing (countdown + coupon)
- `/console/website/leads` — Leads + CSV
- `/console/website/golive` — Checklist (identity, floating, commerce…)

## Public API

- `GET /api/v1/storefronts/:id/runtime` → `site_settings` + `commerce_ux`
- `PUT /api/v1/admin/storefronts/:id/site-settings`
- `POST /api/v1/public/storefronts/:id/leads`

## e2e

```bash
# Foundation
API_URL=http://127.0.0.1:3101 ./scripts/e2e-cms-pro-s1.sh

# PRO-C2 · UC-13 + collection/cart/promo/mega/golive
# Full pass needs C2 deploy (coupon_strip + nav mega). Pre-deploy smoke:
#   C2_PARTIAL=1 API_URL=http://127.0.0.1:3101 ./scripts/e2e-cms-pro-c2.sh
API_URL=http://127.0.0.1:3101 \
STOREFRONT_URL=https://themes.ngoinhahomnay.vn \
  ./scripts/e2e-cms-pro-c2.sh

node scripts/check-section-parity.mjs
```

## UAT checklist bán hàng (PC2-11 / PRO-3)

| # | Bước | Kỳ vọng |
|---|---|---|
| 1 | Settings → Bán hàng: empty cart, mini-cart, policy, thank-you | Lưu → runtime `commerce_ux` |
| 2 | Bộ sưu tập: banner + SEO → Publish | SF `/collections/{slug}` hiện banner |
| 3 | Campaign: countdown + coupon → Publish | SF `/promo/{slug}` · hết hạn ẩn deal |
| 4 | Mega menu: gắn collection + SP | Desktop hover hiện panel |
| 5 | PLP → PDP → ATC → mini-cart → checkout | UC-13; policy links trên checkout |
| 6 | Go-live | `catalog_sync` / `commerce_atc` / `merch_home` pass |

**Phân biệt:** `/products` = SKU/giá/tồn (Core) · Settings/Builder/Collections = trình bày CMS.

## Phân biệt

| Path | Việc |
|---|---|
| `/website/settings` · Builder · Collections · Nav · Campaigns | Trình bày / merchandising |
| `/products` · `/inventory` | SKU / giá / tồn (Commerce Core) |
| `/platform/*` | Platform GTM — không dùng cho shop khách |
