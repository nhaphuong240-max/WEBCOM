#!/usr/bin/env bash
# HR-3 — custom roles · department · POS PIN · SCIM stub
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"
H=(-H "content-type: application/json" -H "x-tenant-id: ten_aura" -H "x-actor-id: usr_aura_admin")

echo "== login admin =="
curl -sS -X POST "$BASE/v1/auth/login" \
  -H "content-type: application/json" \
  -d '{"email":"admin@aura.local","password":"AuraAdmin1!"}' \
  | tee /tmp/hr3-login.json >/dev/null
ACCESS=$(python3 -c 'import json;print(json.load(open("/tmp/hr3-login.json"))["access_token"])')
AH=(-H "content-type: application/json" -H "authorization: Bearer $ACCESS" -H "x-tenant-id: ten_aura")

CODE="floor_lead_$(date +%s | tail -c 5)"
echo "== create custom role $CODE =="
curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hr/roles" \
  -d "{\"code\":\"$CODE\",\"name\":\"Floor Lead\",\"description\":\"HR-3 e2e\",\"permissions\":[\"hr.employee.read\",\"pos.sell\",\"pos.shift.manage\"]}" \
  | tee /tmp/hr3-role.json >/dev/null
ROLE_ID=$(python3 - <<'PY'
import json
d=json.load(open("/tmp/hr3-role.json"))
assert d.get("id") and d.get("system") is False, d
assert "pos.sell" in d["permissions"]
print(d["id"])
PY
)

echo "== reject system override =="
CODE_SYS=$(curl -sS -o /tmp/hr3-sys.json -w "%{http_code}" "${AH[@]}" \
  -X POST "$BASE/v1/admin/hr/roles" \
  -d '{"code":"owner","name":"Nope","permissions":["hr.user.read"]}')
python3 - <<PY
assert int("$CODE_SYS") in (400,422), open("/tmp/hr3-sys.json").read()
print("system override blocked")
PY

echo "== catalog includes custom =="
curl -sS "${AH[@]}" "$BASE/v1/admin/hr/catalog" | tee /tmp/hr3-catalog.json >/dev/null
python3 - <<PY
import json
d=json.load(open("/tmp/hr3-catalog.json"))
assert any(r["code"]=="$CODE" and r.get("system") is False for r in d["roles"]), d["roles"][-3:]
print("catalog ok")
PY

echo "== invite with custom role =="
EMAIL="hr3-$CODE@aura.local"
curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hr/users/invite" \
  -d "{\"email\":\"$EMAIL\",\"name\":\"Floor\",\"role_codes\":[\"$CODE\"],\"scope\":{\"type\":\"tenant\"}}" \
  | tee /tmp/hr3-invite.json >/dev/null
TOKEN=$(python3 -c 'import json;print(json.load(open("/tmp/hr3-invite.json"))["invite_token"])')
curl -sS -X POST "$BASE/v1/public/invites/$TOKEN/accept" \
  -H "content-type: application/json" \
  -d '{"password":"FloorPass1!","name":"Floor"}' >/dev/null
curl -sS -X POST "$BASE/v1/auth/login" \
  -H "content-type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"FloorPass1!\"}" \
  | tee /tmp/hr3-floor-login.json >/dev/null
FACCESS=$(python3 -c 'import json;print(json.load(open("/tmp/hr3-floor-login.json"))["access_token"])')
FH=(-H "content-type: application/json" -H "authorization: Bearer $FACCESS" -H "x-tenant-id: ten_aura")
curl -sS "${FH[@]}" "$BASE/v1/me" | tee /tmp/hr3-me.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/hr3-me.json"))
perms=set(d.get("permissions") or [])
assert "pos.sell" in perms and "hr.employee.read" in perms, d
assert "secret.manage" not in perms
print("custom role perms ok", d.get("roles"))
PY

echo "== employee department + PIN =="
EMP_CODE="NV-HR3-$(date +%s | tail -c 5)"
curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hr/employees" \
  -d "{\"code\":\"$EMP_CODE\",\"display_name\":\"HR3 Emp\",\"department\":\"Ops Floor\",\"store_ids\":[\"sf_aura\"]}" \
  | tee /tmp/hr3-emp.json >/dev/null
EMP_ID=$(python3 -c 'import json;print(json.load(open("/tmp/hr3-emp.json"))["id"])')
python3 -c 'import json;d=json.load(open("/tmp/hr3-emp.json"));assert d.get("department")=="Ops Floor"'
curl -sS "${AH[@]}" "$BASE/v1/admin/hr/employees?department=Ops%20Floor" | tee /tmp/hr3-emp-list.json >/dev/null
python3 - <<PY
import json
rows=json.load(open("/tmp/hr3-emp-list.json"))
assert any(e["id"]=="$EMP_ID" for e in rows), rows
print("department filter ok")
PY
curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hr/employees/$EMP_ID/pos-pin" \
  -d '{"pin":"1234"}' | tee /tmp/hr3-pin.json >/dev/null
python3 -c 'import json;assert json.load(open("/tmp/hr3-pin.json")).get("pos_pin_set")'
curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hr/employees/$EMP_ID/pos-pin/verify" \
  -d '{"pin":"1234"}' | tee /tmp/hr3-pin-ok.json >/dev/null
python3 -c 'import json;assert json.load(open("/tmp/hr3-pin-ok.json")).get("verified")'
CODE_BAD=$(curl -sS -o /tmp/hr3-pin-bad.json -w "%{http_code}" "${AH[@]}" \
  -X POST "$BASE/v1/admin/hr/employees/$EMP_ID/pos-pin/verify" -d '{"pin":"9999"}')
python3 - <<PY
assert int("$CODE_BAD") in (401,403), open("/tmp/hr3-pin-bad.json").read()
print("pin verify ok")
PY

echo "== SCIM stub =="
curl -sS "${AH[@]}" "$BASE/scim/v2/Users?count=5" | tee /tmp/hr3-scim-list.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/hr3-scim-list.json"))
assert "Resources" in d and d.get("schemas"), d
assert d.get("meta",{}).get("stub") is True
print("scim list", d["totalResults"])
PY
SCIM_EMAIL="scim-hr3-$(date +%s)@aura.local"
curl -sS "${AH[@]}" -X POST "$BASE/scim/v2/Users" \
  -d "{\"userName\":\"$SCIM_EMAIL\",\"displayName\":\"SCIM User\",\"roles\":[{\"value\":\"readonly\"}]}" \
  | tee /tmp/hr3-scim-create.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/hr3-scim-create.json"))
assert d.get("id") and d.get("meta",{}).get("invite_token"), d
print("scim create→invite ok")
PY

echo "== delete unused custom role (after unassign would be needed — skip if in use) =="
# role is in use — expect conflict
CODE_DEL=$(curl -sS -o /tmp/hr3-del.json -w "%{http_code}" "${AH[@]}" \
  -X DELETE "$BASE/v1/admin/hr/roles/$ROLE_ID")
python3 - <<PY
code=int("$CODE_DEL")
assert code in (409,400), open("/tmp/hr3-del.json").read()
print("delete in-use blocked", code)
PY

echo "HR-3 OK"
