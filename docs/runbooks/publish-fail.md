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
- `POST …/rollback` về theme version trước — A4 trả `duration_ms` + `within_slo` (target &lt; 5 phút)
- Hoặc `FEATURE_AUTO_ROLLBACK=true` để auto khi regress &gt;20%
- Publish chạy `PublishThemeWorkflow` (`FEATURE_TEMPORAL`, engine `temporal_stub`|`temporal`) — xem `docs/runbooks/temporal-publish.md`

## Liên hệ
On-call WebCom / platform
