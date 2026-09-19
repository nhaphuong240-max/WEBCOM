# ADR-007 — HRM-Pro (waves A+B+C MVP)

- Status: Accepted
- Date: 2026-09-19

## Context

HR-1…3 shipped IAM, employee directory, and POS shift under `/hr`. Payroll, contracts, leave, and attendance require a separate product surface so WebCom GA is not blocked. Spec: `docs/specs/hr-iam-employee.md` §18.

## Decision

1. **Prefix `/hrm`** — all HRM-Pro API routes; never mix with `/hr` controllers.
2. **Feature flag** — `FEATURE_HRM_PRO=false` by default; `requireHrmPro()` throws validation error when off.
3. **Self-build MVP (waves A+B+C)** — org (legal entity, department tree), employment contracts, leave policies/balances/requests, attendance/roster/timesheet, payroll run with VN statutory **estimates** (BHXH/BHYT/BHTN + progressive PIT stub).
4. **Disclaimer on every payslip** — `"Ước tính BHXH/PIT — không thay thế tư vấn thuế."` Estimates are not tax advice.
5. **PWA console** — admin UI consumes `/v1/admin/hrm/*`; employee self-service via `/v1/me/hrm/*` (payslips, leave).
6. **Commercial add-on later** — full compliance, e-sign HĐLĐ, bank file export remain out of MVP scope.

## Consequences

- Permissions `hrm.*` live in `@ptt/shared-kernel`; guards reuse `assertPermission` from HR module.
- Timesheet build pairs check-in/out events and optionally ingests closed POS shifts.
- Payroll requires locked timesheet before run; status flow draft → review → approved → paid.
- Production keeps flag off until staging sign-off.

## Refs

- ADR-006 (HR IAM baseline)
- Spec: `docs/specs/hr-iam-employee.md`
- Plan: `docs/specs/hr-implementation-plan.md`
