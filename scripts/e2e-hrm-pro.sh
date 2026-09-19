#!/usr/bin/env bash
# HRM-Pro HRMP-C — runs A+B then payroll draft→review→approved · payslip net · disclaimer
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"
YEAR="${HRM_YEAR:-2026}"
MONTH="${HRM_MONTH:-6}"

echo "== HRMP-A =="
bash "$DIR/e2e-hrm-a.sh"

echo "== HRMP-B =="
bash "$DIR/e2e-hrm-b.sh"

EMP_ID=$(cat /tmp/hrm-b-emp-id.txt)

echo "== login admin =="
curl -sS -X POST "$BASE/v1/auth/login" \
  -H "content-type: application/json" \
  -d '{"email":"admin@aura.local","password":"AuraAdmin1!"}' \
  | tee /tmp/hrm-pro-login.json >/dev/null
ACCESS=$(python3 -c 'import json;print(json.load(open("/tmp/hrm-pro-login.json"))["access_token"])')
AH=(-H "content-type: application/json" -H "authorization: Bearer $ACCESS" -H "x-tenant-id: ten_aura")

echo "== set salary =="
curl -sS "${AH[@]}" -X PUT "$BASE/v1/admin/hrm/salary/$EMP_ID" \
  -d '{"base_salary":15000000}' \
  | tee /tmp/hrm-pro-salary.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/hrm-pro-salary.json"))
sal=float(d.get("baseSalary") or d.get("base_salary") or 0)
assert sal == 15000000, d
print("salary ok")
PY

echo "== run payroll $YEAR/$MONTH =="
curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hrm/payroll/$YEAR/$MONTH/run" \
  | tee /tmp/hrm-pro-run.json >/dev/null
RUN_ID=$(python3 -c 'import json;print(json.load(open("/tmp/hrm-pro-run.json"))["id"])')
python3 - <<'PY'
import json
d=json.load(open("/tmp/hrm-pro-run.json"))
assert d.get("status")=="draft", d
print("payroll run draft", d["id"])
PY

echo "== review payroll run =="
curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hrm/payroll/runs/$RUN_ID/transition" \
  -d '{"status":"review"}' >/dev/null

echo "== approve payroll run =="
curl -sS "${AH[@]}" -X POST "$BASE/v1/admin/hrm/payroll/runs/$RUN_ID/transition" \
  -d '{"status":"approved"}' \
  | tee /tmp/hrm-pro-run-approved.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/hrm-pro-run-approved.json"))
assert d.get("status")=="approved", d
print("run approved")
PY

echo "== list payslips =="
curl -sS "${AH[@]}" "$BASE/v1/admin/hrm/payroll/runs/$RUN_ID/payslips" \
  | tee /tmp/hrm-pro-payslips.json >/dev/null
python3 - <<'PY'
import json
rows=json.load(open("/tmp/hrm-pro-payslips.json"))
assert isinstance(rows, list) and len(rows) >= 1, rows
slip=rows[0]
net=float(slip.get("net") or slip.get("net_salary") or 0)
assert net > 0, slip
disc=str(slip.get("disclaimer") or slip.get("tax_disclaimer") or "").lower()
assert "thuế" in disc or "bhxh" in disc or "ước tính" in disc, slip
print("payslip net ok", net, "disclaimer present")
PY

echo "HRM-Pro OK"
