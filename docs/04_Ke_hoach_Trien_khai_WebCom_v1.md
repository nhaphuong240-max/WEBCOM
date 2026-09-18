# Kế hoạch triển khai chi tiết — Website Commerce Platform (WebCom)

## PTT Commerce Intelligence OS

| Thuộc tính | Nội dung |
|---|---|
| Phiên bản | 1.0 |
| Trạng thái | Implementation Plan — Ready for execution |
| Phạm vi | **Website Commerce Platform (WebCom)** + phụ thuộc Commerce Core tối thiểu |
| Tham chiếu | SRS Master v5.1 · Kiến trúc hệ thống v3.0 · Mockup HTML `mockups/` |
| Đối tượng | PO, Tech Lead, FE/BE/QA/DevOps, Design, AI Ops |
| Mục tiêu | Go-live merchant bán được → Platform tự xây & governance → Analytics/AI conversion — **thắng Haraweb về conversion + publish an toàn** |

---

# 0. Tóm tắt điều hành

## 0.1. Định nghĩa WebCom trong chương trình PTT

```text
WebCom = product line Website Commerce
├── Corporate GTM (bán PTT)          → mockup 01
├── Onboarding Wizard                → mockup 02
├── Template Marketplace             → mockup 04
├── Theme Library / Publish          → mockup 05, 07
├── Visual Site Builder              → mockup 06
├── Merchant Storefront / PWA        → mockup 08
├── Website Analytics                → mockup 09
└── (phụ thuộc) Cart/Checkout/OMS/Inventory/Payment từ Commerce Core
```

WebCom **không** thay toàn bộ OS. Nó gắn chặt:

| Phụ thuộc bắt buộc | Lý do |
|---|---|
| Tenant / IAM / Brand | Multi-storefront, RBAC publish |
| PIM / Price / Promo | Catalog PDP đúng nguồn |
| Inventory reservation | Checkout không oversell |
| Cart / Checkout / OMS / Payment / Shipping | Đơn web thật |
| Customer / Consent | Account, tracking, journey |

## 0.2. Nguyên tắc triển khai

1. **Modular monolith first** (NestJS) — `packages/website-commerce`, `cart-checkout`; tách service khi có số liệu.
2. **Schema-driven theme/page** — JSON versioned là truth; không raw HTML làm nguồn nghiệp vụ.
3. **Mockup = UI acceptance baseline** — pixel-intent + flow; không hard-code mock data vào production path.
4. **Parity trước, moat sau:** bán được (Foundation) → builder/governance (Platform) → margin analytics + AI (Intelligence).
5. **Go-live gate cứng** — checklist fail = không publish (trừ waiver có audit).

## 0.3. Timeline tổng (WebCom-focused)

| Phase | Tên | Thời lượng | Outcome |
|---|---|---|---|
| W0 | Foundation & scaffolding | 3 tuần | Repo, IAM, design system, CI, empty shells |
| W1 | Commerce Core tối thiểu cho Web | 6 tuần | PIM/price/stock/cart/checkout/order cơ bản |
| W2 | Website Foundation (bán được) | 8 tuần | Storefront SSR + checkout + SEO + domain |
| W3 | Website Platform (tự xây) | 10 tuần | Template, Brand Kit, Builder, Theme version, Go-live |
| W4 | Analytics & Conversion Intel | 6 tuần | Funnel, CWV, margin-by-page, AI assist (guardrail) |
| W5 | Hardening & scale | 4 tuần | Perf, DR, headless API, agency workflow |

**Tổng lịch định hướng:** ~37 tuần (~9 tháng) cho WebCom đạt mức “thắng Haraweb” ở governance + conversion measurability.  
Có thể **song song W1∥W0** và **W2 sớm trên API stub** nếu đội đủ người.

```text
W0 ──┬── W1 (Core for Web)
     └── Design system / mockup → React
            │
            ▼
           W2 Storefront bán được  ──► Soft launch Pilot
            │
            ▼
           W3 Platform (Template/Builder/Go-live) ──► GA Website Platform
            │
            ▼
           W4 Analytics + AI assist ──► Differentiation live
            │
            ▼
           W5 Harden / Headless / Agency
```

---

# 1. Mapping Mockup → Epic → FR SRS

| Mockup | Epic WebCom | FR chính (SRS) | Phase |
|---|---|---|---|
| `01-corporate-gtm.html` | Corporate GTM site | FR-CORP-* | W2 song song / W5 polish |
| `02-onboarding.html` | Merchant onboarding wizard | FR-WCP-001, 002, 004 | W3 |
| `03-admin-command-center.html` | Admin shell + web entry | FR-ORG, IAM (shared) | W0–W1 |
| `04-template-marketplace.html` | Template Store + AI Match | FR-WCP-002 | W3 |
| `05-theme-library.html` | Theme version/staging/publish | FR-WCP-003, BR-015/016/017 | W3 |
| `06-visual-site-builder.html` | Visual Site Builder | FR-WCP-005, 006, 007 | W3 |
| `07-golive-checklist.html` | Go-live governance | FR-WCP-014, BR-025 | W3 |
| `08-storefront-beauty.html` | Storefront mobile-first | FR-WCP-008–011 | W2 |
| `09-website-analytics.html` | Web analytics + CWV | FR-WCP-011, FR-RI (page margin) | W4 |
| `10–12` | Ngoài WebCom thuần (Social/RI/Creator) | Tích hợp event/attribution | Sau / song song OS |

---

# 2. Kiến trúc triển khai WebCom (cắt từ Arch v3)

## 2.1. Applications sẽ ship

| App | Stack | Mockup ref | Trách nhiệm |
|---|---|---|---|
| `apps/corporate-web` | Next.js SSR/ISR | 01 | GTM, lead form → CRM |
| `apps/admin-web` | Next.js | 02–07, 09 (+ shell 03) | Website Commerce Admin |
| `apps/storefront-web` | Next.js SSR/ISR/PWA | 08 | Merchant public shop |
| `apps/admin-api` | NestJS modular | — | Domain APIs |
| `apps/storefront-bff` | NestJS / Next RH | — | Aggregate read cho storefront |
| `apps/worker` | NestJS + Temporal workers | — | Publish, revalidate, checklist jobs |
| `apps/ai-gateway` | FastAPI (phase W4) | — | Theme match, copy assist |

## 2.2. Module backend ưu tiên WebCom

```text
packages/
├── shared-kernel/
├── iam/
├── organization/          # brand, storefront config
├── catalog/
├── pricing-promotion/
├── website-commerce/      # ★ theme, page, brand kit, publish, checklist
├── cart-checkout/         # ★
├── oms/                   # order create from checkout
├── inventory/             # reservation
├── payment-finance/       # payment intent / COD
├── fulfillment-shipping/  # quote
├── customer-crm/          # account, consent
├── notification/
└── audit/
```

## 2.3. Data stores (MVP WebCom)

| Store | Dùng cho |
|---|---|
| PostgreSQL | Storefront, Theme, Page, BrandKit, Cart, Order, PublishJob, Checklist |
| Redis | Cart session, locks reservation, rate limit, ISR tag hints |
| Object storage + CDN | Media, theme packages, Brand Kit assets |
| OpenSearch | Product search (W2+) |
| ClickHouse | Storefront events (W4) |
| Temporal | PublishThemeWorkflow, GoLiveValidationWorkflow |
| Redpanda/Kafka | Outbox events catalog/order/website (từ W2 nhẹ / W4 đủ) |

