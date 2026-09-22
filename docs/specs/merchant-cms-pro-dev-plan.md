# Kế hoạch DEV — Merchant CMS Pro (toàn bộ SRS v2.1)

| Thuộc tính | Nội dung |
|---|---|
| Mã | DEVPLAN-CMS-PRO-2.1 |
| Ngày | 2026-09-22 |
| SRS | [`merchant-cms-pro-srs.md`](./merchant-cms-pro-srs.md) |
| Plan sản phẩm | [`merchant-cms-pro-implementation-plan.md`](./merchant-cms-pro-implementation-plan.md) |
| Phạm vi | **Toàn bộ FR-CMS-PRO-001…018** + NFR + 8 industry presets + UAT |
| Thời lượng | **13 sprint × 1 tuần** (hoặc 6.5 sprint bi-weekly) ≈ **11–13 tuần lịch** |
| Đội | BE · FE-Admin · FE-SF · QA · PO (0.25) |
| Repo | `WEBSITEECOM` monorepo · deploy VPS `/var/www/webecom` |

---

## 0. Mục tiêu DEV

Ship CMS Pro trên VPS sao cho:

1. Merchant cấu hình được **mọi archetype** (commerce / lead_gen / booking / content).  
2. **Website bán hàng** đủ PLP → PDP → ATC → cart → checkout content.  
3. **Lead-gen** đủ form + floating + thank-you.  
4. **8 industry presets** khác nhau thật.  
5. GoLive + flags + e2e + guide VI.

**Không làm trong plan này:** CRM webhook bắt buộc · booking calendar đầy đủ · Webflow parity · sửa Core pricing engine.

---

## 1. Ma trận phủ SPEC → Sprint

| FR | Tên | Sprint chính | Sprint phụ |
|---|---|---|---|
| 001 | Site Settings | S1–S2 | S3 (popup/social) |
| 002 | Brand Kit UX | S2 | — |
| 003 | Builder + registry core | S2–S4 | S6 parity CI |
| 004 | Pages / SEO / thank-you | S3 | S5 REG pages |
| 005 | Nav + Media | S3–S4 | S9 mega menu |
| 006 | Lead capture | S1–S2 | S12 export |
| 007 | ThemePackage + compatibility | S6–S7 | — |
| 008 | GoLive archetype | S3 | S9 commerce checks |
| 009 | Roles + audit | S12 | — |
| 010 | Runtime merge | S1 | S4–S5 commerce_ux |
| **011** | Commerce settings | **S3–S4** | S8 P1 fields |
| **012** | Home merch | **S5–S6** | — |
| **013** | PLP CMS | **S7–S8** | — |
| **014** | PDP CMS | **S7–S8** | — |
| **015** | Cart/Checkout content | **S4** + **S8** | — |
| **016** | Promo landing | **S9** | — |
| **017** | Commerce IA | **S9** | S7 nav starter |
| **018** | Analytics hooks | **S9** | — |
| G3 presets×8 | Industry packs | S6–S7 | S10 polish |
| NFR / e2e / docs | — | mỗi sprint + S11–S13 | — |

---

## 2. Lịch sprint (13 tuần)

```text
S1   Foundation SiteSettings + runtime + archetype gate + lead API
S2   Settings UI P0 + Brand + lead_form SF + Builder allowlist
S3   Pages REG + GoLive P0 + Lead popup/social + ★ Commerce settings start
S4   ★ Mini-cart / empty cart / announcement / coupon flags / policy links
S5   ★ Home merch sections + product picker + flash/ATC
S6   Section parity CI (core) + 4 presets commerce
S7   4 presets lead/content + compatibility + PLP banner start
S8   ★ PLP filters/sort + PDP layout + cart cross-sell
S9   ★ Promo landing + mega menu + GoLive commerce + analytics toggles
S10  Booking/content polish + map_stores/team + gap P1
S11  Hardening + perf + e2e full matrix
S12  Roles/audit + leads CSV + settings history
S13  UAT VPS + docs guide + GA flags + buffer
```

