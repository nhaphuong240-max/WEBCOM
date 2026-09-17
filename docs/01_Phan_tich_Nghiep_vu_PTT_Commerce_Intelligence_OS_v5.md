# Phân tích nghiệp vụ chi tiết

## PTT Commerce Intelligence OS & Website Commerce Platform

| Thuộc tính | Nội dung |
|---|---|
| Tên tài liệu | Business Analysis — PTT Commerce Intelligence OS |
| Phiên bản | 5.0 |
| Trạng thái | Master Business Blueprint |
| Nguồn | SRS Master v4.0, Kiến trúc hệ thống v2.0 |
| Đối tượng | Product Owner, BA, Solution Architect, UI/UX, Engineering, QA, Sales, Operations |
| Mục tiêu | Phân tích nghiệp vụ đầy đủ: value chain, persona, journey, process, use case, domain model, epic/feature, rule, KPI — làm nền để viết lại SRS và Architecture |

---

# 1. Tóm tắt điều hành

## 1.1. Vấn đề thị trường

Doanh nghiệp Việt Nam (D2C, retail, beauty/spa, F&B, agency, B2B) thường vận hành phân mảnh:

| Hệ thống hiện có | Khoảng trống |
|---|---|
| Website/CMS | Không gắn inventory, margin, attribution |
| Marketplace / Social / Live | Order rời rạc, khó đối soát COD/return |
| POS / Excel / WMS nhẹ | Không Customer 360, không journey |
| Ads / Content / KOL | Không biết creative nào tạo contribution margin |
| Chatbot / AI rời | Không policy, audit, human-in-the-loop |
| CRM / ERP tách | Lead → order → retention đứt đoạn |

Hệ quả: quyết định theo GMV/top-line thay vì lợi nhuận thực; website chỉ là mặt tiền; AI không an toàn để đưa vào vận hành.

## 1.2. Giải pháp nghiệp vụ

**PTT Commerce Intelligence OS** là Growth Operating System hợp nhất:

```text
Market Intelligence
→ Corporate GTM / Lead
→ Content & Campaign
→ Merchant Website / Social / Live / POS / Marketplace
→ Customer 360 & Journey
→ OMS / Inventory / Fulfillment / COD / Finance
→ Loyalty / Advocacy
→ Revenue Graph / Executive Intelligence
→ Guardrailed AI Actions
```

## 1.3. Kết quả nghiệp vụ kỳ vọng

1. Một nguồn sự thật cho product, price, stock, customer, order, content, margin.
2. Website trở thành conversion engine đo được revenue, margin, LTV.
3. Content/ads/KOL/livestream gắn được với order và contribution profit.
4. Vận hành omnichannel (POS–web–social–marketplace) trên một OMS/inventory.
5. AI tăng năng suất trong phạm vi quyền, policy, approval, audit, budget.
6. Enterprise cấu hình được workflow, custom object, white-label, SSO, private AI.

---

# 2. Phạm vi phân tích

## 2.1. In scope

| Domain | Mô tả nghiệp vụ |
|---|---|
| Foundation | Tenant, legal entity, brand, store, warehouse, RBAC, audit |
| Commerce Core | PIM, pricing, promotion, cart, checkout, OMS, inventory, shipping, payment, e-invoice |
| Website Commerce | Template Marketplace, Theme, Brand Kit, Builder, Storefront, PWA, SEO, analytics, go-live |
| Corporate GTM | Marketing site, lead, demo, resource, case/ROI, product tour |
| Omnichannel | POS, unified inbox, live commerce, marketplace sync |
| Customer Growth | Customer 360, segment, loyalty, journey, service recovery |
| Content-to-Revenue | Content asset, creator/KOL, creative intelligence, attribution |
| AI Platform | Agent catalog, RAG, tool policy, evaluation, cost governance |
| Enterprise | Workflow, custom object, white-label, API/webhook, private AI |

## 2.2. Out of scope (MVP và gần hạn)

- MRP / sản xuất đầy đủ
- Payroll / HRM
- General ledger thay ERP kế toán
- Last-mile route optimization tự phát triển
- Cross-border marketplace compliance chuyên sâu
- AI tự thực hiện action rủi ro cao không policy/approval

## 2.3. Giả định

