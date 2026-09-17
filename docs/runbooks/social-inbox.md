# Runbook — Social Inbox B1

## Mục tiêu
Channel binding (Meta/Zalo stub) + Unified Inbox: thread, owner, SLA, tag, reply stub.

## Flags / env
- `FEATURE_SOCIAL_LIVE=false` (default) → luôn stub OAuth/send
- `SOCIAL_SLA_MINUTES=15`
- Optional live markers: `META_APP_ID`, `ZALO_APP_ID` (mode label only khi FEATURE_SOCIAL_LIVE)

## Verify
```bash
curl -sS http://127.0.0.1:3001/api/health   # wave B1
bash scripts/e2e-b1.sh
```

## Ops
1. Bind ≥2 kênh: `POST /v1/admin/social/channels/bind` (meta messenger + zalo oa).
2. Ingest: `POST /v1/admin/social/webhooks/meta|zalo` với `text` / `thread_id`.
3. Assign: `POST /v1/admin/social/inbox/:id/assign` — owner + tags → reset SLA.
4. Admin UI: `/social` · `/social/[id]`.

## Sự cố thường gặp
| Triệu chứng | Cách xử lý |
|---|---|
| Channel disconnected | Re-bind cùng `external_id` |
| Dedupe message | Cùng `message_id` trên thread → `deduped: true` |
| SLA breached | `POST /v1/admin/social/sla/refresh` hoặc assign lại |

SRS: FR-ORG-011 · FR-SOC-001/002 · OpenAPI `docs/openapi-b1.yaml`
