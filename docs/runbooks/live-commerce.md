# Runbook — Live Commerce B4

## Mục tiêu
Live session plan · keyword comment → OMS order · stock alert · post-live recovery (FR-LIVE).

## Flow
1. `POST /v1/admin/live/sessions` — tạo plan + bind channel stub
2. `POST .../items` — gắn SKU + keyword (vd. `SERUM1`)
3. `POST .../start` — go live
4. `POST .../comments` — comment chứa keyword → Social draft → convert CONFIRMED
5. `GET .../alerts` — tồn thấp / reserved ≥80%
6. `POST .../end` + `GET .../recovery` — đơn TRANSFER/pending

## Verify
```bash
curl -sS http://127.0.0.1:3001/api/health   # wave B4
bash scripts/e2e-b4.sh
```

SRS: FR-LIVE · phụ thuộc B2 Social draft · OpenAPI `docs/openapi-b4.yaml`