1. Thị trường chính: Việt Nam (Zalo, COD, e-invoice, sàn nội địa, social selling).
2. Mô hình triển khai: SaaS multi-tenant; có tier enterprise isolated / private AI.
3. Merchant có thể go-live website no-code; agency có thể white-label giao hàng.
4. Dữ liệu tài chính/attribution có version công thức; không rewrite lịch sử tùy tiện.
5. AI luôn đứng sau Tool Gateway; không truy cập DB trực tiếp.

---

# 3. Chuỗi giá trị và mô hình kinh doanh sản phẩm

## 3.1. Value chain nội bộ của merchant/brand dùng PTT

```text
[1] Định vị & Lead (Corporate GTM / Ads / Social)
        ↓
[2] Onboarding & Catalog (Brand Kit, PIM, Theme)
        ↓
[3] Demand Generation (Content, KOL, Live, Landing, Website)
        ↓
[4] Conversion (Storefront / POS / Chat / Marketplace)
        ↓
[5] Fulfillment (Allocate → Pick → Pack → Ship → COD)
        ↓
[6] Service & Retention (Ticket, Return, Loyalty, Journey)
        ↓
[7] Intelligence (Attribution, Margin, Forecast, NBA)
        ↓
[8] Reinvestment (Campaign / Inventory / Pricing / AI playbook)
```

## 3.2. Revenue streams của PTT (SaaS)

| Stream | Mô tả |
|---|---|
| Subscription | Plan theo module/usage (order, storefront, AI token, connector) |
| Website Commerce add-on | Template premium, builder seat, custom theme, agency license |
| Marketplace take-rate / one-time | Template Marketplace license (nếu có) |
| Enterprise | SSO, white-label, private AI, dedicated isolation, SLA |
| Professional services | Onboarding, migration, vertical playbook, custom object |

## 3.3. Buyer vs User

| Đối tượng | Vai trò mua/dùng |
|---|---|
| CEO / Founder | Buyer — quyết định ROI, margin, risk |
| E-commerce / Marketing Director | Champion — website, conversion, campaign |
| Operations / Warehouse | Daily user — OMS, inventory, shipping |
| Agency | Buyer+User — multi-client, portal, template |
| Enterprise IT/Security | Gatekeeper — SSO, audit, private AI |
| End Customer | External user — storefront/PWA |

---

# 4. Stakeholder, persona và nhu cầu

## 4.1. Ma trận stakeholder

| Vai trò | Mục tiêu | Pain hiện tại | Success metric |
|---|---|---|---|
| Owner / CEO | Tăng lợi nhuận thực, kiểm soát rủi ro | Báo cáo GMV đẹp nhưng lỗ/margin mờ | Contribution margin, cashflow, forecast accuracy |
| Super Admin | An toàn tenant, quyền, tích hợp | Rò rỉ quyền, khó audit | 0 isolation breach; audit coverage 100% |
| E-commerce Manager | Go-live nhanh, tăng CVR | Theme đẹp nhưng không bán; SEO/tracking đứt | CVR, AOV, LCP, publish lead time |
| Designer / Agency | Deliver brand đúng, duyệt nhanh | Handoff code chậm; client portal yếu | Time-to-publish, brand compliance score |
| Store Manager | Doanh thu cửa hàng, ca làm | POS lệch tồn web | Sync accuracy, shift close time |
| Cashier | Bán nhanh, ít lỗi | Scan chậm, promo phức tạp | Basket time, void rate |
| Social Sales | Chat → order | Inbox rời, mất lead | Chat-to-order, SLA reply |
| Warehouse | Đúng tồn, đúng hàng | Oversell, pick sai | Pick accuracy, stockout |
| Finance | Đối soát COD/payment/invoice | File Excel, dispute | Reconciliation lag, unmatched % |
| CRM Marketer | Retention, LTV | Segment thủ công, spam | Repeat rate, LTV:CAC |
| Content / Media | Creative tạo doanh thu | Không biết video nào bán | Content ROI, creator margin |
| Customer Care | Giải quyết khiếu nại | Thiếu context order/ship | FCR, CSAT, return cycle |
| AI Ops | AI hữu ích, an toàn, kiểm soát chi phí | Hallucination, cost spike | Policy pass rate, cost/action |
| Customer | Mua dễ, theo dõi đơn, loyalty | Checkout dài, COD fail | Checkout completion, NPS |

## 4.2. Persona chi tiết (tóm tắt)

### P-01 — Mai (E-commerce Manager, Beauty D2C)

- Mục tiêu: launch site 2 tuần, tăng mobile CVR 20%.
- Cần: Template Marketplace, Brand Kit, Builder, go-live checklist, analytics gắn order/margin.
- Không chấp nhận: theme chỉ đẹp; publish không rollback; stock web sai.

