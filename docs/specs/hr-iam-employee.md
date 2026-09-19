# Spec — HR (Human Resources vận hành) · IAM + Employee + Shift

| Thuộc tính | Nội dung |
|---|---|
| Phiên bản | 1.1 |
| Ngày | 2026-09-19 |
| Trạng thái | **HR-0…HR-3 shipped** (code) · HRM-Pro = Could / Phase sau (§18) |
| Kế hoạch triển khai | [`hr-implementation-plan.md`](./hr-implementation-plan.md) |
| ADR | [`docs/adr/006-hr-iam-employee.md`](../adr/006-hr-iam-employee.md) |
| Tham chiếu | SRS `docs/02` §6.1 FR-ORG · §6.2 FR-IAM · §9.1 FR-POS · UC-IAM-* (`docs/01` §7.1) · BR-010 · NFR security |
| Phạm vi sản phẩm | Quản lý **người vận hành** trên Console + gắn POS/cửa hàng — **không** thay ERP Payroll/HRM |
| Gap hiện tại | Có `User` + login/trial + JWT; **chưa** UI Users; chưa Employee/Shift/Invite/RBAC catalog |

---

## 0. Tóm tắt điều hành

Merchant cần một chỗ **quản lý user** (invite, role, scope cửa hàng) và **hồ sơ nhân sự vận hành** (nv bán hàng, ca POS) — tách khỏi Customer 360 (`/customers`).

```text
HR module (trong WebCom)
├── IAM Users          ← đăng nhập Console (bảng users)
├── Roles & Permissions ← RBAC catalog + data scope
├── Employees          ← hồ sơ NV gắn User (1:0..1) + store assignment
├── Shifts (POS)       ← mở/đóng ca, cash drawer (phụ thuộc FR-POS)
└── Audit & Sessions   ← login history, revoke, PII export gate
```

**Deliverable GA HR-1:** Admin `/hr/users` + invite + role templates + store scope enforce API; Employee directory stub; e2e-hr-1.

**Phase sau:** **HRM-Pro** (§18) — HĐLĐ, chấm công, phép, lương VN, ATS lite — Could, flag `FEATURE_HRM_PRO`, không block WebCom GA.

---

## 1. Mục tiêu

1. Admin tenant mời / kích hoạt / tạm khóa / reset mật khẩu user Console.
2. Gán **role template** + **data scope** (tenant / brand / store / warehouse / channel).
3. Tách rõ **User (IAM)** vs **Customer (CRM)** vs **Employee (HR ops)**.
4. Chuẩn bị foundation cho POS: Employee ↔ Store ↔ Shift.
5. Mọi thao tác nhạy cảm ghi audit + permission check (parity FR-IAM).

## 2. Non-goals (Won't — khớp SRS §2.3)

| Không làm **trong HR-0…HR-3** | Lý do |
|---|---|
| Payroll / bảng lương / BHXH / PIT | Out of scope MVP (Payroll/HRM) — xem **§18 HRM-Pro** (Could / Phase sau) |
| Chấm công GPS / leave / OKR / tuyển dụng ATS | HRM đầy đủ — **§18 HRM-Pro** |
| General ledger / cost center kế toán | ERP kế toán riêng; HRM-Pro chỉ emit payroll journal stub |
| SCIM sync IdP đầy đủ | Enterprise SSO; stub ở HR-3, đầy đủ có thể gói HRM-Pro |
| Thay Customer 360 | Giữ `/customers` cho người mua |
| MFA TOTP production-hard | HR-2; HR-1 chỉ session revoke + login history stub |

---

## 3. Phân lớp & ranh giới

```text
┌──────────────────────────────────────────────────────────────┐
│ A. IAM (identity)                                              │
│    User · Credential · Session · Invite · RoleAssignment       │
├──────────────────────────────────────────────────────────────┤
│ B. RBAC (authorization)                                        │
│    RoleTemplate · Permission · DataScope                       │
├──────────────────────────────────────────────────────────────┤
│ C. HR Ops (workforce)                                          │
│    Employee · Employment · StoreAssignment · Shift             │
├──────────────────────────────────────────────────────────────┤
│ D. Audit / Compliance                                          │
│    AuditLog (đã có) · LoginHistory · SensitiveExportGate       │
└──────────────────────────────────────────────────────────────┘
```

| Khái niệm | Là gì | Không phải |
|---|---|---|
| **User** | Tài khoản đăng nhập Console / API actor | Khách mua hàng |
| **Employee** | Hồ sơ NV vận hành (mã NV, cửa hàng, chức danh) | Bắt buộc có User (có thể NV chỉ POS PIN sau) |
| **Customer** | Hồ sơ mua hàng (CRM) | User Console |
| **Role** | Tập permission + mặc định scope | Job title HR (title là field Employee) |

