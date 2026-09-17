# Runbook — Publish fail

## Triệu chứng
- `POST /v1/admin/storefronts/:id/publish` trả 409 CONFLICT
- Go-live `can_publish=false`
- Analytics incident `cwv_regression` sau health-window

## Kiểm tra nhanh
1. `GET /v1/admin/storefronts/:id/golive` — xem `blocking_fails`
2. Waiver có audit nếu business chấp nhận rủi ro
3. `GET /v1/admin/storefronts/:id/cwv` — LCP delta
4. `POST …/health-window` — canary + checkout

## Khôi phục
- `POST …/rollback` về theme version trước (&lt; 5 phút thao tác)
- Hoặc `FEATURE_AUTO_ROLLBACK=true` để auto khi regress &gt;20%

## Liên hệ
On-call WebCom / platform