### P-02 — Hùng (CEO Retail đa chi nhánh)

- Mục tiêu: thấy kênh nào lãi sau fee/return/COD.
- Cần: Command Center, Revenue Graph, exception queue, approval.
- Không chấp nhận: dashboard vanity metric; AI tự refund.

### P-03 — Lan (Agency Creative Lead)

- Mục tiêu: giao nhiều brand, duyệt client, tái sử dụng template.
- Cần: Client portal, Brand Kit inheritance, theme delivery workflow, white-label report.
- Không chấp nhận: mất mapping content khi update theme.

### P-04 — Tuấn (Warehouse Manager)

- Mục tiêu: giảm oversell, tăng pick accuracy.
- Cần: reservation realtime, FEFO, transfer, barcode, exception.
- Không chấp nhận: confirm order vượt available (trừ policy).

### P-05 — Customer “An” (Mobile buyer)

- Mục tiêu: mua nhanh từ TikTok/Zalo deep link, COD tin cậy.
- Cần: PWA/mobile sticky ATC, short checkout, tracking, Zalo support.
- Không chấp nhận: giá đổi lúc checkout; form dài; không biết đơn ở đâu.

---

# 5. Journey map nghiệp vụ

## 5.1. Journey Merchant go-live Website Commerce

```text
Sign up / Trial
→ Create Brand + Brand Kit
→ Connect Catalog / Import PIM
→ AI Theme Matchmaker → Install Template
→ Customize bằng Visual Site Builder
→ Config payment / shipping / COD / domain
→ Go-live Checklist + Staging Review
→ Approval → Publish
→ Monitor Analytics / CWV / Funnel
→ Iterate A/B / AI Conversion Insight
```

**Pain điểm:** thiếu checklist → publish lỗi checkout; thiếu backup → không rollback; tracking sai → attribution gãy.

## 5.2. Journey End-customer mua hàng (Storefront)

```text
Deep link Ads/KOL/Live
→ Landing / Home / Collection
→ PDP (variant, price, stock, review, AI Q&A)
→ Add to cart / Bundle / Voucher
→ Checkout (address, ship ETA, COD/QR)
→ Purchase confirmation
→ Tracking / Notification
→ Delivery / COD collect
→ Review / Loyalty / Reorder
```

**Drop-off điển hình:** PDP stock mismatch; checkout fee bất ngờ; OTP fail; COD address risk; slow LCP mobile.

## 5.3. Journey Social / Live → Order

```text
Comment / DM / Live keyword
→ Inbox / Live Console
→ Intent detect + product suggest
→ Order draft (policy)
→ Confirm + reserve stock
→ Payment / COD
→ Fulfillment
→ Post-live recovery nếu chưa thanh toán
```

## 5.4. Journey Corporate GTM → Closed Won

```text
Visit Corporate Website
→ Product tour / Case / ROI calc
→ Demo / Assessment form (consent + UTM)
→ CRM lead create + dedupe + routing
→ Sales Copilot summary / NBA
→ Sandbox / Demo
→ Proposal / Close
→ Tenant provisioning / Onboarding
```

## 5.5. Journey Content → Revenue

```text
Idea / Brief
→ Production / Review / Brand approval
→ Publish (ads/social/live/landing)
→ Track UTM/creator/coupon
→ Cart / Order / Return
→ Allocate cost (ad, commission, return)
→ Contribution margin + creative insight
→ Optimize next brief
```

---

# 6. Quy trình nghiệp vụ (Business Processes)

## 6.1. BP-ORD — Order-to-Cash (omnichannel)

### Mục tiêu
Chuyển nhu cầu mua từ mọi kênh thành đơn đã giao, đã thu tiền, đã đối soát, đã ghi nhận margin.

### Luồng chính

```text
1. Capture order (Web/POS/Social/Live/Marketplace/API/Manual)
2. Validate identity, items, price, promo, stock policy
3. Duplicate / fraud / risk score
4. Confirm → Reserve inventory
5. Allocate warehouse
6. Pick → Pack → Ready to ship
7. Create shipment / label / handover
8. In transit → Delivered (or failed / return)
9. Collect payment / COD remit
10. Issue e-invoice (nếu required)
11. Complete → Attribution & margin close
```

### Nhánh phụ

