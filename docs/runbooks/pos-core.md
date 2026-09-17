# Runbook — POS Core B3 (1 store)

## Mục tiêu
Location / Register / Shift · barcode sell · split cash/COD/TRANSFER · receipt · tồn location ↔ global · đổi trả cơ bản.

## Flow
1. `POST /v1/admin/pos/locations/ensure` — tạo Store Q1 + Reg 1, sync stock
2. `POST /v1/admin/pos/shifts/open` — mở ca + opening cash
3. `GET /v1/admin/pos/lookup?q=` — barcode/SKU (SLO ≤500ms)
4. `POST /v1/admin/pos/sales` — bán + trừ tồn location & global + OMS shadow order
5. `POST /v1/admin/pos/returns` — hoàn 1 phần/toàn bộ
6. `POST /v1/admin/pos/shifts/:id/close` — báo cáo ca + cash variance

## Verify
```bash
curl -sS http://127.0.0.1:3001/api/health   # wave B3
bash scripts/e2e-b3.sh
```

## Seed
- Location `store_q1` · Register `reg_1`
- Barcode Glow Serum: `8938501234567`

SRS: FR-POS · NFR-PERF-002 · OpenAPI `docs/openapi-b3.yaml`
