#!/usr/bin/env bash
# B4: Live Commerce — keyword comment → order + stock alert + recovery
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
T="${TENANT_ID:-ten_aura}"
SF="${STOREFRONT_ID:-sf_aura}"
SKU="${SKU_ID:-sku_aura_glow_30}"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-brand-id: brd_aura" -H "x-actor-id: e2e-b4")

echo "== health wave B4 =="
curl -sS "$BASE/health" | tee /tmp/b4-health.json
grep -qE '"wave":"B[45]"' /tmp/b4-health.json

echo "== live status =="
curl -sS "${H[@]}" "$BASE/v1/admin/live/status" | tee /tmp/b4-status.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b4-status.json"))
assert d["wave"]=="B4"
assert d["features"]["keyword_to_order"] is True
print("status ok")
PY

echo "== create session (threshold high to force stock alert) =="
curl -sS "${H[@]}" -d "{\"title\":\"E2E Live Glow\",\"host_name\":\"Host E2E\",\"storefront_id\":\"$SF\",\"gmv_target\":2000000,\"stock_alert_threshold\":99}" \
  "$BASE/v1/admin/live/sessions" | tee /tmp/b4-session.json
SID=$(python3 -c 'import json;print(json.load(open("/tmp/b4-session.json"))["id"])')
test -n "$SID"

echo "== add keyword item =="
curl -sS "${H[@]}" -d "{\"sku_id\":\"$SKU\",\"keyword\":\"SERUM1\",\"deal_price\":399000}" \
  "$BASE/v1/admin/live/sessions/$SID/items" | tee /tmp/b4-item.json
grep -q SERUM1 /tmp/b4-item.json

echo "== start live =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/live/sessions/$SID/start" | tee /tmp/b4-start.json
grep -q '"status":"live"' /tmp/b4-start.json

echo "== ingest keyword comment → order =="
curl -sS "${H[@]}" -d '{"body":"Chốt SERUM1 giúp shop","author_name":"Live Guest","author_handle":"live_guest_1","payment_method":"COD","auto_convert":true}' \
  "$BASE/v1/admin/live/sessions/$SID/comments" | tee /tmp/b4-comment.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b4-comment.json"))
assert d["deduped"] is False
assert d["matched_keyword"]=="SERUM1"
assert d["comment"]["status"]=="ordered"
assert d["order"]["order"]["status"]=="CONFIRMED"
assert d["order"]["order"]["order_id"]
open("/tmp/b4-order.txt","w").write(d["order"]["order"]["order_id"])
print("order", d["order"]["order"]["order_id"], "draft", d["draft"]["id"])
PY

echo "== stock alerts fired =="
curl -sS "${H[@]}" "$BASE/v1/admin/live/sessions/$SID/alerts?unresolved=1" | tee /tmp/b4-alerts.json
python3 - <<'PY'
import json
rows=json.load(open("/tmp/b4-alerts.json"))
assert any(a["type"]=="stock" for a in rows), rows
print("alerts", len(rows), [a["severity"] for a in rows])
PY

echo "== session metrics =="
curl -sS "${H[@]}" "$BASE/v1/admin/live/sessions/$SID" | tee /tmp/b4-detail.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b4-detail.json"))
assert d["orders_count"]>=1
assert d["comments_count"]>=1
assert float(d["gmv_actual"])>0
print("gmv", d["gmv_actual"], "orders", d["orders_count"])
PY

echo "== TRANSFER comment for recovery =="
curl -sS "${H[@]}" -d '{"body":"SERUM1 CK","author_name":"QR Viewer","author_handle":"qr_v1","payment_method":"TRANSFER","auto_convert":true}' \
  "$BASE/v1/admin/live/sessions/$SID/comments" | tee /tmp/b4-qr.json
grep -q ordered /tmp/b4-qr.json

echo "== end + recovery =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/live/sessions/$SID/end" | tee /tmp/b4-end.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b4-end.json"))
assert d["status"]=="ended"
assert "recovery" in d
assert d["recovery"]["count"]>=1
print("recovery", d["recovery"]["count"])
PY

curl -sS "${H[@]}" "$BASE/v1/admin/live/sessions/$SID/recovery" | tee /tmp/b4-recovery.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b4-recovery.json"))
assert d["count"]>=1
print("recovery items", [i["order_id"] for i in d["items"]])
PY

echo "B4 OK"