**Quy tắc liên kết**

- `Employee.userId` optional: NV chỉ quầy có thể chưa có login Console.
- 1 User ↔ tối đa 1 Employee trong 1 tenant (HR-1).
- Customer **không** join User trừ B2B portal (ngoài scope).

---

## 4. Actors & personas

| Actor | Việc chính | Permission tối thiểu |
|---|---|---|
| Super Admin (tenant owner) | Invite, gán mọi role, suspend, xem audit | `hr.user.manage`, `hr.role.manage` |
| HR / Ops Admin | Invite staff, gán store scope, quản Employee | `hr.user.manage`, `hr.employee.manage` |
| Store Manager | Xem NV cửa mình, mở/đóng shift (HR-2+) | `hr.employee.read` + scope store; `pos.shift.manage` |
| Cashier / Staff | Đăng nhập POS / Console hạn chế | Role template `cashier` / `editor` |
| Compliance | Xem audit, approve export PII | `audit.read`, `pii.export` |

---

## 5. Functional requirements

### 5.1. FR-HR-IAM — Users

| ID | Requirement | MoSCoW | Wave |
|---|---|---|---|
| FR-HR-001 | List/search users theo email, name, status, role | Must | HR-1 |
| FR-HR-002 | Invite user bằng email (+ optional name); tạo invite token TTL 7 ngày | Must | HR-1 |
| FR-HR-003 | Activate invite → set password → status `active` | Must | HR-1 |
| FR-HR-004 | Suspend / reactivate user; session revoke khi suspend | Must | HR-1 |
| FR-HR-005 | Admin reset password (temp link) hoặc self-service forgot (Could) | Should | HR-1 / HR-2 |
| FR-HR-006 | Login history: IP, UA, time, result; revoke session | Must | HR-1 stub / HR-2 |
| FR-HR-007 | MFA enroll cho role nhạy cảm | Should | HR-2 |
| FR-HR-008 | `GET /v1/me` trả roles + scopes + employee_id nếu có | Must | HR-1 |

### 5.2. FR-HR-RBAC — Roles & permissions

| ID | Requirement | MoSCoW | Wave |
|---|---|---|---|
| FR-HR-010 | Catalog permission ổn định (string codes) | Must | HR-1 |
| FR-HR-011 | Role templates hệ thống (không xóa): `owner`, `admin`, `ops`, `store_manager`, `cashier`, `website_editor`, `website_publisher`, `analyst`, `readonly` | Must | HR-1 |
| FR-HR-012 | Gán 1..n roles / user; effective permissions = union | Must | HR-1 |
| FR-HR-013 | Data scope: `tenant` \| `brand[]` \| `store[]` \| `warehouse[]` \| `channel[]` | Must | HR-1 |
| FR-HR-014 | Sensitive perms hạng nhất (SRS): `margin.view`, `ai.approve`, `website.publish`, `pii.export`, `price.override`, `refund.issue`, `stock.adjust`, `secret.manage` | Must | HR-1 |
| FR-HR-015 | Custom role (tenant-defined) | Could | HR-3 |
| FR-HR-016 | Enforce scope trên API list (orders/inventory/pages) — deny cross-store | Must | HR-1 (website + stub) → HR-2 full |

### 5.3. FR-HR-EMP — Employee directory

| ID | Requirement | MoSCoW | Wave |
|---|---|---|---|
| FR-HR-020 | CRUD Employee: code, display_name, title, phone, email, status | Must | HR-1 |
| FR-HR-021 | Link / unlink User ↔ Employee | Must | HR-1 |
| FR-HR-022 | Store assignment (primary + secondary stores) | Must | HR-1 |
| FR-HR-023 | Employment status: `active` \| `on_leave` \| `terminated` | Must | HR-1 |
| FR-HR-024 | POS PIN / badge code (hashed) | Should | HR-2 |
| FR-HR-025 | Org chart / department | Could | HR-3 |

### 5.4. FR-HR-SHIFT — Ca làm việc (POS foundation)

| ID | Requirement | MoSCoW | Wave |
|---|---|---|---|
| FR-HR-030 | Open shift: store + register + employee + opening_cash | Must | HR-2 |
| FR-HR-031 | Close shift: closing_cash, variance, note | Must | HR-2 |
| FR-HR-032 | 1 open shift / register tại một thời điểm | Must | HR-2 |
| FR-HR-033 | Báo cáo doanh thu theo NV/ca (read model) | Should | HR-2 |
| FR-HR-034 | Offline queue shift sync | Could | HR-3 |

