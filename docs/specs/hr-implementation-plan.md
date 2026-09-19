# Kế hoạch triển khai chi tiết — HR (IAM + Employee + Shift) & HRM-Pro

| Thuộc tính | Nội dung |
|---|---|
| Phiên bản | 1.0 |
| Ngày | 2026-09-19 |
| Trạng thái | **HR-0…HR-3 shipped** · **HRM-Pro A+B+C MVP** (code · `FEATURE_HRM_PRO`) |
| Spec | [`hr-iam-employee.md`](./hr-iam-employee.md) |
| Kế hoạch tổng | `docs/04` §15 · SRS FR-IAM · FR-ORG · FR-POS |
| ADR | `docs/adr/006-hr-iam-employee.md` (tạo ở HR-0) |
| Ước lượng | **HR-0…HR-2 ≈ 4–6 tuần lịch**; HR-3 ≈ 1–2 tuần; **HRM-Pro ≈ 8–14 tuần** (tách chương trình, không block GA) |

---

## 0. Tóm tắt điều hành

**Deliverable GA HR (vận hành):** Admin quản được Users (invite/RBAC/scope) + Employee directory; `/v1/me` trả roles/scopes; ít nhất 1 API enforce store scope; Shift POS sẵn sàng (HR-2).

```text
Tuần 0        HR-0   ADR + permission catalog + baseline audit
Tuần 1–2      HR-1a  Schema + Users/Invite/Roles API + dual-write roles
Tuần 2–3      HR-1b  Employee + Console UI /hr/* + e2e-hr-1 + VPS
Tuần 3–5      HR-2   Sessions · scope OMS/pages · Shift · PII gate · e2e-hr-2
Tuần 5–6      HR-3   Custom roles · dept stub · SCIM stub · PIN (optional)
Phase sau     HRM-Pro  HĐLĐ · công · phép · lương VN · ATS (§18 spec)
```

**Đội gợi ý (1 squad):** BE 1 · FE Admin 1 · QA 0.5 · Tech lead review ADR/RBAC.

**Không đụng:** Customer 360, Payroll trong HR-1/2, CMS/MKT đã GA.

---

## 1. Nguyên tắc thực thi

1. **Tách UI:** `/console/hr/*` ≠ `/console/customers/*`.
2. **Feature flags** (default theo wave):
   - `FEATURE_HR_IAM` · `FEATURE_HR_EMPLOYEE` · `FEATURE_HR_SHIFT` · `FEATURE_HR_MFA` · `FEATURE_HRM_PRO`
3. **Dual-write `User.roles[]` ↔ `UserRoleAssignment`** hết HR-1; không big-bang xóa cột `roles`.
4. **Scope store = `Storefront.id`** (quyết định mặc định spec §16) — alias JSON `store_id`.
5. **Invite HR-1 = copy-link stub**; SMTP optional cùng wave nếu env có.
6. Mỗi wave: **migrate → seed permissions/roles → API → guard → UI → e2e → OpenAPI/Bruno → runbook → deploy VPS**.
7. Tiếng Việt runbook/UI; code/API English.
8. **HRM-Pro không bắt đầu** trước khi HR-1 exit xanh trên VPS + PO sign-off.

---

## 2. Workstream & phụ thuộc

```text
              ┌──────────┐
              │  HR-0    │
              │  ADR +   │
              │  catalog │
              └────┬─────┘
                   ▼
         ┌─────────────────┐
         │  HR-1a  IAM API │
         │  invite/roles   │
         └────────┬────────┘
                  ▼
         ┌─────────────────┐
         │  HR-1b Employee │
         │  + Console UI   │
         └────────┬────────┘
           ┌──────┴──────┐
           ▼             ▼
     ┌──────────┐  ┌──────────┐
     │  HR-2    │  │ Website  │
     │  Shift + │  │ publish  │
     │  scope   │  │ perm     │─── soft dep (đã có CMS)
     └────┬─────┘  └──────────┘
          ▼
     ┌──────────┐
     │  HR-3    │
     │  Enterprise│
     └────┬─────┘
          ▼ (PO Could)
     ┌──────────┐
     │ HRM-Pro  │
     │ A→E      │
     └──────────┘
```