| Nhánh | Xử lý |
|---|---|
| Cancel trước handover | Release reserved; refund nếu paid |
| On hold | Risk/stock/address/payment exception queue |
| Delivery failed | Retry / return / COD debt |
| Return/RMA | Classify → receive → refund/credit → restock policy |
| Split/Merge | Traceability; không mất attribution |

### Quy tắc gắn

BR-002, BR-003, BR-004, BR-005, BR-007, BR-014.

## 6.2. BP-INV — Inventory & Reservation

```text
On-hand
Reserved = giữ khi confirm/allocate
Available = On-hand - Reserved - Blocked
Incoming / In-transit / Blocked tách sổ

Events:
Receipt | Sale | Return | Adjustment | Transfer | Reserve | Release | Stocktake
```

**Critical rule:** Checkout/OMS luôn server-side validate available; storefront badge chỉ là soft signal.

## 6.3. BP-WEB-PUB — Theme/Page Publish & Go-live

```text
Draft edit (Builder)
→ Autosave version
→ Staging preview link
→ Automated validation
   (schema, app blocks, SEO, tracking, checkout smoke, CWV)
→ Backup current published
→ Approval (nếu policy)
→ Schedule / Immediate publish
→ CDN/ISR invalidation
→ Health window monitor
→ Auto/manual rollback nếu P1
→ Audit + notify
```

**Invariant:** Một storefront chỉ một Published Theme tại một thời điểm (BR-015).

## 6.4. BP-CHK — Cart & Checkout

```text
Cart mutate (add/update/remove)
→ Validate stock/price/promo/MOQ/bundle
→ Begin checkout
→ Identity / address
→ Shipping quote + ETA
→ Payment method (COD/QR/card/wallet/BNPL/…)
→ Server recalculate totals
→ Create payment intent / COD order
→ Idempotent confirm
→ Reserve inventory
→ Create OMS order
→ Emit purchase events (consent-aware)
```

**Không tin client-side total.** Idempotency key bắt buộc.

## 6.5. BP-CRM — Lead & Customer 360

```text
Identity signals (phone/email/social/marketplace/loyalty)
→ Match / merge / unmerge (audit)
→ Consent & channel preference
→ Profile enrichment (RFM, LTV, risk, segment)
→ Journey trigger / NBA
→ Service ticket linkage
```

## 6.6. BP-JOURNEY — Orchestration

```text
Trigger (web/order/customer/loyalty/shipping)
→ Condition + consent + frequency cap
→ Delay / wait event
→ Action (email/SMS/ZNS/Messenger/push/task/webhook/voucher)
→ Branch / exit / conversion
→ Holdout / A-B measurement
```

## 6.7. BP-REV — Revenue Attribution Close

```text
Touchpoints (ads, content, creator, web, chat, sales-assisted)
→ Attribution model (versioned)
→ Order netting (discount, return, fee)
→ Cost allocation (ad, commission, shipping subsidy, payment fee…)
→ Contribution margin
→ Dashboard / AI insight / budget reallocation
```

## 6.8. BP-AI — Guardrailed Agent Action

```text
User/system request
→ AI Gateway (tenant/RBAC/budget)
→ Retrieve knowledge (ACL filter)
→ Propose action via Tool Gateway
→ Risk class evaluation (OPA/Cedar)
→ Auto | Optional review | Mandatory approval
→ Execute domain API
→ Audit + cost + evaluation feedback
```

Risk matrix:

| Risk | Ví dụ | Rule |
|---|---|---|
| Low | Summary, tag, FAQ | Auto |
| Medium | Lead/ticket/order/voucher draft | Review theo policy |
| High | Confirm order, transfer, high discount | Approval bắt buộc |
| Critical | Refund, stock adjust, delete PII, mass send, sensitive publish | Approval luôn bắt buộc |

---

# 7. Use Case Catalog (chi tiết chọn lọc)

> Ký hiệu: UC-\<DOMAIN\>-\<NNN\>. Priority: Must / Should / Could (MoSCoW theo roadmap).

## 7.1. Foundation & IAM

| ID | Use Case | Actor | Priority |
|---|---|---|---|
| UC-ORG-001 | Tạo tenant, legal entity, brand, store, warehouse | Super Admin | Must |
| UC-ORG-002 | Cấu hình module, quota, timezone, currency, tax | Super Admin | Must |
| UC-IAM-001 | Invite user, gán role/data scope | Admin | Must |
| UC-IAM-002 | MFA, session revoke, login history | User/Admin | Must |
| UC-IAM-003 | Export PII với permission + audit | Authorized role | Must |
| UC-AUD-001 | Xem audit trail theo entity/correlation | Admin/Compliance | Must |

