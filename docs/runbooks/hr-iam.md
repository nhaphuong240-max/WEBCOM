# Runbook — HR IAM (HR-0 … HR-3)

## Khái niệm
- **HR-0:** catalog `@ptt/shared-kernel` (`PERMISSION_CATALOG`, `ROLE_TEMPLATES`).
- **HR-1:** API `/hr/*` + UI `/console/hr/*` + invite accept `/console/invite/[token]`.
- **HR-2:** UserSession (JWT `sid`) · LoginEvent · Shift · OMS/pages scope · PII export · MFA stub.
- **HR-3:** Custom `TenantRoleTemplate` · Employee `department` · POS PIN · SCIM stub `/scim/v2/Users`.
- **ADR:** `docs/adr/006-hr-iam-employee.md`

## Flags

| Env | Mặc định | Ghi chú |
|---|---|---|
| `FEATURE_HR_IAM` | true | Users/invite/roles |
| `FEATURE_HR_EMPLOYEE` | true | Employee directory |
| `FEATURE_HR_SHIFT` | true | POS shifts `/hr/shifts` |
| `FEATURE_HR_MFA` | false | MFA enroll stub |
| `FEATURE_HRM_PRO` | false | Phase sau |

## Seed demo (AURA)
- Email: `admin@aura.local` / `AuraAdmin1!`
- POS register: `preg_aura_1`

## Console
- Users / Employees / Roles (custom CRUD) / Shifts / Login history

## Custom roles (HR-3)
```bash
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/hr/roles" \
  -d '{"code":"floor_lead","name":"Floor Lead","permissions":["hr.employee.read","pos.sell"]}'
```
- Không ghi đè system codes (`owner`, `admin`, …).
- Không gồm `secret.manage`.
- Xóa role chỉ khi không còn `UserRoleAssignment`.

## POS PIN
```bash
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/hr/employees/<id>/pos-pin" -d '{"pin":"1234"}'
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/hr/employees/<id>/pos-pin/verify" -d '{"pin":"1234"}'
```

## SCIM stub
```bash
curl -sS "${H[@]}" "$BASE/scim/v2/Users"
curl -sS "${H[@]}" -X POST "$BASE/scim/v2/Users" \
  -d '{"userName":"new@example.com","roles":[{"value":"readonly"}]}'
```
→ tạo **invite** (pending); full IdP sync = HRM-Pro.

## e2e
```bash
BASE_URL=http://127.0.0.1:3101/api bash scripts/e2e-hr-3.sh
```

## Spec / plan
- `docs/specs/hr-iam-employee.md`
- `docs/specs/hr-implementation-plan.md`
- `docs/openapi-hr-3.yaml`