| ID | Phụ thuộc cứng |
|---|---|
| HR-1 | `User` + login/JWT hiện có · `AuditService` · `TenantAuthGuard` |
| HR-1b UI | HR-1a API ổn định |
| HR-2 Shift | HR-1 Employee |
| HR-2 scope OMS | Orders list có `storefrontId` (đã có) |
| HR-3 SCIM | HR-1 RoleAssignment |
| HRM-Pro | HR-1 Employee + HR-2 Shift (attendance phụ) + Legal entity (nếu thiếu → stub) |

---

## 3. Baseline audit (HR-0 Day 0)

| # | Việc | Owner | Output |
|---|---|---|---|
| A1 | Inventory `User` model + trial signup/login + JWT claims | BE | Gap vs FR-HR-001…008 |
| A2 | Inventory `TenantAuthGuard` / `RequestContext` — chỗ đọc `roles` | BE | Điểm inject permission check |
| A3 | Audit trail API hiện có — pattern `audit.write` | BE | Reuse cho `hr.*` actions |
| A4 | Admin nav + layout — chỗ thêm section Nhân sự | FE | PR nav mock |
| A5 | Seed users `ten_aura` — email/password demo | BE | Tài khoản test e2e |
| A6 | Chốt quyết định §16 spec (store scope, invite stub, dual auth) | TL + PO | Ghi vào ADR-006 |

**ADR-006 phải khóa**

1. Scope `store_id` = Storefront.id  
2. Invite token hash-only + accept public route  
3. Permission deny = HTTP 403 + code `FORBIDDEN_PERMISSION`  
4. Legacy `User.roles[]` dual-write đến hết HR-2  

---

## 4. Wave HR-0 — Kickoff (0.5–1 ngày)

### 4.1. Mục tiêu
Khóa contract + catalog permission; **chưa** ship UI production.

### 4.2. Task breakdown

| ID | Task | Files / khu vực | AC |
|---|---|---|---|
| H0-1 | Viết `docs/adr/006-hr-iam-employee.md` | `docs/adr/` | Merge + link từ spec |
| H0-2 | `packages/shared-kernel` hoặc `apps/admin-api/src/hr/permissions.ts` — enum/codes | shared | Unit list đủ FR-HR-010/014 |
| H0-3 | Role template seed JSON (`owner`…`readonly`) | `hr/role-templates.ts` | owner ⊇ admin ⊇ … |
| H0-4 | Flag docs trong `.env.example` | env | 5 flags documented |
| H0-5 | Cập nhật `docs/04` wave table HR | docs | PO thấy lịch |
| H0-6 | Checklist open questions đã chốt trong ADR | ADR | Không blocker HR-1 |

**Exit HR-0:** ADR merged · permission catalog review xong · sẵn migrate HR-1. ✅ (2026-09-19)

---

## 5. Wave HR-1a — IAM foundation (Tuần 1–2 · ~5–7 ngày)

### 5.1. Mục tiêu
Invite / activate / suspend / gán role+scope qua API; dual-write roles; mở rộng `/v1/me`.

### 5.2. Task breakdown

| ID | Task | Files / khu vực | AC |
|---|---|---|---|
| H1-1 | Prisma: mở rộng `User` (status, invitedAt…) + `UserRoleAssignment` + `UserInvite` + `Permission`/`RoleTemplate` (hoặc seed-only templates) | `schema.prisma` + migration | `migrate deploy` OK |
| H1-2 | Module Nest `HrModule` + `HrIamService` | `apps/admin-api/src/hr/` | Injectable |
| H1-3 | `GET/POST` users list/invite · suspend/reactivate · assign roles | `hr.controller.ts` | Zod validate; audit |
| H1-4 | Public `GET/POST /v1/public/invites/:token` accept | auth/hr | Activate + password hash |
| H1-5 | Login ghi `LoginEvent` (bảng tối thiểu hoặc reuse audit payload) | `trial.service` / auth | success/fail |
| H1-6 | `PermissionGuard` hoặc decorator `@RequirePerm('hr.user.manage')` | common | 403 thiếu perm |
| H1-7 | Map JWT roles → effective permissions (union templates) | jwt + hr | `/v1/me` có `permissions[]` + `scopes` |
| H1-8 | Dual-write: khi assign roles cập nhật cả `User.roles[]` | service | Legacy header auth vẫn chạy |
| H1-9 | Seed: permissions + role templates + promote aura owner | seed | e2e login owner |
| H1-10 | Flag `FEATURE_HR_IAM` gate toàn `/hr/users*` | controller | flag off → validation error |
| H1-11 | Rate-limit invite accept + login (simple in-memory/redis) | middleware | NFR-HR-005 stub |

