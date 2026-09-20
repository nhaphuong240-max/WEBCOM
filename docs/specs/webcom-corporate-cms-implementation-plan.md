# Kế hoạch triển khai chi tiết — WebCom Corporate CMS

| Thuộc tính | Nội dung |
|---|---|
| Phiên bản | 2.0 |
| Ngày | 2026-09-20 |
| Trạng thái | **Ready to execute** sau chốt Q1–Q8 (mặc định §2) |
| Spec | [`webcom-corporate-cms.md`](./webcom-corporate-cms.md) **v1.2** |
| Kế hoạch tổng | `docs/04` §9p · §9r |
| Engine | Shared CMS GA · ADR-005 |
| SRS | FR-CORPWEB-001…006 |
| Ước lượng | **6–8 tuần lịch** tới GA (CORP-CMS-0…2); CORP-CMS-3 backlog |

---

## 0. Tóm tắt điều hành

**Deliverable GA (cuối CORP-CMS-2):**

1. Marketing/PMM sửa **homepage, pricing, ≥1 solution, catalog intro, nav** trên `webecom.ngoinhahomnay.vn` qua `/console/platform/*` — không deploy code.
2. Cùng Visual Builder Shared CMS (`scope=platform`) — **không fork**.
3. Nghiệp vụ: CTA `cta_code`, Editor≠Approver, publish checklist, pricing tách Theme vs Platform plan, hybrid `/templates`.
4. UI: tokens `--hv-*`, SectionStackPlatform, motion + reduced-motion, filter logic catalog.
5. Flag dual-path; e2e + OpenAPI + runbook.

```text
Day 0          Audit + chốt Q1–Q8 (defaults §2)
Tuần 1         CORP-CMS-0  Foundation (PlatformSite, API, RBAC, flag, e2e-0)
Tuần 2–3.5     CORP-CMS-1  Content MVP + nghiệp vụ + UI runtime + e2e-1
Tuần 4–5.5     CORP-CMS-2  Solutions/Case/Industry/Nav + revalidate + GA
Tuần 6+        CORP-CMS-3  Resources gated · Tour · ROI · i18n (backlog)
```

**Đội (1 squad):** BE 1 · FE Corp 0.75 · FE Admin 0.5 · QA 0.4 · PMM 0.25 · TL review schema/ADR.

**Không phá:** trial P2, theme license P3, Shared CMS storefront, catalog API `/templates`.

---

## 1. Nguyên tắc thực thi

1. **Không fork builder** — palette `scope=platform` only.
2. **Fallback hardcode** bắt buộc đến hết CORP-CMS-1 (AC-P5).
3. **Hybrid `/templates`** — CMS chỉ `catalog_intro`; cards/facets = API (AC-B8, Spec §3.6).
4. **Flags:** `FEATURE_PLATFORM_CMS` · `cms.platform_registry.v1` · `builder.platform`.
5. Mỗi wave: **migrate → API → seed → UI → AC-B/UI → e2e → OpenAPI/Bruno → runbook**.
6. Regression bắt buộc: `e2e-cms-ga` + smoke corporate `/` `/templates` `/trial`.
7. **PMM sign-off** seed copy trước bật flag prod.
8. Tiếng Việt user-facing; code/API English.

---

## 2. Quyết định mặc định (open questions Spec §15)

Dùng để kickoff; đổi trước Day 0 nếu PO/Legal không đồng ý.

| # | Câu hỏi | **Default kế hoạch** |
|---|---|---|
| Q1 | Tenant PlatformSite | `ten_platform` mới + seed admin roles |
| Q2 | Page ownership | **Interim** `sf_platform_webcom` trong CORP-CMS-0; migrate `owner_type` cuối CORP-CMS-1 |
| Q3 | Capability matrix peer | Label **“Omnichannel phổ biến”** — không brand đối thủ |
| Q4 | Staging | `site_key=webcom_staging` (host staging khi có) |
| Q5 | Lead SLA first-touch | **4h giờ làm việc** (Sales Ops config CRM; ngoài CMS) |
| Q6 | `source_ref` owner | **PMM** primary; Finance C khi số tài chính |
| Q7 | Platform plan giá | Phase 1 **“Liên hệ”** only |
| Q8 | `ends_at` TZ | `Asia/Ho_Chi_Minh` |