---

## 3. Backlog theo sprint (ticket DEV)

### Quy ước

- **SP** = story point (1≈0.5–1 ngày eng).  
- Owner mặc định: BE / FEA (admin-web) / FES (storefront) / QA.  
- Mỗi sprint: **migrate→API→UI→SF→e2e→flag** nếu có surface mới.  
- PR nhỏ; không commit `.env` secret.

---

### S1 — Foundation (FR-001, 006, 010) · ~21 SP

| Ticket | Mô tả | FR | Owner | SP |
|---|---|---|---|---|
| DEV-001 | Prisma `SiteSettings` + migration | 001 | BE | 3 |
| DEV-002 | `GET/PUT …/site-settings` + `expected_version` + Ajv | 001 | BE | 5 |
| DEV-003 | Merge `site_settings` vào `getRuntime` | 010 | BE | 3 |
| DEV-004 | Archetype enum + cart gate SF (`lead_gen` ẩn giỏ) | 001/010 | FES | 3 |
| DEV-005 | Public `POST …/leads` + validate phone VN + consent | 006 | BE | 3 |
| DEV-006 | Flags `.env.example` + systemd note `INTERNAL_API_URL` | NFR | BE | 1 |
| DEV-007 | Nav stub **Thiết lập website** | 001 | FEA | 1 |
| DEV-008 | `e2e-cms-pro-s1.sh` | — | QA | 2 |

**Exit S1:** API settings + runtime + lead submit + cart gate.

---

### S2 — Settings UI + Brand + lead_form (FR-001/002/003/006) · ~26 SP

| Ticket | Mô tả | FR | Owner | SP |
|---|---|---|---|---|
| DEV-010 | `/website/settings` tabs: Archetype, Identity, Header, Floating, Privacy | 001 | FEA | 8 |
| DEV-011 | Media picker logo/favicon/OG | 001/005 | FEA+BE | 3 |
| DEV-012 | Brand Kit panel (màu/font) trong Settings | 002 | FEA | 3 |
| DEV-013 | SF: CSS vars BrandKit + header CTA + floating hotline/zalo | 002/010 | FES | 5 |
| DEV-014 | Section `lead_form` registry + SF render + thank-you redirect | 003/006 | BE+FES | 5 |
| DEV-015 | Builder: chỉ add type ∈ supports | 003 | FEA | 2 |

**Exit S2:** Merchant đổi logo/CTA/hotline; submit lead trên SF.

---

### S3 — Pages + GoLive + Settings P1 + Commerce start (FR-004/008/011) · ~28 SP

| Ticket | Mô tả | FR | Owner | SP |
|---|---|---|---|---|
| DEV-020 | Pages create static + SEO panel + promote | 004 | FEA+BE | 5 |
| DEV-021 | Starter `dang-ky` / `thank-you` trong package | 004/007 | BE | 2 |
| DEV-022 | Lead popup + social links settings + SF | 001 | FEA+FES | 5 |
| DEV-023 | GoLive checks identity/floating/lead (lead_gen B) | 008 | BE | 3 |
| DEV-024 | Schema `commerce` group P0 fields (Ajv) | 011 | BE | 3 |
| DEV-025 | Settings tab **Bán hàng** (P0 fields UI) | 011 | FEA | 5 |
| DEV-026 | catalog_card settings (ratio, price, primary_cta) | 001/011 | FEA+FES | 3 |
| DEV-027 | e2e S3 | — | QA | 2 |

**Exit S3:** REG flow; tab Bán hàng lưu được; GoLive lead_gen.

---

### S4 — Commerce UX shell (FR-011/015/010) · ~24 SP

