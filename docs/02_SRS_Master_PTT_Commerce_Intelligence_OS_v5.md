# SRS Master — PTT Commerce Intelligence OS & Website Commerce Platform

## Phiên bản 5.1 (Deep SRS + Competitive vs Haravan)

| Thuộc tính | Nội dung |
|---|---|
| Tên sản phẩm | PTT Commerce Intelligence OS |
| Tên tài liệu | SRS Master — Deep Requirements & Competitive Upgrade Blueprint |
| Phiên bản | 5.1 |
| Trạng thái | Master Product Blueprint — Ready for Solution Design & Competitive Execution |
| Ngôn ngữ | Tiếng Việt |
| Kế thừa cấu trúc | **SRS Master v4.0** (giữ nguyên khung mục 1–20, mở rộng chuyên sâu từng FR) |
| Đối thủ tham chiếu | [Haravan](https://www.haravan.com) — Omnichannel + Haraweb + Harasocial + POS + CRM/AI Chat |
| Mục tiêu tài liệu | (1) Đặc tả nghiệp vụ/chức năng chuyên sâu bám SRS gốc; (2) Chỉ rõ **parity bắt buộc** với Haravan; (3) Chỉ rõ **upgrade thắng trận** mà Haravan chưa dẫn đầu |

> Tài liệu này **không thay đổi định vị** của SRS v4.0. Nó làm dày yêu cầu, gắn acceptance criteria, và thêm chương cạnh tranh Haravan để Product/Engineering ưu tiên đúng thứ tự: *Parity để không thua SMB → Differentiation để thắng brand/agency/enterprise*.

---

# 1. Tầm nhìn và định vị

## 1.1. Định vị sản phẩm

> **PTT Commerce Intelligence OS** là nền tảng điều hành tăng trưởng AI-native, hợp nhất Commerce, CRM, Content, Website, AI Agent và Revenue Intelligence cho doanh nghiệp Việt Nam.

Hệ thống không chỉ quản lý sản phẩm, đơn hàng và tồn kho. Nền tảng phải liên kết chuỗi giá trị:

```text
Market Intelligence
→ Corporate Website / Lead Generation
→ Content & Campaign Operations
→ Merchant Website / Social / Video / Livestream Commerce
→ Lead & Customer Intelligence
→ Order / Inventory / Fulfillment
→ Loyalty / Retention / Advocacy
→ Revenue / Profitability / Executive Intelligence
```

### Định vị cạnh tranh ngắn (vs Haravan)

| Haravan đang thắng | PTT phải đạt parity | PTT thắng bằng |
|---|---|---|
| Omnichannel “đủ dùng” cho SMB VN: web + social + live + POS + sàn | Cùng độ phủ kênh, connector, COD, e-invoice | **Revenue Intelligence** (margin thật, không chỉ GMV) |
| 400+ theme, go-live nhanh, giá vào cửa thấp | Theme/template đủ ngành + time-to-first-order | **Website Growth Platform**: Brand Kit, Conversion Playbook, Builder governance, rollback, CWV |
| Harasocial inbox + comment/live chốt đơn mạnh | Inbox/live/comment-to-order ngang tầm | **Content→Creator→Order→Margin** + Agency portal |
| AI Chat / Meta Business Agent bán hàng | AI chat bán hàng + handoff | **Guardrailed AI Agent OS**: tool policy, approval, audit, private AI, cost governance |
| Hệ sinh thái 60k+ DN, support 8h–21h | Onboarding/support playbook rõ | Vertical Playbook + Enterprise workflow/custom object/SSO |

## 1.2. Mục tiêu nghiệp vụ

Hệ thống phải giúp doanh nghiệp:

1. Hợp nhất dữ liệu sản phẩm, khách hàng, nội dung, đơn hàng, tồn kho, giao nhận, thanh toán và doanh thu.
2. Biến website từ “mặt tiền số” thành conversion engine đo được doanh thu, **contribution margin** và LTV.
3. Liên kết content, ads, KOL/KOC, social, livestream, landing page và order qua **Revenue Graph**.
4. Điều hành đơn hàng, tồn kho, COD, fulfillment và exception theo thời gian thực.
5. Tăng retention qua Customer 360, loyalty, journey automation và next-best-action.
6. Đưa AI vào quy trình có quyền, policy, audit, cost governance và human-in-the-loop.
7. Cho phép enterprise cấu hình workflow, custom object, multi-brand, white-label, API, SSO và private AI.

## 1.3. Các câu hỏi hệ thống phải trả lời

1. Lead/khách hàng nào có giá trị cao và cần được ưu tiên?
2. Content, campaign, creator, website page hoặc livestream nào tạo doanh thu và **contribution margin thực**?
3. Kênh bán nào đang có hiệu quả tốt nhất sau giá vốn, discount, fee, return và commission?
4. Order, tồn kho, carrier, checkout hoặc customer journey nào có rủi ro?
5. Hành động tiếp theo nào do nhân viên hoặc AI Agent thực hiện để tối ưu doanh thu, margin hoặc trải nghiệm?

## 1.4. Trụ cột cạnh tranh

| Trụ cột | Giá trị khác biệt | Kết quả kỳ vọng | So với Haravan |
|---|---|---|---|
| AI-native Operations | AI Agent có knowledge, tool permission, policy, approval và audit | Tăng năng suất, giảm SLA, kiểm soát rủi ro | Vượt AI Chat đơn thuần |
| Revenue Intelligence | Liên kết creative, ads, creator, web, social, order, cost và margin | Quyết định đầu tư theo lợi nhuận thực | Haravan mạnh GMV/CVR/pixel; yếu margin graph |
| Website Commerce Platform | Template Marketplace, Brand Kit, Visual Builder, Storefront, PWA, AI conversion | Website có conversion và vận hành gắn commerce core | Vượt Haraweb theme+editor theo hướng Shopify-grade governance |
| Vietnam-first Enterprise | Zalo, social selling, COD, sàn, e-invoice, workflow và đa chi nhánh | Phù hợp nghiệp vụ VN | Parity vận hành; vượt ở enterprise configurability |
| Agency-to-Commerce Bridge | Brief, creative, KOL/KOC, media, lead, order, ROI và client portal | Khác biệt agency/brand ops | Haravan chưa định vị mạnh agency OS |

---

# 2. Phạm vi và phân lớp sản phẩm

## 2.1. Phạm vi in scope

| Domain | Phân hệ | Ghi chú cạnh tranh |
|---|---|---|
| Foundation | Tenant, organization, legal entity, brand, store, warehouse, user, RBAC, audit | Parity + enterprise isolation |
| Commerce Core | PIM, pricing, promotion, cart, checkout, OMS, fulfillment, return/refund | Parity Haravan order/inventory |
| Website Commerce | Storefront, template marketplace, theme library, Brand Kit, Site Builder, CMS, SEO, PWA, headless, analytics | **Differentiation trung tâm** |
| Corporate GTM Website | Public marketing website, product tour, lead capture, demo booking, resource hub, case study, pricing CTA | Bán chính PTT |
| Omnichannel Sales | POS, social inbox, chatbot, comment-to-order, livestream, marketplace | **Parity cứng** vs Harasocial/POS/sàn |
| Operations | Inventory, warehouse, shipping, COD, payment, finance ops, e-invoice | Parity 12+ payment / 15+ carrier / VAT |
| Customer Growth | Customer 360, segment, loyalty, referral, journey, service recovery | Parity CRM + vượt NBA/journey ROI |
| Content Commerce | Content asset, creative workflow, creator/KOL/KOC, affiliate, campaign/media | **Differentiation** |
| Revenue Intelligence | Attribution, unit economics, profitability, forecast, executive insight | **Differentiation** |
| AI Platform | AI Agent, RAG, Knowledge Hub, model routing, evaluation, governance | **Differentiation** |
| Enterprise | Workflow, approval, custom object, white-label, SSO, API/webhook, private AI | **Differentiation** |

## 2.2. Các lớp giao diện

| Lớp giao diện | Actor | Mục tiêu |
|---|---|---|
| Corporate Marketing Website | CEO, founder, buyer, enterprise, agency | Định vị PTT, thu lead, book demo, tải tài liệu, product tour |
| Admin Command Center | Owner, executive, operator | KPI, **margin**, order, exception, AI insight, approval |
| Website Commerce Admin | E-commerce manager, merchant, agency | Storefront, domain, theme, page, SEO, conversion, publish |
| Template Marketplace | Merchant, designer, agency | Khám phá/mua/cài template theo ngành và conversion goal |
| Visual Site Builder | Merchant, designer, agency | Dựng page no-code theo section/block và Brand Kit |
| Merchant Storefront | Khách mua cuối | Catalog, PDP, cart, checkout, loyalty, tracking, support |
| Mobile Web / PWA | Khách mua mobile | Mobile conversion, deep link social, fast checkout, push |
| POS / Warehouse App | Cashier, store/kho | Bán tại quầy, scan, inventory, pick/pack/stocktake |
| Social / Live Console | Sales, CSKH, host | Inbox, comment, chat-to-order, livestream, AI assistance |
| Content Revenue Studio | Marketing, creative, agency | Brief, asset, creator, campaign, revenue/margin |
| AI Agent Studio | AI Ops, admin | Agent, knowledge, tool, policy, evaluation, cost |
| Client / Brand Portal | Enterprise/agency client | White-label report, approval, asset/campaign collaboration |

## 2.3. Out of scope MVP

- MRP/sản xuất đầy đủ.
- Payroll/HRM.
- General ledger thay thế ERP kế toán.
- Last-mile route optimization tự phát triển.
- Cross-border marketplace compliance chuyên sâu.
- AI tự thực hiện action rủi ro cao không policy/approval.

## 2.4. Chiến lược phạm vi để thắng Haravan

```text
Layer A — Table stakes (không có = thua SMB ngay):
  Website bán hàng + SEO + mobile
  Social inbox (FB/IG/Zalo/TikTok/Shopee chat)
  Comment-to-order + Livestream keyword order
  POS chuỗi + tồn đa kho
  Marketplace Shopee/Lazada/TikTok Shop/Tiki
  Payment/COD/Carrier/E-invoice
  CRM 360 + segment + loyalty + broadcast cơ bản

Layer B — Win themes (Haravan yếu / chưa dẫn):
  Contribution margin & Revenue Graph
  Website Theme Marketplace + Brand Kit + Go-live Governance + CWV/rollback
  Content/KOL creative → margin attribution
  Guardrailed multi-agent AI (không chỉ chatbot)
  Agency client portal + white-label
  Enterprise workflow / custom object / SSO / private AI

Layer C — Moat dài hạn:
  Vertical Playbooks (Beauty, Agency, B2B, Education, Real Estate)
  Developer/Headless + App Block ecosystem chất lượng
  Data network effects (benchmark ngành ẩn danh)
```

---

# 3. Kiến trúc nghiệp vụ cấp cao

```text
Corporate Website
→ Lead Capture / Demo Booking
→ PTT CRM Lead Pipeline / Sales Copilot
→ Product Demo / Sandbox / Onboarding
→ Admin Command Center
→ Website Commerce Admin
→ Template Marketplace → Theme Library → Visual Site Builder
→ Merchant Storefront / Mobile Web / PWA
→ Cart / Checkout / OMS / CRM / Loyalty / Shipping / Finance
→ Revenue Intelligence / AI Insight / Automation / Enterprise Workflow
```

```text
Channels
├── Corporate Website
├── Merchant Website / Mobile Web / PWA
├── POS / Store
├── Facebook / Instagram / Messenger
├── Zalo OA
├── TikTok / Livestream
├── Shopee / Lazada / TikTok Shop / Tiki
└── B2B/API Portal
             │
             ▼
PTT Commerce Intelligence OS
├── Catalog / Price / Promotion
├── Website Commerce / Checkout
├── Customer 360 / Loyalty / Journey
├── OMS / Inventory / Fulfillment / COD
├── Content / Creator / Campaign
├── Revenue Intelligence
├── AI Agent / Knowledge Hub
├── Workflow / Approval / Audit
└── Integration Hub
```

### Luồng “bán như Haravan” phải chạy được end-to-end

```text
Comment / Live keyword / DM
→ Unified Inbox
→ Cart suggestion / Order draft
→ Confirm + Reserve stock
→ Payment / COD
→ Carrier handover
→ Tracking notify (ZNS/Messenger)
→ Loyalty earn
→ Attribution + margin close
```

---

# 4. Stakeholder và vai trò

| Vai trò | Nhu cầu chính | Kỳ vọng khi so Haravan |
|---|---|---|
| Owner / CEO | Revenue, margin, cashflow, forecast, risk, executive approval | Thấy **lãi thật theo kênh**, không chỉ doanh thu |
| Super Admin | Tenant, subscription, integration, security, RBAC, audit | SSO/audit enterprise rõ hơn |
| E-commerce Manager | Website, domain, catalog, template, SEO, conversion, promotion | Go-live nhanh + đo CVR/margin theo page |
| Designer / Agency | Brand Kit, visual builder, content, template custom, approval, portal | Giao nhiều brand; client duyệt; không mất mapping |
| Store Manager | POS, employee, shift, store inventory, revenue | Đồng bộ online–offline như Haravan POS |
| Cashier | POS order, payment, receipt, return/exchange | Nhanh, QR, split payment |
| Social Sales | Inbox, lead, chat/order draft, live commerce | Parity Harasocial; AI draft an toàn |
| Warehouse Staff / Manager | Receive, pick, pack, stocktake, transfer, QC | Oversell thấp hơn nhờ reservation |
| Finance / Accountant | Payment, COD reconciliation, cashbook, invoice, debt | E-invoice đa kênh + COD đối soát |
| CRM Marketer | Segment, campaign, journey, loyalty, attribution | Broadcast đa kênh + ROI/journey |
| Content / Media Team | Brief, creative, campaign, creator, performance | Biết video/KOL nào có margin |
| Customer Care | Ticket, return, review, service recovery | Context 360 + playbook |
| Integration Admin | API, webhook, connector, sync log, credential scope | Connector ổn định, resync, DLQ |
| AI Ops | Agent, prompt, knowledge, evaluation, budget, policy | Cost/policy/eval — Haravan chưa có OS này |
| Customer | Storefront, account, order, loyalty, return request, consent | Checkout ngắn, tracking rõ, mobile mượt |

---

# 5. Nguyên tắc dữ liệu và business rules

## 5.1. Nguyên tắc dữ liệu

1. Một tenant có thể có nhiều legal entity, brand, storefront, store, warehouse, channel và user.
2. Product/Variant là nguồn dữ liệu chuẩn dùng cho POS, marketplace, website và social order.
3. Customer được hợp nhất theo identity resolution: phone, email, social ID, marketplace ID, loyalty ID và consent.
4. Order có internal ID duy nhất, external ID theo nguồn, source/campaign/content attribution nếu có.
5. Inventory tách on-hand, reserved, available, incoming, blocked, in-transit.
6. Transactional data và analytics data tách lớp; metric tài chính/attribution có version công thức.
7. Website storefront dùng dữ liệu product, price, stock, promotion, customer, loyalty từ commerce core.
8. AI luôn tuân tenant boundary, RBAC, tool policy, budget, risk policy và approval matrix.
9. Integration write phải idempotent, retryable, có dead-letter queue và reconciliation.
10. Mọi thay đổi tiền, tồn, đơn, quyền, publish, AI action phải có audit.

## 5.2. Business rules trọng yếu

| Mã | Quy tắc |
|---|---|
| BR-001 | SKU unique theo tenant/product policy |
| BR-002 | Không confirm order vượt available stock, trừ oversell/backorder policy |
| BR-003 | Reserved stock tăng khi confirm/allocate và release khi cancel/timeout |
| BR-004 | External marketplace order ID unique theo channel account |
| BR-005 | Order đã handed-over không sửa trực tiếp item/price; thay đổi qua cancel/return workflow |
| BR-006 | Transaction không hard-delete; dùng archive/void cùng audit |
| BR-007 | Paid order cancel phải tạo refund/credit workflow |
| BR-008 | Product expired không allocate/bán; FEFO nếu policy bật |
| BR-009 | Inventory adjustment cần reason, threshold approval và audit |
| BR-010 | Export PII phải có permission riêng và audit |
| BR-011 | Marketing phải kiểm tra consent, channel policy và frequency cap |
| BR-012 | Write API/callback dùng idempotency và correlation ID |
| BR-013 | Webhook outbound signed, retryable, observable, replayable |
| BR-014 | Financial data đã reconciliation chỉ điều chỉnh bằng chứng từ mới |
| BR-015 | Một storefront chỉ có một Published Theme tại một thời điểm |
| BR-016 | Theme/page publish cần preview, version, audit và rollback reference |
| BR-017 | Theme update không phá content/product mapping nếu chưa compatibility validation |
| BR-018 | AI high-risk action phải qua policy + approval |
| BR-019 | Attribution/cost formula phải version, không rewrite historical metric tùy tiện |
| BR-020 | Tracking phải tôn trọng consent, data quality limitation và privacy policy |
| BR-021 | Checkout không tin client-side price/discount/total |
| BR-022 | Deal chồng deal / stacking chỉ theo priority–conflict engine đã cấu hình |
| BR-023 | Social/live order draft phải gắn product snapshot + channel thread ID |
| BR-024 | E-invoice phát hành theo legal entity đúng với order ownership |
| BR-025 | Go-live checklist fail chặn publish trừ waiver có approval |

---

# 6. Functional Requirements — Foundation & Commerce Core

> Mỗi nhóm FR dưới đây có **Parity Haravan** (bắt buộc ngang tầm) và **PTT Plus** (điểm thắng).

## 6.1. FR-ORG — Organization, Brand, Store, Warehouse

**Yêu cầu gốc (giữ & làm dày):**

- Tạo/cập nhật/suspend tenant, legal entity, brand.
- Khai báo tax, timezone, language, currency, subscription, modules, quota.
- Tạo store/branch/warehouse: physical, online, return, quarantine, in-transit.
- Gán warehouse/price list/fulfillment policy theo channel/store.
- Archive thay vì hard-delete đơn vị có transaction.

**Chuyên sâu bổ sung:**

| ID | Chi tiết | Priority |
|---|---|---|
| FR-ORG-010 | Multi-store unlimited trên 1 tenant (parity chuỗi Haravan) | Must |
| FR-ORG-011 | Channel account binding: Fanpage/OA/Shop/POS register | Must |
| FR-ORG-012 | Legal entity → tax profile → e-invoice series mapping | Must |
| FR-ORG-013 | Brand isolation cho agency multi-client | Should |

**Acceptance:** Tạo 1 brand + 3 store + 2 warehouse + 1 storefront trong < 30 phút onboarding guided.

## 6.2. FR-IAM — User, RBAC, Audit

- Invite, activate, suspend, reset password, MFA, session/login history.
- Permission: view/create/update/approve/cancel/delete/export/import/configure/integration manage.
- Data scope: own/team/brand/store/warehouse/channel/tenant.
- Sensitive permission: price override, refund, stock adjustment, publish site, export PII, view margin, manage secret, approve AI action.
- Audit actor, device, time, entity, before/after, reason, approval, correlation ID.

**PTT Plus vs Haravan:** `view margin`, `approve AI action`, `publish site` là permission hạng nhất; audit export cho enterprise.

**Acceptance:** User store A không xem đơn/tồn store B nếu scope = store; export PII luôn sinh audit.

## 6.3. FR-PIM — Product, Variant, Pricing

- Product simple, variant, combo, bundle, service, digital, gift.
- SKU, barcode, supplier code, weight/dimension, tax, media, SEO.
- UOM conversion, lot, expiry, serial, FEFO/FIFO.
- Price list retail/wholesale/VIP/employee/marketplace/branch; time, quantity, contract policy.
- Bulk import/export and validation.

**Parity Haravan:**

- Import hàng loạt không giới hạn catalog scale hợp lý.
- Đồng bộ listing sang FB Shop / Zalo / sàn (qua connector).
- Copy sản phẩm từ sàn về PIM (parity “sao chép từ sàn”).

**PTT Plus:** Channel-specific price & content override vẫn giữ master variant; SEO/media gắn Brand Kit.

## 6.4. FR-PROMO — Promotion Engine

- Percentage/fixed discount, voucher, BOGO, bundle, gift, tier discount, freeship, flash sale, member pricing, channel promotion, stacking.
- Time/product/channel/segment/budget/usage/priority/conflict/approval/audit rule.
- Promotion snapshot stored with order.

**Parity bắt buộc:** Deal chồng deal có kiểm soát conflict (Haravan đã ship “Deal chồng deal”).

**Acceptance:** Hai deal hợp lệ stack đúng rule; deal xung đột bị block hoặc ưu tiên theo priority; snapshot lưu trên order.

## 6.5. FR-OMS — Order Management

### Order sources

Website, POS, social/chatbot/livestream, marketplace, B2B/API, import, manual.

### Order lifecycle

```text
DRAFT → PENDING_CONFIRMATION → CONFIRMED → ALLOCATED → PICKING
→ PACKED → READY_TO_SHIP → HANDED_OVER → IN_TRANSIT → DELIVERED → COMPLETED

DRAFT/PENDING_CONFIRMATION/CONFIRMED → CANCELLED
CONFIRMED/ALLOCATED/PICKING/PACKED → ON_HOLD
HANDED_OVER/IN_TRANSIT → DELIVERY_FAILED
HANDED_OVER/IN_TRANSIT/DELIVERED → RETURN_REQUESTED
RETURN_REQUESTED → RETURN_IN_TRANSIT → RETURN_RECEIVED → REFUNDED/CLOSED
```

**Chuyên sâu (parity vận hành Haravan):**

| ID | Requirement | Priority |
|---|---|---|
| FR-OMS-010 | Inbox/live comment tạo order draft 1-click kèm product snapshot | Must |
| FR-OMS-011 | Gộp đơn / tách đơn có audit & giữ attribution | Must |
| FR-OMS-012 | Bulk cập nhật trạng thái / bulk đẩy vận chuyển | Must |
| FR-OMS-013 | Suspect duplicate queue (phone+address+SKU window) | Must |
| FR-OMS-014 | Partial fulfill / backorder theo policy | Should |
| FR-OMS-015 | Return auto cập nhật tồn + phân loại theo kênh/sàn | Must |

**Acceptance:** Đơn social và đơn web cùng customer identity hợp nhất; handover xong không sửa line trực tiếp.

## 6.6. FR-INV — Inventory & Warehouse

```text
On-hand = tồn thực tế
Reserved = tồn đã giữ
Available = On-hand - Reserved - Blocked
Incoming = hàng đang nhập
In-transit = hàng đang điều chuyển
Blocked = hư hỏng/quarantine/expired/không bán
```

- Inventory ledger: receipt, issue, sale, return, adjustment, transfer, reservation, release, stocktake.
- Receiving, lot/expiry/serial/cost, partial receipt.
- Stock adjustment reason/approval/audit.
- Stocktake multi-count/blind count/variance approval.
- Transfer: Draft → Requested → Approved → Picked → Shipped → Received → Completed.

**Parity Haravan:** Tồn theo địa điểm realtime; đồng bộ web–POS–sàn; live campaign cập nhật tồn liên tục.

**PTT Plus:** Reservation cứng khi confirm (giảm oversell) + channel buffer policy + alert stockout priority SKU.

## 6.7. FR-SHIP — Shipping, Carrier, COD

- Carrier connector, quote, zone/service validation.
- Create/cancel shipment, label, manifest, bulk handover.
- Tracking webhook/polling, normalized state, exception queue, customer notification.
- COD expected/collected/remitted/reconciliation/dispute/debt.
- Carrier recommendation by cost, SLA, success rate, COD risk.

**Parity target:** ≥ 15 nhà vận chuyển phổ biến VN (Haravan claim 15+); COD đối soát đầy đủ.

**Acceptance:** Tạo vận đơn hàng loạt từ OMS; trạng thái chuẩn hóa; COD unmatched vào dispute queue.

## 6.8. FR-PAYFIN — Payment, Finance, E-invoice

- Cash, COD, bank transfer, QR, card, wallet, deposit, partial payment, BNPL, gift/points.
- Payment transaction/provider callback/refund.
- Cashbook, receipt/payment voucher, attachment, approval.
- Customer/supplier/carrier debt, aging, credit limit.
- E-invoice request, issue, adjust, replace, cancel, PDF/XML/status.

**Parity target:** ≥ 12 cổng/phương thức thanh toán; QR xác nhận tự động; **Haravan Invoice-like** xuất VAT đa kênh.

**Acceptance:** Callback verify chữ ký; idempotent; e-invoice map đúng legal entity; không log PAN/secret.

---

# 7. Website Commerce Platform — Chuyên sâu

## 7.1. Mục tiêu Website Commerce

Website Commerce là product line độc lập:

```text
Website Commerce Admin
→ Template Marketplace
→ AI Theme Matchmaker
→ Theme Library
→ Brand Kit
→ Visual Site Builder
→ Pages / CMS / Landing Pages
→ Storefront Desktop / Mobile Web / PWA
→ Cart / Checkout / Customer Account
→ SEO / Performance / Analytics
→ AI Shopping Assistant / Conversion Intelligence
→ Go-live Governance / Headless Developer Platform
```

### So Haraweb — phải hơn ở đâu?

| Haraweb mạnh | PTT parity | PTT thắng |
|---|---|---|
| 400+ giao diện, SEO, SSL, domain, mobile | Kho template đủ ngành + SSL/domain/SEO | Template có **Conversion score / Mobile score / Playbook** |
| Editor tùy chỉnh không code | Visual Site Builder tương đương | Brand Kit + version/staging/rollback + go-live gate |
| Blog, filter, review, promo, GA/pixel | Đầy đủ | Funnel + **revenue/margin by page** + experiment |
| App store phong phú | App blocks + connectors | Schema-driven blocks + security allowlist |
| Đồng bộ FB/Zalo/sàn | Connector parity | Deep link social + PWA + CWV regression sau publish |

## 7.2. FR-WCP-001 — Storefront Management

- Tạo nhiều storefront theo brand/thị trường/legal entity/audience.
- Cấu hình domain/subdomain, locale, currency, tax, catalog, price list, warehouse, promotion, shipping, payment.
- State: Draft, Staging, Published, Maintenance, Archived.
- Preview URL cho staging/draft.
- Access: public, password-protected, B2B login-only, regional restriction.
- Multi-language/currency rollout support.

**AC:** Merchant gắn domain + SSL trong wizard; Staging không lộ sản phẩm nháp ra public index.

## 7.3. FR-WCP-002 — Template Marketplace

### Template discovery

- Free, Premium, Vertical Playbook, Agency, Enterprise Custom theme.
- Industry: Beauty/Spa, Fashion, F&B, Retail, Electronics, Home, B2B, Education, Real Estate.
- Goal: conversion, landing page, premium branding, catalog, social/live, lead generation, B2B quote.
- Layout: one-page, catalog, editorial, mobile-first, multi-brand, campaign.
- Search/filter/sort by conversion score, mobile score, SEO/performance, price, rating, version, updated date, app blocks.
- Desktop/mobile live demo and sandbox.
- Feature matrix: filter, quick add, bundle, review, loyalty, store locator, pre-order, blog, booking, quote, AI chat.

### License, purchase, install

- License: free, one-time, subscription, agency, enterprise custom.
- Trial/preview, purchase record, invoice, owner, expiry/renewal.
- Install to Theme Library, update/changelog/compatibility warning.
- Rating/review/support reference.

### AI Theme Matchmaker

**Input:** Industry/business model; growth goal; acquisition channel; catalog scale; brand style; required App Blocks; budget; in-house/agency capability.

**Output:** Ranked theme; Conversion Playbook + setup checklist; suggested Brand Kit/app blocks; homepage/landing structure; migration estimate/compatibility warning.

**Upgrade thắng Haravan:** Không đua “số theme” mù quáng — đua **theme có playbook chuyển đổi + đo được sau install**. Mục tiêu MVP: 30–50 vertical playbook chất lượng > 400 theme mỏng.

## 7.4. FR-WCP-003 — Theme Library, Version, Publish

- Theme states: Installed, Draft, Staging, Published, Archived, Error/Compatibility Warning.
- Một storefront chỉ có một Published Theme; nhiều Draft/Staging Theme được phép.
- Clone/duplicate/preview/set staging/publish/schedule/maintenance mode.
- Backup published theme, rollback, diff/changelog, validation.
- Update không được mất content/product mapping.
- Import/export package, schema/security/asset size validation.
- Agency delivery workflow: submit → review → accept → install → staging → publish.

**AC:** Rollback về version trước trong < 5 phút thao tác; diff hiển thị section đổi.

## 7.5. FR-WCP-004 — Brand Kit & Design System

Brand Kit gồm: logo/favicons/watermark; colors; fonts/typography scale; spacing/radius/button/icon tokens; tone of voice, key message, default CTA; media library; social/contact; delivery/return/warranty/privacy/terms; SEO/OG defaults.

Requirements: inheritance tenant→brand→storefront→page→section; apply on install; override by permission; version/approval/rollback; brand compliance score.

**Đây là capability Haravan gần như không có ở mức design-system** — ưu tiên ship sớm cho agency.

## 7.6. FR-WCP-005 — Visual Site Builder

### No-code editing

- Drag/drop section/block; inline edit text/media/CTA/link.
- Style: layout, background, spacing, border, typography, animation basic.
- Responsive Desktop/Tablet/Mobile; autosave, undo/redo, draft, version, publish/schedule/rollback.
- Reusable/global section, saved block, app embed; preview/staging review link.

### Section/block library

Announcement, header, mega menu, hero, collection, product grid, flash sale, countdown, bundle, video, livestream, testimonial, review, UGC, brand story, blog, FAQ, contact/lead form, booking, store locator, newsletter, loyalty signup, social proof, footer.

### AI Site Builder Assistant

- Draft page outline, headline, CTA, product copy, FAQ, SEO meta.
- Recommend section/layout by goal/industry.
- Brand tone/claim risk check; mobile conversion recommendation; A/B variants.
- Không tự publish hoặc sửa price/legal policy without approval.

## 7.7. FR-WCP-006 — Page, Landing Page, CMS

- Home, PDP/collection/cart/checkout/account templates (allowed scope).
- Static page, blog/category/tag.
- Campaign, creator/KOL, livestream replay, B2B quote, booking landing.
- Slug, redirect, canonical, SEO/OG/schema.
- Publish schedule, page version, approval, clone.
- Campaign/creator/promo/segment/tracking relation.
- Access/password; A/B experiment.

**Parity Haraweb:** Blog SEO + landing booking/lead form mạnh.

## 7.8. FR-WCP-007 — Navigation and Media

- Header/footer/mega menu/mobile bottom navigation.
- Menu links: page, collection, product, external, campaign, dynamic segment.
- Media library: image/video/doc/icon/3D/360; compression, srcset, WebP/AVIF.
- Alt, rights, expiry, usage map; CDN/lazy/cache invalidation.

## 7.9. FR-WCP-008 — Storefront Catalog & Product Experience

### Catalog/Search

Collection/category/brand/search; filter/sort/suggestion/synonym/typo/zero-result; related/cross-sell/upsell/FBT/recent/wishlist/back-in-stock.

### PDP

Gallery image/video/UGC/360; variant; price/compare-at/member/BNPL; stock; specs; bundle/subscription/gift; review/Q&A; delivery estimator/pickup/local stock; Zalo/Messenger/hotline/AI assistant; sticky ATC; events view/select/cart/wishlist.

### Personalization

Segment-aware banner/product/promo; loyalty display; geo/store stock; experiment variants.

**Parity:** Gợi ý SP liên quan + gợi ý khuyến mãi (Haravan nhấn mạnh).

## 7.10. FR-WCP-009 — Cart, Checkout, Account

### Cart

Add/update/remove; validate stock/price/promo/bundle/MOQ; voucher/gift/freeship/point/gift card; cross-device persistence; abandoned-cart trigger.

### Checkout

Guest/logged-in; identity/address autocomplete; shipping quote/ETA; COD/transfer/QR/card/wallet/deposit/partial/BNPL; tax/consent/note; **server-side recalculation + idempotency**; error/retry UX; funnel events.

### Customer account

OTP/password/SSO (Apple/Google/Zalo parity); profile/address/consent/order/tracking; loyalty/tier/voucher/referral/wishlist/reorder; return/warranty; privacy export/delete; thanh toán đơn chưa hoàn tất (parity trang tài khoản mới Haravan).

## 7.11. FR-WCP-010 — Mobile Web & PWA

Mobile-first, bottom nav, sticky ATC, quick add, short checkout; deep link TikTok/FB/Zalo/ads/KOL/live; CWV monitor; PWA add-to-home/offline shell/push consent.

**Upgrade thắng:** Mobile conversion toolkit đo LCP/INP/CLS theo theme — Haravan ít communicate CWV governance.

## 7.12. FR-WCP-011 — SEO, Performance, Tracking

Meta/canonical/robots/sitemap/redirect/schema/OG; broken link/missing meta alerts; CDN/cache/media opt; LCP/INP/CLS/TTFB; regression alert post publish; GA/GTM, Meta Pixel/CAPI, TikTok Pixel, Zalo tracking; UTM/referral/coupon/creator attribution; consent-aware data quality.

**Parity:** Pixel/CAPI/TikTok events (Haravan đã có gửi event TikTok Ads từ hội thoại/đơn).

## 7.13. FR-WCP-012 — AI Shopping Assistant & Conversion Intelligence

Answer product/policy/stock/delivery/order với Knowledge Hub; recommend product/bundle; create lead/cart/order draft trong policy; human handoff; citation; no unauthorized price/refund/policy; detect drop-off/slow page/stock mismatch/broken tracking; recommend CTA/layout/offer/A-B.

**Vs Haravan AI Chat:** Không chỉ “trả lời 24/7” — phải gắn tool permission + margin-aware recommend + conversion diagnostics.

## 7.14. FR-WCP-013 — Theme Developer & Headless Commerce

Theme CLI/SDK; schema section/block/settings; local dev, package upload, staging, lint/security/performance; Git workflow; custom app block; webhooks; headless API product/cart/checkout/customer/content; version/rate limit/auth scope.

**Parity/Plus:** Haravan có Open API & headless exclusives ở gói cao — PTT phải có API-first sớm để agency/dev không bị khóa.

## 7.15. FR-WCP-014 — Website Go-live Governance

### Checklist

Catalog/price/inventory sync; checkout/payment/COD/shipping; account/loyalty/return; domain/SSL/Brand Kit; SEO/sitemap/robots/schema; analytics/pixel/consent; CWV; backup + staging review; brand/legal/owner approval.

### Publish workflow

```text
Draft/Staging
→ Automated Validation
→ Performance/SEO/Tracking/Checkout Tests
→ Backup Current Published Version
→ Approval (if required)
→ Scheduled/Immediate Publish
→ CDN Cache Invalidation
→ Health Monitoring
→ Automatic/Manual Rollback if critical failure
```

**Đây là moat vận hành website** — biến PTT thành “website không sợ publish”.

## 7.16. Website Commerce Data Model

| Entity | Mô tả |
|---|---|
| Storefront | Public website/shop |
| Template | Marketplace template product |
| TemplateLicense | License/ownership/expiry |
| Theme | Installed storefront theme |
| ThemeVersion | Theme schema/config/version/publish status |
| BrandKit | Token, asset, typography, tone, SEO defaults |
| Page / PageVersion | CMS page và version |
| SectionInstance / BlockInstance | Builder configuration |
| MediaAsset | Image/video/document rights and usage |
| NavigationMenu | Header/footer/mobile menu |
| Experiment | A/B test/variant/audience/metric |
| PublishJob | Publish/schedule/rollback reference |
| StorefrontEvent | Web behavior event |
| SeoAudit | SEO/performance/tracking validation |
| GoLiveChecklist | Validation item/status/owner/approval |

---

# 8. Corporate GTM Website

## 8.1. FR-CORPWEB-001 — Homepage

Announcement bar, header, mega menu; hero value proposition + Product UI showcase; social proof/case metric; problem-to-solution; product module tour; Website Commerce showcase; industry/role solution; enterprise integration/security; CTA demo/assessment; FAQ/footer.

**Bổ sung cạnh tranh:** Trang so sánh có kiểm soát (capability matrix vs “omnichannel phổ biến”) — không cần gọi tên đối thủ trên UI nếu Legal không muốn; Sales kit nội bộ thì có.

## 8.2–8.6. Giữ yêu cầu gốc và làm dày AC

| ID | Module | AC chính |
|---|---|---|
| FR-CORPWEB-002 | Product/Solution pages | Mỗi module: problem → workflow → UI → KPI → CTA |
| FR-CORPWEB-003 | Industry/Role pages | Beauty, D2C, B2B, RE, Edu, Agency + role CEO/Mkt/Ops |
| FR-CORPWEB-004 | Lead & Demo | Consent + UTM + dedupe + CRM routing + SLA task + Copilot summary |
| FR-CORPWEB-005 | Case/ROI/Resource | Before/after KPI; ROI assumptions; gated score |
| FR-CORPWEB-006 | Pricing/Tour/Governance | Plan comparison; interactive tour; CMS approval/version |

---

# 9. Omnichannel Sales — Parity cứng với Haravan

## 9.1. FR-POS — Point of Sale

- POS location/register/shift/cash opening-closing.
- Barcode/SKU scan, customer, price/promotion/loyalty.
- Split payment, receipt, exchange/return.
- Offline queue where applicable.
- Sync inventory, OMS, reporting.

**Parity Haravan POS:** Đa cửa hàng; sửa giá nhanh theo quyền; QR confirm; báo cáo theo chi nhánh/NV; đổi trả web→store.

## 9.2. FR-SOCIAL — Unified Inbox (Harasocial parity)

| ID | Requirement | Priority | Haravan ref |
|---|---|---|---|
| FR-SOC-001 | Inbox đa kênh: FB/IG/Messenger, Zalo OA, Shopee Chat, TikTok for Business | Must | Harasocial |
| FR-SOC-002 | Owner/SLA/tag/note/mention + customer-order context | Must | Có |
| FR-SOC-003 | Chatbot + AI reply + upsell + human handoff | Must | AI Chat / Meta Agent |
| FR-SOC-004 | Comment-to-order / Reels/Post → gửi giỏ Messenger | Must | Có |
| FR-SOC-005 | Messenger checkout / Click-to-Messenger ads flow | Must | Có |
| FR-SOC-006 | Messenger calling / video call collab (phase) | Should | New Haravan |
| FR-SOC-007 | Intent/sentiment/moderation/escalation | Should | Một phần |
| FR-SOC-008 | Review/rating quản lý hội thoại + đơn | Should | New |

**PTT Plus:** Mọi AI reply đi qua policy; order draft có risk score; gắn content/campaign ID để ra margin.

## 9.3. FR-LIVE — Live Commerce Center

- Plan: host/script/product/deal/inventory/GMV target/personnel.
- Realtime viewers/comments/orders/GMV/inventory.
- Keyword/SKU/comment-to-order/AI suggestion.
- Alert stock/comment/conversion/backlog/claim risk.
- Post-live payment recovery/remarketing/report.

**Parity:** Quét keyword tự tạo đơn + gợi ý giỏ trên màn live + tồn realtime + retarget khách cũ (Haravan live features).

**PTT Plus:** Post-live contribution margin (return/COD fail trừ ra); claim risk queue.

## 9.4. FR-MKTPLACE — Marketplace

- Multi-account; product/listing/SKU mapping.
- Stock sync/reconciliation; order/return/refund/tracking sync.
- Error/retry/resync/audit.
- Import listing từ sàn → PIM.
- Multi-warehouse map TikTok Shop/Shopee (parity).

**Acceptance:** Lag tồn mục tiêu ≤ 60s tùy API đối tác; unmatched order vào exception.

---

# 10. Customer Growth Platform

## 10.1. FR-CRM — Customer 360

Profile: identity, consent, order, conversation, ticket, review, loyalty, segment, attribution, RFM, value, risk/churn, custom field; match/merge/unmerge audit.

**Parity:** RFM 360 (Haravan new); đồng bộ đa nền tảng.

## 10.2. FR-SEG — Segmentation

Geo, spend, AOV, frequency, RFM, product, channel, website behavior, cart, campaign, loyalty, tag, custom; AND/OR/time window.

## 10.3. FR-LOY — Loyalty, Referral, Community

Earn/redeem ledger, tier, expiry, voucher/gift; referral/ambassador fraud controls; UGC/event linkage.

## 10.4. FR-JRN — Journey Orchestration

```text
Trigger → Condition → Delay/Wait Event → Action → Branch → Exit/Conversion
```

Actions: Email/SMS/ZNS/Messenger/push/task/webhook/tag/voucher.

**Parity Broadcast Haravan:** Zalo ZNS, Email, Messenger, SMS — cá nhân hóa theo segment.

**PTT Plus:** Holdout + ROI + frequency cap + conflict journey; đo contribution không chỉ open rate.

## 10.5. FR-CX — Next Best Action & Service Recovery

Recommend call/reminder/education/bundle/voucher/live invite/care/escalation/no-contact; evidence/expected outcome/cost/owner; playbook delay/fail/defect/negative review/dispute/VIP.

---

# 11. Content-to-Commerce & Revenue Intelligence

> Đây là **chiến trường Haravan chưa chiếm**. Không được hy sinh parity Layer A, nhưng đây là lý do brand/agency trả tiền cao hơn.

## 11.1. FR-CONTENT — Content Asset and Workflow

Content asset: type, brand, campaign, product, target, brief, objective, message, CTA, channel, owner, creator, approval, version, media, transcript, UTM, cost, performance.

```text
IDEA → BRIEF → PRODUCTION → INTERNAL_REVIEW → BRAND_APPROVAL
→ SCHEDULED → PUBLISHED → MEASURED → OPTIMIZED → ARCHIVED
```

## 11.2. FR-CREATOR — KOL/KOC/Affiliate

Profile/rate card/contract/deliverable/sample/commission; coupon/referral tracking; view→order→return→revenue→**margin**→LTV; payout/reconciliation/compliance.

## 11.3. FR-CREATIVE-AI — Creative Intelligence

Analyze hook/CTA/transcript/visual/sentiment/format/host/time; recommend A/B script/caption/brief; brand/claim risk; link creative to revenue/margin/repeat.

## 11.4. FR-RI — Revenue Intelligence

```text
Campaign → Ads / Creative → KOL/KOC/Affiliate → Content/Video/Live
→ Landing Page / Conversation / Lead → Cart / Order / Payment
→ Return / Refund / Repeat Purchase → Margin / Contribution Profit
```

- Attribution versioned: first, last, linear, time decay, position, rule/data-driven, sales-assisted.
- Unit economics: GMV, net revenue, COGS, discount, shipping subsidy, payment fee, marketplace fee, ad spend, commission, return cost, contribution margin, CAC, LTV, LTV:CAC.
- AI insight: margin decline, return anomaly, low CVR, churn, stockout, carrier issue, weak content, SLA.
- Forecast & scenario.

**Messsage thắng Haravan cho CEO:** *“Biết kênh nào lãi, không chỉ kênh nào bán chạy.”*

---

# 12. AI Platform

## 12.1. FR-AI-001 — AI Command Center

Agent list/status/objective/KPI; prompt/workflow/knowledge/model version; cost, latency, error, tool call, policy monitoring; pause/rollback/kill switch.

## 12.2. FR-AI-002 — Agent Catalog

| Agent | Nhiệm vụ | Quyền tối đa |
|---|---|---|
| Sales Copilot | Reply, product, upsell, objection | Lead/order draft |
| Customer Care Agent | FAQ, tracking, return, warranty | Ticket/RMA draft |
| Marketing Copilot | Content, segment, campaign | Campaign draft |
| Merchandising Agent | Stock/slow-moving/combo | Proposal draft |
| Order Risk Agent | Cancel/return/fraud score | Review queue |
| Warehouse Copilot | Pick/pack/exception | Task proposal |
| Executive Agent | Summary, forecast, query | Read-only/report draft |
| Content Intelligence Agent | Creative/KOL/video | Insight/task |
| Website AI Assistant | Theme match, site copy, shopping/conversion | Draft page/cart/lead |

## 12.3. FR-AI-003 — Risk / Human-in-the-loop

| Risk | Action | Rule |
|---|---|---|
| Low | Summary/tag/reply | Auto allowed |
| Medium | Lead/ticket/order/voucher draft | Review optional by policy |
| High | Confirm order, transfer, high discount | Approval mandatory |
| Critical | Refund, adjustment, delete PII, mass send, sensitive publish | Approval mandatory always |

## 12.4–12.5. Knowledge/RAG/Routing + Evaluation

Giữ yêu cầu gốc SRS v4; nhấn mạnh tenant isolation, citations, budget, evaluation trước release.

**Vs Haravan:** Họ có AI Chat bán hàng; PTT bán **AI Operating System có kiểm soát** — narrative enterprise/agency.

---

# 13. Enterprise Configurability and Integration

## 13.1. FR-ENT-001 — Workflow/Approval Builder

Trigger, condition, sequential/parallel multi-level approval, SLA, escalation, reminder, delegation, rejection/rework, audit, version, sandbox, publish/rollback.

Áp dụng: order, inventory, price, promo, refund, invoice, content, campaign, website publish, AI action, custom object.

## 13.2. FR-ENT-002 — Custom Objects

| Vertical | Object examples |
|---|---|
| Spa/Beauty | Treatment, appointment, therapist, package, image consent |
| Bất động sản | Project, unit, viewing, booking, broker |
| Giáo dục | Course, class, student, parent, attendance |
| B2B Distribution | Dealer, quote, contract, credit limit, route |
| Retail | Collection, season, store event, member program |

## 13.3. FR-ENT-003 — White-label/Security

White-label domain/portal/email/report; multi-brand; SSO SAML/OIDC, SCIM, IP allowlist, field mask, audit export, retention, private gateway, private AI/BYOK.

## 13.4. FR-INT — API, Event, Connector

Versioned REST/GraphQL (GraphQL hạn chế); OAuth/API key scope; rate limit; idempotency; signed webhook; DLQ; connectors marketplace/social/carrier/payment/e-invoice/messaging/ads/ERP/CRM/WMS/BI/AI.

**Parity:** App ecosystem hướng mở như kho ứng dụng Haravan — nhưng governance chặt (signed, scoped, reviewed).

---

# 14. Non-functional Requirements

## 14.1. Performance

| Mã | Requirement |
|---|---|
| NFR-PERF-001 | Dashboard P95 ≤ 3 giây |
| NFR-PERF-002 | POS SKU/barcode search P95 ≤ 500 ms |
| NFR-PERF-003 | Core order create P95 ≤ 2 giây không tính third-party |
| NFR-PERF-004 | Inventory availability update nội bộ ≤ 5 giây |
| NFR-PERF-005 | Channel stock sync target ≤ 60 giây tùy đối tác |
| NFR-PERF-006 | Website monitor LCP, INP, CLS, TTFB theo page/device/theme |
| NFR-PERF-007 | Theme/page publish async, status, error, rollback |
| NFR-PERF-008 | Mobile Web tối ưu low-bandwidth/Core Web Vitals |
| NFR-PERF-009 | Inbox message list P95 ≤ 1.5 giây (parity social ops) |
| NFR-PERF-010 | Live keyword→order draft P95 ≤ 2 giây (không tính mạng MXH) |

## 14.2–14.5. Availability, Security, Scale, Usability

Giữ chuẩn SRS v4:

- Availability 99.9%; RPO ≤ 15 phút; RTO ≤ 4 giờ (enterprise theo HĐ).
- TLS, vault, MFA, WAF, RBAC, PII masking, consent, AI isolation.
- Multi-tenant isolation; tách search/analytics/vector/media khỏi OLTP.
- Vietnamese-first; WCAG AA cho bề mặt khách.

**Upgrade cạnh tranh phi chức năng:** Publish rollback + checkout synthetic monitor là SLA marketing được — Haravan ít công khai tương đương.

---

# 15. KPI and Acceptance Criteria

## 15.1. KPI sản phẩm (giữ gốc)

- 90% orders có source/channel.
- 80% orders linkable campaign/content/referral where possible.
- OMS/reporting discrepancy < 1%.
- Website conversion tracked by page/channel/device.
- 70% content qua version/approval/measurement workflow.
- 25–40% repetitive question handling time AI-assisted.
- 10–20% chat-to-order uplift Copilot cohort.
- 15% stockout reduction priority SKU.
- 100% high-risk AI actions có policy/approval/audit.

## 15.2. KPI cạnh tranh vs Haravan (mới)

| KPI | Target định hướng | Ý nghĩa |
|---|---|---|
| Time-to-first-order (trial) | ≤ 1 ngày với template playbook | Đánh Haraweb “lên web nhanh” |
| Social comment→order draft success | ≥ parity nội bộ benchmark live | Đánh Harasocial |
| Checkout completion mobile | +10–20% vs baseline theme cũ | Đánh conversion |
| % orders có contribution margin calculated | ≥ 95% sau Phase Intelligence | Moat RI |
| Publish incident rollback MTTR | ≤ 5 phút | Moat governance |
| Agency multi-brand seats active | Tăng QoQ | Moat agency |
| Win-rate deal khi đối thủ = Haravan (brand/agency segment) | Đo bằng CRM | Feedback loop GTM |

## 15.3. Website Commerce acceptance (giữ gốc + bổ sung)

- Merchant tạo storefront, Brand Kit, install template no-code.
- Một Published Theme; preview/version/audit/rollback.
- Builder section/block/responsive/autosave/publish.
- Storefront đúng product/price/stock/promo/customer từ core.
- Desktop/mobile checkout idempotent.
- Mobile sticky cart/bottom nav/deep link/CWV.
- SEO/analytics consent/health check.
- AI shopping policy + handoff.
- Headless API auth/version/rate limit/audit.
- **Mới:** Go-live checklist fail thì không publish (trừ waiver).
- **Mới:** Deal stacking đúng conflict engine.

## 15.4. Omnichannel acceptance (mới — parity Haravan)

- Inbox đọc/trả lời ≥ 4 kênh trong danh sách Must.
- Comment keyword tạo order draft + reserve khi confirm.
- Live session hiển thị GMV/tồn gần realtime.
- POS bán + sync tồn web trong NFR.
- Marketplace order vào OMS không trùng external ID.
- E-invoice phát hành được từ order đa kênh (phase Operations).

---

# 16. Roadmap — Điều chỉnh để thắng Haravan

| Phase | Goal | Scope | Competitive intent |
|---|---|---|---|
| 1 — Commerce CRM Core | Core sales/customer/order | CRM 360, PIM, order, inventory basic, social inbox MVP, reports | Không thua vận hành cơ bản |
| 2 — Omnichannel Operations | Chuẩn hóa ops | POS, multi-warehouse, fulfillment, shipping/COD, promo/stacking, marketplace, e-invoice | **Parity Haravan ops** |
| 3 — Website Foundation | Merchant bán online | Storefront, PDP, cart/checkout, domain, SEO, mobile, pixels | Parity Haraweb bán hàng |
| 4 — Website Platform | Tự xây & governance | Template Store, Theme Library, Brand Kit, Builder, landing, go-live, CWV | **Vượt Haraweb** |
| 5 — Intelligence Foundation | Đo lãi thật | Revenue Graph, attribution, profitability, content asset | **Moat #1** |
| 6 — AI-assisted Growth | AI an toàn | Copilot guardrailed, RAG, journey, live intel, risk/approval | Vượt AI Chat |
| 7 — Enterprise Intelligence | Configurable/private | Workflow, custom object, SSO, white-label, private AI, forecast | Win enterprise |
| 8 — Corporate GTM | Scale bán PTT | Corporate site, demo, resource, case, lead routing | Win pipeline |

### Thứ tự nâng cấp bắt buộc (execution sequence)

```text
P0 — Parity để không mất deal SMB/omnichannel
  1) Social inbox + comment-to-order + Messenger cart
  2) Live keyword order + tồn realtime
  3) Marketplace 4 sàn + stock sync
  4) POS chuỗi + QR/COD
  5) Carrier 15-ish + payment 12-ish + e-invoice
  6) CRM 360 + RFM + loyalty + broadcast ZNS/Email/SMS/Messenger
  7) Website bán được: theme đủ ngành, SEO, mobile checkout, pixels/CAPI

P1 — Differentiation để thắng brand/agency
  8) Brand Kit + Theme versioning/staging/rollback
  9) Template Marketplace + Conversion Playbook + AI Theme Match
 10) Go-live Governance + CWV regression
 11) Website analytics gắn order/margin theo page/channel
 12) Content/KOL studio + creator margin scorecard
 13) Revenue Intelligence dashboard (CEO)
 14) Client/Brand portal white-label

P2 — Moat enterprise
 15) Guardrailed multi-agent + evaluation/cost
 16) Workflow builder + custom objects vertical
 17) SSO/SCIM/private AI
 18) Headless/App Block ecosystem chất lượng
```

### Việc KHÔNG làm sớm (tránh phân tán trước parity)

- Đua 400 theme mỏng trước khi 30 playbook chuyển đổi chạy.
- AI “tự refund/tự confirm” không policy.
- MRP/HR/GL.
- Tối ưu last-mile thuật toán tự xây.

---

# 17. Mockup HTML Reference

| File | Scope |
|---|---|
| PTT_Commerce_Intelligence_OS_Master_Mockup.html | Master Admin Command Center |
| PTT_Commerce_OS_Corporate_Website.html | Corporate B2B SaaS website |
| PTT_Haraweb_Landing.html | Website Commerce landing |
| PTT_Website_Onboarding.html | Website onboarding wizard |
| PTT_Template_Store_v2.html | Conversion Template Marketplace + AI Theme Matchmaker |
| PTT_Theme_Library.html | Theme version/staging/publish/rollback |
| PTT_Visual_Site_Builder.html | No-code builder |
| PTT_Website_Analytics.html | Website revenue/conversion dashboard |
| PTT_Website_GoLive_Checklist.html | Publish governance and checklist |
| PTT_Storefront_Beauty_Mobile_First.html | Merchant storefront mobile-first |

### Mockup bổ sung đề xuất (để đánh Haravan)

| Mockup mới | Mục đích cạnh tranh |
|---|---|
| PTT_Social_Live_Console.html | Parity Harasocial/Live |
| PTT_Revenue_Intelligence_CEO.html | Moat margin graph |
| PTT_Creator_Scorecard.html | KOL margin |
| PTT_Migration_From_Omnichannel.html | Onboarding chuyển đổi từ đối thủ |

### Mockup flow

```text
PTT Corporate Website
→ Demo / Assessment Lead
→ CRM / Sales Copilot
→ Admin Command Center
→ Website Commerce Landing
→ Onboarding
→ Template Store
→ Theme Library
→ Visual Site Builder
→ Go-live Checklist
→ Merchant Storefront / PWA
→ Website Analytics / Revenue Intelligence
```

---

# 18. Kiến trúc kỹ thuật tham chiếu

| Layer | Khuyến nghị |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS, shadcn/ui |
| Builder | React, dnd-kit, Zustand, schema-driven renderer |
| Backend | NestJS, Node.js, TypeScript; modular monolith first |
| AI services | Python, FastAPI, LangGraph, PydanticAI |
| OLTP | PostgreSQL |
| Cache | Redis |
| Search | OpenSearch |
| Event stream | Redpanda/Kafka + outbox/inbox |
| Workflow | Temporal |
| Analytics | ClickHouse + transformation layer |
| Vector/RAG | Qdrant with tenant ACL filters |
| Object storage | S3/R2/MinIO + CDN |
| AI inference | Multi-provider + vLLM/SGLang self-host option |
| Creative AI | ComfyUI workers |
| Policy | OPA/Cedar |
| Observability | OpenTelemetry, Prometheus, Grafana, Loki, Tempo, Sentry |
| DevSecOps | Docker, Kubernetes, Terraform/OpenTofu, Helm, Argo CD, GitHub/GitLab CI |

Chi tiết triển khai: *Kiến trúc hệ thống & công nghệ v3.0*.

---

# 19. Glossary

| Thuật ngữ | Diễn giải |
|---|---|
| AI Agent | Tác nhân AI có goal, knowledge, tool, permission, policy, workflow |
| Attribution | Cách gán đóng góp revenue/conversion cho điểm chạm |
| Brand Kit | Logo, colors, font, token, asset, tone, SEO default |
| Contribution Margin | Revenue sau COGS và chi phí biến đổi trực tiếp |
| Customer 360 | Hồ sơ khách thống nhất giao dịch/hành vi/hội thoại/marketing |
| Headless Commerce | Tách storefront frontend khỏi commerce backend qua API |
| Human-in-the-loop | Con người review/approve AI action |
| Omnichannel Parity | Mức năng lực kênh tối thiểu ngang đối thủ VN dẫn đầu |
| PWA | Web app add-to-home/offline/push |
| RAG | Retrieval-Augmented Generation |
| Revenue Graph | Liên kết marketing/content/customer/order/cost/margin |
| Storefront | Website public để khách khám phá và mua hàng |
| Template Marketplace | Kho khám phá/mua/cài template |
| Theme Library | Kho theme đã cài/sở hữu |
| Visual Site Builder | No-code page builder theo section/block |
| Vertical Playbook | Workflow/object/dashboard/knowledge/agent theo ngành |
| Table stakes | Năng lực bắt buộc để không bị loại khỏi shortlist |

---

# 20. Kết luận

SRS v5.1 giữ nguyên khung và định vị SRS v4.0, đồng thời trả lời rõ câu hỏi cạnh tranh:

## 20.1. Muốn thắng Haravan phải nâng cấp gì?

**1) Table stakes (P0) — làm ngang hoặc hơn rõ ràng**