**Exit HR-1a:** curl invite→accept→login→me có scopes; suspend chặn login.

### 5.3. API contract (chốt sớm)

```http
POST /api/v1/admin/hr/users/invite
{ "email", "name?", "role_codes": ["website_editor"], "scope": { "type": "store", "ids": ["sf_aura"] } }

POST /api/v1/public/invites/:token/accept
{ "password", "name?" }

GET /api/v1/me
→ { actor_id, roles, permissions, scopes, employee_id? }
```

---

## 6. Wave HR-1b — Employee + Console UI (Tuần 2–3 · ~4–6 ngày)

### 6.1. Mục tiêu
Directory NV + UI quản user; e2e-hr-1 xanh; deploy VPS.

### 6.2. Task breakdown

| ID | Task | Files / khu vực | AC |
|---|---|---|---|
| H1-20 | Prisma `Employee` + `EmployeeStoreAssignment` | migration | unique (tenant, code) |
| H1-21 | CRUD employees + link/unlink user + assign stores | `HrEmployeeService` | FR-HR-020…023 |
| H1-22 | Flag `FEATURE_HR_EMPLOYEE` | | |
| H1-23 | UI `/hr/users` list + invite form | `admin-web/.../hr/users` | Copy invite link |
| H1-24 | UI `/hr/users/[id]` roles/scope/suspend + link employee | | |
| H1-25 | UI `/hr/employees` + detail | | |
| H1-26 | UI `/hr/roles` read-only templates | | |
| H1-27 | Trang `/invite/[token]` accept (public) | admin-web | Set password |
| H1-28 | Nav section **Nhân sự** | `nav.ts` | |
| H1-29 | Enforce demo: user chỉ `website.edit` **không** gọi publish (403) | e2e | FR website perm |
| H1-30 | Enforce demo: scope 1 storefront — `GET pages` hoặc `GET orders` filter/403 | platform/oms | UC-HR-002 stub |
| H1-31 | `scripts/e2e-hr-1.sh` | scripts | Exit checklist §13 spec |
| H1-32 | OpenAPI `docs/openapi-hr-1.yaml` + Bruno + `docs/runbooks/hr-iam.md` | docs | |
| H1-33 | Deploy VPS + migrate + seed + e2e trên server | DevOps | Smoke `/console/hr/users` |

**Exit HR-1 (GA vận hành tối thiểu):** checklist spec §13 đủ · flag on staging/prod. ✅ code 2026-09-19 — deploy/e2e VPS khi PO yêu cầu.

---

## 7. Wave HR-2 — Sessions, Shift, scope cứng (Tuần 3–5 · ~7–10 ngày)

### 7.1. Mục tiêu
POS-ready + compliance nhẹ + scope OMS/INV thật.

### 7.2. Task breakdown

| ID | Task | Files / khu vực | AC |
|---|---|---|---|
| H2-1 | `UserSession` + revoke; mint session id trong JWT hoặc sidecar | hr/auth | Suspend revoke all ✅ |
| H2-2 | UI sessions trên user detail | admin-web | Revoke 1 session ✅ |
| H2-3 | `LoginEvent` list API + UI filter | | FR-HR-006 ✅ |
| H2-4 | MFA TOTP stub (enroll/verify flag `FEATURE_HR_MFA`) | | Không bắt prod ✅ |
| H2-5 | Prisma `PosShift` + open/close API | `/hr/shifts` | 1 open / register ✅ |
| H2-6 | Flag `FEATURE_HR_SHIFT` | | ✅ |
| H2-7 | UI `/hr/shifts` | | Open/close ✅ |
| H2-8 | Scope enforce: orders list/detail theo `scopes.store` | oms | 403 cross-store ✅ |
| H2-9 | Scope enforce: inventory hoặc pages tương tự | | ≥2 resources ✅ |
| H2-10 | `pii.export` gate + reason audit cho CSV users | | BR-010 ✅ |
| H2-11 | Website: map `website_publisher` → publish gate | website | ✅ (HR-1) |
| H2-12 | `scripts/e2e-hr-2.sh` + OpenAPI delta | | ✅ |
| H2-13 | Runbook cập nhật Shift + scope | runbook | ✅ |
| H2-14 | Deploy VPS | | e2e-hr-1 + e2e-hr-2 — pending |

