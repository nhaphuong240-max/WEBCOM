# Runbook — Marketplace B5 (Shopee connector #1)

## Mục tiêu
Shopee stub: connect account · listing↔SKU · stock outbox lag ≤60s · order import / exception (FR-MKTPLACE · BR-004).

## Flow
1. `POST /v1/admin/marketplace/accounts/connect` — bind shop stub
2. `POST /v1/admin/marketplace/listings` — map SKU → external item + enqueue stock
3. `POST /v1/admin/marketplace/stock/sync` — drain outbox; kiểm `within_slo`
4. `POST /v1/admin/marketplace/orders/ingest` — matched → OMS `CONFIRMED`; unmatched → `match_status=exception`
5. `GET /v1/admin/marketplace/outbox` — lag_ms theo job

## Flags
- `FEATURE_SHOPEE_LIVE=false` (mặc định stub)
- `MARKETPLACE_STOCK_LAG_SLO_MS=60000`

## Verify
```bash
curl -sS http://127.0.0.1:3001/api/health   # wave B5
bash scripts/e2e-b5.sh
```

SRS: FR-MKTPLACE · OpenAPI `docs/openapi-b5.yaml` · Admin `/marketplace`