## 2.4. Render & publish pipeline (bất biến)

```text
BrandKit + ThemeVersion + PageVersion JSON
→ Storefront Renderer (Next.js)
→ CDN / ISR cache tags
→ Publish: validate → backup → switch pointer → purge → health → rollback
```

---

# 3. Tổ chức đội & RACI (định hướng)

| Vai trò | Số lượng gợi ý | Trách nhiệm chính |
|---|---|---|
| Product Owner / BA | 1 | Backlog WebCom, AC theo mockup+SRS |
| Tech Lead | 1 | ADR, modular boundaries, review |
| FE Admin/Builder | 2 | Admin, Builder, Marketplace UI |
| FE Storefront | 2 | SSR storefront, PDP, checkout UX |
| BE Commerce/Web | 2–3 | website-commerce, cart-checkout, APIs |
| Design (UI/UX) | 1 | Token từ mockup → Figma → code |
| QA | 1–2 | E2E checkout, publish, CWV |
| DevOps | 1 | CI/CD, CDN, env, observability |
| AI (W4) | 0.5–1 | Theme match, copy assist, gateway |

**RACI nhanh:** PO = A cho scope · Tech Lead = A cho kiến trúc · FE/BE = R · QA = R test gate · Design = C UI.

---

# 4. Phase W0 — Foundation & Scaffolding (3 tuần)

## Mục tiêu
Repo chạy được, design system từ mockup, auth tenant, admin/storefront shell trống.

## Deliverables

| ID | Deliverable | Done when |
|---|---|---|
| W0-D1 | Monorepo (pnpm/turborepo): apps + packages | `dev` chạy admin + storefront + api |
| W0-D2 | NestJS modular skeleton + Prisma/Drizzle + Postgres | Health check + tenant middleware |
| W0-D3 | Keycloak/OIDC hoặc auth provider dev | Login admin, JWT tenant claims |
| W0-D4 | Design tokens từ `ptt-design.css` → Tailwind/CSS vars | Storybook 10+ components |
| W0-D5 | CI: lint, typecheck, unit, container build | PR gate xanh |
| W0-D6 | OTel + Sentry baseline | Trace request mẫu |
| W0-D7 | Map mockup → route map trong admin | Menu khớp 02–07, 09 |

## Tasks chi tiết

1. Khởi tạo monorepo, ESLint, Prettier, Husky.
2. Tạo `packages/shared-kernel` (Result, Id, errors, pagination).
3. IAM middleware: `tenant_id`, `actor_id`, `correlation_id`.
4. Port tokens: `--ink`, `--accent`, Syne + Be Vietnam Pro.
5. Admin shell layout (sidebar từ mockup 03) — link placeholder.
6. Environments: local / dev / staging.
7. ADR xác nhận: modular monolith, Next.js storefront, schema-driven theme.

## Exit criteria
- [x] Developer mới clone → chạy được trong ≤ 1 ngày (README).
- [x] Không merge main nếu CI fail (workflow `.github/workflows/ci.yml`).
- [x] Tenant isolation smoke: header/`JWT` tenant A ≠ B (`/api/v1/tenancy/context`).
- [ ] Postgres migrate trên máy có Docker (SQL sẵn trong `prisma/migrations`).
- [ ] OTel + Sentry baseline (W0-D6) — deferred nhẹ, làm đầu W1 nếu cần.

**Trạng thái scaffold (2026-09):** monorepo + admin-api/web + storefront + shared-kernel/ui + ADR 001/005/010 đã có. Design system qua `/design-system` (Storybook đầy đủ có thể bổ sung sau).

---

# 5. Phase W1 — Commerce Core tối thiểu cho Web (6 tuần)

## Mục tiêu
Đủ API để storefront bán 1 SKU end-to-end (chưa đẹp theme).

## Scope Must

| Module | Chức năng tối thiểu | BR |
|---|---|---|
| Organization | Brand, 1 storefront draft | — |
| PIM | Product/variant/SKU/media | BR-001 |
| Pricing | 1 price list + basic % discount | BR-025 promo snapshot về sau |
| Inventory | On-hand, available, reserve/release | BR-002, BR-003 |
| Cart | Add/update/remove, server price | BR-021 |
| Checkout | Guest, address, COD hoặc 1 payment | BR-021 |
| OMS | Create CONFIRMED → simple states | BR-005 (phần) |
| Customer | OTP/password basic, consent flag | BR-020 |
| Audit | Order/payment/stock writes | — |

## Deliverables

| ID | Deliverable |
|---|---|
| W1-D1 | API OpenAPI: catalog, cart, checkout, orders |
| W1-D2 | Idempotency key trên checkout/payment |
| W1-D3 | Reservation + Redis lock demo |
| W1-D4 | Admin CRUD product/stock thô |
| W1-D5 | Postman/Bruno collection + contract tests |
| W1-D6 | Seed data brand **AURA Beauty** (khớp mockup 08) |

## Test plan W1
- Checkout 2 lần cùng idempotency → 1 order.
- Confirm khi available = 0 → reject.
- Cancel → release reserved.
- Giá client gửi sai → server recalculate.

## Exit criteria
- [x] E2E API: browse → cart → checkout COD → order id (`scripts/e2e-w1.sh`).
- [x] NFR-PERF-003 hướng tới (order create P95 ≤ 2s nội bộ) đo baseline — chạy e2e local/VPS và ghi thời gian curl.

**Trạng thái W1 (2026-09):** schema commerce + modules Nest (catalog/inventory/cart/checkout/OMS/customer) + seed AURA + OpenAPI/Bruno + admin CRUD thô + storefront COD flow.

---

# 6. Phase W2 — Website Foundation: Merchant bán được (8 tuần)

> Tương SRS Phase 3 · Mockup `08` là AC UI chính · Soft launch Pilot.

## 6.1. Epics

### E-W2-01 Storefront runtime
- Next.js app multi-tenant host: `*.ptt.shop` + custom domain (staging).
- SSR/ISR PDP, collection, home từ **theme JSON tối thiểu** (1 theme built-in “Aura Commerce Lite”).
- Media CDN, responsive images.

### E-W2-02 Catalog UX
- Collection filter/sort, search (Postgres full-text trước, OpenSearch sau).
- PDP: gallery, variant, price, stock badge, sticky ATC (mobile), trust COD.
- Events: `view_item`, `add_to_cart` (collector API đơn giản → Postgres hoặc queue).

### E-W2-03 Cart & Checkout UX
- Cart drawer/page, voucher cơ bản.
- Checkout: guest, address VN, shipping quote 1–N carrier stub, COD + 1 cổng QR.
- Error/retry UX; funnel events.
- **Không tin client total.**

### E-W2-04 Customer account
- Login OTP/password; order list/tracking; consent banner.

### E-W2-05 SEO & tracking
- Meta, canonical, sitemap, robots, Product schema, OG.
- GTM/GA config, Meta Pixel + CAPI stub với **consent gate**.

### E-W2-06 Domain & SSL
- Connect domain wizard; cert-manager / Cloudflare.
- Storefront states: Draft / Staging / Published / Maintenance.

### E-W2-07 Corporate GTM v1 (song song 50%)
- Implement `01-corporate-gtm.html` → `apps/corporate-web`.
- Lead form → CRM table + notify sales (email/Slack).
- Tab kênh + demo CTA.