### UC-IAM-001 — Invite & RBAC (chi tiết)

- **Mô tả:** Admin mời user, gán permission và data scope.
- **Tiền điều kiện:** Actor có quyền `user.manage` trong tenant.
- **Luồng chính:**
  1. Nhập email/phone, role template.
  2. Chọn data scope: own/team/brand/store/warehouse/channel.
  3. Gửi invite; user activate + MFA nếu role nhạy cảm.
  4. Ghi audit.
- **Ngoại lệ:** Email trùng active user → link existing; role sensitive thiếu MFA → block activate.
- **Hậu điều kiện:** User có session bound tenant; permission enforce ở API.

## 7.2. Commerce Core

| ID | Use Case | Actor | Priority |
|---|---|---|---|
| UC-PIM-001 | Tạo product/variant/SKU/media/SEO | Merchandiser | Must |
| UC-PIM-002 | Import bulk + validation | Merchandiser | Must |
| UC-PRC-001 | Quản lý price list đa kênh | Pricing Manager | Must |
| UC-PROMO-001 | Tạo promotion + conflict/priority | Marketing | Must |
| UC-OMS-001 | Tạo/confirm/cancel order omnichannel | Ops/System | Must |
| UC-OMS-002 | Allocate, pick, pack, handover | Warehouse | Must |
| UC-OMS-003 | RMA / return / refund | Care/Finance | Must |
| UC-INV-001 | Reservation / release / ledger | System | Must |
| UC-INV-002 | Stocktake / adjustment có approval | Warehouse | Must |
| UC-INV-003 | Transfer inter-warehouse | Warehouse | Must |
| UC-SHIP-001 | Tạo shipment, tracking, exception | Ops | Must |
| UC-SHIP-002 | COD reconcile / dispute | Finance | Must |
| UC-PAY-001 | Thanh toán đa phương thức + refund | System/Finance | Must |
| UC-FIN-001 | E-invoice issue/adjust/cancel | Finance | Should |

### UC-OMS-001 — Confirm Order (chi tiết)

- **Tiền điều kiện:** Order ở `PENDING_CONFIRMATION` hoặc tương đương; có line items hợp lệ.
- **Luồng chính:**
  1. Risk/duplicate check.
  2. Server recalculate price/promo.
  3. Check available stock theo policy (oversell/backorder nếu bật).
  4. Reserve inventory; tăng Reserved.
  5. Chuyển `CONFIRMED` → trigger allocate workflow.
  6. Emit events + audit.
- **Ngoại lệ:** Insufficient stock → ON_HOLD hoặc partial theo policy; high risk → approval queue.
- **Hậu điều kiện:** Reserved khớp line; không confirm vượt available trừ policy.

## 7.3. Website Commerce Platform

| ID | Use Case | Actor | Priority |
|---|---|---|---|
| UC-WCP-001 | Tạo storefront + domain + locale | Ecom Manager | Must |
| UC-WCP-002 | Discover/purchase/install template | Merchant/Agency | Must |
| UC-WCP-003 | AI Theme Matchmaker recommend | Merchant | Should |
| UC-WCP-004 | Apply Brand Kit to theme | Designer | Must |
| UC-WCP-005 | Edit page bằng Visual Site Builder | Designer/Merchant | Must |
| UC-WCP-006 | Preview staging + comment review | Stakeholder | Must |
| UC-WCP-007 | Publish theme/page với governance | Publisher | Must |
| UC-WCP-008 | Rollback published version | Publisher | Must |
| UC-WCP-009 | Storefront browse/search/PDP | Customer | Must |
| UC-WCP-010 | Cart + checkout + account | Customer | Must |
| UC-WCP-011 | PWA install / push consent | Customer | Should |
| UC-WCP-012 | SEO/sitemap/schema/CWV monitor | Ecom Manager | Must |
| UC-WCP-013 | AI Shopping Assistant Q&A / draft cart | Customer/AI | Should |
| UC-WCP-014 | Headless API consume storefront data | Developer | Could |
| UC-WCP-015 | Go-live checklist pass/fail gate | Ecom Manager | Must |

### UC-WCP-007 — Publish Theme (chi tiết)