---

## 3. Workstream & phụ thuộc

```text
        ┌──────────────┐
        │ Shared CMS GA│ (đã có — phụ thuộc cứng)
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │  CORP-CMS-0  │ Foundation
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │  CORP-CMS-1  │ Runtime + nghiệp vụ MVP + UI
        │  (1a BE ║ 1b FE corp ║ 1c Admin)
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │  CORP-CMS-2  │ Expand IA + GA
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │  CORP-CMS-3  │ Backlog
        └──────────────┘
```

| Wave | Phụ thuộc cứng |
|---|---|
| CORP-CMS-0 | Shared CMS PageVersion + builder canvas hoạt động |
| CORP-CMS-1 | PC0 public GET + permissions |
| CORP-CMS-2 | SectionStackPlatform ổn + CTA enum |
| CORP-CMS-3 | Lead API + publish checklist |

---

## 4. Day 0 — Audit (trước code · 0.5–1 ngày)

| ID | Việc | Owner | Output |
|---|---|---|---|
| A1 | Inventory hardcode `corporate-web` pages → map slug Spec §6 | FE Corp | Bảng slug → component |
| A2 | Inventory Shared CMS: Page/PageVersion, builder routes, preview token | BE | Điểm tái sử dụng |
| A3 | Inventory permissions HR/RBAC — chỗ gắn `platform.cms.*` | BE | PR sketch |
| A4 | Inventory lead form + consent + GTM consent banner | FE Corp | Hook `cta_code` |
| A5 | Inventory `/templates` facets keys vs industry CMS keys | FE Corp | Bảng AC-B3 |
| A6 | Flag matrix + `.env.example` VPS | DevOps | 3 flags documented |
| A7 | PO/PMM/Legal confirm §2 defaults | PO | Sign-off Slack/doc |

**Exit Day 0:** A7 signed; A1–A5 artifact trong PR hoặc Notion gắn plan.

---

## 5. CORP-CMS-0 — Foundation (Tuần 1 · 4–5 ngày)

### 5.1. Mục tiêu

PlatformSite (hoặc interim SF) + API đọc/ghi draft + public published + RBAC + flag fallback — **chưa** bắt buộc đổi UI marketing.

### 5.2. Tasks

| ID | Task | Khu vực | AC / DoD |
|---|---|---|---|
| PC0-1 | ADR-008 (hoặc note ADR-005): PlatformSite + interim SF | `docs/adr/` | Merged |
| PC0-2 | Prisma: `PlatformSite` **hoặc** seed `sf_platform_webcom` + convention | `schema.prisma` + migrate | Deploy VPS OK |
| PC0-3 | Seed `webcom_apex` meta + pages stub `/`, `/pricing` ContentV1 tối thiểu | `seed.ts` | Idempotent |
| PC0-4 | Permissions: `platform.cms.read\|write\|publish` + gán Editor/Approver roles | RBAC seed | AC-P2 / AC-B7 nền |
| PC0-5 | Admin API: list/get/put draft `…/platform/sites/:key/pages` | `admin-api` | Bruno 200 |
| PC0-6 | `POST …/pages/:slug/transition` draft→review→published | `admin-api` | Permission gate |
| PC0-7 | Public `GET …/public/platform/:key/pages/:slug` (published only) | `admin-api` | 200/404 |
| PC0-8 | Flags env + corporate read path stub (log only / dual) | `.env.example`, corp | AC-P5 |
| PC0-9 | `scripts/e2e-platform-cms-0.sh` | `scripts/` | Local + VPS |
| PC0-10 | OpenAPI snippet + Bruno folder `platform-cms` | `docs/` | Linked |

### 5.3. Exit CORP-CMS-0

