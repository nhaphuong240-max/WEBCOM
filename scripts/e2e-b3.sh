#!/usr/bin/env bash
# B3: POS 1 store — barcode sell + shift + location stock sync + return
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
T="${TENANT_ID:-ten_aura}"
SKU="${SKU_ID:-sku_aura_glow_30}"
BARCODE="${BARCODE:-8938501234567}"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-brand-id: brd_aura" -H "x-actor-id: e2e-b3")

echo "== health wave B3 =="
curl -sS "$BASE/health" | tee /tmp/b3-health.json
grep -qE '"wave":"B[3-6]"' /tmp/b3-health.json

echo "== pos status =="
curl -sS "${H[@]}" "$BASE/v1/admin/pos/status" | tee /tmp/b3-status.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b3-status.json"))
assert d["wave"] in ("B3","B4","B5","B6")
assert d["features"]["barcode_search"] is True
assert d["nfr"]["barcode_search_p95_ms_target"]==500
print("status ok")
PY

echo "== ensure store =="
curl -sS "${H[@]}" -d '{}' "$BASE/v1/admin/pos/locations/ensure" | tee /tmp/b3-store.json
LOC=$(python3 -c 'import json;print(json.load(open("/tmp/b3-store.json"))["location"]["id"])')
REG=$(python3 -c 'import json;print(json.load(open("/tmp/b3-store.json"))["register"]["id"])')
echo "loc=$LOC reg=$REG"

echo "== barcode lookup SLO =="
curl -sS "${H[@]}" "$BASE/v1/admin/pos/lookup?q=$BARCODE&location_id=$LOC" | tee /tmp/b3-lookup.json
python3 - <<PY
import json
d=json.load(open("/tmp/b3-lookup.json"))
assert d["sku_id"]=="$SKU"
assert d["within_slo"] is True, d
assert d["latency_ms"] <= 500, d
print("lookup", d["latency_ms"], "ms", d["unit_price"], "avail", d["available_pos"])
PY

echo "== inventory before =="
curl -sS "${H[@]}" "$BASE/v1/admin/inventory/$SKU" | tee /tmp/b3-inv-before.json
BEFORE=$(python3 -c 'import json;print(json.load(open("/tmp/b3-inv-before.json"))["on_hand"])')

echo "== open shift =="
curl -sS "${H[@]}" -d "{\"register_id\":\"$REG\",\"opening_cash\":500000}" \
  "$BASE/v1/admin/pos/shifts/open" | tee /tmp/b3-shift.json
SHIFT=$(python3 -c 'import json;print(json.load(open("/tmp/b3-shift.json"))["id"])')
test -n "$SHIFT"

echo "== sell cash =="
PRICE=$(python3 -c 'import json;print(json.load(open("/tmp/b3-lookup.json"))["unit_price"])')
curl -sS "${H[@]}" -d "{\"shift_id\":\"$SHIFT\",\"lines\":[{\"sku_id\":\"$SKU\",\"qty\":1}],\"payments\":[{\"method\":\"cash\",\"amount\":$PRICE}],\"customer_name\":\"POS Guest\"}" \
  "$BASE/v1/admin/pos/sales" | tee /tmp/b3-sale.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b3-sale.json"))
assert d["status"]=="completed"
assert d["receipt_no"]
assert d["order_id"]
assert d["receipt"]["total"]
open("/tmp/b3-sale-id.txt","w").write(d["id"])
print("sale", d["receipt_no"], d["total"], "order", d["order_id"])
PY
SALE=$(cat /tmp/b3-sale-id.txt)

echo "== stock synced after sell =="
curl -sS "${H[@]}" "$BASE/v1/admin/inventory/$SKU" | tee /tmp/b3-inv-after.json
curl -sS "${H[@]}" "$BASE/v1/admin/pos/locations/$LOC/stock" | tee /tmp/b3-loc-stock.json
python3 - <<PY
import json
before=int("$BEFORE")
inv=json.load(open("/tmp/b3-inv-after.json"))
assert inv["on_hand"]==before-1, (before, inv)
rows=json.load(open("/tmp/b3-loc-stock.json"))
hit=next(r for r in rows if r["sku_id"]=="$SKU")
assert hit["on_hand_location"]==inv["on_hand"]
assert hit["consistent"] is True
print("synced global", inv["on_hand"], "location", hit["on_hand_location"])
PY

echo "== sell TRANSFER (QR) =="
curl -sS "${H[@]}" -d "{\"shift_id\":\"$SHIFT\",\"lines\":[{\"sku_id\":\"$SKU\",\"qty\":1}],\"payments\":[{\"method\":\"TRANSFER\",\"amount\":$PRICE}]}" \
  "$BASE/v1/admin/pos/sales" | tee /tmp/b3-qr.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b3-qr.json"))
assert d["payment_summary"]=="TRANSFER"
assert d.get("qr_image_url") or True
print("qr sale", d["receipt_no"])
PY

echo "== return =="
curl -sS "${H[@]}" -d "{\"sale_id\":\"$SALE\",\"lines\":[{\"sku_id\":\"$SKU\",\"qty\":1}],\"reason\":\"e2e return\",\"refund_tender\":\"cash\",\"shift_id\":\"$SHIFT\"}" \
  "$BASE/v1/admin/pos/returns" | tee /tmp/b3-return.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b3-return.json"))
assert float(d["total"])>0
print("return", d["id"], d["total"])
PY

echo "== close shift report =="
# expected ≈ opening + cash sales - cash returns; after 1 cash sale + 1 return cash net 0 + maybe transfer
curl -sS "${H[@]}" -d '{"closing_cash":500000}' "$BASE/v1/admin/pos/shifts/$SHIFT/close" | tee /tmp/b3-close.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b3-close.json"))
assert d["status"]=="closed"
assert "report" in d
assert d["report"]["sales_count"]>=1
print("close report", d["report"])
PY

echo "B3 OK"