## 6.2. Sprint breakdown gợi ý (8 × 1 tuần hoặc 4 × 2 tuần)

| Sprint | Focus | Mockup AC |
|---|---|---|
| S1 | Theme lite renderer + Home/Collection | 08 layout base |
| S2 | PDP + sticky ATC + variants | 08 PDP |
| S3 | Cart + checkout COD | 08 → flow mua |
| S4 | Payment QR + order confirmation | — |
| S5 | Account + consent + pixels | — |
| S6 | SEO schema + sitemap + domain | — |
| S7 | Mobile polish + CWV baseline measure | 08 mobile |
| S8 | Pilot harden + Corporate GTM MVP | 01 |

## 6.3. Data model ship W2

`Storefront`, `Theme` (1 built-in), `ThemeVersion`, `Page`/`PageVersion` (home + templates hệ thống), `MediaAsset`, `NavigationMenu`, `StorefrontEvent` (raw).

## 6.4. Exit criteria (SRS 15.3 subset)
- [x] Merchant seed AURA: domain staging, mua được trên mobile (storefront routes + COD).
- [x] Desktop/mobile checkout idempotent (W1 Idempotency-Key + W2 UX).
- [x] SEO basic + consent trước pixel (`sitemap`/`robots`/Product JSON-LD + ConsentBanner).
- [x] LCP/INP/CLS đo được (chưa gate publish) — đo bằng Lighthouse/CWV tools trên staging.
- [ ] Soft launch ≥ 1–3 merchant nội bộ / design partner (ops).

**Trạng thái W2 (2026-09):** Theme/Page/Nav/Events/Voucher/Lead schema; Aura Commerce Lite runtime; storefront home/PDP/collection/cart/checkout/account; corporate lead form; admin theme+analytics.

---

# 7. Phase W3 — Website Platform: tự xây & governance (10 tuần)

> Tương SRS Phase 4 · **Moat vs Haraweb** · Mockup 02, 04, 05, 06, 07.

## 7.1. Epics

### E-W3-01 Brand Kit
- Tokens: color, font, spacing, logo, SEO defaults, legal snippets.
- Inheritance tenant → brand → storefront.
- Apply on theme install; version + rollback.
- **UI:** phần onboarding step 1 (mockup 02).

### E-W3-02 Template Marketplace
- Catalog template: industry, goal, scores (CVR/Mobile/SEO), feature matrix.
- License free/one-time; install → Theme Library.
- Live demo / sandbox iframe.
- Seed **30 playbook chất** (Beauty, Fashion, F&B, B2B…) — không đua 400 theme mỏng.
- **UI AC:** mockup 04.

### E-W3-03 AI Theme Matchmaker (rules + LLM optional)
- Input: industry, goal, channel, catalog size, style, budget.
- Output: ranked themes + playbook checklist.
- Có thể bắt đầu **rules engine**; LLM rank giải thích ở W4.
- **UI:** mockup 02 + panel 04.

### E-W3-04 Theme Library & versioning
- States: Installed / Draft / Staging / Published / Archived / Compat warn.
- **BR-015:** 1 Published / storefront.
- Clone, preview link, schedule, maintenance.
- Backup + rollback + diff section.
- **UI AC:** mockup 05.

### E-W3-05 Visual Site Builder
- Section/block library (tối thiểu list SRS 7.6).
- Drag/drop (dnd-kit), inline edit, responsive breakpoints.
- Autosave + optimistic concurrency + undo/redo.
- Inspector typography/spacing; AI copy drawer (**không auto-publish**).
- Preview staging token hết hạn.
- **UI AC:** mockup 06.

### E-W3-06 CMS pages & landing
- Static, blog, campaign landing; slug/redirect/canonical.
- Experiment stub (A/B flag) — full metrics ở W4.

### E-W3-07 Go-live Governance + Temporal
- Checklist groups khớp mockup 07 + SRS 7.15.
- Automated: schema validate, checkout smoke, SEO/tracking checks, CWV synthetic.
- PublishThemeWorkflow (Arch 7.4).
- Blocking fail → Publish disabled; waiver = approval + audit.
- **UI AC:** mockup 07.

### E-W3-08 Onboarding wizard
- Steps: Brand Kit → Import catalog → Theme Match → Payment/Shipping → Go-live.
- Deep link vào từng admin module.
- **UI AC:** mockup 02.

### E-W3-09 Agency delivery (Should)
- Submit → review → accept → install → staging → publish.
- Comment/annotation trên preview.

## 7.2. Sprint gợi ý (5 × 2 tuần)

| Sprint | Focus |
|---|---|
| S1 | Brand Kit + ThemeVersion model + Library UI |
| S2 | Builder MVP (hero, product grid, footer) + autosave |
| S3 | Marketplace + install/license + 10 templates đầu |
| S4 | Publish workflow Temporal + checklist + rollback |
| S5 | Onboarding wizard E2E + 20 templates thêm + agency preview |

## 7.3. Technical tasks then chốt

1. JSON Schema cho section/block; Ajv validate.
2. App block allowlist (no arbitrary script).
3. CDN tag invalidation map (Arch 8.3).
4. Compatibility validation khi theme update (BR-017).
5. Feature flags: `builder.v1`, `golive.gate`, `marketplace`.

## 7.4. Exit criteria
- [x] Merchant no-code: tạo storefront → Brand Kit → cài template → sửa builder → pass checklist → publish.
- [x] Rollback published < 5 phút thao tác (API `POST …/rollback` + Theme Library UI).
- [x] Fail Pixel consent hoặc LCP → không publish (`consent_gate`, `cwv_lcp` blocking; `GOLIVE_FORCE_FAIL_LCP=1` để test).
- [x] AC mockup 02/04/05/06/07 — admin routes Onboarding / Templates / Themes / Builder / Go-live.
- [x] GA Website Platform (public beta) — phase marker `W3` trên `/api/health`.

### W3 ship notes (MVP in-process)
- Temporal `PublishThemeWorkflow` → in-process `PublishJob` + checklist gate (FEATURE_GOLIVE_GATE).
- Seed **10 templates** playbook (Beauty/Fashion/F&B/B2B…).
- Feature flags: `FEATURE_BUILDER_V1`, `FEATURE_GOLIVE_GATE`, `FEATURE_MARKETPLACE` (default on).
- OpenAPI: `docs/openapi-w3.yaml` · Bruno: `docs/bruno/WebCom-W3.bru` · E2E: `scripts/e2e-w3.sh`.

---

# 8. Phase W4 — Analytics & Conversion Intelligence (6 tuần)

> Mockup 09 · SRS FR-WCP-011/012 · bắt đầu gắn margin page-level.

## 8.1. Epics

### E-W4-01 Event pipeline
- Storefront Event SDK → Consent gate → Collector → Redpanda → ClickHouse.
- Events chuẩn SRS (page_view → purchase, experiment_exposed…).

### E-W4-02 Website Analytics UI
- Funnel drop-off; revenue & **contribution** by landing (join order margins).
- Device CWV dashboard; regression alert post-publish.
- **UI AC:** mockup 09.

### E-W4-03 Publish health window
- Synthetic CWV + checkout canary sau publish; auto-rollback threshold.

### E-W4-04 AI assist (guardrailed)
- Theme match LLM explanation; builder headline variants; shopping Q&A draft.
- Tool Gateway; risk matrix; không commit price/refund.
- AI Gateway FastAPI + Qdrant knowledge (policy/FAQ/product).

