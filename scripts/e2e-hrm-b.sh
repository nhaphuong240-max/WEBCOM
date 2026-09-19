#!/usr/bin/env bash
# HRM-Pro HRMP-B — attendance check-in/out · build + lock timesheet
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"
SF="${STOREFRONT_ID:-sf_aura}"
YEAR="${HRM_YEAR:-2026}"
MONTH="${HRM_MONTH:-6}"

echo "== login admin =="
curl -sS -X POST "$BASE/v1/auth/login" \
  -H "content-type: application/json" \
  -d '{"email":"admin@aura.local","password":"AuraAdmin1!"}' \
  | tee /tmp/hrm-b-login.json >/dev/null
ACCESS=$(python3 -c 'import json;print(json.load(open("/tmp/hrm-b-login.json"))["access_token"])')
AH=(-H "content-type: application/json" -H "authorization: Bearer $ACCESS" -H "x-tenant-id: ten_aura")

echo "== FEATURE_HRM_PRO must be on =="
CODE_FLAG=$(curl -sS -o /tmp/hrm-b-flag.json -w "%{http_code}" "${AH[@]}" "$BASE/v1/admin/hrm/departments")
python3 - <<PY
code=int("$CODE_FLAG")
assert code in (200, 201), open("/tmp/hrm-b-flag.json").read()
print("hrm ok")
PY

if [[ -f /tmp/hrm-a-emp-id.txt ]]; then
  EMP_ID=$(cat /tmp/hrm-a-emp-id.txt)
  echo "== reuse employee from HRM-A: $EMP_ID =="
else
  echo "== create employee =="
  EMP_CODE="NV-HRM-B-$(date +%s | tail -c 5)"
  curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hr/employees" \
    -d "{\"code\":\"$EMP_CODE\",\"display_name\":\"HRM B Emp\",\"store_ids\":[\"$SF\"]}" \
    | tee /tmp/hrm-b-emp.json >/dev/null
  EMP_ID=$(python3 -c 'import json;print(json.load(open("/tmp/hrm-b-emp.json"))["id"])')
fi
echo "$EMP_ID" > /tmp/hrm-b-emp-id.txt

# Use fixed timestamps in June so timesheet month matches
IN_AT="${YEAR}-$(printf '%02d' "$MONTH")-10T01:00:00.000Z"
OUT_AT="${YEAR}-$(printf '%02d' "$MONTH")-10T09:00:00.000Z"

echo "== check in =="
curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hrm/attendance/check" \
  -d "{\"employee_id\":\"$EMP_ID\",\"event_type\":\"check_in\",\"occurred_at\":\"$IN_AT\"}" \
  | tee /tmp/hrm-b-checkin.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/hrm-b-checkin.json"))
assert (d.get("eventType") or d.get("event_type"))=="check_in" or d.get("id"), d
print("check_in ok")
PY

echo "== check out =="
curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hrm/attendance/check" \
  -d "{\"employee_id\":\"$EMP_ID\",\"event_type\":\"check_out\",\"occurred_at\":\"$OUT_AT\"}" \
  | tee /tmp/hrm-b-checkout.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/hrm-b-checkout.json"))
assert (d.get("eventType") or d.get("event_type"))=="check_out" or d.get("id"), d
print("check_out ok")
PY

echo "== build timesheet $YEAR/$MONTH =="
curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hrm/timesheets/$YEAR/$MONTH/build" \
  | tee /tmp/hrm-b-ts-build.json >/dev/null
python3 - <<PY
import json
d=json.load(open("/tmp/hrm-b-ts-build.json"))
assert d.get("year")==int("$YEAR") and d.get("month")==int("$MONTH"), d
assert d.get("status") in ("draft", "open", "built", "locked"), d
print("timesheet built", d.get("status"))
PY

echo "== lock timesheet =="
curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hrm/timesheets/$YEAR/$MONTH/lock" \
  | tee /tmp/hrm-b-ts-lock.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/hrm-b-ts-lock.json"))
assert d.get("status")=="locked", d
print("timesheet locked ok")
PY

echo "HRM-B OK"