- Social inbox đa kênh + comment/Reels-to-cart + Messenger flows  
- Livestream keyword order + tồn realtime + recovery  
- Marketplace 4 sàn + POS chuỗi + COD/carrier/payment/e-invoice  
- CRM 360 + RFM + loyalty + broadcast ZNS/Email/SMS/Messenger  
- Website bán được: SEO, mobile, checkout, pixels/CAPI  

**2) Differentiation (P1) — lý do chọn PTT**

- Website Growth Platform: Brand Kit, Conversion Playbook, staging/rollback, go-live gate, CWV  
- Revenue Intelligence: contribution margin theo kênh/content/creator/page  
- Content/KOL operating system gắn order–return–margin  
- Guardrailed AI Agent (policy/tool/audit/cost), không chỉ chatbot  
- Agency portal / white-label  

**3) Enterprise moat (P2)**

- Workflow builder, custom objects theo vertical, SSO/SCIM, private AI, headless ecosystem  

## 20.2. Nguyên tắc go-to-market

```text
Đừng tuyên chiến Haravan trên mọi phân khúc cùng lúc.
Thắng trước: Brand D2C / Beauty / Agency cần đo lãi & chạy content-commerce.
Giữ giá vào cửa đủ cạnh tranh để không mất SMB thuần POS+sàn.
Narrative CEO: “Omnichannel có lãi” — không chỉ “Omnichannel có đơn”.
```

## 20.3. Định vị sản phẩm giữ vững

```text
Commerce Core
+ Website Commerce Platform
+ Corporate GTM Website
+ Omnichannel Operations
+ Customer Growth
+ Content-to-Revenue
+ Guardrailed AI Agent
+ Enterprise Workflow
```

**Điểm khác biệt cần giữ:** website và toàn bộ kênh được vận hành như **growth engine đo được revenue, contribution margin, conversion, LTV và hành động tối ưu** — không chỉ bộ công cụ bán hàng đa kênh.