- [x] Public GET published stub page
- [x] Editor PUT draft OK; Editor **không** publish (403)
- [x] Approver publish OK
- [x] `FEATURE_PLATFORM_CMS=false` → corporate UI cũ 200
- [x] e2e-0 script + OpenAPI/Bruno; không regression storefront CMS (verify on VPS/local when DB up)

### 5.4. Rollback CORP-CMS-0

Tắt flag; giữ migrate (additive). Không xóa Page merchant.

---

## 6. CORP-CMS-1 — Content MVP + nghiệp vụ + UI (Tuần 2–3.5 · ~10–12 ngày)

Chia song song sau PC0:

| Stream | Focus |
|---|---|
| **1a BE** | Registry platform types, Ajv `cta_code`, announce `ends_at`, preview token |
| **1b FE Corp** | SectionStackPlatform, tokens, homepage/pricing/templates hybrid, analytics |
| **1c FE Admin** | `/console/platform/pages`, canvas scope, checklist, starters |

### 6.1. Tasks

| ID | Task | Stream | AC |
|---|---|---|---|
| PC1-1 | Registry: `announce_bar`, `platform_hero`, `social_proof`, `module_tour`, `pricing_table`, `catalog_intro`, `faq`, `cta_band` + Ajv | 1a | Spec §7.2 |
| PC1-2 | Enum `cta_code` trong props CTA (reject unknown) | 1a | AC-B1 |
| PC1-3 | Filter `announce_bar` khi `ends_at` &lt; now (TZ Q8) | 1a | AC-B9 |
| PC1-4 | Preview token reuse Shared CMS pattern | 1a/1c | AC-P7 |
| PC1-5 | Admin list pages + editor canvas `scope=platform` | 1c | — |
| PC1-6 | Autosave indicator + block publish nếu Ajv fail | 1c | AC-UI4 |
| PC1-7 | Publish checklist UI §3.11 (checkbox → audit JSON) | 1c | AC-B7 |
| PC1-8 | Page starters: `gtm_home`, `gtm_pricing`, `gtm_catalog` | 1c | Spec §9.3 |
| PC1-9 | Icon picker allowlist | 1c | AC-UI2 |
| PC1-10 | `SectionStackPlatform` + normalize + unknown→ẩn | 1b | AC-P6 |
| PC1-11 | Components: Hero, Proof, Module, Pricing, Faq, Cta, Announce | 1b | §9.1 |
| PC1-12 | Tokens `--hv-*` + motion + reduced-motion | 1b | AC-UI3 |
| PC1-13 | Wire `/` + `/pricing` dual-path CMS→fallback | 1b | AC-P5 |
| PC1-14 | `/templates`: `catalog_intro` only; giữ facet UI logic | 1b | AC-B8, AC-UI1 |
| PC1-15 | Seed content parity homepage + pricing (PMM) | 1b+PMM | AC-B2, AC-B5 |
| PC1-16 | `platform_cta_click` → dataLayer (consent) | 1b | AC-B10 |
| PC1-17 | Lead form: require consent; pass `cta_code`, `landing_slug` | 1b | AC-B4 |
| PC1-18 | Industry keys align catalog facets | 1b | AC-B3 |
| PC1-19 | `scripts/e2e-platform-cms-1.sh` | QA | AC-P1/P8 + B1 sample |
| PC1-20 | Runbook draft `docs/runbooks/platform-cms.md` | BE | How to edit/publish |

### 6.2. Exit CORP-CMS-1

- [x] Dual-path homepage/pricing + catalog intro (flag on)
- [x] Pricing tách Theme vs Platform (AC-B5) trong starter + legacy
- [x] `/templates` facets + cards API; CMS chỉ `catalog_intro` (AC-B8)
- [x] CTA `cta_code` validate (AC-B1)
- [x] AC-UI tokens/motion; lead consent; announce ends_at; checklist publish
- [x] e2e-1 script + runbook (chạy khi DB up)

### 6.3. Rollback CORP-CMS-1

`FEATURE_PLATFORM_CMS=false`; seed giữ nguyên.

---

## 7. CORP-CMS-2 — Expand IA + GA (Tuần 4–5.5 · ~8–10 ngày)

