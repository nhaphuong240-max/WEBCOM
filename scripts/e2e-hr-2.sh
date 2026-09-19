#!/usr/bin/env bash
# HR-2 — sessions · OMS scope · shift · PII export · MFA stub
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"
SF="${STOREFRONT_ID:-sf_aura}"
REG="${POS_REGISTER_ID:-preg_aura_1}"
SKU="${SKU_ID:-sku_aura_glow_30}"
H=(-H "content-type: application/json" -H "x-tenant-id: ten_aura" -H "x-actor-id: usr_aura_admin")

echo "== admin login (session mint) =="
curl -sS -X POST "$BASE/v1/auth/login" \
  -H "content-type: application/json" \
  -d '{"email":"admin@aura.local","password":"AuraAdmin1!"}' \
  | tee /tmp/hr2-admin-login.json >/dev/null
ADMIN_ACCESS=$(python3 - <<'PY'
import json
d=json.load(open("/tmp/hr2-admin-login.json"))
assert d.get("access_token"), d
print(d["access_token"])
PY
)
ADMIN_ID=$(python3 - <<'PY'
import json
d=json.load(open("/tmp/hr2-admin-login.json"))
print(d.get("user_id") or d["claims"]["actor_id"])
PY
)
AH=(-H "content-type: application/json" -H "authorization: Bearer $ADMIN_ACCESS" -H "x-tenant-id: ten_aura")

echo "== list sessions =="
curl -sS "${AH[@]}" "$BASE/v1/admin/hr/users/$ADMIN_ID/sessions" | tee /tmp/hr2-sessions.json >/dev/null
SESSION_ID=$(python3 - <<'PY'
import json
rows=json.load(open("/tmp/hr2-sessions.json"))
assert isinstance(rows,list) and len(rows)>=1, rows
active=[s for s in rows if s.get("active")]
assert active, rows
print(active[0]["id"])
PY
)
echo "session $SESSION_ID"

echo "== login events =="
curl -sS "${AH[@]}" "$BASE/v1/admin/hr/login-events?email=admin@aura.local" | tee /tmp/hr2-lge.json >/dev/null
python3 - <<'PY'
import json
rows=json.load(open("/tmp/hr2-lge.json"))
assert any(e.get("success") for e in rows), rows
print("login events", len(rows))
PY

echo "== PII export gated =="
CODE=$(curl -sS -o /tmp/hr2-export-bad.json -w "%{http_code}" "${AH[@]}" \
  -X POST "$BASE/v1/admin/hr/users/export" -d '{"reason":"x"}')
python3 - <<PY
code=int("$CODE")
assert code in (400,422), (code, open("/tmp/hr2-export-bad.json").read())
print("export short reason blocked", code)
PY
curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hr/users/export" \
  -d '{"reason":"hr2 e2e compliance export"}' | tee /tmp/hr2-export.csv >/dev/null
python3 - <<'PY'
csv=open("/tmp/hr2-export.csv").read()
assert "email" in csv and "admin@aura.local" in csv, csv[:300]
print("export csv ok", len(csv.splitlines()), "lines")
PY

echo "== MFA stub (may skip if flag off) =="
CODE_MFA=$(curl -sS -o /tmp/hr2-mfa.json -w "%{http_code}" "${AH[@]}" \
  -X POST "$BASE/v1/admin/hr/users/$ADMIN_ID/mfa/enroll" -d '{}')
python3 - <<PY
import json
code=int("$CODE_MFA")
body=json.load(open("/tmp/hr2-mfa.json"))
if code==200:
  assert body.get("stub") and body.get("secret"), body
  print("mfa enroll ok")
else:
  msg=str(body)
  assert "mfa" in msg.lower() or "disabled" in msg.lower() or code in (400,422), (code, body)
  print("mfa skipped (flag off)", code)