### E-W4-05 Experiment framework
- A/B hero/CTA; audience; metric wiring vào ClickHouse.

## 8.2. Exit criteria
- [x] ≥ 95% storefront published có funnel tracked (Event SDK + page_view/view_item; seed + collector).
- [x] Page contribution hiển thị cho order web có cost allocation cơ bản (rate 42% assumed COGS).
- [x] AI actions high-risk 100% audit/approval path (`shopping_qa` → pending_approval).
- [x] Post-publish CWV regression tự mở incident / rollback policy (`health-window`; `FEATURE_AUTO_ROLLBACK`, `CWV_FORCE_REGRESSION`).

### W4 ship notes (MVP)
- Event sink: **Postgres** collector (Redpanda/ClickHouse deferred — interface `sink: postgres`).
- Consent gate: `FEATURE_ANALYTICS_CONSENT_GATE` (default on) skips marketing events when denied.
- OpenAPI: `docs/openapi-w4.yaml` · Bruno: `docs/bruno/WebCom-W4.bru` · E2E: `scripts/e2e-w4.sh`.

---

# 9. Phase W5 — Hardening, Headless, Agency scale (4 tuần)

## Scope
- Headless Storefront API (product/cart/checkout/customer/content) — FR-WCP-013.
- Theme CLI/SDK alpha; package lint/security/size.
- PWA: add-to-home, offline shell, push consent.
- Performance budget; k6 checkout/storefront; DR restore drill.
- White-label preview domain cho agency.
- Corporate GTM polish (case/ROI/resource) theo FR-CORP.
- Security: CSP, WAF rules checkout, pen-test light.

## Exit criteria
- [x] SLA Standard: 99.9% storefront; RPO/RTO theo NFR (documented in `docs/runbooks/dr-restore.md`).
- [x] Headless API authenticated, versioned, rate-limited (`/v1/headless/*` + API keys + RPM).
- [x] Runbooks: publish fail, payment, CDN, pixel (+ DR drill).

### W5 ship notes (MVP)
- PWA: manifest + SW offline shell + install prompt.
- Security: CSP/headers (Next + nginx), checkout RPM guard.
- Agency: delivery workflow + white-label host + preview revoke.
- Corporate: case/ROI, resources, pricing pages + systemd unit.
- Theme CLI alpha: `@ptt/theme-cli` lint.
- Perf: `perf/k6/storefront.js`, `checkout-smoke.js`.
- OpenAPI: `docs/openapi-w5.yaml` · Bruno: `docs/bruno/WebCom-W5.bru` · E2E: `scripts/e2e-w5.sh`.

---

# 9b. Wave A1 — Playbooks & Domain (Branch A deepen)

> Sau W5 MVP · Mục tiêu: ≥30 Conversion Playbook + Domain/SSL wizard + host multi-tenant.

## Exit criteria
- [x] Template catalog ≥ 30 playbooks (seed `prisma/data/templates-catalog.ts`).
- [x] Install trả Conversion Playbook; Marketplace lọc/sort CVR·Mobile·SEO.
- [x] Domain connect: subdomain `*.ptt.shop` + custom; verify DNS; TLS staging (`FEATURE_DOMAIN_TLS`).
- [x] Go-live `domain_ssl` pass khi DNS verified + TLS active.
- [x] `GET /v1/public/host-resolve` + storefront middleware Host→tenant.
- [x] Health `wave: A1` · OpenAPI/Bruno/E2E: `docs/openapi-a1.yaml`, `docs/bruno/WebCom-A1.bru`, `scripts/e2e-a1.sh`.

---

# 9c. Wave A2 — Payment QR & Shipping (Branch A deepen)

## Exit criteria
- [x] Checkout server-side shipping + voucher vào Order totals (BR-021).
- [x] TRANSFER → PaymentIntent VietQR (`img.vietqr.io`) + webhook idempotent → `payment_status=paid`.
- [x] COD giữ nguyên.
- [x] Shipping quotes: stub mặc định; GHN live khi `FEATURE_LIVE_SHIPPING` + token.
- [x] Storefront checkout re-quote theo city; order page hiện QR + simulate paid (dev).
- [x] Health `wave: A2` · `docs/openapi-a2.yaml` · `docs/bruno/WebCom-A2.bru` · `scripts/e2e-a2.sh`.

---

# 9d. Wave A3 — Analytics pipeline (Branch A deepen)

## Exit criteria
- [x] Dual-write: Postgres → Redpanda (stub/live) → ClickHouse (stub/live HTTP).
- [x] Dashboard funnel ưu tiên ClickHouse; `coverage.ch_coverage_pct` / `funnel_from_ch_ok`.
- [x] Page contribution join order revenue từ CH (+ fallback PG).
- [x] Pipeline health `GET /v1/admin/analytics/pipeline`; retention `ANALYTICS_RETENTION_DAYS`.
- [x] Optional compose profile `analytics` (ClickHouse + Redpanda).
- [x] Health `wave: A3` · `docs/openapi-a3.yaml` · `docs/bruno/WebCom-A3.bru` · `scripts/e2e-a3.sh`.

---

# 9e. Wave A4 — Temporal Publish / GoLive (Branch A deepen)

## Exit criteria
- [x] `PublishThemeWorkflow` + `GoLiveValidationWorkflow` (FEATURE_TEMPORAL stub; live khi `TEMPORAL_ADDRESS`).
- [x] Checklist fail block publish (409) với `workflow_id` / job metadata.
- [x] Retry + compensate rollback; `apps/worker` companion.
- [x] Rollback `within_slo` &lt; 5 phút.
- [x] Health `wave: A4` · `docs/openapi-a4.yaml` · `docs/bruno/WebCom-A4.bru` · `scripts/e2e-a4.sh` · runbook Temporal.

---

# 9f. Wave A5 — OpenSearch catalog (Branch A deepen)

## Exit criteria
- [x] Product index qua outbox (`search_outbox`) → OpenSearch stub/live.
- [x] `GET /v1/catalog/search` ưu tiên OS; hydrate PG; fallback Postgres.
- [x] Storefront `/search` dùng search API + hiện source/latency.
- [x] Status P95 vs `SEARCH_P95_SLO_MS` (200ms).
- [x] Health `wave: A5` · OpenAPI/Bruno/`scripts/e2e-a5.sh` · runbook.

---

# 9g. Wave A6 — AI Gateway (Branch A deepen)

## Exit criteria
- [x] `apps/ai-gateway` FastAPI (Theme Match / headlines / shopping Q&A + Qdrant stub).
- [x] Nest `AiModule` + budget ledger; `AI_GATEWAY_URL` hoặc nest stub.
- [x] High-risk `shopping_qa` 100% `pending_approval` + audit; apply cần approve; không auto-publish/đổi giá.
- [x] Health `wave: A6` · `docs/openapi-a6.yaml` · Bruno · `scripts/e2e-a6.sh` · runbook.

---

# 9h. Nhánh B — Omnichannel Sales (kế hoạch)

> Sau A6 · Canvas: `canvases/ke-hoach-nhanh-b-omnichannel.canvas.tsx` · ~16 tuần · B1–B6.