### 5.5. FR-HR-AUD — Audit & compliance

| ID | Requirement | MoSCoW | Wave |
|---|---|---|---|
| FR-HR-040 | Audit mọi invite/role/scope/suspend/reset/link employee | Must | HR-1 |
| FR-HR-041 | Export PII user/employee cần `pii.export` + audit reason | Must | HR-2 |
| FR-HR-042 | Retention login history ≥ 90 ngày (configurable) | Should | HR-2 |

---

## 6. Permission catalog (HR-1 seed)

```text
# IAM / HR
hr.user.read | hr.user.manage
hr.role.read | hr.role.manage
hr.employee.read | hr.employee.manage
hr.invite.manage
hr.session.revoke

# Sensitive (cross-module — gán qua role)
margin.view
ai.approve
website.edit | website.publish
pii.export
price.override
refund.issue
stock.adjust
secret.manage
audit.read

# POS (HR-2)
pos.shift.manage | pos.sell
```

### Role templates (mặc định)

| Role | Permissions chính | Default scope |
|---|---|---|
| `owner` | `*` (all) | tenant |
| `admin` | hầu hết trừ `secret.manage` optional | tenant |
| `ops` | orders, inventory read/write (không publish site) | tenant hoặc stores |
| `store_manager` | store ops + `hr.employee.read` + `pos.shift.manage` | assigned stores |
| `cashier` | `pos.sell`, `pos.shift.manage` (own) | assigned stores |
| `website_editor` | `website.edit` | brand/storefront |
| `website_publisher` | `website.edit` + `website.publish` | brand/storefront |
| `analyst` | read + `margin.view` | tenant |
| `readonly` | `*.read` only | tenant |

---

## 7. Data model (Prisma đề xuất)

```prisma
/// Đã có — mở rộng
model User {
  id            String
  tenantId      String
  email         String
  name          String
  passwordHash  String?
  roles         String[]   // legacy; HR-1 migrate → UserRoleAssignment
  status        String     // invited | active | suspended | deleted
  invitedAt     DateTime?
  activatedAt   DateTime?
  lastLoginAt   DateTime?
  // ...
  employee      Employee?
  roleAssignments UserRoleAssignment[]
  invitesSent   UserInvite[] @relation("Inviter")
  sessions      UserSession[]
  loginEvents   LoginEvent[]
}

model Permission {
  code        String  @id   // hr.user.manage
  description String
  sensitive   Boolean @default(false)
}

model RoleTemplate {
  id          String
  tenantId    String?  // null = system
  code        String   // owner, cashier, ...
  name        String
  system      Boolean  @default(false)
  permissions String[] // codes
  @@unique([tenantId, code])
}

model UserRoleAssignment {
  id        String
  tenantId  String
  userId    String
  roleCode  String
  /// { type: "tenant" } | { type: "store", ids: [] } | ...
  scope     Json
  createdAt DateTime
  @@index([tenantId, userId])
}

model UserInvite {
  id          String
  tenantId    String
  email       String
  name        String?
  roleCodes   String[]
  scope       Json
  tokenHash   String
  expiresAt   DateTime
  acceptedAt  DateTime?
  invitedById String?
  status      String   // pending | accepted | expired | revoked
}

model UserSession {
  id           String
  tenantId     String
  userId       String
  tokenHash    String
  ip           String?
  userAgent    String?
  createdAt    DateTime
  lastSeenAt   DateTime
  revokedAt    DateTime?
}

model LoginEvent {
  id        String
  tenantId  String
  userId    String?
  email     String
  success   Boolean
  reason    String?
  ip        String?
  userAgent String?
  createdAt DateTime
}

model Employee {
  id           String
  tenantId     String
  userId       String?  @unique
  code         String   // NV-001
  displayName  String
  title        String?
  phone        String?
  email        String?
  status       String   // active | on_leave | terminated
  hiredAt      DateTime?
  terminatedAt DateTime?
  posPinHash   String?
  assignments  EmployeeStoreAssignment[]
  shifts       PosShift[]
  @@unique([tenantId, code])
}

model EmployeeStoreAssignment {
  id          String
  employeeId  String
  storeId     String   // map Storefront or future Store entity
  isPrimary   Boolean  @default(false)
  @@unique([employeeId, storeId])
}

model PosShift {
  id            String
  tenantId      String
  storeId       String
  registerCode  String
  employeeId    String
  status        String   // open | closed
  openedAt      DateTime
  closedAt      DateTime?
  openingCash   Decimal
  closingCash   Decimal?
  variance      Decimal?
  note          String?
}
```