**Exit HR-2:** Shift open/close · scope OMS chứng minh · session revoke · PII export gated.

---

## 8. Wave HR-3 — Enterprise IAM lite (Tuần 5–6 · optional ~5 ngày)

| ID | Task | AC |
|---|---|---|
| H3-1 | Custom `RoleTemplate` per tenant (CRUD) | Không sửa system roles ✅ |
| H3-2 | Department stub trên Employee | Field + filter list ✅ |
| H3-3 | POS PIN hash trên Employee | Set/verify API ✅ |
| H3-4 | SCIM stub: `GET/POST /scim/v2/Users` skeleton | create→invite ✅ |
| H3-5 | e2e-hr-3 smoke | ✅ script |

**Exit HR-3:** PO dùng custom role; SCIM documented as stub.

---

## 9. Wave HRM-Pro — Phase sau (Could · 8–14 tuần)

> Chỉ kickoff khi HR-1+HR-2 GA và PO chốt open questions spec §18.10.  
> Module/API **`/hrm`** tách `/hr`. Flag `FEATURE_HRM_PRO`.

### 9.1. Lịch sub-wave

```text
HRMP-A (2–3 tuần)  Org + Contract + Leave
HRMP-B (2–3 tuần)  Attendance + Timesheet lock (+ đọc PosShift)
HRMP-C (3–4 tuần)  Payroll VN + Payslip + run lifecycle  ← GA HRM-Pro tối thiểu
HRMP-D (1.5–2 tuần) Benefits + ATS lite + BHXH CSV
HRMP-E (1–2 tuần)  Performance + e-sign + banking file   ← Could
```

### 9.2. HRMP-A — Org · Contract · Leave

| ID | Task | AC |
|---|---|---|
| HP-A1 | ADR `007-hrm-pro.md` + license add-on quyết định | |
| HP-A2 | Models: Department, EmploymentContract, Leave* | migrate |
| HP-A3 | API `/hrm/departments` · `/hrm/contracts` · `/hrm/leave/*` | |
| HP-A4 | Approval leave multi-level (manager→HR) | |
| HP-A5 | UI `/hrm/contracts` · `/hrm/leave` | |
| HP-A6 | e2e-hrm-a.sh | HĐ + leave approve |

### 9.3. HRMP-B — Attendance

| ID | Task | AC |
|---|---|---|
| HP-B1 | WorkSchedule · Roster · AttendanceEvent · Timesheet* | |
| HP-B2 | Check-in API (QR token / manual) | |
| HP-B3 | Import CSV attendance | |
| HP-B4 | Lock timesheet tháng + approve | |
| HP-B5 | Optional ingest hours từ PosShift | read-only join |
| HP-B6 | UI roster + timesheet | |
| HP-B7 | e2e-hrm-b.sh | |

### 9.4. HRMP-C — Payroll VN (GA HRM-Pro)

| ID | Task | AC |
|---|---|---|
| HP-C1 | SalaryStructure · PayrollPeriod · PayrollRun · Payslip | |
| HP-C2 | Engine: công + OT + unpaid leave + BHXH rates + PIT stub | Version rates by year |
| HP-C3 | Run state machine draft→approved→paid | |
| HP-C4 | Payslip render + self-service `/me/payslips` | |
| HP-C5 | Disclaimer thuế trên UI | |
| HP-C6 | UI payroll run wizard | |
| HP-C7 | e2e-hrm-pro.sh (A+B+C) + runbook `hrm-pro.md` | Spec §18.8 |
| HP-C8 | Deploy staging; flag off prod đến PO | |

### 9.5. HRMP-D / E — Backlog có AC

| Sub | Deliverable |
|---|---|
| D | Benefits enrollment → payroll lines; ATS offer→Employee; BHXH CSV export |
| E | OKR lite; e-sign adapter interface; banking bulk CSV |

---

## 10. Ma trận trách nhiệm (RACI rút gọn)

| Hạng mục | BE | FE-Admin | QA | PO |
|---|---|---|---|---|
| ADR / permission catalog | R | C | I | A |
| IAM API / guards | R | C | C | I |
| Employee / Shift | R | C | R | I |
| Console `/hr` UI | C | R | R | C |
| Scope OMS | R | I | R | I |
| HRM-Pro payroll engine | R | C | R | A |
| e2e scripts | C | C | R | I |

---

## 11. Feature flag matrix