| Ticket | Mô tả | FR | Owner | SP |
|---|---|---|---|---|
| DEV-030 | SF mini-cart + cart count theo settings | 011/015 | FES | 5 |
| DEV-031 | Empty cart title/CTA | 015 | FES | 2 |
| DEV-032 | Announcement bar + schedule TZ VN | 011 | FES | 3 |
| DEV-033 | Compare-at price flag trên card/PDP | 011 | FES | 2 |
| DEV-034 | Coupon entry show/hide cart+checkout | 011/015 | FES | 2 |
| DEV-035 | checkout_policy_links | 015 | FES | 2 |
| DEV-036 | sticky_atc_mobile setting (wire PDP) | 011/014 | FES | 3 |
| DEV-037 | Flag `cms.commerce_merch.v1` | 011 | BE | 1 |
| DEV-038 | e2e TC-C01…C03 | — | QA | 4 |

**Exit S4:** Shop shell P0 trên themes host.

---

### S5 — Home merchandising (FR-012/003) · ~28 SP

| Ticket | Mô tả | FR | Owner | SP |
|---|---|---|---|---|
| DEV-040 | Registry: flash_sale, promo_banner, bundle_offer, hero_slider… | 012 | BE | 5 |
| DEV-041 | Product/collection search API cho picker | 012 | BE | 5 |
| DEV-042 | Builder inspector product picker | 012/003 | FEA | 5 |
| DEV-043 | SF renderers: featured, product_grid, flash, promo, trust | 012 | FES | 8 |
| DEV-044 | ends_at → hide/ended | 012 | FES | 2 |
| DEV-045 | Beauty home starter merch | 007/012 | BE | 2 |
| DEV-046 | e2e ATC từ featured | — | QA | 1 |

**Exit S5:** Home flash + ATC path.

---

### S6 — Parity core + presets commerce ×4 (FR-003/007) · ~26 SP

| Ticket | Mô tả | FR | Owner | SP |
|---|---|---|---|---|
| DEV-050 | CI gate: registry type ↔ SF component map | 003 | BE | 5 |
| DEV-051 | Renderers còn thiếu core: intro_stats, services, testimonials, gallery, faq… | 003 | FES | 8 |
| DEV-052 | Presets: beauty, fashion, home, electronics (`commerce`) | 007 | BE | 5 |
| DEV-053 | Install copy site_settings + home + nav | 007 | BE | 3 |
| DEV-054 | Demo `?demo=` assert khác headline | 007 | QA | 2 |
| DEV-055 | Builder responsive tabs D/T/M | 003 | FEA | 3 |

**Exit S6:** 4 shop presets; CI parity core on.

---

### S7 — Presets lead/content + PLP start (FR-007/013) · ~24 SP

| Ticket | Mô tả | FR | Owner | SP |
|---|---|---|---|---|
| DEV-060 | Presets: realestate, health, b2b (`lead_gen`) + agency (`content`) | 007 | BE | 5 |
| DEV-061 | Compatibility-check warnings đổi theme | 007 | BE | 3 |
| DEV-062 | `/website/collections` list + banner/SEO edit | 013 | FEA+BE | 8 |
| DEV-063 | SF collection banner + SEO meta | 013 | FES | 3 |
| DEV-064 | plp_default_sort + page_size wire | 011/013 | FES | 3 |
| DEV-065 | e2e 2 industry archetype diff | — | QA | 2 |

**Exit S7:** 8 presets; collection merch MVP.

---

### S8 — PLP filters + PDP + cart content (FR-013/014/015) · ~30 SP

| Ticket | Mô tả | FR | Owner | SP |
|---|---|---|---|---|
| DEV-070 | PLP filters UI theo `plp_filters_enabled` | 013 | FES | 5 |
| DEV-071 | Empty PLP copy | 013 | FES | 1 |
| DEV-072 | quick_add_plp (simple SKU) | 011/013 | FES | 3 |
| DEV-073 | PDP template: gallery, buybox, tabs, trust, sticky ATC | 014 | FES | 8 |
| DEV-074 | Related products (same_collection / manual) | 014 | BE+FES | 5 |
| DEV-075 | sold_out_behavior | 011/014 | FES | 2 |
| DEV-076 | Cart cross-sell + mini-cart copy polish | 015 | FES | 3 |
| DEV-077 | Order thank-you content settings | 015 | FEA+FES | 2 |
| DEV-078 | e2e UC-13 full | — | QA | 1 |