| Wave | Focus | Exit chính |
|---|---|---|
| B1 | Channel binding + Unified Inbox | ≥2 kênh stub; thread + SLA/tag · **shipped** `wave: B1` |
| B2 | Comment/chat → Order draft | Draft → OMS/checkout E2E · **shipped** `wave: B2` |
| B3 | POS 1 cửa hàng | Barcode sell + shift + tồn realtime · **shipped** `wave: B3` |
| B4 | Live Commerce MVP | Keyword→order + alert tồn · **shipped** `wave: B4` |
| B5 | Marketplace connector #1 | Listing/order/stock; lag ≤60s · **shipped** `wave: B5` |
| B6 | AI social + đa cửa hàng | AI reply approval; POS ≥2 location · **shipped** `wave: B6` |

**Phạm vi:** FR-POS · FR-SOCIAL · FR-LIVE · FR-MKTPLACE. **Không** full CRM Journey/Loyalty (nhánh C).

---

# 9i. Wave B1 — Channel binding + Unified Inbox

## Exit criteria
- [x] `ChannelAccount` + `InboxConversation` + `InboxMessage` (Prisma · migration `b1_social_inbox`).
- [x] Nest `SocialModule`: bind Meta/Zalo stub (≥2 kênh); webhook ingest → thread; owner/SLA/tag/note; reply stub.
- [x] Admin `/social` list + `/social/[id]` detail (assign + reply).
- [x] Health `wave: B1` · `docs/openapi-b1.yaml` · Bruno · `scripts/e2e-b1.sh`.

## API (tóm tắt)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/v1/admin/social/status` | Connector modes |
| POST | `/api/v1/admin/social/channels/bind` | Bind Meta/Zalo |
| GET | `/api/v1/admin/social/inbox` | List threads |
| POST | `/api/v1/admin/social/webhooks/:provider` | Ingest stub inbound |
| POST | `/api/v1/admin/social/inbox/:id/assign` | Owner / tags / SLA |

**SRS:** FR-ORG-011 · FR-SOC-001/002. Live OAuth: `FEATURE_SOCIAL_LIVE` + `META_APP_ID` / `ZALO_APP_ID` (chưa gọi partner — vẫn stub send).

---

# 9j. Wave B2 — Comment/chat → Order draft → OMS

## Exit criteria
- [x] `SocialOrderDraft` + product snapshot + `external_thread_id` (BR-023).
- [x] Comment ingest (`kind=comment`) + product picker + 1-click draft (FR-SOC-004 · FR-OMS-010).
- [x] Messenger cart stub (FR-SOC-005) · risk score soft.
- [x] Convert → cart → checkout COD/TRANSFER → `CONFIRMED` + stock reserve + channel attribution trên Order.
- [x] Admin `/social/[id]` draft UI · Health `wave: B2` · `openapi-b2.yaml` · `scripts/e2e-b2.sh` · runbook.

## API (tóm tắt)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/v1/admin/social/products` | Product picker |
| POST | `/api/v1/admin/social/drafts` | Tạo draft |
| POST | `/api/v1/admin/social/comments/:messageId/order-draft` | Comment→draft |
| POST | `/api/v1/admin/social/drafts/:id/send-cart` | Stub giỏ Messenger |
| POST | `/api/v1/admin/social/drafts/:id/convert` | → OMS CONFIRMED |

---

# 9k. Wave B3 — POS Core (1 cửa hàng)

## Exit criteria
- [x] `PosLocation` / `PosRegister` / `PosShift` / `PosSale` / `PosReturn` / `LocationInventory`.
- [x] Barcode/SKU lookup ≤500ms target · bán cash/COD/TRANSFER (split) · receipt.
- [x] Tồn location ↔ global đồng bộ khi sell/return · đóng ca có báo cáo variance.
- [x] Admin `/pos` · Health `wave: B3` · `openapi-b3.yaml` · `scripts/e2e-b3.sh` · runbook.

## API (tóm tắt)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/v1/admin/pos/locations/ensure` | Bootstrap 1 store |
| POST | `/api/v1/admin/pos/shifts/open` | Mở ca |
| GET | `/api/v1/admin/pos/lookup` | Barcode search |
| POST | `/api/v1/admin/pos/sales` | Bán + receipt |
| POST | `/api/v1/admin/pos/returns` | Đổi trả |
| POST | `/api/v1/admin/pos/shifts/:id/close` | Đóng ca + report |

**SRS:** FR-POS · NFR-PERF-002.

---

# 9l. Wave B4 — Live Commerce MVP

## Exit criteria
- [x] `LiveSession` / `LiveSessionItem` / `LiveComment` / `LiveAlert`.
- [x] Keyword comment → Social draft → OMS `CONFIRMED` (≥1 order staging).
- [x] Stock alert khi available ≤ threshold hoặc reserved ≥80% on_hand.
- [x] Post-live recovery list (TRANSFER/pending).
- [x] Admin `/live` · Health `wave: B4` · `openapi-b4.yaml` · `scripts/e2e-b4.sh`.

## API (tóm tắt)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/v1/admin/live/sessions` | Tạo phiên |
| POST | `/api/v1/admin/live/sessions/:id/items` | SKU + keyword |
| POST | `/api/v1/admin/live/sessions/:id/start` | Go live |
| POST | `/api/v1/admin/live/sessions/:id/comments` | Keyword→order |
| GET | `/api/v1/admin/live/sessions/:id/alerts` | Alert tồn |
| GET | `/api/v1/admin/live/sessions/:id/recovery` | Post-live recovery |

**SRS:** FR-LIVE.

---

# 9m. Wave B5 — Marketplace connector #1 (Shopee)

## Exit criteria
- [x] `MarketplaceAccount` / `MarketplaceListing` / `MarketplaceOrder` / `MarketplaceOutbox` (migration `b5_marketplace_shopee`).
- [x] Nest `MarketplaceModule`: Shopee stub connect · listing↔SKU · stock outbox drain · lag ≤60s · order ingest (BR-004) · unmatched → exception.
- [x] Matched order → OMS `CONFIRMED` + stock reserve + channel attribution.
- [x] Admin `/marketplace` · Health `wave: B5` · `openapi-b5.yaml` · Bruno · `scripts/e2e-b5.sh` · runbook.

## API (tóm tắt)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/v1/admin/marketplace/accounts/connect` | Bind Shopee stub |
| POST | `/api/v1/admin/marketplace/listings` | Map SKU → listing + enqueue stock |
| POST | `/api/v1/admin/marketplace/stock/sync` | Drain outbox; assert lag SLO |
| POST | `/api/v1/admin/marketplace/orders/ingest` | Matched→OMS / exception |
| GET | `/api/v1/admin/marketplace/outbox` | Jobs + `lag_ms` |

**SRS:** FR-MKTPLACE · BR-004. Live partner: `FEATURE_SHOPEE_LIVE` + `SHOPEE_PARTNER_ID` (chưa gọi API đối tác — vẫn stub push).

---

# 9n. Wave B6 — AI social reply + POS đa cửa hàng

## Exit criteria
- [x] AI kind `social_reply` high-risk → `pending_approval` (BR-018 · FR-SOC-003).
- [x] `POST .../inbox/:id/ai-reply` draft; approve + apply → outbound send; không auto-send.
- [x] POS ≥2 location (seed Q1+Q3); transfer tồn inter-store (`PosStockTransfer`).
- [x] Location mới không copy full global stock nếu SKU đã phân bổ.
- [x] Admin social AI panel + POS multi/transfer · Health `wave: B6` · `openapi-b6.yaml` · `scripts/e2e-b6.sh`.

