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
- `/console/website/leads` — Leads + CSV
- `/console/website/golive` — Checklist (identity, floating, commerce…)

## Public API

- `GET /api/v1/storefronts/:id/runtime` → `site_settings` + `commerce_ux`
- `PUT /api/v1/admin/storefronts/:id/site-settings`
- `POST /api/v1/public/storefronts/:id/leads`

## e2e

```bash
API_URL=http://127.0.0.1:3101 ./scripts/e2e-cms-pro-s1.sh
node scripts/check-section-parity.mjs
```

## Phân biệt

| Path | Việc |
|---|---|
| `/website/settings` · Builder | Trình bày / merchandising |
| `/products` · `/inventory` | SKU / giá / tồn (Commerce Core) |
| `/platform/*` | Platform GTM — không dùng cho shop khách |