| Flag | HR-0 | HR-1 | HR-2 | HR-3 | HRM-Pro |
|---|---|---|---|---|---|
| `FEATURE_HR_IAM` | — | on | on | on | on |
| `FEATURE_HR_EMPLOYEE` | — | on | on | on | on |
| `FEATURE_HR_SHIFT` | off | off | on | on | on |
| `FEATURE_HR_MFA` | off | off | stub | opt | opt |
| `FEATURE_HRM_PRO` | off | off | off | off | on (staging→prod) |

---

## 12. Kiểm thử & DoD mỗi wave

**DoD chung**

- [ ] migrate deploy VPS  
- [ ] e2e script wave tương ứng xanh  
- [ ] OpenAPI/Bruno cập nhật  
- [ ] Runbook tiếng Việt  
- [ ] Không regression login trial / CMS publish (smoke e2e-cms-ga hoặc subset)  
- [ ] Audit actions chính có mặt  

**Bộ script**

| Script | Wave |
|---|---|
| `scripts/e2e-hr-1.sh` | HR-1 |
| `scripts/e2e-hr-2.sh` | HR-2 |
| `scripts/e2e-hr-3.sh` | HR-3 |
| `scripts/e2e-hrm-a.sh` … `e2e-hrm-pro.sh` | HRM-Pro |

---

## 13. Lịch sprint gợi ý (2 tuần / sprint)

### Sprint S-HR-A
- HR-0 + HR-1a (API IAM)
- Demo nội bộ: invite link → accept → login → `/v1/me`

### Sprint S-HR-B
- HR-1b UI + Employee + e2e-hr-1 + **deploy VPS**
- Demo: `/console/hr/users` production

### Sprint S-HR-C
- HR-2 sessions + scope OMS + Shift
- e2e-hr-2 + deploy

### Sprint S-HR-D (optional)
- HR-3 custom roles / PIN / SCIM stub

### Chương trình S-HRM-* (sau PO)
- Theo §9 HRMP-A→C bắt buộc trước khi gọi HRM-Pro GA

---

## 14. Rủi ro & giảm thiểu

| Rủi ro | Mitigation |
|---|---|
| Phá login trial hiện có | Dual-write roles; e2e login aura mỗi PR HR |
| Scope filter thiếu sót → leak data | Allowlist resources có enforce; deny-by-default cho store-scoped routes mới |
| Permission catalog phình | Codes ổn định trong shared-kernel; cấm string ad-hoc trong controller |
| Payroll pháp lý VN | HRM-Pro disclaimer + rate versioning; không claim “chứng nhận thuế” |
| Scope creep HRM vào HR-1 | Flag tách; PO gate kickoff HRM-Pro |
| SMTP chưa sẵn | Invite copy-link HR-1 |

---

## 15. Definition of Done — GA “HR vận hành”

- [ ] HR-1 + HR-2 shipped VPS  
- [ ] Nav Nhân sự dùng được bởi merchant demo  
- [ ] Owner không bị suspend nhầm (BR-HR-003 test)  
- [ ] Runbook `hr-iam.md` đủ onboarding admin  
- [ ] `FEATURE_HRM_PRO` vẫn **false** trên prod  

**Không yêu cầu** cho GA HR: payroll, leave, ATS, MFA bắt buộc.

---

## 16. Kickoff checklist (ngày bắt đầu HR-1)

1. Merge ADR-006  
2. Chốt seed user owner `ten_aura`  
3. Tạo branch `feat/hr-1-iam` (hoặc làm trên `main` theo convention repo)  
4. H0-2 permission catalog merged  
5. Bật tracking checklist §13 spec trong PR description  

---

## 17. Liên kết tài liệu

| Doc | Vai trò |
|---|---|
| [`hr-iam-employee.md`](./hr-iam-employee.md) | Spec FR/UC/model |
| `docs/adr/006-hr-iam-employee.md` | Quyết định kỹ thuật |
| `docs/runbooks/hr-iam.md` | Vận hành |
| `docs/04` §15 | Roadmap tổng |
| SRS `docs/02` §6.2 FR-IAM | Nguồn yêu cầu |

---

## 18. Tóm tắt một dòng

> **Làm HR-0→HR-2 trước** (Users + RBAC + Employee + Shift + scope) trong ~4–6 tuần; **HRM-Pro** là chương trình Could riêng 8–14 tuần sau khi PO chốt — không trộn vào sprint GA WebCom.