PY
if [ "$CODE_MFA" = "200" ]; then
  curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hr/users/$ADMIN_ID/mfa/verify" \
    -d '{"code":"000000"}' | tee /tmp/hr2-mfa-v.json >/dev/null
  python3 -c 'import json;d=json.load(open("/tmp/hr2-mfa-v.json"));assert d.get("mfa_enabled");print("mfa verified")'
  curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hr/users/$ADMIN_ID/mfa/disable" -d '{}' >/dev/null
fi

echo "== checkout order for OMS scope =="
curl -sS -H "content-type: application/json" -H "x-tenant-id: ten_aura" -H "x-brand-id: brd_aura" \
  -d "{\"storefront_id\":\"$SF\"}" "$BASE/v1/carts" | tee /tmp/hr2-cart.json >/dev/null
CART_ID=$(python3 -c 'import json;print(json.load(open("/tmp/hr2-cart.json"))["id"])')
curl -sS -H "content-type: application/json" -H "x-tenant-id: ten_aura" -H "x-brand-id: brd_aura" \
  -d "{\"sku_id\":\"$SKU\",\"qty\":1}" "$BASE/v1/carts/$CART_ID/items" >/dev/null
IDEM="hr2-$(date +%s)"
BODY="{\"cart_id\":\"$CART_ID\",\"payment_method\":\"COD\",\"shipping_name\":\"HR2\",\"shipping_phone\":\"0901111222\",\"shipping_address\":\"1 Test\",\"shipping_city\":\"HCM\",\"client_total\":1}"
curl -sS -H "content-type: application/json" -H "x-tenant-id: ten_aura" -H "x-brand-id: brd_aura" \
  -H "Idempotency-Key: $IDEM" -d "$BODY" "$BASE/v1/checkout" | tee /tmp/hr2-order.json >/dev/null
OID=$(python3 -c 'import json;print(json.load(open("/tmp/hr2-order.json"))["order_id"])')
echo "order $OID"

