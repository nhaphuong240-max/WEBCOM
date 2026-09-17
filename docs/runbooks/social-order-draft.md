# Runbook — Social comment/chat → Order (B2)

## Mục tiêu
Từ comment/chat inbox tạo **order draft** (product snapshot + `external_thread_id` — BR-023), gửi giỏ Messenger stub, convert → OMS `CONFIRMED` với reserve tồn + attribution kênh.

## Flow
1. Ingest `kind=comment|chat` → `POST /v1/admin/social/webhooks/:provider`
2. Product picker → `GET /v1/admin/social/products?q=`
3. Draft → `POST /v1/admin/social/comments/:messageId/order-draft` hoặc `/drafts`
4. (Optional) `POST /drafts/:id/send-cart` — stub m.me cart + reply
5. `POST /drafts/:id/convert` — cart → checkout COD/TRANSFER

## Risk score (soft)
| Flag | Điểm |
|---|---|
| missing_phone | +25 |
| missing_address | +15 |
| cod_high_value (≥1e6) | +30 |
| comment_origin | +10 |
| cod | +5 |

## Verify
```bash
curl -sS http://127.0.0.1:3001/api/health   # wave B2
bash scripts/e2e-b2.sh
```

## Sự cố
| Triệu chứng | Xử lý |
|---|---|
| Insufficient stock | Giảm qty / điều chỉnh tồn |
| Draft already converted | Không convert lại (409) |
| Missing shipping_* | Bắt buộc name/phone/address khi convert |

SRS: FR-SOC-004/005 · FR-OMS-010 · BR-023 · OpenAPI `docs/openapi-b2.yaml`