## API (tóm tắt)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/v1/admin/social/inbox/:id/ai-reply` | Nháp AI reply |
| POST | `/api/v1/admin/ai/actions/:id/review` | Approve/reject |
| POST | `/api/v1/admin/ai/actions/:id/apply` | Gửi outbound |
| POST | `/api/v1/admin/pos/locations/ensure` | Bootstrap store theo code |
| POST | `/api/v1/admin/pos/transfers` | Transfer tồn giữa location |

**SRS:** FR-SOC-003 · FR-POS · BR-018.

---

# 9o. Nhánh C — Customer Growth (kế hoạch)

> Sau B6 · Canvas: `canvases/ke-hoach-nhanh-c-customer-growth.canvas.tsx` · ~16 tuần · C1–C6.

| Wave | Focus | Exit chính |
|---|---|---|
| C1 | Customer 360 profile | Hồ sơ thống nhất: order + inbox + consent · admin `/customers` · **shipped** `wave: C1` |
| C2 | Identity match / merge | Match phone/email/social · merge/unmerge + audit · **shipped** `wave: C2` |
| C3 | RFM + Segmentation | RFM job; segment rule AND/OR; audience preview · **shipped** `wave: C3` |
| C4 | Loyalty ledger | Earn on CONFIRMED; redeem checkout; tier; ledger · **shipped** `wave: C4` |
| C5 | Journey MVP | Trigger→condition→delay→action stub; consent + frequency cap · **shipped** `wave: C5` |
| C6 | NBA + service recovery | Playbook + NBA + AI care/nba approval · **shipped** `wave: C6` |

**Phạm vi:** FR-CRM · FR-SEG · FR-LOY · FR-JRN · FR-CX. **Không** full Revenue Intelligence / Content-KOL (nhánh D) · không broadcast partner live (stub trước).

## Nguyên tắc
- Identity hợp nhất theo phone/email/social/marketplace/loyalty ID + consent (SRS §3 · BP-CRM).
- Marketing action kiểm tra consent + channel policy + frequency cap (**BR-011**).
- AI care / NBA draft high-risk → approval (**BR-018**); không auto-refund / auto-mass-send.
- Tái sử dụng: `Customer` (W2), Social inbox (B1–B2/B6), OMS attribution (B2+), AI Gateway (A6), Audit.

## Phụ thuộc từ code hiện tại
| Asset | Trạng thái | Việc nhánh C |
|---|---|---|
| `Customer` (email/phone/consent_marketing) | Register/login storefront | Mở rộng profile, identities, tags, RFM fields |
| `InboxConversation.customerId` | Optional | Auto-link / match sau C2 |
| `Order` attribution | Shipped B2+ | Feed RFM + loyalty earn |
| `AiAction` / approval | A6 + B6 `social_reply` | Thêm kind `care_reply` / `nba_suggest` |
| Voucher / promo engine | Chưa đủ FR-LOY | Hook redeem điểm ↔ voucher stub |

## Wave C1 — Customer 360 profile (tuần 1–2)
### Exit criteria
- [x] Mở rộng `Customer`: addresses/tags/notes/lifetime; consent email/sms/zns/messenger.
- [x] Admin `CrmModule`: list/search/get 360 (orders + conversations + consent).
- [x] Storefront account vẫn dùng cùng `Customer` (register/login).
- [x] Health `wave: C1` · `openapi-c1.yaml` · Bruno · `scripts/e2e-c1.sh` · runbook.

### API (tóm tắt)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/v1/admin/customers/ensure` | Upsert phone/email |
| GET | `/api/v1/admin/customers` | Search |
| GET | `/api/v1/admin/customers/:id` | 360 snapshot |
| PATCH | `/api/v1/admin/customers/:id` | Profile |
| PATCH | `/api/v1/admin/customers/:id/consent` | Channel consents |
| POST | `/api/v1/admin/customers/:id/link-inbox` | Link threads by phone |

**SRS:** FR-CRM (profile slice).

## Wave C2 — Identity match / merge (tuần 3–5)
### Exit criteria
- [x] `CustomerIdentity` (type: phone/email/meta/zalo/shopee/loyalty …) unique theo tenant.
- [x] Match candidate queue; merge → survivor + audit before/after; unmerge soft.
- [x] Auto-attach inbox thread / guest order khi signal khớp.
- [x] Health `wave: C2` · `openapi-c2.yaml` · Bruno · `scripts/e2e-c2.sh` · runbook · admin `/customers/matches`.

### API (tóm tắt)
| Method | Path | Mô tả |
|---|---|---|
| GET/POST | `/api/v1/admin/customers/:id/identities` | List / add identity |
| DELETE | `/api/v1/admin/customers/:id/identities/:identityId` | Remove (non-primary) |
| POST | `/api/v1/admin/crm/matches/scan` | Scan shared signals |
| GET | `/api/v1/admin/crm/matches` | Match queue |
| POST | `/api/v1/admin/crm/matches/:id/dismiss` | Dismiss |
| POST | `/api/v1/admin/crm/merge` | Merge → survivor |
| POST | `/api/v1/admin/crm/merge/:eventId/unmerge` | Soft unmerge |
| GET | `/api/v1/admin/crm/merge-events` | Audit |

**SRS:** FR-CRM · BP-CRM · BR-006 (no hard-delete).

## Wave C3 — RFM + Segmentation (tuần 6–8)
### Exit criteria
- [x] Job RFM (R/F/M scores + segment label) theo tenant; refresh theo lịch stub (`rfm_job_runs`).
- [x] `Segment` + `SegmentRule` (AND/OR, field/op/value, time window).
- [x] Preview audience count + sample IDs; materialize membership snapshot.
- [x] Admin `/segments` · Health `wave: C3` · `openapi-c3.yaml` · Bruno · `scripts/e2e-c3.sh` · runbook.

### API (tóm tắt)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/v1/admin/crm/rfm/refresh` | Score all active customers |
| GET | `/api/v1/admin/crm/rfm/summary` | Counts by label |
| GET | `/api/v1/admin/crm/rfm/customers` | Filter by rfm_segment |
| GET/POST | `/api/v1/admin/segments` | List / create |
| GET/PATCH/DELETE | `/api/v1/admin/segments/:id` | CRUD |
| POST | `/api/v1/admin/segments/:id/preview` | Count + sample |
| POST | `/api/v1/admin/segments/:id/materialize` | Snapshot memberships |
| GET | `/api/v1/admin/segments/:id/members` | Materialized list |

**SRS:** FR-SEG.

## Wave C4 — Loyalty ledger (tuần 9–11)
### Exit criteria
- [x] `LoyaltyAccount` / `LoyaltyLedger` (earn/redeem/expire/adjust+reason); tier rules.
- [x] Earn trên order `CONFIRMED` (idempotent theo order_id); redeem ở checkout stub (điểm→discount).
- [x] Referral code cơ bản (1 level) + fraud soft check.
- [x] Admin `/loyalty` · Health `wave: C4` · `openapi-c4.yaml` · Bruno · `scripts/e2e-c4.sh` · runbook.

### API (tóm tắt)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/v1/admin/loyalty/status` | Flags + defaults |
| POST | `/api/v1/admin/loyalty/accounts/ensure` | Wallet + referral code |
| POST | `/api/v1/admin/loyalty/earn-order/:orderId` | Earn idempotent |
| POST | `/api/v1/admin/loyalty/redeem` | Redeem points |
| POST | `/api/v1/admin/loyalty/adjust` | Manual ±points + reason |
| POST | `/api/v1/admin/loyalty/expire` | Expire stub |
| POST | `/api/v1/admin/loyalty/referral/apply` | Referral + soft fraud |
| POST | `/api/v1/checkout` | `loyalty_points` optional |

