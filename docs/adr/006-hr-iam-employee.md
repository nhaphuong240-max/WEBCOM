# ADR-006 — HR IAM + Employee (+ Shift)

- Status: Accepted (HR-0)
- Date: 2026-09-19

## Context

Console chưa có UI quản user; chỉ có `User` + trial login + JWT `roles[]` string. Spec [`hr-iam-employee.md`](../specs/hr-iam-employee.md) tách **IAM Users** / **Employee** / **Customer**, và **HRM-Pro** (payroll…) là Phase sau.

## Decision

1. **Scope store** trong role assignment: `store_id` = `Storefront.id` (không tạo entity Store riêng ở HR-1).
2. **Invite HR-1:** token random ≥32 bytes, lưu **hash only**; accept qua `POST /v1/public/invites/:token/accept`. UI copy-link stub; SMTP optional khi có env.
3. **Permission deny:** HTTP 403, `AppError` code `FORBIDDEN`, details `{ reason: "FORBIDDEN_PERMISSION", permission }`.
4. **Legacy dual-write:** giữ `User.roles: string[]` đến hết HR-2; mỗi lần assign role cập nhật cả `UserRoleAssignment` (HR-1+) và `User.roles`.
5. **Catalog nguồn sự thật (HR-0):** `@ptt/shared-kernel` — `PERMISSIONS`, `ROLE_TEMPLATES`, helpers `resolvePermissions` / `roleHasPermission`. DB seed (HR-1) đồng bộ từ catalog này; custom role (HR-3) mới ghi DB.
6. **Auth song song:** JWT + header `x-tenant-id`/`x-actor-id` (dev) đến hết HR-2; production tắt `AUTH_DEV_BYPASS`.
7. **PosShift** schema/API dưới prefix `/hr` đến khi POS app tách; `register_code` string free-form HR-2.
8. **HRM-Pro** API/UI prefix `/hrm` + flag `FEATURE_HRM_PRO` — không trộn sprint HR-1/2.

## Consequences

- HR-1 migrate có thể import catalog từ shared-kernel không hardcode lại.
- Website publish gate map permission `website.publish` (HR-1b+).
- Đổi Storefront.id = đổi scope; rename store không đổi id.

## Refs

- Spec: `docs/specs/hr-iam-employee.md`
- Plan: `docs/specs/hr-implementation-plan.md`
- SRS: FR-IAM · FR-ORG · FR-POS (shift)
- Auth interim: ADR-010