- **Tiền điều kiện:** Theme ở Staging; checklist bắt buộc pass hoặc waiver có approval.
- **Luồng chính:**
  1. Validate schema + app block compatibility.
  2. Run SEO/tracking/checkout smoke + CWV synthetic.
  3. Backup current Published ThemeVersion.
  4. Approval nếu required.
  5. Atomic switch Published pointer.
  6. Invalidate CDN/ISR tags.
  7. Health monitor window; rollback nếu critical.
- **Hậu điều kiện:** Chỉ 1 Published Theme; audit đủ actor/diff/version.

## 7.4. Corporate GTM

| ID | Use Case | Actor | Priority |
|---|---|---|---|
| UC-CORP-001 | Xem homepage/product/industry pages | Prospect | Must |
| UC-CORP-002 | Submit demo/assessment lead | Prospect | Must |
| UC-CORP-003 | Book demo + calendar confirm | Prospect/Sales | Should |
| UC-CORP-004 | Download gated resource → score lead | Prospect | Should |
| UC-CORP-005 | Sales Copilot summarize lead + NBA | Sales | Should |
| UC-CORP-006 | CMS publish corporate content có duyệt | Marketing | Must |

## 7.5. Omnichannel / Growth / Content / AI / Enterprise

| ID | Use Case | Priority |
|---|---|---|
| UC-POS-001 | Bán tại quầy, shift, sync tồn | Must |
| UC-SOC-001 | Unified inbox reply + chat-to-order | Must |
| UC-LIVE-001 | Live session GMV/inventory realtime | Should |
| UC-MKT-001 | Marketplace listing/order/stock sync | Should |
| UC-CRM-001 | Customer 360 view + merge | Must |
| UC-SEG-001 | Build segment động | Must |
| UC-LOY-001 | Earn/redeem/referral | Should |
| UC-JRN-001 | Publish journey automation | Should |
| UC-CX-001 | Next-best-action + service recovery playbook | Should |
| UC-CNT-001 | Content workflow brief→publish→measure | Should |
| UC-CRE-001 | Creator contract/commission/payout | Could |
| UC-RI-001 | Attribution + contribution margin dashboard | Should |
| UC-AI-001 | Configure agent/knowledge/policy | Should |
| UC-AI-002 | Approve high-risk AI action | Must (khi có AI write) |
| UC-ENT-001 | Workflow/approval builder | Could→Must enterprise |
| UC-ENT-002 | Custom object theo vertical | Could |
| UC-INT-001 | Manage connector/webhook/API key | Must |

---

# 8. Mô hình miền (Domain Model)

## 8.1. Aggregate cốt lõi

```text
Tenant
 ├── LegalEntity
 ├── Brand
 │    ├── BrandKit
 │    ├── Storefront
 │    │    ├── Theme / ThemeVersion
 │    │    ├── Page / PageVersion
 │    │    ├── Navigation
 │    │    └── Experiment
 │    ├── Product / Variant / SKU
 │    ├── PriceList / Promotion
 │    └── ContentAsset / Campaign
 ├── Store / Warehouse
 ├── User / Role / Permission
 ├── Customer (identity graph)
 ├── Cart / CheckoutSession
 ├── Order / OrderLine / Shipment / Payment / RMA
 ├── InventoryBalance / InventoryLedger / Reservation
 ├── LoyaltyAccount / Journey
 ├── Creator / AffiliateConversion
 ├── WorkflowDefinition / ApprovalRequest
 └── AIAgent / KnowledgeDoc / ToolInvocation
```

## 8.2. Inventory semantics

| Field | Ý nghĩa |
|---|---|
| On-hand | Tồn vật lý |
| Reserved | Đã giữ cho order confirmed/allocated |
| Available | On-hand − Reserved − Blocked |
| Incoming | Đang nhập |
| In-transit | Đang điều chuyển |
| Blocked | Quarantine/expired/hư hỏng |

## 8.3. Order state machine (chuẩn)

```text
DRAFT → PENDING_CONFIRMATION → CONFIRMED → ALLOCATED → PICKING
→ PACKED → READY_TO_SHIP → HANDED_OVER → IN_TRANSIT → DELIVERED → COMPLETED

Cancel: DRAFT/PENDING/CONFIRMED → CANCELLED
Hold: CONFIRMED…PACKED → ON_HOLD
Fail: HANDED_OVER/IN_TRANSIT → DELIVERY_FAILED
Return: … → RETURN_REQUESTED → RETURN_IN_TRANSIT → RETURN_RECEIVED → REFUNDED/CLOSED
```

## 8.4. Website entities