**SRS:** FR-LOY.

## Wave C5 — Journey MVP (tuần 12–14)
### Exit criteria
- [x] `Journey` / `JourneyStep` / `JourneyEnrollment`: Trigger → Condition → Delay → Action → Exit.
- [x] Actions stub: tag, voucher issue, Messenger/Zalo/email/SMS **stub send**.
- [x] Guard: consent + frequency cap + conflict (1 journey active / customer / category).
- [x] Admin `/journeys` · enroll + run-once drain · Health `wave: C5` · OpenAPI/Bruno/e2e/runbook.

### API (tóm tắt)
| Method | Path | Mô tả |
|---|---|---|
| GET/POST | `/api/v1/admin/journeys` | List / create |
| POST | `/api/v1/admin/journeys/drain` | Drain due enrollments |
| PATCH | `/api/v1/admin/journeys/:id` | Update / activate / replace steps |
| POST | `/api/v1/admin/journeys/:id/enroll` | Enroll (+ auto drain) |
| GET | `/api/v1/admin/journeys/:id/enrollments` | Enrollments |
| GET | `/api/v1/admin/journey-enrollments/:id/logs` | Run logs |

**SRS:** FR-JRN · BR-011 · BP-JOURNEY.

## Wave C6 — NBA + service recovery (tuần 15–16)
### Exit criteria
- [x] `ServiceTicket` link customer/order; playbook triggers (delay COD, fail payment, negative keyword stub).
- [x] NBA recommend (call/voucher/live invite/no-contact) + evidence fields; owner assign.
- [x] AI kind `care_reply` / `nba_suggest` → pending_approval → apply draft only (không auto-refund/send).
- [x] Admin `/recovery` + Customer 360 recovery panel · Health `wave: C6` · e2e-c6 · runbook.

**API (tóm tắt)**
| Method | Path | Mục đích |
|---|---|---|
| GET | `/api/v1/admin/cx/status` | Feature flags C6 |
| GET/POST | `/api/v1/admin/cx/tickets` | List / create ticket |
| GET/PATCH | `/api/v1/admin/cx/tickets/:id` | Detail / update |
| POST | `/api/v1/admin/cx/tickets/:id/care-reply` | AI care_reply → pending_approval |
| POST | `/api/v1/admin/cx/playbooks/scan` | Scan delay_cod / fail_payment / negative_keyword |
| POST | `/api/v1/admin/cx/nba/suggest` | Rule NBA |
| POST | `/api/v1/admin/cx/nba/suggest-ai` | AI nba_suggest → pending_approval |
| GET | `/api/v1/admin/cx/nba` | List NBA |
| PATCH | `/api/v1/admin/cx/nba/:id` | Accept / dismiss / owner |
| POST | `/api/v1/admin/cx/nba/:id/apply` | Apply stub (không refund) |

**SRS:** FR-CX · BR-018 · runbook `docs/runbooks/nba-service-recovery.md`.

## Won't (nhánh C)
- Broadcast production ZNS/Email/SMS (chỉ stub + policy).
- Journey holdout / contribution ROI đầy đủ (nhánh D RI).
- Community UGC / KOL affiliate (Content branch).
- Custom objects / workflow builder enterprise.
- Auto-refund / mass send không approval.

## Definition of Done mỗi wave
Prisma migration · Nest module · Admin UI · `health.wave = Cn` · OpenAPI + Bruno · `scripts/e2e-cn.sh` · runbook · cập nhật bảng §9o.

---

# 10. Backlog ưu tiên MoSCoW (WebCom)

## Must (trước GA Platform)
- Storefront SSR + PDP/cart/checkout/COD
- Server-side price + inventory reserve
- Brand Kit + Theme version + 1 Published rule
- Builder section core + autosave + preview
- Template Marketplace (≥ 30 playbook) + install
- Go-live checklist gate + rollback
- Consent-aware pixels
- Domain/SSL
- Audit publish/order/stock

## Should
- AI Theme Match + AI copy drawer
- OpenSearch product search
- PWA
- A/B experiments
- Agency delivery workflow
- Contribution by page
- Corporate GTM full (01)

## Could
- Theme CLI/SDK
- 3D/360 media
- Multi-currency/language full
- App block marketplace bên thứ ba

## Won't (now)
- Đua 400 theme mỏng
- AI tự publish / tự refund
- MRP/HR/GL
- Last-mile tự build

---

# 11. Kế hoạch kiểm thử

## 11.1. Tầng test

| Tầng | Công cụ | Bắt buộc từ |
|---|---|---|
| Unit | Vitest / Jest / pytest | W0 |
| Contract | Pact / OpenAPI spectral | W1 |
| Integration | Testcontainers PG/Redis | W1 |
| E2E | Playwright (checkout, publish, builder) | W2 |
| Perf | k6 (checkout, PDP, publish) | W2 / W5 |
| Visual | Playwright screenshots vs mockup key pages | W3 |
| Security | Semgrep, Trivy, ZAP smoke | W0+ |
| CWV | Lighthouse CI / synthetic | W2 measure · W3 gate |

## 11.2. E2E critical paths

```text
P1: Guest mobile buy COD
P2: Logged-in buy QR + voucher
P3: Publish staging → checklist fail Pixel → blocked
P4: Fix → publish → rollback
P5: Onboarding wizard AURA → first order < 1 day
P6: Theme update compatibility warning blocks blind publish
```

## 11.3. UAT theo mockup
- PO + Design sign-off từng màn 01–09 (WebCom).
- Checklist lệch mockup phải có ticket “mockup drift” hoặc cập nhật SRS.

---

# 12. DevOps & môi trường

| Env | Mục đích |
|---|---|
| Local | Docker compose: PG, Redis, MinIO, mailhog |
| Dev | Shared, seed AURA, feature flags on |
| Staging | Gần prod, custom domain test, Temporal |
| Prod | Multi-AZ PG, CDN, WAF, backups |

**Pipeline:** PR → lint/type/unit → SAST → image → staging deploy → Playwright smoke → approve → canary storefront → full.

**CDN:** cache tags `storefront:{id}:page:{id}|product:{id}|theme:{ver}`.

**Secrets:** vault; không bao giờ vào bundle storefront.

---

# 13. Metrics thành công WebCom

| Metric | Target |
|---|---|
| Time-to-first-order (pilot) | ≤ 1 ngày với playbook |
| Checkout completion mobile | Baseline +10–20% sau tối ưu W2–W4 |
| Publish rollback MTTR | ≤ 5 phút |
| % publish bị chặn đúng khi checklist fail | 100% |
| LCP mobile home (published themes chuẩn) | ≤ 2.5s p75 |
| Storefronts có funnel tracking | 100% published |
| Theme playbooks chất lượng | ≥ 30 trước GA Platform |
| NPS merchant Website Admin (beta) | Đo sau W3 |

---

# 14. Rủi ro & giảm thiểu

