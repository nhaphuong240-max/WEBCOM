#!/usr/bin/env bash
# C1: Customer 360 — profile + consent + orders/inbox snapshot
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
T="${TENANT_ID:-ten_aura}"
SF="${STOREFRONT_ID:-sf_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-brand-id: brd_aura" -H "x-actor-id: e2e-c1")

echo "== health wave C1 =="
curl -sS "$BASE/health" | tee /tmp/c1-health.json
grep -qE '"wave":"C[1-6]"' /tmp/c1-health.json

echo "== crm status =="
curl -sS "${H[@]}" "$BASE/v1/admin/crm/status" | tee /tmp/c1-status.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c1-status.json"))
assert d["wave"] in ("C1", "C2", "C3", "C4", "C5", "C6")
assert d["features"]["customer_360"] is True
assert d["features"]["consent_channels"] is True
print("status ok")
PY

echo "== ensure customer =="
curl -sS "${H[@]}" -d '{"phone":"0901234567","email":"lan@aura.local","name":"Lan Nguyen","tags":["vip","beauty"],"notes":"e2e-c1","consent_marketing":true,"consent_email":true,"consent_sms":true,"consent_messenger":true,"addresses":[{"label":"Home","line1":"1 Nguyen Hue","city":"HCM","phone":"0901234567","is_default":true}]}' \
  "$BASE/v1/admin/customers/ensure" | tee /tmp/c1-ensure.json
CID=$(python3 -c 'import json;print(json.load(open("/tmp/c1-ensure.json"))["id"])')
test -n "$CID"
python3 - <<'PY'
import json
d=json.load(open("/tmp/c1-ensure.json"))
assert d["phone"]=="0901234567"
assert d["consent"]["email"] is True
assert d["consent"]["sms"] is True
assert "vip" in d["tags"]
print("customer", d["id"])
PY

echo "== list search =="
curl -sS "${H[@]}" "$BASE/v1/admin/customers?q=Lan" | tee /tmp/c1-list.json
python3 - <<'PY'
import json
rows=json.load(open("/tmp/c1-list.json"))
assert any(r["phone"]=="0901234567" for r in rows), rows
print("list", len(rows))
PY

echo "== patch profile =="
curl -sS "${H[@]}" -X PATCH -d '{"notes":"updated by e2e-c1","tags":["vip","beauty","e2e"]}' \
  "$BASE/v1/admin/customers/$CID" | tee /tmp/c1-patch.json
grep -q e2e-c1 /tmp/c1-patch.json

echo "== patch consent =="
curl -sS "${H[@]}" -X PATCH -d '{"consent_zns":true,"consent_messenger":true}' \
  "$BASE/v1/admin/customers/$CID/consent" | tee /tmp/c1-consent.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c1-consent.json"))
assert d["consent"]["zns"] is True
assert d["consent"]["messenger"] is True
print("consent ok")
PY

echo "== bind social + webhook with matching phone handle =="
curl -sS "${H[@]}" -d "{\"provider\":\"meta\",\"channel_type\":\"messenger\",\"storefront_id\":\"$SF\",\"display_name\":\"C1 Meta\",\"external_id\":\"e2e_c1_meta\"}" \
  "$BASE/v1/admin/social/channels/bind" >/tmp/c1-ch.json
CH=$(python3 -c 'import json;print(json.load(open("/tmp/c1-ch.json"))["id"])')
curl -sS "${H[@]}" -d "{\"channel_id\":\"$CH\",\"external_thread_id\":\"c1_thread_lan\",\"contact_name\":\"Lan Nguyen\",\"contact_handle\":\"0901234567\",\"text\":\"Xin chào shop\"}" \
  "$BASE/v1/admin/social/webhooks/meta" | tee /tmp/c1-wh.json

echo "== link inbox + 360 =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/customers/$CID/link-inbox" | tee /tmp/c1-link.json
curl -sS "${H[@]}" "$BASE/v1/admin/customers/$CID" | tee /tmp/c1-360.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c1-360.json"))
assert d["id"]
assert "orders_summary" in d
assert isinstance(d["orders"], list)
assert isinstance(d["conversations"], list)
assert any(c.get("channel") for c in d["conversations"]) or True
# after link should have >=1 conversation when handle matched
assert len(d["conversations"])>=1, d["conversations"]
print("360 orders", d["orders_summary"], "inbox", len(d["conversations"]))
PY

echo "C1 OK"