| Entity | Trách nhiệm |
|---|---|
| Storefront | Cấu hình site public theo brand/market |
| Template / TemplateLicense | Sản phẩm marketplace + quyền sở hữu |
| Theme / ThemeVersion | Theme đã cài + version schema/settings |
| BrandKit | Token, asset, tone, SEO default |
| Page / PageVersion | CMS + landing + version |
| SectionInstance / BlockInstance | Cấu hình builder |
| PublishJob / GoLiveChecklist | Governance publish |
| StorefrontEvent | Hành vi web (analytics) |

## 8.5. Revenue Graph (khái niệm)

```text
Campaign / Creative / Creator / Content / Live
→ Landing / Conversation / Lead
→ Cart / Order / Payment
→ Return / Refund / Repeat
→ Costs (COGS, fee, ad, commission, subsidy)
→ Contribution Margin / LTV / CAC
```

---

# 9. Business Rules (mở rộng có mã)

| Mã | Quy tắc | Severity |
|---|---|---|
| BR-001 | SKU unique theo tenant/product policy | High |
| BR-002 | Không confirm vượt available trừ oversell/backorder policy | Critical |
| BR-003 | Reserved tăng khi confirm/allocate; release khi cancel/timeout | Critical |
| BR-004 | External marketplace order ID unique theo channel account | High |
| BR-005 | Order đã handover không sửa item/price trực tiếp; qua cancel/return | Critical |
| BR-006 | Transaction không hard-delete; archive/void + audit | High |
| BR-007 | Paid cancel → refund/credit workflow | Critical |
| BR-008 | Expired product không bán; FEFO nếu bật | High |
| BR-009 | Inventory adjustment cần reason + threshold approval + audit | High |
| BR-010 | Export PII cần permission riêng + audit | Critical |
| BR-011 | Marketing tôn trọng consent, channel policy, frequency cap | High |
| BR-012 | Write API/callback idempotent + correlation ID | High |
| BR-013 | Webhook outbound signed, retryable, observable, replayable | High |
| BR-014 | Financial đã reconcile chỉ điều chỉnh bằng chứng từ mới | Critical |
| BR-015 | Một storefront chỉ một Published Theme tại một thời điểm | Critical |
| BR-016 | Theme/page publish cần preview, version, audit, rollback ref | High |
| BR-017 | Theme update không phá content/product mapping nếu chưa compatibility validation | High |
| BR-018 | AI high-risk action phải policy + approval | Critical |
| BR-019 | Attribution/cost formula versioned; không rewrite historical tùy tiện | High |
| BR-020 | Tracking tôn trọng consent và privacy | High |
| BR-021 | Checkout không tin client-side price/total | Critical |
| BR-022 | Storefront data (price/stock/promo/customer) lấy từ commerce core | High |
| BR-023 | AI không truy cập DB trực tiếp; chỉ qua Tool Gateway | Critical |
| BR-024 | Tenant boundary bắt buộc trên API/DB/cache/queue/search/vector/storage | Critical |
| BR-025 | Go-live checklist fail block publish trừ waiver có approval | High |

---

# 10. Epics & Feature backlog (theo roadmap)

## Phase 1 — Commerce CRM Core

- Epic E1: Tenant/IAM/Audit
- Epic E2: PIM + Pricing basic
- Epic E3: Customer 360 + Identity
- Epic E4: Order basic + Inventory basic
- Epic E5: Social Inbox basic
- Epic E6: Operational reports

## Phase 2 — Omnichannel Operations

- Epic E7: POS + shift
- Epic E8: Multi-warehouse + transfer + reservation hardening
- Epic E9: Shipping/COD/carrier
- Epic E10: Promotion engine
- Epic E11: Marketplace sync

## Phase 3 — Website Foundation

- Epic E12: Storefront SSR + PDP/collection
- Epic E13: Cart/Checkout/Account
- Epic E14: Domain/SSL/SEO basic
- Epic E15: Mobile web optimization

## Phase 4 — Website Platform

- Epic E16: Template Marketplace + License
- Epic E17: Theme Library versioning
- Epic E18: Brand Kit
- Epic E19: Visual Site Builder
- Epic E20: Landing CMS + experiments
- Epic E21: Go-live Governance + Analytics

## Phase 5 — Intelligence Foundation

- Epic E22: Event pipeline + ClickHouse
- Epic E23: Attribution models versioned
- Epic E24: Contribution margin / unit economics
- Epic E25: Content asset linkage