### 7.1. Mục tiêu

Solutions / industry / case (+ capability matrix Legal) + platform nav + revalidate on publish + rollback UI + docs GA.

### 7.2. Tasks

| ID | Task | AC |
|---|---|---|
| PC2-1 | Types: `problem_workflow`, `kpi_row`, `ui_showcase`, `case_hero`, `before_after_kpi`, `capability_matrix`, `page_header`, `use_case_cards` | FR-002/003/005 |
| PC2-2 | Seed ≥1 solution + 1 industry + 1 case (≥2 KPI) | AC-B6 |
| PC2-3 | Case publish: checklist chặn nếu &lt;2 before/after | AC-B6 |
| PC2-4 | Platform NavigationMenu header/footer | — |
| PC2-5 | Publish → `revalidatePath` / tag corporate (&lt;2 phút) | AC-P1 |
| PC2-6 | Rollback API + UI Approver | AC-P3 |
| PC2-7 | Capability matrix peer label per Q3 | Legal |
| PC2-8 | OpenAPI full + Bruno + runbook complete | — |
| PC2-9 | `scripts/e2e-platform-cms.sh` (full GA) | DoD §17 |
| PC2-10 | Migrate Page `owner_type` + PlatformSite table | **done** (dual-write interim SF) |
| PC2-11 | Staging `webcom_staging` optional | Q4 |
| PC2-12 | Update `docs/04` §9r status → **shipped GA** | — |

### 7.3. Exit CORP-CMS-2 = **GA Platform CMS**

Checklist Spec §17 + AC-P* + AC-UI* + AC-B1…B10.

### 7.4. Rollback CORP-CMS-2

Flag off; nav fallback hardcode SiteChrome.

---

## 8. CORP-CMS-3 — Backlog (Tuần 6+ · không chặn GA)

| ID | Task | Priority |
|---|---|---|
| PC3-1 | `resource_list` + `gated_form` → lead → unlock | Should | **done** |
| PC3-2 | `tour_steps` interactive | Should | **done** |
| PC3-3 | `roi_assumptions` + disclaimer | Should | **done** |
| PC3-4 | Locale `en` / `webcom_en` | Could | **done** (EN seed + `/en` · `/en/pricing`) |
| PC3-5 | Schedule publish | Could | **done** (`publish_at` + flush) |
| PC3-6 | Page A/B | Could | **done** (admin panel + corporate hero assign) |

---

## 9. Ma trận truy vết Spec → Wave

| Spec AC | Wave tối thiểu |
|---|---|
| AC-P2, P5, P7 nền | CORP-CMS-0 |
| AC-P1, P4, P6, P8 | CORP-CMS-1 (P1 cứng ở CMS-2 nếu revalidate) |
| AC-P3 | CORP-CMS-2 |
| AC-UI1…UI4, UI7 | CORP-CMS-1 |
| AC-UI5, UI6 | CORP-CMS-1 |
| AC-B1,B2,B4,B5,B7,B8,B9,B10 | CORP-CMS-1 |
| AC-B3, B6 | CORP-CMS-1 keys / CORP-CMS-2 case |
| FR-001 Homepage | CORP-CMS-1 |
| FR-006 Pricing + governance | CORP-CMS-1 |
| FR-002/003/005 | CORP-CMS-2 |
| FR-004 Lead ranh giới | CORP-CMS-1 (SLA CRM = Sales Ops song song) |

---

## 10. Lịch gợi ý (calendar)

| Tuần | Milestone | Demo PO |
|---|---|---|
| W0 | Day 0 audit + Q sign-off | Defaults §2 |
| W1 | CORP-CMS-0 done | Bruno publish stub |
| W2 | SectionStack homepage dual-path | Đổi headline live staging |
| W3 | Pricing + templates intro + checklist + e2e-1 | PMM visual sign-off |
| W4 | Solution + case types | 1 case before/after |
| W5 | Nav + revalidate + e2e full | **GA Go/No-Go** |
| W6+ | CORP-CMS-3 | Backlog |

