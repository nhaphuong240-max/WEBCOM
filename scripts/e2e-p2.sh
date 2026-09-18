#!/usr/bin/env bash
# P2: self-serve trial signup → JWT → onboarding storefront
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
TS=$(date +%s)
EMAIL="trial_${TS}@example.local"
PASS='trialpass1'
CO="Trial Co ${TS}"

echo "== trial status =="
curl -sS "$BASE/v1/public/trial/status" | tee /tmp/p2-status.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/p2-status.json"))
assert d["features"]["self_serve_trial"] is True
assert d["features"]["trial_before_paywall"] is True
print("status ok")
PY

echo "== signup =="
curl -sS -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"company\":\"$CO\",\"name\":\"Trial User\",\"template_code\":\"aura-commerce-lite\"}" \
  "$BASE/v1/public/trial/signup" | tee /tmp/p2-signup.json
TOKEN=$(python3 -c 'import json;print(json.load(open("/tmp/p2-signup.json"))["access_token"])')
TID=$(python3 -c 'import json;print(json.load(open("/tmp/p2-signup.json"))["tenant_id"])')
SF=$(python3 -c 'import json;print(json.load(open("/tmp/p2-signup.json"))["storefront_id"])')
python3 - <<'PY'
import json
d=json.load(open("/tmp/p2-signup.json"))
assert d["trial"] is True
assert d["access_token"]
assert d["storefront_id"]
print("signup", d["tenant_id"], d["storefront_id"])
PY

echo "== onboarding with JWT =="
curl -sS -H "authorization: Bearer $TOKEN" -H "x-tenant-id: $TID" \
  "$BASE/v1/admin/storefronts/$SF/onboarding" | tee /tmp/p2-onb.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/p2-onb.json"))
assert d.get("current_step") or d.get("steps")
print("onboarding ok", d.get("current_step"))
PY

echo "== login =="
curl -sS -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  "$BASE/v1/auth/login" | tee /tmp/p2-login.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/p2-login.json"))
assert d["access_token"]
assert d["tenant_id"]
print("login ok")
PY

echo "P2 e2e OK"
