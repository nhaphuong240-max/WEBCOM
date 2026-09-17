# Runbook — C1 Customer 360

## Mục tiêu
Hồ sơ khách thống nhất: profile + consent kênh + snapshot orders/inbox (FR-CRM slice · BR-011/020).

## Flow
1. `POST /v1/admin/customers/ensure` — upsert theo phone/email
2. `GET /v1/admin/customers?q=` — search
3. `GET /v1/admin/customers/:id` — 360 (orders + conversations)
4. `PATCH .../consent` — bật/tắt email/sms/zns/messenger
5. `POST .../link-inbox` — gắn thread có `contact_handle` = phone

Storefront `POST /v1/customers/register|login` vẫn dùng cùng bảng `customers`.

## Verify
```bash
curl -sS http://127.0.0.1:3001/api/health   # wave C1+ (C2 supersedes)
bash scripts/e2e-c1.sh
```

Admin: `/customers` · `/customers/[id]` · OpenAPI `docs/openapi-c1.yaml`

Identity merge (C2): xem `docs/runbooks/customer-identity-merge.md` · `/customers/matches`.