echo "== invite store-scoped ops =="
EMAIL="hr2-ops-$(date +%s)@aura.local"
curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hr/users/invite" \
  -d "{\"email\":\"$EMAIL\",\"name\":\"HR2 Ops\",\"role_codes\":[\"ops\"],\"scope\":{\"type\":\"store\",\"ids\":[\"sf_other_only\"]}}" \
  | tee /tmp/hr2-invite.json >/dev/null
TOKEN=$(python3 -c 'import json;print(json.load(open("/tmp/hr2-invite.json"))["invite_token"])')
curl -sS -X POST "$BASE/v1/public/invites/$TOKEN/accept" \
  -H "content-type: application/json" \
  -d '{"password":"OpsPass1!","name":"HR2 Ops"}' >/dev/null
curl -sS -X POST "$BASE/v1/auth/login" \
  -H "content-type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"OpsPass1!\"}" \
  | tee /tmp/hr2-ops-login.json >/dev/null
OPS_ACCESS=$(python3 -c 'import json;print(json.load(open("/tmp/hr2-ops-login.json"))["access_token"])')
OH=(-H "content-type: application/json" -H "authorization: Bearer $OPS_ACCESS" -H "x-tenant-id: ten_aura")

echo "== OMS scope deny detail =="
CODE_O=$(curl -sS -o /tmp/hr2-ord.json -w "%{http_code}" "${OH[@]}" \
  "$BASE/v1/admin/orders/$OID")
python3 - <<PY
code=int("$CODE_O")
assert code==403, open("/tmp/hr2-ord.json").read()
print("order detail denied", code)
PY

curl -sS "${OH[@]}" "$BASE/v1/admin/orders" | tee /tmp/hr2-ord-list.json >/dev/null
python3 - <<PY
import json
rows=json.load(open("/tmp/hr2-ord-list.json"))
assert isinstance(rows,list)
assert not any(o.get("id")=="$OID" for o in rows), rows
print("orders list filtered", len(rows))
PY

echo "== pages scope still enforced =="
CODE_P=$(curl -sS -o /tmp/hr2-pages.json -w "%{http_code}" "${OH[@]}" \
  "$BASE/v1/admin/storefronts/$SF/pages")
python3 - <<PY
assert int("$CODE_P")==403, open("/tmp/hr2-pages.json").read()
print("pages denied", "$CODE_P")
PY

echo "== shift open/close (FEATURE_HR_SHIFT) =="
# close any leftover open shift on register first (best-effort via list)
curl -sS "${AH[@]}" "$BASE/v1/admin/hr/shifts?status=open&register_id=$REG" \
  | tee /tmp/hr2-open-shifts.json >/dev/null || true
python3 - <<'PY'
import json,urllib.request,os
try:
  rows=json.load(open("/tmp/hr2-open-shifts.json"))
except Exception:
  rows=[]
base=os.environ.get("BASE_URL","http://127.0.0.1:3001/api").rstrip("/")
# close via shell below — just print ids
open("/tmp/hr2-open-ids.txt","w").write("\n".join(s["id"] for s in rows if isinstance(s,dict) and s.get("id")))
print("open shifts", len(rows) if isinstance(rows,list) else 0)
PY
if [ -s /tmp/hr2-open-ids.txt ]; then
  while read -r SID; do
    [ -n "$SID" ] || continue
    curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hr/shifts/$SID/close" -d '{"closing_cash":0}' >/dev/null || true
  done < /tmp/hr2-open-ids.txt
fi

CODE_S=$(curl -sS -o /tmp/hr2-shift-open.json -w "%{http_code}" "${AH[@]}" \
  -X POST "$BASE/v1/admin/hr/shifts/open" \
  -d "{\"register_id\":\"$REG\",\"opening_cash\":100}")
python3 - <<PY
import json
code=int("$CODE_S")
body=json.load(open("/tmp/hr2-shift-open.json"))
if code==200:
  assert body.get("id"), body
  open("/tmp/hr2-shift-id.txt","w").write(body["id"])
  print("shift open ok", body["id"])
else:
  msg=str(body).lower()
  assert "shift" in msg or "disabled" in msg or code in (400,422,409), (code, body)
  print("shift skipped (flag off or conflict)", code)
  open("/tmp/hr2-shift-id.txt","w").write("")
PY
SHIFT_ID=$(cat /tmp/hr2-shift-id.txt)
if [ -n "$SHIFT_ID" ]; then
  curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hr/shifts/$SHIFT_ID/close" \
    -d '{"closing_cash":100}' | tee /tmp/hr2-shift-close.json >/dev/null
  python3 -c 'import json;d=json.load(open("/tmp/hr2-shift-close.json"));assert d.get("status")=="closed" or d.get("id");print("shift closed")'
fi

echo "== revoke session =="
curl -sS -X POST "$BASE/v1/auth/login" \
  -H "content-type: application/json" \
  -d '{"email":"admin@aura.local","password":"AuraAdmin1!"}' \
  | tee /tmp/hr2-admin-login2.json >/dev/null
ACCESS2=$(python3 -c 'import json;print(json.load(open("/tmp/hr2-admin-login2.json"))["access_token"])')
AH2=(-H "content-type: application/json" -H "authorization: Bearer $ACCESS2" -H "x-tenant-id: ten_aura")
curl -sS "${AH2[@]}" -X POST "$BASE/v1/admin/hr/sessions/$SESSION_ID/revoke" -d '{}' \
  | tee /tmp/hr2-revoke.json >/dev/null
python3 -c 'import json;d=json.load(open("/tmp/hr2-revoke.json"));assert d.get("revoked");print("revoked", d["id"])'
CODE_R=$(curl -sS -o /tmp/hr2-revoked-me.json -w "%{http_code}" "${AH[@]}" "$BASE/v1/me")
python3 - <<PY
code=int("$CODE_R")
assert code in (401,403), (code, open("/tmp/hr2-revoked-me.json").read())
print("revoked token rejected", code)
PY

echo "HR-2 OK"