---

## 11. E2E scripts

### 11.1. `e2e-platform-cms-0.sh`

1. Auth Approver + Editor  
2. Editor PUT draft → OK; Editor transition published → **403**  
3. Approver transition published → OK  
4. Public GET assert content  
5. Corporate `/` HTTP 200 với flag off  

### 11.2. `e2e-platform-cms-1.sh`

1. Publish homepage headline unique  
2. Public GET + (optional) curl HTML corp chứa headline  
3. GET `/templates` JSON/HTML vẫn có theme cards  
4. PUT CTA thiếu `cta_code` → 400  
5. Announce `ends_at` past → không render  

### 11.3. `e2e-platform-cms.sh` (GA)

Gộp 0+1 + case KPI gate + rollback + revalidate smoke.

---

## 12. Rollout VPS

| Bước | Hành động | Flag |
|---|---|---|
| 1 | migrate + seed PlatformSite/SF + roles | — |
| 2 | Deploy corporate + admin-api + admin-web | `FEATURE_PLATFORM_CMS=false` |
| 3 | Smoke e2e-0 trên VPS | false |
| 4 | PMM nạp/duyệt seed staging | staging site_key |
| 5 | Bật flag **staging** → UAT 48h | true staging |
| 6 | Bật flag **prod** giờ thấp điểm | true prod |
| 7 | Monitor 5xx corp/admin 24h; dashboard CTA events | — |

**Hot rollback:** `FEATURE_PLATFORM_CMS=false` + restart `webecom-corporate`.

---

## 13. RACI

| Hạng mục | BE | FE Corp | FE Admin | QA | PMM | Sales Ops | TL | Legal |
|---|---|---|---|---|---|---|---|---|
| Schema/API | A/R | C | C | I | I | I | A | I |
| SectionStack + public UI | C | A/R | C | C | C | I | I | I |
| Builder platform | C | C | A/R | C | C | I | I | I |
| Seed copy / CTA | I | C | I | I | A/R | C | I | C |
| Lead SLA CRM | I | I | I | I | I | A/R | I | I |
| Capability matrix | I | C | I | I | R | I | I | A |
| e2e / runbook | C | C | C | A/R | I | I | I | I |
| Go/No-Go GA | C | C | C | R | R | C | A | C |

---

## 14. Rủi ro & mitigation (thực thi)

| Rủi ro | Mitigation | Owner |
|---|---|---|
| Interim SF lẫn merchant tools | Prefix `sf_platform_*`; ẩn khỏi theme install UI | BE |
| Visual regression homepage | Screenshot compare + PMM sign-off trước flag prod | FE+PMM |
| Ajv quá chặt chặn publish | Starter hợp lệ; error UX rõ field | FE Admin |
| GTM không nhận event | Consent gate + e2e manual checklist AC-B10 | FE Corp |
| Migrate owner_type tuần 5 rủi ro | Feature dual-read owner; e2e storefront trước/sau | BE |
| Scope creep CORP-CMS-3 vào GA | Gate cứng: GA = Exit §7.3 only | PO/TL |

---

## 15. Definition of Done (nhắc Spec §17)

GA khi:

- [x] Exit CORP-CMS-2 (§7.3)  
- [x] AC-P*, AC-UI*, AC-B1…B10 (P3 rollback · P1 revalidate · B6 case gate)  
- [x] e2e-platform-cms.sh (GA)  
- [x] Runbook + OpenAPI  
- [x] `docs/04` §9r = shipped GA  
- [ ] PO Go từ demo funnel: templates → trial CTA → pricing tách lớp (UAT)  

---

## 16. Kickoff checklist (in ngày)

1. [ ] Merge plan v2.0 + Spec v1.2  
2. [ ] A7 sign-off defaults §2  
3. [ ] Tạo epic `CORP-CMS` + issues PC0-*  
4. [ ] Assign BE/FE/QA  
5. [ ] Bắt đầu PC0-1 ADR  

**Supersede:** Plan v1.x trong file này được thay bởi **v2.0**.
