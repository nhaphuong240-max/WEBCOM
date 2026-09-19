#!/usr/bin/env bash
# HRM-Pro HRMP-A — departments · contract · leave approve · balance deduct
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"
SF="${STOREFRONT_ID:-sf_aura}"

echo "== login admin =="
curl -sS -X POST "$BASE/v1/auth/login" \
  -H "content-type: application/json" \
  -d '{"email":"admin@aura.local","password":"AuraAdmin1!"}' \
  | tee /tmp/hrm-a-login.json >/dev/null
ACCESS=$(python3 -c 'import json;print(json.load(open("/tmp/hrm-a-login.json"))["access_token"])')
AH=(-H "content-type: application/json" -H "authorization: Bearer $ACCESS" -H "x-tenant-id: ten_aura")

echo "== FEATURE_HRM_PRO must be on =="
CODE_FLAG=$(curl -sS -o /tmp/hrm-a-flag.json -w "%{http_code}" "${AH[@]}" "$BASE/v1/admin/hrm/departments")
python3 - <<PY
code=int("$CODE_FLAG")
body=open("/tmp/hrm-a-flag.json").read()
if code in (404, 503):
    raise SystemExit("FEATURE_HRM_PRO appears off: HTTP %s %s" % (code, body[:200]))
assert code in (200, 201), (code, body)
print("hrm departments reachable", code)
PY

DEPT_CODE="PB-$(date +%s | tail -c 5)"
echo "== create department $DEPT_CODE =="
curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hrm/departments" \
  -d "{\"code\":\"$DEPT_CODE\",\"name\":\"Ops $DEPT_CODE\"}" \
  | tee /tmp/hrm-a-dept.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/hrm-a-dept.json"))
assert d.get("id") and d.get("code"), d
print("dept ok", d["id"])
PY

echo "== create employee (HR-1) =="
EMP_CODE="NV-HRM-A-$(date +%s | tail -c 5)"
curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hr/employees" \
  -d "{\"code\":\"$EMP_CODE\",\"display_name\":\"HRM A Emp\",\"department\":\"$DEPT_CODE\",\"store_ids\":[\"$SF\"]}" \
  | tee /tmp/hrm-a-emp.json >/dev/null
EMP_ID=$(python3 -c 'import json;print(json.load(open("/tmp/hrm-a-emp.json"))["id"])')
echo "$EMP_ID" > /tmp/hrm-a-emp-id.txt

echo "== create contract =="
curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hrm/contracts" \
  -d "{\"employee_id\":\"$EMP_ID\",\"contract_type\":\"indefinite\",\"start_date\":\"2026-01-01\",\"base_salary\":15000000}" \
  | tee /tmp/hrm-a-contract.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/hrm-a-contract.json"))
assert d.get("id") and (d.get("employeeId") or d.get("employee_id")), d
sal=float(d.get("baseSalary") or d.get("base_salary") or 0)
assert sal == 15000000, d
print("contract ok", d["id"])
PY

echo "== leave balance before =="
curl -sS "${AH[@]}" "$BASE/v1/admin/hrm/leave/balances?employee_id=$EMP_ID" \
  | tee /tmp/hrm-a-bal-before.json >/dev/null
python3 - <<'PY'
import json
rows=json.load(open("/tmp/hrm-a-bal-before.json"))
annual=next((r for r in rows if r.get("leaveType")=="annual" or r.get("leave_type")=="annual"), None)
assert annual is not None, rows
bal=float(annual.get("balance") if annual.get("balance") is not None else annual.get("balance_days") or 0)
open("/tmp/hrm-a-bal-before-days.txt","w").write(str(bal))
print("annual balance before", bal)
PY
BAL_BEFORE=$(cat /tmp/hrm-a-bal-before-days.txt)

echo "== create leave request =="
curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hrm/leave/requests" \
  -d "{\"employee_id\":\"$EMP_ID\",\"leave_type\":\"annual\",\"start_date\":\"2026-06-02\",\"end_date\":\"2026-06-02\"}" \
  | tee /tmp/hrm-a-leave.json >/dev/null
LEAVE_ID=$(python3 -c 'import json;print(json.load(open("/tmp/hrm-a-leave.json"))["id"])')

echo "== approve leave =="
curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hrm/leave/requests/$LEAVE_ID/approve" \
  -d '{}' | tee /tmp/hrm-a-leave-ok.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/hrm-a-leave-ok.json"))
assert d.get("status")=="approved", d
print("leave approved")
PY

echo "== leave balance after =="
curl -sS "${AH[@]}" "$BASE/v1/admin/hrm/leave/balances?employee_id=$EMP_ID" \
  | tee /tmp/hrm-a-bal-after.json >/dev/null
python3 - <<PY
import json
rows=json.load(open("/tmp/hrm-a-bal-after.json"))
annual=next((r for r in rows if r.get("leaveType")=="annual" or r.get("leave_type")=="annual"), None)
bal=float(annual.get("balance") if annual.get("balance") is not None else annual.get("balance_days") or 0)
before=float("$BAL_BEFORE")
assert bal == before - 1, (before, bal, annual)
print("balance deducted", before, "→", bal)
PY

echo "HRM-A OK"
