#!/usr/bin/env bash
# C5: Journey MVP — enroll + consent/freq/conflict guards + drain
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
T="${TENANT_ID:-ten_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-brand-id: brd_aura" -H "x-actor-id: e2e-c5")

echo "== health wave C5 =="
curl -sS "$BASE/health" | tee /tmp/c5-health.json
grep -qE '"wave":"C[56]"' /tmp/c5-health.json

echo "== journey status =="
curl -sS "${H[@]}" "$BASE/v1/admin/journeys/status" | tee /tmp/c5-status.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c5-status.json"))
assert d["wave"] in ("C5", "C6")
assert d["features"]["consent_guard"] is True
assert d["features"]["drain_run_once"] is True
print("status ok")
PY

TS=$(date +%s)
NAME="e2e_welcome_${TS}"

echo "== create journey =="
curl -sS "${H[@]}" -d "{\"name\":\"$NAME\",\"description\":\"e2e\",\"category\":\"onboarding\",\"status\":\"draft\",\"trigger_type\":\"manual\",\"required_consent\":[\"email\",\"marketing\"],\"frequency_cap_days\":7,\"frequency_cap_count\":1,\"steps\":[{\"kind\":\"trigger\",\"config\":{\"type\":\"manual\"}},{\"kind\":\"condition\",\"config\":{\"field\":\"consent_email\",\"op\":\"eq\",\"value\":true}},{\"kind\":\"delay\",\"config\":{\"minutes\":0}},{\"kind\":\"action\",\"config\":{\"type\":\"tag\",\"tag\":\"e2e_journey\"}},{\"kind\":\"action\",\"config\":{\"type\":\"send_email\",\"template\":\"hi\"}},{\"kind\":\"action\",\"config\":{\"type\":\"voucher_stub\",\"code\":\"E2E10\"}},{\"kind\":\"exit\",\"config\":{\"reason\":\"done\"}}]}" \
  "$BASE/v1/admin/journeys" | tee /tmp/c5-jrn.json
JID=$(python3 -c 'import json;print(json.load(open("/tmp/c5-jrn.json"))["id"])')
python3 - <<'PY'
import json
d=json.load(open("/tmp/c5-jrn.json"))
assert len(d["steps"])>=5
print("journey", d["id"], "steps", len(d["steps"]))
PY

echo "== activate =="
curl -sS "${H[@]}" -X PATCH -d '{"status":"active"}' "$BASE/v1/admin/journeys/$JID" | tee /tmp/c5-act.json
grep -q '"status":"active"' /tmp/c5-act.json

PHONE="0977$(echo $TS | tail -c 7)"
EMAIL="c5_${TS}@aura.local"
echo "== ensure customer with consent =="
curl -sS "${H[@]}" -d "{\"phone\":\"$PHONE\",\"email\":\"$EMAIL\",\"name\":\"C5 Traveler\",\"tags\":[\"c5\"],\"consent_marketing\":true,\"consent_email\":true,\"consent_sms\":true}" \
  "$BASE/v1/admin/customers/ensure" | tee /tmp/c5-cus.json
CID=$(python3 -c 'import json;print(json.load(open("/tmp/c5-cus.json"))["id"])')

echo "== enroll + auto drain =="
curl -sS "${H[@]}" -d "{\"customer_id\":\"$CID\"}" "$BASE/v1/admin/journeys/$JID/enroll" | tee /tmp/c5-enroll.json
EID=$(python3 -c 'import json;print(json.load(open("/tmp/c5-enroll.json"))["enrollment"]["id"])')
python3 - <<'PY'
import json
d=json.load(open("/tmp/c5-enroll.json"))
assert d["blocked"] is False
assert d["enrollment"]["status"] in ("completed","active","waiting")
assert d.get("drain") and d["drain"]["steps_run"] >= 1
print("enroll", d["enrollment"]["status"], "steps_run", d["drain"]["steps_run"])
PY

echo "== customer tagged =="
curl -sS "${H[@]}" "$BASE/v1/admin/customers/$CID" | tee /tmp/c5-360.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c5-360.json"))
assert "e2e_journey" in d.get("tags", []), d.get("tags")
print("tag ok")
PY

echo "== logs =="
curl -sS "${H[@]}" "$BASE/v1/admin/journey-enrollments/$EID/logs" | tee /tmp/c5-logs.json
python3 - <<'PY'
import json
rows=json.load(open("/tmp/c5-logs.json"))
assert len(rows) >= 3
msgs=" ".join(r["message"] for r in rows)
assert "Enrolled" in msgs or "Tagged" in msgs or "Stub send" in msgs
print("logs", len(rows))
PY

echo "== frequency cap =="
CODE=$(curl -sS -o /tmp/c5-cap.json -w "%{http_code}" "${H[@]}" -d "{\"customer_id\":\"$CID\"}" "$BASE/v1/admin/journeys/$JID/enroll")
python3 - <<PY
import json
code=int("$CODE")
d=json.load(open("/tmp/c5-cap.json"))
assert code in (409, 400) or (isinstance(d, dict) and d.get("error")), (code, d)
print("freq cap blocked", code)
PY

