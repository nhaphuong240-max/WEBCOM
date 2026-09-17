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
