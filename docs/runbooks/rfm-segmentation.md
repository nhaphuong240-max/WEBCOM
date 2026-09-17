# Runbook — RFM + Segmentation (C3)

## Mục tiêu
Tính RFM (R/F/M 1–5 + label) theo tenant và định nghĩa audience bằng `Segment` + `SegmentRule` (AND/OR, time window) — FR-SEG.

## RFM (stub buckets)
| Dimension | Metric | Buckets (ví dụ) |
|---|---|---|
| R | days since `last_order_at` | ≤30→5 … >180→1 |
| F | `lifetime_orders` | ≥10→5 … 0–1→1 |
| M | `lifetime_spend` VND | ≥5M→5 … <300k→1 |

Labels: Champions · Loyal · Potential · New · AtRisk · NeedAttention · Hibernating · Other.

```bash
curl -X POST .../v1/admin/crm/rfm/refresh
curl .../v1/admin/crm/rfm/summary
```

Job audit: bảng `rfm_job_runs` (lịch cron stub = gọi API).

## Segment rules
Fields: `rfm_*`, `lifetime_orders|spend`, `tags`, `status`, `consent_*`, `last_order_days` (+ `window_days`).

Ops: `eq|neq|gt|gte|lt|lte|in|contains|has_tag`.

```bash
# Preview (không ghi)
curl -X POST .../v1/admin/segments/$SID/preview
# Materialize snapshot
curl -X POST .../v1/admin/segments/$SID/materialize
```

## Admin
- `/segments` — RFM refresh · CRUD · preview · materialize
- `/segments/:id/members` — membership snapshot
- Customer 360 hiện RFM + segment memberships

## Verify
```bash
bash scripts/e2e-c3.sh
```

## Lỗi thường gặp
| Triệu chứng | Xử lý |
|---|---|
| Preview count = 0 | Chạy RFM refresh trước nếu rule dùng `rfm_*` |
| Segment name conflict | Đổi `name` (unique per tenant) |
| `Unsupported field` | Chỉ dùng field whitelist trong runbook |