**Migration ghi chú**

- Giữ `User.roles[]` dual-read HR-1; dual-write vào `UserRoleAssignment`.
- `storeId` HR-1: dùng `Storefront.id` nếu chưa có entity `Store` riêng; map rõ trong ADR ngắn.

---

## 8. API surface

Base: `/api/v1/admin/...` · Guard: `TenantAuthGuard` + permission check.

### 8.1. Users

| Method | Path | Permission | Mô tả |
|---|---|---|---|
| GET | `/hr/users` | `hr.user.read` | List + q, status, role |
| GET | `/hr/users/:id` | `hr.user.read` | Detail + roles + employee |
| POST | `/hr/users/invite` | `hr.invite.manage` | Invite |
| POST | `/hr/users/:id/suspend` | `hr.user.manage` | Suspend + revoke sessions |
| POST | `/hr/users/:id/reactivate` | `hr.user.manage` | Reactivate |
| POST | `/hr/users/:id/roles` | `hr.role.manage` | Replace assignments |
| POST | `/hr/users/:id/reset-password` | `hr.user.manage` | Issue reset |
| GET | `/hr/users/:id/sessions` | `hr.user.read` | Sessions |
| POST | `/hr/sessions/:id/revoke` | `hr.session.revoke` | Revoke |

### 8.2. Public invite / auth (bổ sung)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/v1/public/invites/:token` | public | Preview invite |
| POST | `/v1/public/invites/:token/accept` | public | Set password + activate |
| POST | `/v1/auth/login` | public | Đã có — ghi `LoginEvent` |
| GET | `/v1/me` | JWT | Mở rộng scopes + employee |

### 8.3. Employees

| Method | Path | Permission |
|---|---|---|
| GET/POST | `/hr/employees` | read / manage |
| GET/PATCH | `/hr/employees/:id` | read / manage |
| POST | `/hr/employees/:id/link-user` | manage |
| POST | `/hr/employees/:id/stores` | manage |

### 8.4. Roles

| Method | Path | Permission |
|---|---|---|
| GET | `/hr/roles` | `hr.role.read` |
| GET | `/hr/permissions` | `hr.role.read` |

### 8.5. Shifts (HR-2)

| Method | Path | Permission |
|---|---|---|
| POST | `/hr/stores/:storeId/registers/:code/shifts/open` | `pos.shift.manage` |
| POST | `/hr/shifts/:id/close` | `pos.shift.manage` |
| GET | `/hr/shifts` | `hr.employee.read` hoặc `pos.shift.manage` |

---

## 9. UI Console (admin-web)

Base path: `/console/hr/...` · Nav section **Nhân sự / HR**.

| Route | Mục đích | Wave |
|---|---|---|
| `/hr/users` | Danh sách user + invite | HR-1 |
| `/hr/users/[id]` | Roles, scope, sessions, link employee | HR-1 |
| `/hr/employees` | Directory NV | HR-1 |
| `/hr/employees/[id]` | Assign stores, status | HR-1 |
| `/hr/roles` | Xem role templates (read-only HR-1) | HR-1 |
| `/hr/shifts` | Open shifts / history | HR-2 |
| `/hr/audit` | Filter audit HR actions | HR-2 |

**IA rules (khớp brand UI Console hiện tại)**

- Một composition list + detail; không dashboard KPI HR ở viewport đầu.
- CTA chính: **Mời user** / **Thêm nhân viên**.
- Không trộn Customer list vào HR.

**Invite accept:** trang public `/console/invite/[token]` (ngoài shell đã login).

---

## 10. Business rules

| ID | Rule |
|---|---|
| BR-HR-001 | Không hard-delete User; `status=deleted` + anonymize optional |
| BR-HR-002 | Suspend → revoke mọi `UserSession` ngay |
| BR-HR-003 | Role `owner` cuối cùng của tenant không được suspend/remove |
| BR-HR-004 | Gán `website.publish` / `pii.export` / `margin.view` bắt buộc audit reason (HR-2 soft) |
| BR-HR-005 | Scope store: API trả 403 hoặc filter — không leak ID cross-store |
| BR-HR-006 | Invite email trùng user `active` → reject; trùng `invited` → resend |
| BR-HR-007 | Employee `terminated` → unlink POS PIN; optional suspend linked User |
| BR-HR-008 | Export CSV users cần `pii.export` (BR-010) |
| BR-HR-009 | Actor không tự nâng quyền vượt effective permissions của mình (trừ owner) |