## Phase 6 — AI-assisted Growth

- Epic E26: AI Gateway + RAG
- Epic E27: Sales/Care/Website copilots
- Epic E28: Journey orchestration
- Epic E29: Live commerce intelligence
- Epic E30: Risk scoring + approval UX

## Phase 7 — Enterprise Intelligence

- Epic E31: Workflow/Approval builder
- Epic E32: Custom objects / vertical playbooks
- Epic E33: SSO/SCIM/white-label
- Epic E34: Private AI / BYOK
- Epic E35: Forecast & scenario

## Phase 8 — Corporate GTM Scale

- Epic E36: Corporate site CMS
- Epic E37: Lead capture/routing/SLA
- Epic E38: Resource hub/case/ROI
- Epic E39: Product tour + sandbox CTA

---

# 11. Yêu cầu dữ liệu & chất lượng

1. Mọi transactional entity có `tenant_id`, audit fields, soft-delete/archive policy.
2. Order có internal ID + external source IDs + attribution refs khi có.
3. Customer identity resolution có confidence score và merge audit.
4. Metric tài chính/attribution lưu `formula_version`.
5. Website events consent-aware; missing consent → không forward pixel/CAPI.
6. Integration write idempotent; có DLQ và reconciliation job.
7. PII classification + retention + export/delete request.

---

# 12. KPI nghiệp vụ & Acceptance (BA view)

| KPI | Target định hướng |
|---|---|
| Orders có source/channel | ≥ 90% |
| Orders linkable campaign/content/referral | ≥ 80% (khi có touchpoint) |
| OMS vs reporting discrepancy | < 1% |
| Website conversion tracked by page/channel/device | 100% storefronts published |
| Content qua version/approval/measure | ≥ 70% |
| AI-assisted repetitive handling time reduction | 25–40% |
| Chat-to-order uplift (Copilot cohort) | 10–20% |
| Stockout reduction priority SKU | ≥ 15% |
| High-risk AI actions có policy/approval/audit | 100% |
| Publish rollback available | 100% theme/page publishes |
| Checkout server-price integrity | 100% |

---

# 13. Rủi ro nghiệp vụ & kiểm soát

| Rủi ro | Tác động | Kiểm soát |
|---|---|---|
| Oversell đa kênh | Hủy đơn, CSAT giảm | Reservation realtime, channel sync lag monitor |
| COD thất thu | Cashflow | Risk score, address validation, carrier success rate |
| Publish gãy checkout | Mất doanh thu | Go-live gate, synthetic checkout, auto-rollback |
| Attribution sai | Sai ngân sách ads | Formula version, consent/data quality monitor |
| AI hallucination / wrong refund | Tài chính & pháp lý | Tool Gateway, risk class, HITL, evaluation |
| Tenant data leak | Pháp lý, uy tín | Zero-trust tenancy, RLS/isolation, audit |
| Theme update phá content | Agency/merchant downtime | Compatibility validation, version pin |

---

# 14. Traceability sang SRS / Architecture

| BA artifact | SRS section | Architecture section |
|---|---|---|
| Value chain / goals | Tầm nhìn, mục tiêu | Architecture goals |
| Personas / journeys | Stakeholders, FR theo domain | Experience layer apps |
| BP-ORD / INV / CHK | FR-OMS, FR-INV, FR-WCP checkout | Domain, checkout boundary, Temporal |
| BP-WEB-PUB | FR-WCP publish/governance | Website publish workflow |
| BP-AI | FR-AI | AI execution plane |
| Domain model | Data model + BR | Data architecture |
| Epics/roadmap | Roadmap | Technical roadmap |
| KPI/AC | Acceptance | Architecture acceptance checklist |

---

# 15. Kết luận phân tích

PTT không phải “website builder + order admin”. Đây là hệ điều hành tăng trưởng với hai mặt không tách rời:

1. **Operational truth:** product, stock, order, payment, COD, audit.
2. **Growth intelligence:** website conversion, content/creator ROI, margin, AI action có kiểm soát.

Ưu tiên nghiệp vụ khi triển khai:

```text
Đúng đơn – đúng tồn – đúng tiền
→ Website bán được và đo được
→ Gắn content/channel với margin
→ AI hỗ trợ trong hàng rào policy
→ Enterprise cấu hình & private deployment
```

Tài liệu này là đầu vào chính thức để viết **SRS Master v5.0** và **Kiến trúc hệ thống & công nghệ v3.0**.