**Exit S8:** PLP→PDP→ATC→cart ổn định.

---

### S9 — Promo + IA + GoLive commerce + analytics (FR-016/017/018/008) · ~24 SP

| Ticket | Mô tả | FR | Owner | SP |
|---|---|---|---|---|
| DEV-080 | Page template `landing_promo` + countdown | 016 | FEA+FES | 5 |
| DEV-081 | Coupon strip + schedule publish | 016 | BE+FES | 3 |
| DEV-082 | Mega menu: collection + featured picker | 017/005 | FEA+FES | 5 |
| DEV-083 | Commerce IA starter nav trong presets | 017 | BE | 2 |
| DEV-084 | GoLive commerce blocking (SP, payment, ATC, merch home) | 008 | BE | 3 |
| DEV-085 | Analytics surface toggles + docs emit map | 018 | BE+FEA | 3 |
| DEV-086 | promo_popup settings (≠ lead popup) | 011 | FEA+FES | 2 |
| DEV-087 | e2e GoLive commerce fail/pass | — | QA | 1 |

**Exit S9:** Commerce DoD gần đủ; promo landing OK.

---

### S10 — Gap P1/P2 chọn lọc (FR-003/005/booking) · ~20 SP

| Ticket | Mô tả | FR | Owner | SP |
|---|---|---|---|---|
| DEV-090 | map_stores + team_cards + blog_list render | 003 | FES | 5 |
| DEV-091 | Media usage warning khi xóa | 005 | BE | 3 |
| DEV-092 | Navigation footer columns polish | 005 | FEA | 2 |
| DEV-093 | booking archetype: CTA + form link (không calendar) | AR | FEA+FES | 3 |
| DEV-094 | free_shipping_threshold / cart_trust_badges copy | 011 | FES | 2 |
| DEV-095 | FBT stub flag off-default | 014 | FES | 2 |
| DEV-096 | Buffer / bugfix S1–S9 | — | all | 3 |

---

### S11 — Hardening + perf + e2e matrix · ~18 SP

| Ticket | Mô tả | Owner | SP |
|---|---|---|---|
| DEV-100 | e2e-cms-pro-full.sh (lead + commerce + presets) | QA | 5 |
| DEV-101 | LCP PLP/PDP spot-check + ảnh hero | FES | 3 |
| DEV-102 | Conflict 409 settings/builder UX toast | FEA | 2 |
| DEV-103 | Security: public lead rate-limit | BE | 3 |
| DEV-104 | Fix CI flaky parity | BE | 2 |
| DEV-105 | Staging deploy rehearsal VPS | BE | 3 |

---

### S12 — Ops / governance (FR-009/006) · ~16 SP

| Ticket | Mô tả | FR | Owner | SP |
|---|---|---|---|---|
| DEV-110 | Leads list + CSV export | 006 | FEA+BE | 5 |
| DEV-111 | Approver policy flag (optional) | 009 | BE+FEA | 3 |
| DEV-112 | Audit log settings/page/archetype | 009 | BE | 3 |
| DEV-113 | SiteSettings version history / rollback last | 001 | BE | 3 |
| DEV-114 | Preview token regression | 009 | QA | 2 |

---

### S13 — UAT + docs + GA · ~16 SP

| Ticket | Mô tả | Owner | SP |
|---|---|---|---|
| DEV-120 | UAT beauty/fashion/fnb (commerce TC-C01…10) | QA+PO | 5 |
| DEV-121 | UAT realestate lead (TC01–04 SPEC KT) | QA | 2 |
| DEV-122 | Guide VI: Thiết lập website + Bán hàng + phân biệt /products | PO+FEA | 3 |
| DEV-123 | Runbook `merchant-cms-pro.md` + OpenAPI/Bruno | BE | 3 |
| DEV-124 | Prod flags GA + smoke VPS | BE | 2 |
| DEV-125 | Buffer hotfix | all | 1 |

**Exit S13 = GA:** SRS §11 DoD đủ checklist.

---