---

## 11. Use cases chi tiết

### UC-HR-001 — Invite & gán role (Must)

- **Actor:** Admin có `hr.invite.manage`
- **Main:** nhập email → chọn role template(s) + scope → gửi mail/link → audit `hr.user.invite`
- **Alt:** email đã active → lỗi; token hết hạn → resend
- **Post:** User `invited`; accept → `active` + assignment

### UC-HR-002 — Enforce store scope trên đơn hàng (Must, HR-1 stub → HR-2)

- User `store_manager` scope store A gọi `GET /orders` → chỉ đơn storefront/store A
- Gọi detail đơn store B → 403

### UC-HR-003 — Link Employee ↔ User (Must)

- Tạo Employee `NV-012` → link user email → `/v1/me` có `employee_id`

### UC-HR-004 — Open / close shift (Should, HR-2)

- Cashier mở ca → bán POS (FR-POS) gắn `shift_id` → đóng ca + variance

### UC-HR-005 — Suspend insider (Must)

- Suspend → không login; JWT cũ reject; audit

---

## 12. Waves triển khai

| Wave | Scope | Exit |
|---|---|---|
| **HR-0** | Spec + permission seed constants + ADR ngắn `docs/adr/00x-hr-iam.md` | Review PO |
| **HR-1** | Users invite/CRUD status · RoleAssignment · Employee · UI `/hr/*` · `/v1/me` scopes · e2e-hr-1 | Admin quản được user |
| **HR-2** | Sessions/login history · MFA stub · Shift · PII export gate · enforce scope OMS/INV | POS-ready |
| **HR-3** | Custom roles · SCIM stub · department · offline PIN | Enterprise IAM |
| **HRM-Pro** | §18 — payroll · attendance · leave · contracts · ATS lite | Could / Phase sau — **không** block WebCom GA |

**Flags**

| Env | Mặc định | Ý nghĩa |
|---|---|---|
| `FEATURE_HR_IAM` | true (sau ship) | Users/roles/invite |
| `FEATURE_HR_EMPLOYEE` | true | Employee directory |
| `FEATURE_HR_SHIFT` | false đến HR-2 | POS shifts |
| `FEATURE_HR_MFA` | false | MFA enroll |
| `FEATURE_HRM_PRO` | false | Bật module HRM-Pro (Phase sau) |

**Ước lượng:** HR-1 ≈ 1.5–2.5 tuần · HR-2 ≈ 1.5–2 tuần · HRM-Pro ≈ 8–14 tuần (tách chương trình).

---

## 13. Acceptance criteria (HR-1)

- [ ] `/console/hr/users` list + invite hoạt động trên VPS
- [ ] Accept invite → login `/console/login` thành công
- [ ] Gán `website_editor` không gọi được publish nếu thiếu `website.publish`
- [ ] User scope 1 store không đọc resource store khác (ít nhất 1 API chứng minh — pages hoặc orders)
- [ ] Employee link hiện trên user detail + `/v1/me`
- [ ] Audit có `hr.user.invite` / `hr.user.suspend` / `hr.role.assign`
- [ ] `scripts/e2e-hr-1.sh` xanh local + VPS
- [ ] OpenAPI/Bruno `docs/openapi-hr-1.yaml` · runbook `docs/runbooks/hr-iam.md`

---

## 14. NFR

| ID | Yêu cầu |
|---|---|
| NFR-HR-001 | Password: bcrypt/argon2; min 8; không log plaintext |
| NFR-HR-002 | Invite token: random 32+ bytes, store hash only |
| NFR-HR-003 | List users P95 ≤ 300 ms (tenant ≤ 5k users) |
| NFR-HR-004 | Mọi endpoint HR tenant-scoped; không cross-tenant |
| NFR-HR-005 | Rate-limit login + invite accept (anti brute-force) |

---

## 15. Quan hệ module khác

| Module | Tương tác |
|---|---|
| Website / CMS | `website.edit` / `website.publish` từ HR roles |
| OMS / Inventory | Data scope store (HR-2 enforce đầy đủ) |
| POS | Employee + Shift (HR-2) |
| AI | `ai.approve` permission |
| Customer 360 | **Tách UI**; không dùng bảng `customers` cho staff |
| Agency | Brand scope isolation (FR-ORG-013) — HR-2+ |

---

## 16. Open questions (chốt trước HR-1 code)

1. Entity **Store** tách khỏi Storefront hay reuse `Storefront.id` cho scope?
2. Invite gửi email thật (SMTP) hay link copy-only stub HR-1?
3. Giữ header `x-tenant-id`/`x-actor-id` song song JWT đến khi nào?
4. POS register model nằm HR hay module POS riêng (shared table OK)?

