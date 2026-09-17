#!/usr/bin/env bash
# B5: Marketplace Shopee — connect · listing · stock lag ≤60s · order import / exception
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
T="${TENANT_ID:-ten_aura}"
SF="${STOREFRONT_ID:-sf_aura}"
SKU="${SKU_ID:-sku_aura_glow_30}"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-brand-id: brd_aura" -H "x-actor-id: e2e-b5")

echo "== health wave B5 =="
curl -sS "$BASE/health" | tee /tmp/b5-health.json
grep -qE '"wave":"(B[56]|C[1-6])"' /tmp/b5-health.json

echo "== marketplace status =="
curl -sS "${H[@]}" "$BASE/v1/admin/marketplace/status" | tee /tmp/b5-status.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b5-status.json"))
assert d["wave"]=="B5"
assert d["connector"]["platform"]=="shopee"
assert d["features"]["stock_sync_outbox"] is True
assert d["features"]["lag_slo_ms"]<=60000
print("status ok", d["connector"]["mode"])
PY

echo "== connect shopee =="
curl -sS "${H[@]}" -d "{\"platform\":\"shopee\",\"shop_name\":\"E2E Shopee\",\"shop_id\":\"e2e_shopee_shop\",\"storefront_id\":\"$SF\"}" \
  "$BASE/v1/admin/marketplace/accounts/connect" | tee /tmp/b5-account.json
AID=$(python3 -c 'import json;print(json.load(open("/tmp/b5-account.json"))["id"])')
test -n "$AID"
grep -q '"status":"connected"' /tmp/b5-account.json

echo "== upsert listing =="
curl -sS "${H[@]}" -d "{\"account_id\":\"$AID\",\"sku_id\":\"$SKU\",\"title\":\"E2E Glow Serum\"}" \
  "$BASE/v1/admin/marketplace/listings" | tee /tmp/b5-listing.json
LID=$(python3 -c 'import json;print(json.load(open("/tmp/b5-listing.json"))["id"])')
EXT=$(python3 -c 'import json;print(json.load(open("/tmp/b5-listing.json"))["external_item_id"])')
test -n "$LID"
test -n "$EXT"

echo "== stock sync + lag SLO =="
curl -sS "${H[@]}" -d "{\"account_id\":\"$AID\",\"listing_id\":\"$LID\"}" \
  "$BASE/v1/admin/marketplace/stock/sync" | tee /tmp/b5-sync.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b5-sync.json"))
assert d["within_slo"] is True, d
assert d["lag_slo_ms"]<=60000
for l in d["listings"]:
    assert l["last_lag_ms"] is not None
    assert l["last_lag_ms"]<=d["lag_slo_ms"], l
    assert l["within_slo"] is True
print("lag ok", [l["last_lag_ms"] for l in d["listings"]])
PY

echo "== ingest matched order → OMS =="
EXT_ORD="SPX-E2E-$(date +%s)"
curl -sS "${H[@]}" -d "{\"account_id\":\"$AID\",\"external_order_id\":\"$EXT_ORD\",\"buyer_name\":\"E2E Buyer\",\"buyer_phone\":\"0901111222\",\"shipping_address\":\"1 Nguyen Hue\",\"auto_import\":true,\"lines\":[{\"sku_id\":\"$SKU\",\"external_item_id\":\"$EXT\",\"qty\":1}]}" \
  "$BASE/v1/admin/marketplace/orders/ingest" | tee /tmp/b5-order.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b5-order.json"))
assert d["deduped"] is False
assert d["order"]["match_status"]=="matched"
assert d["order"]["import_status"]=="imported"
assert d["oms"]["order_id"]
assert d["oms"]["status"]=="CONFIRMED"
open("/tmp/b5-oms.txt","w").write(d["oms"]["order_id"])
print("oms", d["oms"]["order_id"])
PY

echo "== BR-004 dedupe =="
curl -sS "${H[@]}" -d "{\"account_id\":\"$AID\",\"external_order_id\":\"$EXT_ORD\",\"lines\":[{\"sku_id\":\"$SKU\",\"qty\":1}]}" \
  "$BASE/v1/admin/marketplace/orders/ingest" | tee /tmp/b5-dedupe.json
grep -q '"deduped":true' /tmp/b5-dedupe.json

echo "== unmatched → exception =="
curl -sS "${H[@]}" -d "{\"account_id\":\"$AID\",\"external_order_id\":\"SPX-UNMATCH-$(date +%s)\",\"auto_import\":false,\"lines\":[{\"external_item_id\":\"sp_item_no_map\",\"qty\":1,\"unit_price\":50000}]}" \
  "$BASE/v1/admin/marketplace/orders/ingest" | tee /tmp/b5-exc.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b5-exc.json"))
assert d["order"]["match_status"]=="exception"
assert d["order"]["import_status"]=="failed"
assert d["oms"] is None
print("exception", d["order"]["id"], d["order"]["exception_reason"])
PY

echo "== outbox lag listed =="
curl -sS "${H[@]}" "$BASE/v1/admin/marketplace/outbox?account_id=$AID" | tee /tmp/b5-outbox.json
python3 - <<'PY'
import json
rows=json.load(open("/tmp/b5-outbox.json"))
assert any(r["job_type"]=="stock" and r["status"]=="processed" for r in rows), rows[:3]
ok=[r for r in rows if r["lag_ms"] is not None]
assert all(r["lag_ms"]<=60000 for r in ok), ok[:3]
print("outbox", len(rows), "processed stock ok")
PY

echo "B5 OK"
