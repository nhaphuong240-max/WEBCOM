#!/usr/bin/env bash
# P3: theme license quote → invoice VietQR → simulate-paid → install gate
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
TS=$(date +%s)
EMAIL="p3_${TS}@example.local"
PASS='trialpass1'
CO="P3 Shop ${TS}"

echo "== trial signup (tenant) =="
curl -sS -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"company\":\"$CO\",\"name\":\"P3\"}" \
  "$BASE/v1/public/trial/signup" | tee /tmp/p3-signup.json
TOKEN=$(python3 -c 'import json;print(json.load(open("/tmp/p3-signup.json"))["access_token"])')
TID=$(python3 -c 'import json;print(json.load(open("/tmp/p3-signup.json"))["tenant_id"])')
SF=$(python3 -c 'import json;print(json.load(open("/tmp/p3-signup.json"))["storefront_id"])')
H=(-H "authorization: Bearer $TOKEN" -H "x-tenant-id: $TID" -H "content-type: application/json")

# pick a one_time template
curl -sS "$BASE/v1/public/templates" | tee /tmp/p3-tpl.json >/dev/null
CODE=$(python3 - <<'PY'
import json
rows=json.load(open("/tmp/p3-tpl.json"))
paid=[t for t in rows if t.get("license")=="one_time"]
free=[t for t in rows if t.get("license")=="free"]
print((paid or free)[0]["code"])
PY
)
echo "template=$CODE"

echo "== billing status =="
curl -sS "${H[@]}" "$BASE/v1/admin/billing/status" | tee /tmp/p3-bill.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/p3-bill.json"))
assert d["features"]["theme_license"] is True
print("billing ok", d["default_price_vnd"])
PY

echo "== quote =="
curl -sS "${H[@]}" "$BASE/v1/admin/theme-licenses/quote?template_code=$CODE" | tee /tmp/p3-quote.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/p3-quote.json"))
assert "amount" in d
print("quote", d["license"], d["amount"], "requires", d["requires_payment"])
PY

REQ=$(python3 -c 'import json;print(json.load(open("/tmp/p3-quote.json"))["requires_payment"])')
if [[ "$REQ" == "True" || "$REQ" == "true" ]]; then
  echo "== create invoice =="
  curl -sS "${H[@]}" -d "{\"template_code\":\"$CODE\"}" \
    "$BASE/v1/admin/theme-licenses/invoices" | tee /tmp/p3-inv.json
  INV=$(python3 -c 'import json;print(json.load(open("/tmp/p3-inv.json"))["invoice_id"])')
  python3 - <<'PY'
import json
d=json.load(open("/tmp/p3-inv.json"))
assert d["status"]=="open"
assert d.get("qr_image_url") or d.get("transfer_content")
print("invoice", d["invoice_id"], d["transfer_content"])
PY

  echo "== install blocked before pay =="
  code=$(curl -sS -o /tmp/p3-block.json -w "%{http_code}" "${H[@]}" -X POST \
    "$BASE/v1/admin/storefronts/$SF/templates/$CODE/install" || true)
  python3 - <<PY
import json
d=json.load(open("/tmp/p3-block.json"))
assert $code >= 400 or "license" in str(d).lower() or "conflict" in str(d).lower() or d.get("error")
print("blocked ok", $code)
PY

  echo "== simulate paid =="
  curl -sS "${H[@]}" -X POST "$BASE/v1/admin/theme-licenses/invoices/$INV/simulate-paid" | tee /tmp/p3-paid.json
  python3 - <<'PY'
import json
d=json.load(open("/tmp/p3-paid.json"))
assert d["invoice"]["status"]=="paid"
assert d["license"]["status"]=="active"
print("paid + license")
PY
fi

echo "== install after license/free =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/templates/$CODE/install" | tee /tmp/p3-inst.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/p3-inst.json"))
assert d.get("theme") or d.get("code") or d.get("id") or "installed" in str(d).lower() or d.get("template")
print("install ok")
PY

echo "P3 e2e OK"