**Đề xuất mặc định:** (1) reuse Storefront id + alias `store_id` trong scope JSON · (2) copy-link stub + optional SMTP · (3) dual auth đến hết HR-2 · (4) `PosShift` trong schema HR, API prefix `/hr` đến khi POS app tách.

---

## 17. Tài liệu liên quan cần tạo khi implement

| File | Wave |
|---|---|
| `docs/adr/006-hr-iam-employee.md` | HR-0 |
| `docs/runbooks/hr-iam.md` | HR-1 |
| `docs/openapi-hr-1.yaml` · Bruno | HR-1 |
| `scripts/e2e-hr-1.sh` | HR-1 |
| Cập nhật `docs/04` wave table + nav Console | HR-1 |
| `docs/specs/hr-iam-employee.md` §18 (HRM-Pro) → ADR riêng khi kickoff | HRM-Pro |
| `docs/runbooks/hrm-pro.md` · `scripts/e2e-hrm-pro.sh` | HRM-Pro |

---

## 18. HRM-Pro (Could / Phase sau) — HRM chuyên nghiệp

> **Vị trí:** mở rộng **sau** khi HR-1/HR-2 ổn định. Không nằm trong GA WebCom / Shared CMS.  
> **Phụ thuộc:** Employee directory (HR-1) + Store/Shift (HR-2) + Legal entity (FR-ORG).  
> **Flag master:** `FEATURE_HRM_PRO=false` mặc định.

### 18.1. Mục tiêu HRM-Pro

Biến WebCom từ “quản quyền + NV bán hàng” thành **HRM vận hành chuỗi bán lẻ VN** đủ dùng cho SMB/mid-market — chưa thay ERP kế toán đầy đủ, nhưng đủ hồ sơ HĐLĐ, công, phép, lương kỳ.

```text
HR-1/2 (IAM + Employee + Shift)
        │
        ▼
┌─────────────────────────────────────────┐
│ HRM-Pro                                   │
│  Org & Contract · Attendance · Leave      │
│  Payroll VN · Benefits · ATS lite         │
│  Performance (OKR lite) · Compliance VN   │
└─────────────────────────────────────────┘
```

### 18.2. Non-goals HRM-Pro (vẫn không làm)

| Không làm | Ghi chú |
|---|---|
| General ledger / sổ cái thay thế phần mềm kế toán | Chỉ export journal / file ngân hàng |
| MRP / sản xuất | Ngoài OS commerce |
| Bảo hiểm tư nhân phức tạp / đầu tư quỹ | Integrator sau |
| Chấm công phần cứng proprietary lock-in | Ưu tiên API + QR/app |
| AI tự duyệt lương / tự ký HĐ | Luôn human approval |

### 18.3. Phân hệ & MoSCoW

| Phân hệ | ID prefix | MoSCoW | Mô tả ngắn |
|---|---|---|---|
| Org & Contract | FR-HRMP-ORG | Must | Phòng ban, cấp bậc, HĐLĐ, loại HĐ, phụ thuộc |
| Attendance | FR-HRMP-ATT | Must | Roster, check-in/out, OT, bảng công tháng |
| Leave | FR-HRMP-LEV | Must | Phép năm / không lương / duyệt / số dư |
| Payroll VN | FR-HRMP-PAY | Must | Kỳ lương, phụ cấp, BHXH/PIT stub, phiếu lương |
| Benefits | FR-HRMP-BEN | Should | Phúc lợi, phụ cấp cố định |
| ATS lite | FR-HRMP-ATS | Should | JD, pipeline ứng viên, offer → Employee |
| Performance | FR-HRMP-PRF | Could | OKR/KPI lite, review kỳ |
| Compliance VN | FR-HRMP-CPL | Should | Lưu HĐ, retention, báo cáo BHXH export |
| Integrations | FR-HRMP-INT | Could | SCIM đầy đủ, e-sign HĐ, banking payroll file |

### 18.4. Functional requirements (chi tiết)

#### A. Org & Contract — Must

| ID | Requirement |
|---|---|
| FR-HRMP-001 | Department tree theo legal entity / brand |
| FR-HRMP-002 | Job level / title catalog (tách khỏi IAM role) |
| FR-HRMP-003 | Manager chain (`reports_to_employee_id`) |
| FR-HRMP-004 | Hợp đồng lao động: loại (thử việc/xác định/không xác định), ngày hiệu lực–hết hạn, file đính kèm |
| FR-HRMP-005 | Trạng thái employment mở rộng: probation → active → suspended → terminated + lý do nghỉ |
| FR-HRMP-006 | Người phụ thuộc (cho PIT) — optional fields |
| FR-HRMP-007 | Multi-legal-entity: Employee thuộc 1 legal entity chính |