echo "== consent block =="
PHONE2="0988$(echo $TS | tail -c 7)"
curl -sS "${H[@]}" -d "{\"phone\":\"$PHONE2\",\"email\":\"c5b_${TS}@aura.local\",\"name\":\"C5 NoConsent\",\"consent_marketing\":false,\"consent_email\":false}" \
  "$BASE/v1/admin/customers/ensure" | tee /tmp/c5-cus2.json
CID2=$(python3 -c 'import json;print(json.load(open("/tmp/c5-cus2.json"))["id"])')
# force consents off
curl -sS "${H[@]}" -X PATCH -d '{"consent_marketing":false,"consent_email":false}' \
  "$BASE/v1/admin/customers/$CID2/consent" >/tmp/c5-consent.json
curl -sS "${H[@]}" -d "{\"customer_id\":\"$CID2\"}" "$BASE/v1/admin/journeys/$JID/enroll" | tee /tmp/c5-block.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c5-block.json"))
assert d.get("blocked") is True
assert d["enrollment"]["status"]=="blocked"
print("consent block ok", d.get("missing_consent"))
PY

echo "== conflict same category =="
NAME2="e2e_onboard2_${TS}"
curl -sS "${H[@]}" -d "{\"name\":\"$NAME2\",\"category\":\"onboarding\",\"status\":\"active\",\"required_consent\":[],\"frequency_cap_days\":0,\"steps\":[{\"kind\":\"trigger\",\"config\":{}},{\"kind\":\"exit\",\"config\":{}}]}" \
  "$BASE/v1/admin/journeys" | tee /tmp/c5-j2.json
JID2=$(python3 -c 'import json;print(json.load(open("/tmp/c5-j2.json"))["id"])')
# enroll CID2 on j2 first (no consent required) then try another active onboarding
curl -sS "${H[@]}" -d "{\"customer_id\":\"$CID2\",\"skip_drain\":true}" "$BASE/v1/admin/journeys/$JID2/enroll" | tee /tmp/c5-e2.json
# create third journey same category
NAME3="e2e_onboard3_${TS}"
curl -sS "${H[@]}" -d "{\"name\":\"$NAME3\",\"category\":\"onboarding\",\"status\":\"active\",\"required_consent\":[],\"frequency_cap_days\":0,\"steps\":[{\"kind\":\"trigger\",\"config\":{}},{\"kind\":\"delay\",\"config\":{\"minutes\":60}},{\"kind\":\"exit\",\"config\":{}}]}" \
  "$BASE/v1/admin/journeys" | tee /tmp/c5-j3.json
JID3=$(python3 -c 'import json;print(json.load(open("/tmp/c5-j3.json"))["id"])')
# Make e2 waiting so conflict applies
curl -sS "${H[@]}" -X POST -d "{\"journey_id\":\"$JID2\",\"limit\":10}" "$BASE/v1/admin/journeys/drain" >/tmp/c5-d2.json || true
CODE3=$(curl -sS -o /tmp/c5-conflict.json -w "%{http_code}" "${H[@]}" -d "{\"customer_id\":\"$CID2\"}" "$BASE/v1/admin/journeys/$JID3/enroll")
python3 - <<PY
import json
# If first enroll completed immediately (only trigger+exit), conflict may not apply — then enroll with delay journey first
code=int("$CODE3")
d=json.load(open("/tmp/c5-conflict.json"))
print("conflict attempt", code, d.get("error") or d.get("enrollment",{}).get("status") or d)
PY

# Stronger conflict test: enroll on delay journey then second
PHONE3="0999$(echo $TS | tail -c 7)"
curl -sS "${H[@]}" -d "{\"phone\":\"$PHONE3\",\"email\":\"c5c_${TS}@aura.local\",\"name\":\"C5 Conflict\",\"consent_email\":true,\"consent_marketing\":true}" \
  "$BASE/v1/admin/customers/ensure" | tee /tmp/c5-cus3.json
CID3=$(python3 -c 'import json;print(json.load(open("/tmp/c5-cus3.json"))["id"])')
curl -sS "${H[@]}" -d "{\"customer_id\":\"$CID3\",\"skip_drain\":false}" "$BASE/v1/admin/journeys/$JID3/enroll" | tee /tmp/c5-wait.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c5-wait.json"))
st=d["enrollment"]["status"]
assert st in ("waiting","active","completed"), st
print("delay enroll", st)
PY
CODE4=$(curl -sS -o /tmp/c5-conflict2.json -w "%{http_code}" "${H[@]}" -d "{\"customer_id\":\"$CID3\"}" "$BASE/v1/admin/journeys/$JID2/enroll")
python3 - <<PY
import json
d=json.load(open("/tmp/c5-conflict2.json"))
en=json.load(open("/tmp/c5-wait.json"))["enrollment"]["status"]
if en=="waiting":
  assert int("$CODE4")==409 or (d.get("error")), d
  print("conflict ok")
else:
  print("skip conflict assert — enrollment already", en)
PY

echo "== drain =="
curl -sS "${H[@]}" -X POST -d '{"limit":20}' "$BASE/v1/admin/journeys/drain" | tee /tmp/c5-drain.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c5-drain.json"))
assert "processed" in d
print("drain processed", d["processed"])
PY

echo "C5 e2e OK"
