#!/usr/bin/env bash
# HR-1 — invite/RBAC/employee + website.publish gate + store scope stub
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"
SF="${STOREFRONT_ID:-sf_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: ten_aura" -H "x-actor-id: usr_aura_admin")

echo "== catalog =="
curl -sS "${H[@]}" "$BASE/v1/admin/hr/catalog" | tee /tmp/hr1-catalog.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/hr1-catalog.json"))
assert any(r["code"]=="website_editor" for r in d["roles"])
assert any(p["code"]=="website.publish" for p in d["permissions"])
print("catalog ok", len(d["roles"]), "roles")
PY

echo "== invite website_editor =="
EMAIL="hr1-editor-$(date +%s)@aura.local"
INV=$(curl -sS "${H[@]}" -X POST "$BASE/v1/admin/hr/users/invite" \
  -d "{\"email\":\"$EMAIL\",\"name\":\"HR1 Editor\",\"role_codes\":[\"website_editor\"],\"scope\":{\"type\":\"tenant\"}}")
echo "$INV" | tee /tmp/hr1-invite.json >/dev/null
TOKEN=$(python3 - <<'PY'
import json
d=json.load(open("/tmp/hr1-invite.json"))
assert d.get("invite_token"), d
print(d["invite_token"])
PY
)
USER_ID=$(python3 - <<'PY'
import json
print(json.load(open("/tmp/hr1-invite.json"))["user_id"])
PY
)

echo "== accept invite =="
curl -sS -X POST "$BASE/v1/public/invites/$TOKEN/accept" \
  -H "content-type: application/json" \
  -d '{"password":"EditorPass1!","name":"HR1 Editor"}' \
  | tee /tmp/hr1-accept.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/hr1-accept.json"))
assert d["status"]=="active", d
print("activated", d["user_id"])
PY

echo "== login editor =="
curl -sS -X POST "$BASE/v1/auth/login" \
  -H "content-type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"EditorPass1!\"}" \
  | tee /tmp/hr1-login.json >/dev/null
ACCESS=$(python3 - <<'PY'
import json
d=json.load(open("/tmp/hr1-login.json"))
assert d.get("access_token"), d
print(d["access_token"])
PY
)
EH=(-H "content-type: application/json" -H "authorization: Bearer $ACCESS" -H "x-tenant-id: ten_aura")

echo "== /v1/me permissions =="
curl -sS "${EH[@]}" "$BASE/v1/me" | tee /tmp/hr1-me.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/hr1-me.json"))
perms=set(d.get("permissions") or [])
assert "website.edit" in perms
assert "website.publish" not in perms
print("me ok roles", d.get("roles"))
PY

echo "== publish forbidden for editor =="
CODE=$(curl -sS -o /tmp/hr1-pub.json -w "%{http_code}" "${EH[@]}" \
  -X POST "$BASE/v1/admin/storefronts/$SF/publish")
python3 - <<PY
import json
code=int("$CODE")
body=json.load(open("/tmp/hr1-pub.json"))
assert code in (403, 400), (code, body)
# 403 preferred; some stacks wrap
err=(body.get("error") or {})
msg=str(err.get("message") or body)
assert "publish" in msg.lower() or "permission" in msg.lower() or "forbidden" in msg.lower() or code==403, body
print("publish blocked", code)
PY

echo "== employee create + link =="
CODE_EMP="NV-HR1-$(date +%s | tail -c 5)"
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/hr/employees" \
  -d "{\"code\":\"$CODE_EMP\",\"display_name\":\"NV HR1\",\"store_ids\":[\"$SF\"]}" \
  | tee /tmp/hr1-emp.json >/dev/null
EMP_ID=$(python3 - <<'PY'
import json
print(json.load(open("/tmp/hr1-emp.json"))["id"])
PY
)
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/hr/employees/$EMP_ID/link-user" \
  -d "{\"user_id\":\"$USER_ID\"}" | tee /tmp/hr1-link.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/hr1-link.json"))
assert d.get("user_id"), d
print("linked", d["user_id"])
PY

curl -sS "${EH[@]}" "$BASE/v1/me" | tee /tmp/hr1-me2.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/hr1-me2.json"))
assert d.get("employee_id"), d
print("me employee_id", d["employee_id"])
PY

echo "== store scope deny =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/hr/users/$USER_ID/roles" \
  -d '{"role_codes":["website_editor"],"scope":{"type":"store","ids":["sf_other_only"]}}' \
  >/dev/null
# re-login to refresh JWT roles (scope from DB)
curl -sS -X POST "$BASE/v1/auth/login" \
  -H "content-type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"EditorPass1!\"}" \
  | tee /tmp/hr1-login2.json >/dev/null
ACCESS2=$(python3 -c 'import json;print(json.load(open("/tmp/hr1-login2.json"))["access_token"])')
EH2=(-H "content-type: application/json" -H "authorization: Bearer $ACCESS2" -H "x-tenant-id: ten_aura")
CODE2=$(curl -sS -o /tmp/hr1-pages.json -w "%{http_code}" "${EH2[@]}" \
  "$BASE/v1/admin/storefronts/$SF/pages")
python3 - <<PY
code=int("$CODE2")
assert code==403, open("/tmp/hr1-pages.json").read()
print("pages scope denied", code)
PY

echo "== list users (admin bypass/owner) =="
curl -sS "${H[@]}" "$BASE/v1/admin/hr/users" | tee /tmp/hr1-users.json >/dev/null
python3 - <<PY
import json
rows=json.load(open("/tmp/hr1-users.json"))
assert any(u["email"]=="$EMAIL" for u in rows), rows
print("users", len(rows))
PY

echo "HR-1 OK"
