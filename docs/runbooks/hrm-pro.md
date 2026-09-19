# Runbook — HRM-Pro (HRMP-A/B/C)

## Khái niệm
- **HRMP-A:** Phòng ban · HĐLĐ · phép (approve trừ số dư).
- **HRMP-B:** Chấm công check-in/out · bảng công tháng build + lock.
- **HRMP-C:** Payroll VN draft→approved · payslip · disclaimer thuế.
- Tách API `/hrm/*` khỏi IAM `/hr/*`; reuse `employee_id` từ HR-1.

## Flag

| Env | Mặc định | Ghi chú |
|---|---|---|
| `FEATURE_HRM_PRO` | false | Bật trên staging trước prod |

Khi flag tắt: `/api/v1/admin/hrm/*` → 404/disabled.

## Seed demo (AURA)
- Email: `admin@aura.local` / `AuraAdmin1!`
- Tenant: `ten_aura`

## Console UI
- `/hrm` — home
- `/hrm/departments` · `/hrm/contracts` · `/hrm/leave`
- `/hrm/attendance` · `/hrm/payroll`

## e2e
```bash
# HRMP-A
BASE_URL=http://127.0.0.1:3101/api bash scripts/e2e-hrm-a.sh

# HRMP-B
HRM_YEAR=2026 HRM_MONTH=6 bash scripts/e2e-hrm-b.sh

# Full HRM-Pro (A+B+C)
bash scripts/e2e-hrm-pro.sh
```

## Disclaimer
Payroll BHXH/PIT chỉ **ước tính** — merchant tự cấu hình rate và chịu trách nhiệm pháp lý.

## Spec
- `docs/specs/hr-iam-employee.md` §18
- `docs/openapi-hrm-pro.yaml`