## 4. Phụ thuộc kỹ thuật

```text
DEV-001/002 ──► DEV-003/010/024
DEV-005 ──► DEV-014
DEV-024/025 ──► DEV-030…038 (S4)
DEV-041 ──► DEV-042/043 (S5)
DEV-050 ──► merge blockers S6+
DEV-062 ──► DEV-070 (S8)
DEV-073 ──► DEV-078 UC-13
DEV-084 ──► DEV-120 UAT
```

**Hard dependency ngoài CMS:** payment + shipping config (Core) phải có trên tenant demo trước S9 GoLive commerce.

---

## 5. Định nghĩa xong từng FR (dev DoD)

| FR | Done khi… |
|---|---|
| 001 | Settings CRUD + SF đọc + e2e logo/CTA |
| 002 | Đổi màu → CSS var SF |
| 003 | Core sections render + CI map; commerce types khi flag on |
| 004 | Tạo page + SEO + promote |
| 005 | Nav header/footer + media alt; usage warn S10 |
| 006 | Public lead + admin list/CSV S12 |
| 007 | Install 8 presets; compatibility warnings |
| 008 | Checklist lead + commerce blocking đúng |
| 009 | Audit + optional approver |
| 010 | Runtime đủ fields + mini-cart gate |
| 011 | Tab Bán hàng P0 + P1 fields S8 |
| 012 | Home merch + picker + ATC |
| 013 | Collections merch + PLP sort/filter |
| 014 | PDP layout sticky ATC related |
| 015 | Empty cart + policy + cross-sell |
| 016 | landing_promo countdown |
| 017 | Mega menu merch |
| 018 | Toggles + doc event map |

---

## 6. Phân công & capacity

| Role | Focus sprint | Capacity/tuần |
|---|---|---|
| BE | API, schema, GoLive, presets, picker | ~13–15 SP |
| FEA | Settings, Builder, collections admin | ~13–15 SP |
| FES | Runtime, PLP/PDP/cart, sections | ~13–15 SP |
| QA | e2e scripts + UAT | ~8 SP |
| PO | AC, copy VI, UAT sign | 0.25 FTE |

Total plan ~ **~300 SP** ≈ 13 tuần × ~23 SP/tuần đội.

---

## 7. Environments & ship

| Env | Việc |
|---|---|
| Local | `pnpm` filter admin-api/web + storefront |
| Staging VPS | mỗi exit sprint smoke `/console` + `themes` |
| Prod VPS | S13 only; flags on dần |

Deploy pattern hiện có: rsync → build → systemd restart `webecom-admin-api|admin-web|storefront`.

---

## 8. Rủi ro DEV & buffer

| Rủi ro | Buffer |
|---|---|
| Section parity phình | S6 CI cắt scope P2 types |
| PDP phức tạp variant | S8 chỉ simple+variant cơ bản |
| Payment chưa sẵn tenant | Mock GoLive check / seed |
| Scope creep Haravan | PO reject field ngoài SRS |

---

## 9. Checklist kickoff (tuần 0)

- [ ] PO chốt bảng industry × archetype (SRS §7.3)  
- [ ] Tạo board: epics S1–S13 + tickets DEV-xxx  
- [ ] BE mở PR DEV-001/002  
- [ ] FE gap table SectionStack vs registry  
- [ ] QA skeleton `scripts/e2e-cms-pro-s1.sh`  
- [ ] Không đụng `/platform/*` trong epic này  

---

## 10. Liên kết tài liệu

| Doc | Vai trò |
|---|---|
| `merchant-cms-pro-srs.md` | Yêu cầu / AC sản phẩm |
| `merchant-cms-pro-implementation-plan.md` | Wave sản phẩm PRO/PRO-C |
| **DEVPLAN này** | Ticket · sprint · owner · phủ toàn SPEC |
| `shared-cms-themepackage.md` | Engine không viết lại |
| `05_Huong_dan…` | Cập nhật S13 |

---

*Hết kế hoạch DEV toàn SPEC Merchant CMS Pro v2.1.*