#### B. Attendance — Must

| ID | Requirement |
|---|---|
| FR-HRMP-010 | Ca làm việc (WorkSchedule) ≠ PosShift: lịch tuần / pattern |
| FR-HRMP-011 | Roster gán Employee × Store × ngày |
| FR-HRMP-012 | Check-in/out: app / QR tại store / import CSV |
| FR-HRMP-013 | GPS geofence optional (flag); không bắt buộc MVP HRM-Pro |
| FR-HRMP-014 | Tính đi muộn, về sớm, thiếu giờ, OT (rule configurable) |
| FR-HRMP-015 | Bảng công tháng: lock kỳ + approve Store Manager → HR |
| FR-HRMP-016 | Đồng bộ read-only từ `PosShift` (giờ bán hàng) như một nguồn chấm công phụ |

#### C. Leave — Must

| ID | Requirement |
|---|---|
| FR-HRMP-020 | Leave type: annual, unpaid, sick, remote, custom |
| FR-HRMP-021 | Policy số ngày / năm theo thâm niên (rule table) |
| FR-HRMP-022 | Request → approve multi-level (manager → HR) + SLA |
| FR-HRMP-023 | Số dư phép realtime; trừ khi approved |
| FR-HRMP-024 | Chặn roster / shift conflict khi overlapping leave |

#### D. Payroll VN — Must (core), Should (nâng cao)

| ID | Requirement | MoSCoW |
|---|---|---|
| FR-HRMP-030 | Payroll period (tháng / kỳ 2) | Must |
| FR-HRMP-031 | Salary structure: lương CB + phụ cấp (fixed/% ) | Must |
| FR-HRMP-032 | Input: công đã lock + OT + leave unpaid + thưởng/phạt thủ công | Must |
| FR-HRMP-033 | BHXH/BHYT/BHTN employee + employer rates (configurable by year) | Must |
| FR-HRMP-034 | PIT estimate theo biểu lũy tiến + giảm trừ bản thân/PT (stub chính xác kế toán) | Must |
| FR-HRMP-035 | Payslip PDF/HTML per employee; portal self-service | Must |
| FR-HRMP-036 | Payroll run: draft → review → approved → paid | Must |
| FR-HRMP-037 | Export banking file (VietQR/bulk CSV theo ngân hàng phổ biến) | Should |
| FR-HRMP-038 | Journal export (debit/credit stub) cho phần mềm kế toán | Should |
| FR-HRMP-039 | Tạm ứng / khấu trừ kỳ | Should |

> **Lưu ý pháp lý:** công thức BHXH/PIT phải version theo năm; HRM-Pro **không** cam kết thay thế tư vấn thuế — merchant chịu trách nhiệm cấu hình rate.

#### E. Benefits — Should

| ID | Requirement |
|---|---|
| FR-HRMP-040 | Benefit catalog (ăn trưa, xăng, điện thoại…) |
| FR-HRMP-041 | Enrollment theo Employee / grade |
| FR-HRMP-042 | Đẩy vào payroll như earning/deduction |

#### F. ATS lite — Should

| ID | Requirement |
|---|---|
| FR-HRMP-050 | Job posting nội bộ (không public career site bắt buộc) |
| FR-HRMP-051 | Candidate pipeline: applied → screen → interview → offer → hired |
| FR-HRMP-052 | Offer accepted → **create Employee** (reuse HR-1) + optional invite User |
| FR-HRMP-053 | Không làm job board distribution (Could sau) |

#### G. Performance — Could

| ID | Requirement |
|---|---|
| FR-HRMP-060 | OKR/KPI object gắn Employee / team |
| FR-HRMP-061 | Review cycle + score + comment |
| FR-HRMP-062 | Không auto-link lương (tránh AI/policy rủi ro) trừ approval HR |

#### H. Compliance VN — Should

| ID | Requirement |
|---|---|
| FR-HRMP-070 | Lưu trữ HĐ + phụ lục; retention policy |
| FR-HRMP-071 | Export danh sách lao động / biến động cho BHXH (CSV template) |
| FR-HRMP-072 | Audit mọi thay đổi HĐ, lương, công lock |
| FR-HRMP-073 | PII mask trên UI theo permission `hrm.pii.view` |

#### I. Integrations — Could

