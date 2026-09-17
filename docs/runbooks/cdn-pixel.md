# Runbook — CDN / Pixel / Consent

## Pixel không fire
1. Consent banner: `localStorage ptt_consent_v1=granted`
2. Storefront có `gtm_container_id` / `meta_pixel_id`
3. TrackingPixels chỉ load sau consent

## First-party events thiếu
1. `FEATURE_ANALYTICS_CONSENT_GATE` — denied skip marketing events
2. Kiểm tra `POST /v1/events` + dashboard funnel

## CDN / static
- Next standalone static dưới `.next/static`
- Sau deploy: copy static vào standalone apps/*
- Hard refresh / purge cache nếu dùng CDN phía trước
