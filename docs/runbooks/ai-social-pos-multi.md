# Runbook — B6 AI social + POS multi-store

## Mục tiêu
1. AI reply trên Unified Inbox qua policy/approval (FR-SOC-003 · BR-018).
2. POS ≥2 location + transfer tồn giữa cửa hàng (FR-POS).

## AI social reply
1. `POST /v1/admin/social/inbox/:id/ai-reply` → `AiAction` kind `social_reply`, `pending_approval`
2. Apply **bị chặn** nếu chưa approve
3. `POST /v1/admin/ai/actions/:id/review` `{ decision: approved }`
4. `POST /v1/admin/ai/actions/:id/apply` → outbound stub send
5. Không auto-send / không đổi giá / không refund

## POS multi-store
1. `POST /v1/admin/pos/locations/ensure` với `code=store_q3` (cửa hàng 2+)
2. Location mới: stock SKU = 0 nếu SKU đã có ở location khác
3. `POST /v1/admin/pos/transfers` — chuyển tồn location↔location (global on_hand không đổi)
4. Bán độc lập từng ca/register theo location

## Verify
```bash
curl -sS http://127.0.0.1:3001/api/health   # wave B6
bash scripts/e2e-b6.sh
```

OpenAPI: `docs/openapi-b6.yaml` · Admin `/social/[id]` + `/pos`