| ID | Requirement |
|---|---|
| FR-HRMP-080 | SCIM full sync từ IdP (sau HR-3 stub) |
| FR-HRMP-081 | E-sign HĐ (vendor adapter) |
| FR-HRMP-082 | Webhook `payroll.paid` / `leave.approved` |

### 18.5. Data model bổ sung (phác thảo)

```text
LegalEntity (đã có / FR-ORG)
Department · JobGrade
EmploymentContract · ContractDocument
WorkSchedule · RosterEntry
AttendanceEvent · TimesheetPeriod · TimesheetLine
LeavePolicy · LeaveBalance · LeaveRequest
SalaryStructure · PayrollPeriod · PayrollRun · Payslip · PayslipLine
BenefitPlan · BenefitEnrollment
JobRequisition · Candidate · Offer
PerformanceCycle · Objective · Review
```

Mọi bảng `tenant_id` + (thường) `legal_entity_id`. **Reuse** `Employee` từ HR-1 — không tạo nhân sự song song.

### 18.6. API / UI (prefix riêng)

| Layer | Convention |
|---|---|
| API | `/api/v1/admin/hrm/...` (tách khỏi `/hr` IAM) |
| UI | `/console/hrm/...` — nav section **HRM** (ẩn nếu flag off) |
| Permissions | `hrm.contract.*` · `hrm.attendance.*` · `hrm.leave.*` · `hrm.payroll.*` · `hrm.ats.*` · `hrm.pii.view` |

Self-service nhân viên (Could): `/console/me/payslips`, `/console/me/leave` — chỉ Employee đã link User.

### 18.7. Waves nội bộ HRM-Pro

| Sub-wave | Scope | Exit |
|---|---|---|
| **HRMP-A** | Org + Contract + Leave | HĐ + xin phép duyệt được |
| **HRMP-B** | Attendance + Timesheet lock | Bảng công tháng khóa được |
| **HRMP-C** | Payroll VN + Payslip | Chạy 1 kỳ lương draft→approved trên tenant demo |
| **HRMP-D** | Benefits + ATS lite + Compliance export | Offer→Employee; CSV BHXH |
| **HRMP-E** | Performance + e-sign + banking file | Could |

**Ước lượng lịch:** 8–14 tuần tùy độ sâu PIT/BHXH và email/SMTP.

### 18.8. Acceptance (HRMP-C tối thiểu để gọi “HRM-Pro GA”)

- [ ] Tạo HĐLĐ + department + manager chain
- [ ] Roster tuần + check-in → timesheet tháng lock
- [ ] Leave annual trừ đúng số dư
- [ ] Payroll run 1 kỳ: BHXH + PIT stub + payslip xem được
- [ ] Employee self-service xem payslip (nếu có User)
- [ ] `FEATURE_HRM_PRO` tắt → toàn bộ `/hrm` 404/disabled
- [ ] Không regression HR-1/2 IAM
- [ ] e2e-hrm-pro.sh xanh trên staging

### 18.9. Quan hệ với Spec HR hiện tại

| HR-1/2/3 | HRM-Pro |
|---|---|
| Ai được vào Console / quyền gì | NV được trả lương / công / phép thế nào |
| PosShift = ca bán hàng | WorkSchedule/Attendance = công HR |
| Employee = master người | Contract/Payroll = hồ sơ & tiền |
| Flag `FEATURE_HR_*` | Flag `FEATURE_HRM_PRO` |

**Nguyên tắc:** HRM-Pro **không** fork Employee; mọi payroll/leave gắn `employee_id`. IAM role ≠ job grade.

### 18.10. Open questions (chốt trước kickoff HRM-Pro)

1. Tự build payroll engine vs tích hợp đối tác (Base.vn / GHR / Keke) qua connector?
2. Độ chính xác PIT/BHXH: “estimate đủ SMB” hay cần chữ ký tư vấn thuế / chứng nhận?
3. Self-service mobile app riêng hay PWA Console?
4. Có bán HRM-Pro như **add-on license** (P3-style) không?

**Đề xuất mặc định:** (1) self-build HRMP-A/B + payroll core; connector đối tác = Could · (2) estimate + disclaimer · (3) PWA Console trước · (4) add-on `hrm_pro` license khi ship HRMP-C.

---

## 19. Tóm tắt một dòng

> **HR-1…3** = IAM Users + RBAC/scope + Employee (+ Shift POS) — quản lý người vận hành trên Console.  
> **HRM-Pro (Could / Phase sau)** = HĐLĐ + chấm công + phép + lương VN + ATS lite — HRM chuyên nghiệp gắn Employee, **không** block GA WebCom và **không** thay ERP kế toán.