| Rủi ro | Tác động | Mitigation |
|---|---|---|
| Core (checkout/inventory) chậm → WebCom trễ | Block W2 | Spike W1 song song; contract API trước UI |
| Builder scope creep | Trễ W3 | Section MVP list đóng; app blocks phase sau |
| CWV gate quá chặt chặn mọi publish | Frustration | Threshold theo tier; waiver có audit |
| Template chất lượng kém | Không thắng Haraweb | Editorial review playbook; score công khai |
| CDN/ISR bug giá/tồn | Sai giá | Checkout luôn server validate; cache ngắn cho price |
| AI hallucination copy/legal | Brand risk | Không auto-publish; claim risk check |
| Phụ thuộc payment/carrier VN | Go-live thật chậm | Stub + 1 cổng + COD trước; thêm connector sau |

---

# 15. Phụ thuộc ngoài WebCom (chương trình OS)

| Phụ thuộc | Owner | Cần trước |
|---|---|---|
| IAM / Tenant | Platform | W0 |
| PIM / Inventory / OMS | Commerce | W1–W2 |
| Payment / Shipping connectors | Integrations | W2 soft · W3 GA |
| CRM lead routing | Growth | Corporate GTM |
| ClickHouse / RI margin formula | Data | W4 page contribution |
| Social/Live | Omnichannel | Không block WebCom GA |

---

# 16. Lịch milestone & gate review

| Cột mốc | Thời điểm | Gate |
|---|---|---|
| M0 Kickoff | Tuần 0 | ADR + đội + mockup freeze WebCom |
| M1 Core-for-Web | Tuần 9 | E2E API order |
| M2 Soft launch Storefront | Tuần 17 | Pilot merchants mua thật staging/prod |
| M3 Platform Beta | Tuần 27 | Builder+Go-live UAT pass |
| M4 Analytics/AI | Tuần 33 | Funnel+CWV+AI assist |
| M5 GA WebCom | Tuần 37 | NFR + runbooks + headless alpha |

**Mỗi gate:** PO demo theo mockup · Tech Lead risk · QA report · Go/No-Go.

---

# 9p. Platform apex Haravan-like (chốt 2026-09-18)

> Đổi `webecom.ngoinhahomnay.vn` từ shop AURA → **site bán nền tảng** (chọn template → demo → trial → mua theme).

## Quyết định đã chốt
| # | Quyết định | Giá trị |
|---|---|---|
| 1 | Apex | **Platform** (`corporate-web` trên `webecom.ngoinhahomnay.vn`) |
| 2 | Demo | **Subdomain** `themes.ngoinhahomnay.vn` → `storefront-web` |
| 3 | Monetize phase 1 | **Mua theme** (chưa subscription plan) |
| 4 | Paywall | **Self-serve trial trước** paywall mua theme |

## Surface map
| Host / path | App | Vai trò |
|---|---|---|
| `webecom.ngoinhahomnay.vn/` | corporate-web :3103 | GTM + gallery template + CTA trial/mua |
| `webecom.ngoinhahomnay.vn/console` | admin-web :3100 | Onboarding, install, Brand Kit, builder, go-live |
| `webecom.ngoinhahomnay.vn/api` | admin-api :3101 | Public templates + leads + platform APIs |
| `themes.ngoinhahomnay.vn` | storefront-web :3102 | Live demo sandbox (`?demo=<code>`) |

## Funnel
```text
Browse /templates → Demo (demo. host) → Dùng thử (/console onboarding)
  → Customize (Brand Kit / builder) → Mua theme (P3 billing) → Publish
```

## Waves
| Wave | Scope | Exit |
|---|---|---|
| **P0** | Remount nginx apex→corporate; themes.→storefront; enable systemd corporate; SSL themes | Apex = Platform; shop AURA trên themes. |
| **P1** | Public `GET /api/v1/public/templates` (+ detail); UI `/templates`; demo banner `?demo=` | Gallery public + demo link hoạt động |
| **P2** | Self-serve trial tenant/storefront + deep-link onboarding | Trial không cần trả tiền trước |
| **P3** | Theme license checkout (VietQR/TRANSFER) tách khỏi cart hàng hóa | Mua theme sau trial |

**Won't (phase 1):** subscription Starter/Growth; CMS corporate đầy đủ FR-CORPWEB; marketplace 400 theme.

**SRS:** FR-CORPWEB · FR-WCP-002 · mockup `01-corporate-gtm.html`.

---

# 17. Kế hoạch chuyển mockup → production UI

1. **Freeze** mockup WebCom 01–09 làm baseline (đổi = version mockup).
2. Figma recreate token + components (không redesign lệch SRS).
3. Storybook parity: Button, KPI, Panel, Table, Checklist, Builder chrome.
4. Route map:

| Route Admin | Mockup |
|---|---|
| `/website/onboarding` | 02 |
| `/website/templates` | 04 |
| `/website/themes` | 05 |
| `/website/builder/:pageId` | 06 |
| `/website/golive/:jobId` | 07 |
| `/website/analytics` | 09 |
| `/` Command | 03 (entry) |

5. Storefront: visual QA mobile 390px vs `08`.
6. Corporate: implement `01` 1:1 structure (đã viết lại kiểu Haravan-coverage).

---

# 18. Tuần đầu tiên (Day 1–10) — hành động cụ thể

| Ngày | Việc |
|---|---|
| 1–2 | Kickoff, chốt scope W0–W2, gán owner epic |
| 3–5 | Monorepo + CI + Postgres + admin shell |
| 6–7 | Port design tokens; Storybook; route placeholders |
| 8–9 | PIM+Inventory spike + cart API skeleton |
| 10 | Demo nội bộ: shell + health + 1 product seed AURA |

---

# 19. Tài liệu kèm theo khi triển khai

| Tài liệu | Mục đích |
|---|---|
| SRS v5.1 §7, §14–16 | AC nghiệp vụ |
| Architecture v3 §3, §8, §15 | Kỹ thuật WebCom |
| ADR-005, 013, 014, 015 | Theme engine, SSR, schema, publish |
| Mockup `mockups/README.md` | UI baseline |
| Runbook Publish/Checkout (viết ở W3/W5) | Ops |

---

# 20. Kết luận

Kế hoạch WebCom đi theo 3 tầng thắng đối thủ:

```text
W2  Merchant bán được (parity Haraweb tối thiểu)
 → W3 Tự xây + Go-live gate + Theme playbook (vượt Haraweb)
 → W4 Đo lãi theo page + AI có hàng rào (moat)
```

**Không** bắt đầu bằng Marketplace 400 theme hay AI chat.  
**Bắt đầu** bằng Core-for-Web → Storefront checkout đúng → Builder/Publish an toàn — đúng SRS, đúng kiến trúc, đúng mockup đã có.

---

## Phụ lục A — Checklist mở dự án

- [ ] PO confirm timeline 37 tuần hoặc cắt MVP = hết W2+W3  
- [ ] Đội tối thiểu: 2 FE, 2 BE, 1 QA, 1 TL, 0.5 DevOps, 1 Design  
- [ ] Budget CDN + Temporal + ClickHouse (W4)  
- [ ] Chọn 1 payment + 1 carrier VN cho Pilot  
- [ ] Design partner merchant (Beauty) cho UAT  
- [ ] Mockup freeze tag git `mockups-webcom-v1`  

## Phụ lục B — Definition of Ready (mỗi story)

- FR/BR tham chiếu · Mockup frame · AC Given/When/Then · API contract · Flag · Analytics event (nếu có) · QA note mobile  

## Phụ lục C — Definition of Done

- Code + test · OpenAPI cập nhật · Audit nếu write nhạy cảm · CWV/perf note · Không regress BR-015/021/025 · PO accept theo mockup  
