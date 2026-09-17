# Kiến trúc hệ thống & công nghệ triển khai

## PTT Commerce Intelligence OS & Website Commerce Platform

| Thuộc tính | Nội dung |
|---|---|
| Phiên bản | 3.0 |
| Trạng thái | Target Architecture / Technical Blueprint — Implementation Ready |
| SRS tham chiếu | SRS Master v5.0 |
| BA tham chiếu | Phân tích nghiệp vụ v5.0 |
| Phạm vi | Phần mềm, hạ tầng, dữ liệu, Website Commerce, AI, bảo mật, tích hợp, DevSecOps, vận hành |
| Đối tượng | CTO, Solution Architect, Tech Lead, Backend/Frontend/AI/DevOps, QA, Security, Product Owner |
| Mô hình triển khai | SaaS multi-tenant; enterprise isolated tier; hybrid private-AI |

> v3.0 kế thừa Architecture v2.0, đồng bộ SRS v5.0: bổ sung sequence nghiệp vụ kỹ thuật, data contracts, API standards, deployment topologies, ADR mở rộng và checklist triển khai theo phase.

---

# 1. Mục tiêu và nguyên tắc kiến trúc

## 1.1. Mục tiêu kỹ thuật

1. SaaS multi-tenant cho organization, legal entity, brand, storefront, store, warehouse, channel.
2. Transaction chính xác: order, inventory, payment, COD, refund, approval, audit.
3. Website Commerce Platform phục vụ merchant, agency, enterprise và end-customer.
4. Corporate GTM: lead, demo, CRM routing, product tour.
5. Near-realtime connectors: POS, social, live, marketplace, carrier, payment, e-invoice, ERP/CRM/WMS.
6. Mở rộng theo domain; **không** ép microservice ở MVP.
7. Tách analytics/search/vector/media khỏi OLTP.
8. AI Agent: policy, tenant isolation, tool permission, audit, cost, human-in-the-loop.
9. Self-host GPU / private AI cho dữ liệu nhạy cảm.
10. DevSecOps, observability, backup, DR, release/rollback cho service, theme, page, agent.

## 1.2. Nguyên tắc

| Nguyên tắc | Áp dụng |
|---|---|
| Modular monolith first | NestJS Clean Architecture; tách service khi có lý do đo được |
| Domain-first | Bounded context rõ ràng |
| API-first + event-aware | OpenAPI/AsyncAPI; outbox cho sync & read model |
| Transactional truth | PostgreSQL = source of truth |
| Schema-driven website | Theme/page/section/block = JSON schema versioned; không lấy raw HTML làm truth |
| Read model separation | OpenSearch, ClickHouse, Qdrant, CDN tách OLTP |
| Zero-trust tenancy | Tenant context bắt buộc mọi lớp |
| Security by default | RBAC, audit, vault, encryption, WAF, approval |
| AI with guardrails | Tool Gateway + policy; AI không truy cập DB trực tiếp |
| Progressive delivery | Feature flag, staging, canary/blue-green, publish rollback |

---

# 2. Target Architecture Overview

```text
┌──────────────────────────────── Experience Layer ───────────────────────────────┐
│ PTT Corporate GTM Website                                                        │
│ Admin Command Center │ Website Commerce Admin │ Template Marketplace             │
│ Theme Library │ Visual Site Builder │ Go-live Checklist │ Website Analytics       │
│ Merchant Storefront Desktop │ Mobile Web │ PWA │ Customer Account                │
│ POS │ Warehouse App │ Social Agent Console │ Live Commerce Center                │
│ Content Revenue Studio │ AI Agent Studio │ Client / Brand Portal                 │
└────────────────────────────────────┬─────────────────────────────────────────────┘
                                     │ HTTPS / REST / GraphQL / WebSocket
┌────────────────────────────────────▼─────────────────────────────────────────────┐
│ Edge & API Layer                                                                  │
│ CDN / WAF / Bot Protection │ API Gateway │ OIDC / SSO │ Rate Limit                │
│ Tenant Resolver │ Storefront BFF │ Admin BFF │ Lead Capture BFF                   │
└────────────────────────────────────┬─────────────────────────────────────────────┘
                                     │
┌──────────────────────────── Application / Domain Layer ──────────────────────────┐
│ IAM & Tenant │ Organization │ Catalog │ Pricing/Promotion │ Website/CMS/Theme     │
│ Cart/Checkout │ Customer 360 │ Loyalty/Journey │ OMS │ Inventory │ Fulfillment    │
│ Shipping/COD │ Payment/Finance │ Social/Live │ Content/Creator │ Revenue Intel    │
│ Workflow/Approval │ Notification │ Integration Hub │ Audit                         │
│ AI Gateway │ Agent Orchestrator │ Knowledge Hub │ Policy/Tool Gateway             │
└───────────────────┬─────────────────────────────┬────────────────────────────────┘
                    │ synchronous                  │ events / jobs / long workflows
┌───────────────────▼──────────────────┐ ┌────────▼────────────────────────────────┐
│ Transaction & Read Data               │ │ Event / Workflow / Integration           │
│ PostgreSQL │ Redis │ OpenSearch        │ │ Redpanda/Kafka │ Temporal │ Workers     │
│ Object Storage │ ClickHouse │ Qdrant   │ │ Webhooks │ Connectors │ Notifications  │
└───────────────────┬──────────────────┘ └────────┬────────────────────────────────┘
                    │                              │
┌───────────────────▼──────────────────────────────▼───────────────────────────────┐
│ External Ecosystem                                                                │
│ Meta/Instagram │ Zalo OA │ TikTok │ Marketplace │ Carrier │ Payment │ E-invoice   │
│ Ads/Pixel/CAPI │ Email/SMS/ZNS │ ERP/CRM/WMS │ BI │ Identity Provider │ AI APIs   │
└───────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────── AI Execution Plane ──────────────────────────────┐
│ Model Router │ Agent Graph │ RAG/Qdrant │ Tool Gateway │ OPA/Cedar Policy          │
│ Cloud LLM providers │ Private GPU LLM │ Vision/OCR │ Speech │ ComfyUI Workers      │
│ Evaluation │ Prompt Registry │ Cost/Trace/Audit                                    │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

# 3. Experience & Frontend Architecture

## 3.1. Application matrix

| Application | Technology | Rendering | Responsibility |
|---|---|---|---|
| Corporate GTM Website | Next.js + React + TS | SSR/ISR + CDN | Marketing, SEO, lead, demo, resources |
| Admin Command Center | Next.js + React + TS | SPA/SSR hybrid | Executive, CRM, OMS, AI, revenue, workflow |
| Website Commerce Admin | Next.js + React | SPA/SSR hybrid | Storefront, template, theme, CMS, SEO, publish |
| Template Marketplace | Next.js + React | SSR/ISR | Discover, license, trial/install, AI Theme Match |
| Visual Site Builder | React + dnd-kit + Zustand | SPA | Schema edit, drag/drop, responsive preview, autosave |
| Merchant Storefront | Next.js | SSR/ISR/edge cache | SEO, catalog, PDP, cart, checkout, account |
| PWA | Next.js PWA/SW | Browser/PWA | Mobile conversion, offline shell, push |
| POS/Warehouse | React Native | Mobile app | Barcode, camera, offline queue, printer |
| Client/Brand Portal | Next.js + React | SPA/SSR hybrid | White-label approval/reporting |

## 3.2. UI system

- React 19+ / Next.js current stable LTS; TypeScript strict.
- Tailwind CSS + shadcn/ui; Ant Design chọn lọc cho dense enterprise grids.
- Storybook + visual regression baseline.
- Figma Tokens / Style Dictionary.
- TanStack Query (server state); Zustand (builder/local UI).
- React Hook Form + Zod.
- ECharts/Recharts; không render dataset lớn phía client.

## 3.3. Theme rendering pipeline

```text
Tenant Default Tokens
→ Brand Kit Tokens
→ Storefront Theme Tokens
→ Page Version JSON
→ Section Instance Configuration
→ Block Instance Configuration
→ SSR/ISR Rendered Storefront
```

Yêu cầu:

- JSON schema validation bắt buộc.
- Editor không ghi executable arbitrary code vào production render path.
- Custom app blocks: approved contracts + sandbox/allowlist.
- Assets qua media service/CDN + tenant boundary.
- Preview: staging hostname + version pin.

---

# 4. API Edge & Identity

## 4.1. Edge stack

| Component | Technology | Responsibility |
|---|---|---|
| CDN/WAF | Cloudflare hoặc CloudFront + WAF | CDN, DDoS, edge cache, bot, image opt |
| API Gateway | Kong / APISIX / Traefik / NGINX | Routing, auth, rate limit, IP allowlist |
| Auth/SSO | Keycloak hoặc Auth0/WorkOS | OIDC, OAuth2, SAML, MFA, SCIM |
| BFF | Next.js Route Handlers hoặc NestJS BFF | UI aggregation + server ACL |
| Contract | OpenAPI 3.1 + AsyncAPI | SDK, docs, contract tests |

## 4.2. API standards

- REST cho transactional/public; GraphQL chỉ khi approved cho flexible read.
- Metadata bắt buộc:

```text
tenant_id
brand_id (khi áp dụng)
actor_id
correlation_id
trace_id
idempotency_key (writes)
api_version
```

- Cursor pagination cho resource lớn.
- Error envelope chuẩn toàn hệ thống.
- Storefront public không nhận internal credential / unrestricted token.
- Checkout/payment: WAF/rate limit và replay protection nghiêm hơn.

### Error envelope (chuẩn)

```json
{
  "error": {
    "code": "INV_INSUFFICIENT_STOCK",
    "message": "Available quantity is insufficient",
    "details": [{"sku": "SKU-1", "available": 2, "requested": 5}],
    "correlation_id": "cor_...",
    "trace_id": "trc_..."
  }
}
```

## 4.3. Identity & access

- OIDC/OAuth2 first; MFA bắt buộc Super Admin, Finance, Integration, Publish, AI Ops.
- Enterprise: SAML/OIDC SSO + SCIM.
- Short-lived JWT, refresh rotation, device/session revoke.
- Service-to-service: mTLS hoặc workload identity JWT.
- API keys hashed + secret vault; scopes theo integration.

---

# 5. Domain & Backend Architecture

## 5.1. Backend stack

| Layer | Technology | Role |
|---|---|---|
| Main backend | Node.js 22 LTS + TypeScript + NestJS | Modular core API, use cases, adapters |
| ORM / SQL | Prisma hoặc Drizzle + SQL migrations tường minh | Type-safe access + migration discipline |
| AI services | Python 3.12 + FastAPI | AI gateway, LangGraph, embedding/OCR |
| High-throughput worker | Go khi cần | Webhook/event ingestion |
| Validation | Zod + Pydantic v2 | API/event/tool contracts |
| Job/workflow | Temporal SDK + workers | Durable process, approvals, timers |

## 5.2. Bounded contexts

| Context | Responsibility |
|---|---|
| IAM/Tenant | User, role, permission, SSO, session, tenant context |
| Organization | Legal entity, brand, store, warehouse, channel |
| Catalog/PIM | Product, variant, SKU, attribute, UOM, media |
| Pricing/Promotion | Price list, promotion, voucher, redemption |
| Website Commerce | Storefront, template, theme, Brand Kit, page, SEO |
| Cart/Checkout | Cart, checkout session, quote, order initiation |
| OMS | Order, allocation, merge/split, state machine |
| Inventory | Balance, reservation, lot, movement, stocktake, transfer |
| Fulfillment | Wave pick, package, evidence, RMA |
| Shipping/COD | Shipment, label, tracking, COD reconciliation |
| Payment/Finance | Payment, refund, cashbook, debt, invoice |
| Customer/CRM | Customer, identity, consent, segment, profile |
| Journey/Loyalty | Automation, point ledger, tier, referral |
| Social/Live | Conversation, comment, live session |
| Content/Creator | Brief, asset, creator, campaign, commission |
| Revenue Intelligence | Attribution, cost allocation, metric, forecast |
| Workflow/Approval | Definition, request, approval, task, SLA |
| AI Platform | Agent, prompt, knowledge, tool/action, evaluation |
| Integration Hub | Connector, mapping, credential ref, webhook, sync |
| Notification | Email, SMS, ZNS, push, in-app |

## 5.3. Modular monolith layout

```text
apps/
├── admin-api/
├── storefront-bff/
├── corporate-site-bff/
├── worker/
├── ai-gateway/
└── integration-ingress/

packages/
├── shared-kernel/
├── iam/
├── organization/
├── catalog/
├── pricing-promotion/
├── website-commerce/
├── cart-checkout/
├── oms/
├── inventory/
├── fulfillment-shipping/
├── payment-finance/
├── customer-crm/
├── journey-loyalty/
├── social-live/
├── content-commerce/
├── revenue-intelligence/
├── workflow-approval/
├── integration-hub/
├── notification/
└── audit/
```

Clean Architecture mỗi module:

```text
module/
├── domain/          # entity, VO, event, repository port
├── application/     # commands, queries, use cases, DTO
├── infrastructure/  # DB, queue, clients, adapters
└── presentation/    # HTTP, GraphQL, event consumer
```

## 5.4. Tiêu chí tách service

Tách khi có lý do đo được:

1. Webhook/connector ingress + sync workers  
2. Notification service  
3. Search indexing  
4. Storefront rendering/cache  
5. Analytics event ingestion  
6. AI Gateway + agent workers  
7. ComfyUI/media GPU workers  
8. Payment/checkout isolation (volume/risk)

---

# 6. Data Architecture

## 6.1. PostgreSQL — OLTP Source of Truth

PostgreSQL 16+ lưu:

- Tenant, user, role, permission, audit metadata
- Product, variant, price, promotion
- Customer, consent, loyalty
- Cart, order, payment, refund, inventory ledger, fulfillment
- Storefront, theme, page, Brand Kit, publish job, go-live checklist
- Workflow, approval, integration config

### Patterns

- UUIDv7 / ULID public IDs
- `tenant_id` bắt buộc trên bảng tenant-owned
- RLS cho shared tier; DB/schema isolation cho enterprise
- Partition audit/event theo thời gian (+ tenant khi cần)
- Read replica cho báo cáo không critical
- Outbox table cho reliable publish

### Inventory ledger (logic)

```text
InventoryBalance(sku, warehouse): on_hand, reserved, blocked, incoming, in_transit
InventoryLedger: append-only movements
Reservation: order_line_id, qty, expires_at, status
Available = on_hand - reserved - blocked
```

## 6.2. Redis

Session, rate limit, token blacklist; distributed lock checkout/reservation; cart/checkout short-lived; cache/feature flags/fragment invalidation; BullMQ low-latency nếu cần.

**Không** là source of truth cho order/payment/inventory ledger.

## 6.3. OpenSearch

Product search/filter/synonym/typo; customer/order/admin search; content/page metadata; autocomplete.

Index qua outbox/consumer — không block transaction.

## 6.4. Object storage + CDN

S3 / Cloudflare R2 / MinIO:

- Product/UGC/content media; theme package; Brand Kit assets
- Invoice PDF/XML; packing evidence; export report
- AI I/O; ComfyUI artifacts

Tenant/brand-scoped path; presigned URL; malware scan; versioning/lifecycle; CDN image transform.

## 6.5. ClickHouse — Analytics / Revenue

Facts: storefront, order/payment/fulfillment/shipping, social/live/content/creator, funnel/attribution/margin, AI cost/latency.

```text
App / Storefront / Connector Events
→ Redpanda/Kafka
→ Stream Consumer
→ ClickHouse Raw
→ dbt / MV / Semantic Metrics
→ Dashboard / RI / AI Insight
```

## 6.6. Qdrant — Vector / RAG

Knowledge Hub; semantic product search; content similarity; SOP/FAQ; agent memory (nếu policy cho phép).

Payload tối thiểu:

```json
{
  "tenant_id": "ten_...",
  "brand_id": "brand_...",
  "document_id": "doc_...",
  "document_version": "v3",
  "access_scope": ["role:marketing", "brand:aura"],
  "status": "approved",
  "effective_from": "...",
  "effective_to": "...",
  "source_type": "policy|product|faq|sop|content",
  "language": "vi"
}
```

Multitenancy: shared (payload filter) → growth (shard/key) → enterprise (dedicated collection/cluster).

---

# 7. Event, Workflow & Integration

## 7.1. Event broker

- **Redpanda** giai đoạn đầu / growth (Kafka API compatible).
- **Apache Kafka** khi volume/expertise lớn.
- NATS JetStream chỉ cho low-latency chọn lọc — không thay analytical stream chính.

Topics:

```text
ptt.catalog.events.v1
ptt.order.events.v1
ptt.inventory.events.v1
ptt.website.events.v1
ptt.storefront.events.v1
ptt.crm.events.v1
ptt.content.events.v1
ptt.revenue.events.v1
ptt.ai.events.v1
ptt.integration.events.v1
ptt.audit.events.v1
```

## 7.2. Event envelope

```json
{
  "event_id": "evt_...",
  "event_type": "theme.published",
  "event_version": "1.0",
  "occurred_at": "2026-09-17T00:00:00Z",
  "tenant_id": "ten_...",
  "brand_id": "brand_...",
  "actor": {"type": "user|system|agent|connector", "id": "..."},
  "correlation_id": "cor_...",
  "causation_id": "cmd_...",
  "payload": {}
}
```

## 7.3. Outbox / Inbox

```text
Business TX commit + Outbox insert
→ Outbox publisher → Broker
→ Consumer → Inbox/idempotency
→ Side effect / read model
→ Processed marker
```

Áp dụng: order, inventory, payment, publish, CRM, analytics, AI action, connector sync.

## 7.4. Temporal workflows

Dùng cho: order risk/confirm, fulfillment/handover, RMA/refund, COD reconcile, journeys, theme/page publish, AI high-risk approval, connector refresh/resync, enterprise onboarding.

### PublishThemeWorkflow

```text
Start
→ Validate theme/page schema
→ Validate app block compatibility
→ SEO / tracking / checkout validation
→ Synthetic CWV test
→ Backup current published version
→ Request approval (signal wait)
→ Publish theme/page (atomic pointer)
→ Invalidate CDN / revalidate ISR
→ Health window monitor
→ Rollback if critical threshold
→ Notify + audit
```

### ConfirmOrderWorkflow (rút gọn)

```text
Validate price/promo server-side
→ Risk score
→ Reserve inventory (lock + ledger)
→ Persist CONFIRMED
→ Emit order.confirmed
→ Start AllocateFulfillmentWorkflow
```

## 7.5. Connector framework

```text
Credential Adapter
→ Auth / Token Refresh
→ Field Mapping
→ Status Mapping
→ Webhook / Poll Ingestion
→ Idempotency
→ Retry / Backoff
→ Error Queue (DLQ)
→ Manual Resync
→ Reconciliation
→ Audit / Observability
```

Nhóm: marketplace, social, carrier, payment, e-invoice, messaging, ads/pixel/CAPI, ERP/CRM/WMS/BI, identity, AI provider.

---

# 8. Website Commerce Technical Architecture

## 8.1. Storefront runtime

```text
Browser / Mobile Web / PWA
→ CDN / WAF / Edge Cache
→ Next.js Storefront (SSR/ISR/Edge)
→ Storefront BFF
→ Catalog / Pricing / Inventory Read APIs
→ Search API
→ Cart / Checkout APIs
→ Customer / Loyalty APIs
→ Analytics Event Collector
```

## 8.2. Theme / page model

```text
Storefront
├── BrandKit
├── Theme
│   ├── ThemeVersion
│   ├── ThemeSchema
│   ├── ThemeSettings
│   └── AppBlockRegistry
├── Page
│   ├── PageVersion
│   ├── SEOConfig
│   ├── SectionInstances[] → BlockInstances[]
│   └── ExperimentVariants[]
├── Navigation
└── MediaAssets
```

Render:

```text
Theme Schema + Brand Tokens + Page JSON + Catalog/Segment Context
→ Component Renderer → SSR/ISR HTML
→ CDN cache tags: storefront/page/theme/product/collection
```

## 8.3. Cache invalidation

| Change | Action |
|---|---|
| Product content | Revalidate PDP/collection/search liên quan |
| Price/promo | Revalidate PDP/cart pricing read cache |
| Inventory | Revalidate badge; **checkout luôn server validate** |
| Theme/page publish | Purge/revalidate page/theme tags |
| Brand Kit | Revalidate tokens/assets liên quan |
| Media | Versioned URL hoặc targeted purge |

## 8.4. Visual Site Builder

```text
Builder UI
→ Draft API
→ JSON Schema Validator
→ Page Version Store (PostgreSQL)
→ Preview Renderer (staging pin)
→ Approval / Publish Temporal Workflow
→ CDN / ISR Invalidation
```

Safeguards: version mọi thay đổi; autosave + optimistic concurrency; conflict resolution; preview token hết hạn/revoke; app blocks chỉ từ registry; publish checks schema/SEO/tracking/checkout/CWV/approval.

## 8.5. Checkout boundary

```text
Cart
→ Checkout Session
→ Server-side Pricing / Promotion
→ Inventory Reservation
→ Shipping Quote
→ Payment Intent
→ Order Transaction
→ Provider Callback (signature verify)
→ Order Confirmation Workflow
```

Yêu cầu:

- Không tin client price/discount/total.
- Idempotency key / attempt.
- Redis lock + PostgreSQL ledger cho reservation.
- Payment callback signed + replay protection.
- Tách PCI-sensitive token khỏi app logs/storage.
- Checkout sống được khi analytics pipeline degraded.

## 8.6. Website analytics

```text
Storefront Event SDK
→ Consent Gate
→ Event Collector API
→ Redpanda/Kafka
→ ClickHouse Raw
→ Sessionization / Funnel / Attribution
→ Website Analytics / AI Conversion Insight
```

Events tối thiểu: `page_view`, `view_item_list`, `view_item`, `select_item`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase`, `search`, `signup`, `login`, `chat_opened`, `experiment_exposed`.

---

# 9. AI Execution Architecture

## 9.1. AI plane

```text
UI / API / Temporal
→ AI Gateway
→ Tenant / RBAC / Budget / Policy
→ Model Router
→ Agent Orchestrator (LangGraph)
→ Retrieval (Qdrant + ACL)
→ Tool Gateway → Domain APIs
→ Cloud or Private GPU Model
→ Evaluation / Trace / Cost / Audit
```

## 9.2. Stack

| Component | Technology |
|---|---|
| AI Gateway | FastAPI hoặc NestJS |
| Orchestration | LangGraph |
| Typed output | PydanticAI / Pydantic v2 |
| Durable flow | Temporal |
| Policy | OPA hoặc Cedar |
| RAG | Qdrant + embedding/reranker |
| Prompt registry | Git + DB version records |
| Observability | Langfuse và/hoặc OTel |
| Inference | Provider APIs + vLLM/SGLang |
| Creative | ComfyUI workers |
| Speech | faster-whisper / provider |

## 9.3. Model routing

```text
Tagging/summary/routing → fast low-cost
RAG sales/care → balanced + reranker
Planning/revenue → reasoning
Vision/OCR → vision pipeline
Speech → STT
Enterprise restricted → private route
Provider fail → policy-approved fallback
```

## 9.4. Private GPU topology

```text
Private VPC / On-prem
├── GPU A: vLLM/SGLang LLM
├── GPU B: embedding/reranker/vision/OCR
├── GPU C: ComfyUI
├── CPU: LangGraph/Temporal AI workers
├── Qdrant private
└── DCGM exporter

AI Gateway → private endpoint only (mTLS / service JWT)
```

## 9.5. Tool Gateway (bắt buộc)

```text
Agent → Tool Gateway
→ Tenant/Role/Scope
→ OPA/Cedar
→ Risk/approval
→ Domain API
→ Redacted result + audit
→ Agent response
```

AI **không bao giờ** truy cập DB trực tiếp.

### Risk → kỹ thuật enforce

| Risk | Enforce |
|---|---|
| Low | Allow + audit |
| Medium | Flag `needs_review` optional |
| High/Critical | Temporal approval signal trước execute |

---

# 10. Security & Compliance

## 10.1. Multi-tenancy controls

| Layer | Control |
|---|---|
| API | JWT claims, tenant resolver, middleware |
| Application | Tenant-aware repos + domain authz |
| PostgreSQL | tenant_id / RLS; enterprise isolated DB |
| Redis | tenant namespace / safe keys |
| Event bus | tenant metadata + consumer validation |
| Qdrant | payload filter / shard / dedicated |
| Object storage | tenant prefix / IAM / presigned |
| Search | tenant filter / index boundary |
| ClickHouse/BI | tenant dimensions + RLS |
| AI | ACL retrieval + tool gateway + private model policy |

## 10.2. Secrets & encryption

Vault / cloud secret manager / Doppler; rotate keys/tokens/webhook secrets; encrypt at rest/in transit; redact PII/secret trong logs/traces/prompts; không gửi secret ra browser.

## 10.3. Application security

OWASP ASVS baseline; Zod/Pydantic validation; CSP/CSRF/secure cookies/XSS; SSRF protection (URL ingest + AI tools); malware scan uploads; signed webhook + timestamp/replay; SAST/DAST/dependency/container scans.

## 10.4. Privacy

Classification: public/internal/confidential/PII/financial/restricted AI; field masking; purpose-based consent; retention/anonymization/export/delete; audit PII export; redaction trước external model; private AI route cho enterprise restricted.

---

# 11. Observability & Operations

## 11.1. Stack

| Signal | Tooling |
|---|---|
| Instrumentation | OpenTelemetry SDK |
| Pipeline | OTel Collector |
| Metrics | Prometheus + Grafana |
| Logs | Loki (+ Grafana) hoặc OpenSearch |
| Traces | Tempo hoặc Jaeger |
| Errors | Sentry |
| Synthetic | Checkly / Grafana Synthetic / Better Uptime |
| AI traces | Langfuse và/hoặc OTel |

## 11.2. Dimensions bắt buộc

```text
trace_id, correlation_id, tenant_id, brand_id, storefront_id,
actor_id, service_name, service_version, environment,
workflow_id, entity_id/order_id, ai_agent_id/model/cost
```

## 11.3. Business observability

Order intake/fail/duplicate; reservation conflict/oversell; checkout/payment conversion/callback delay; carrier/marketplace sync lag; theme/page publish success/rollback; CWV/funnel/abandonment; attribution freshness; AI cost/latency/tool fail/policy violation/approval SLA.

## 11.4. Alert levels

| Level | Ví dụ |
|---|---|
| P1 | Checkout/payment outage, data corruption, tenant isolation breach |
| P2 | Order backlog, inventory sync fail, carrier callback fail, publish fail |
| P3 | Web vitals regression, API latency, AI cost spike, token expiry |
| P4 | SEO warning, low stock, approval SLA, content issue |

---

# 12. DevSecOps & Infrastructure

## 12.1. Environments

```text
Local → Dev → Staging → Production → Enterprise Isolated (optional)
```

## 12.2. IaC & deploy

| Area | Technology |
|---|---|
| IaC | Terraform / OpenTofu |
| Bootstrap | Ansible (VM/GPU) |
| Containers | Docker |
| Orchestration | Managed container/VM (MVP) → Kubernetes (growth) |
| Packaging | Helm / Kustomize |
| GitOps | Argo CD / Flux |
| TLS | cert-manager |
| Secrets | External Secrets / Vault Agent |
| Autoscaling | HPA + KEDA (queue workers) |
| Network | NetworkPolicy / Cilium |

## 12.3. CI/CD

```text
PR → Lint/Typecheck/Unit
→ SAST/Secret/Dependency scan
→ Build image / SBOM / Image scan
→ Integration / Contract tests
→ Deploy Staging
→ E2E / k6 / Security smoke
→ Approval gate
→ Canary hoặc Blue-Green Production
→ Observability check / Rollback
```

Tooling: GitHub/GitLab CI; ESLint/Prettier/Ruff/mypy/pytest; Vitest/Jest/Playwright/k6/Pact; Semgrep/Trivy/Gitleaks/Renovate; Unleash/LaunchDarkly.

## 12.4. Backup & DR

| Data | Strategy |
|---|---|
| PostgreSQL | PITR, daily snapshots, restore drill |
| ClickHouse | Replication + object storage backup |
| Qdrant | Snapshot + encrypted object storage |
| Object Storage | Versioning/lifecycle/cross-region enterprise |
| Redis | AOF/RDB theo criticality |
| Redpanda/Kafka | Replication/retention/mirror |
| Config/Secrets | GitOps + secret recovery process |

```text
Standard SaaS: RPO ≤ 15 phút, RTO ≤ 4 giờ
Enterprise: ví dụ RPO ≤ 5 phút, RTO ≤ 1 giờ (theo hợp đồng)
```

---

# 13. Infrastructure Topologies

## 13.1. MVP / Pilot

```text
Cloud VPC
├── CDN/WAF
├── App VM hoặc Managed Container
│   ├── Next.js apps
│   ├── NestJS modular API
│   └── Workers
├── Managed PostgreSQL
├── Managed Redis
├── Object Storage + CDN
├── Managed email/SMS/ZNS
└── Sentry + managed monitoring
```

## 13.2. Growth SaaS

```text
Kubernetes
├── Web pods (Corporate/Storefront/Admin)
├── API/BFF pods
├── Worker pods (KEDA)
├── Integration/Webhook pods
├── AI Gateway pods
├── OTel Collector
├── Redis Cluster
├── Temporal
├── Redpanda/Kafka
├── PostgreSQL HA
├── OpenSearch
├── ClickHouse
├── Qdrant
└── Object storage/CDN
```

## 13.3. Enterprise isolated

```text
Enterprise VPC / Private Cloud / On-prem
├── Dedicated namespace hoặc cluster
├── Dedicated PostgreSQL
├── Dedicated object storage bucket/key
├── Dedicated Qdrant
├── Private VPN / PrivateLink / IP allowlist
├── Enterprise IdP SSO/SCIM
├── Optional private GPU
└── Tenant-separated observability
```

---

# 14. Technology Selection Summary

| Layer | Primary | Alternative |
|---|---|---|
| Corporate/Storefront | Next.js + React + TS | Nuxt/Vue |
| Admin UI | React + Tailwind + shadcn | Ant Design dense screens |
| Mobile/POS | React Native | Flutter |
| Backend | NestJS + TypeScript | Spring Boot / .NET |
| AI service | FastAPI + Python | Node gateway + Python workers |
| OLTP | PostgreSQL | Aurora / Cloud SQL / AlloyDB |
| Cache | Redis | KeyDB / Dragonfly |
| Event stream | Redpanda | Kafka / NATS JetStream |
| Workflow | Temporal | Camunda (BPM-heavy) |
| Search | OpenSearch | Elasticsearch / Meilisearch |
| Analytics | ClickHouse | BigQuery / Snowflake |
| Vector | Qdrant | pgvector (MVP) / Weaviate / Milvus |
| Object storage | S3 / R2 / MinIO | cloud equivalent |
| Auth | Keycloak | Auth0 / WorkOS / Clerk |
| Policy | OPA | Cedar |
| Observability | OTel + Prometheus/Grafana/Loki/Tempo | Datadog / New Relic |
| AI inference | vLLM/SGLang + providers | TGI |
| Creative AI | ComfyUI workers | Managed APIs |
| Infra | K8s + Terraform + Argo CD | Managed containers early |

---

# 15. Technical Roadmap

| Phase | Timeline | Key delivery |
|---|---|---|
| A — Foundation | 0–3 tháng | Next.js shell, NestJS modular core, PG/Redis, IAM, PIM, CRM/order basic, CI/CD/OTel |
| B — Commerce Ops | 3–6 tháng | OMS/inventory/shipping/payment, outbox/events, storefront cart/checkout, POS/social basic |
| C — Website Commerce | 6–9 tháng | Template Store, Theme Library, Brand Kit, Builder, CMS, Go-live, web analytics, SEO/CWV |
| D — Intelligence | 9–12 tháng | Redpanda/Kafka, ClickHouse, attribution, margin, content/creator, Qdrant, AI copilot, Temporal |
| E — Enterprise AI | 12–18 tháng | Workflow/custom objects/SSO/white-label, policy engine, private GPU, DR/SLA |
| F — Corporate GTM | song song | Corporate site, resource hub, product tour, lead routing, case/ROI, experiments |

Mapping SRS phases 1–8 ↔ Technical phases A–F được giữ nhất quán với SRS v5.0.

---

# 16. Architecture Decision Records

| ADR | Decision | Recommendation |
|---|---|---|
| ADR-001 | Monolith vs microservices | Modular monolith first; extract on measurable need |
| ADR-002 | Transaction DB | PostgreSQL source of truth |
| ADR-003 | Events | Redpanda/Kafka + outbox/inbox |
| ADR-004 | Durable workflows | Temporal |
| ADR-005 | Website engine | Hybrid native theme/builder + headless API |
| ADR-006 | Analytics | ClickHouse event/revenue warehouse |
| ADR-007 | RAG | Qdrant + tenant ACL + tiered isolation |
| ADR-008 | AI strategy | Multi-provider + private self-host |
| ADR-009 | AI data access | Tool Gateway + OPA/Cedar; no direct DB |
| ADR-010 | Auth | OIDC-first; Keycloak hoặc managed theo tier |
| ADR-011 | Infrastructure | Managed cloud early → K8s growth → isolated enterprise |
| ADR-012 | Observability | OpenTelemetry-first; technical + business signals |
| ADR-013 | Storefront render | Next.js SSR/ISR + CDN tag invalidation |
| ADR-014 | Builder data | Schema-driven JSON versioned; not raw HTML truth |
| ADR-015 | Publish governance | Temporal validate/approve/backup/rollback |
| ADR-016 | Checkout integrity | Server-side price + idempotency + reservation ledger |
| ADR-017 | Attribution | Versioned formulas in analytics layer; no silent historical rewrite |
| ADR-018 | Multi-tenancy | Shared RLS default; dedicated DB/GPU for enterprise |

---

# 17. Sequence kỹ thuật tham chiếu

## 17.1. Storefront Purchase

```text
Customer → Storefront → BFF → Cart API
→ Checkout Session (reprice)
→ Inventory Reserve
→ Payment Intent / COD create
→ OMS Order persist
→ Outbox: order.created / purchase event
→ Temporal Confirm/Fulfill
→ ClickHouse (async analytics)
```

## 17.2. Theme Publish

```text
Publisher → Admin API → Create PublishJob
→ Temporal PublishThemeWorkflow
→ Validations + Backup
→ Approval signal
→ Switch Published ThemeVersion
→ CDN purge / ISR revalidate
→ Health monitor → Rollback? → Audit
```

## 17.3. AI assisted reply → order draft

```text
Agent UI → AI Gateway
→ Policy/Budget check
→ RAG retrieve (tenant ACL)
→ Propose create_order_draft via Tool Gateway
→ Risk=Medium → optional review
→ CRM/OMS draft API
→ Audit + cost event
```

---

# 18. Architecture Acceptance Checklist

## Functional

- [ ] Tenant context bắt buộc API/DB/cache/queue/search/vector/storage/analytics
- [ ] Order/payment/inventory: idempotency + audit + reservation policy
- [ ] Outbox/inbox reliable delivery
- [ ] Theme/page: version, staging, preview, approval, publish, rollback
- [ ] Cache invalidation theo product/price/stock/promo/theme
- [ ] Checkout server-side pricing + payment webhook signature
- [ ] API version/rate limit/webhook signing/correlation ID
- [ ] AI: Tool Gateway, policy, tenant ACL, audit, approval
- [ ] Knowledge retrieval filter tenant/brand/role/status/effective date
- [ ] Go-live checklist gate trước publish

## Non-functional

- [ ] OTel traces/metrics/logs baseline
- [ ] Technical + business dashboards
- [ ] Secrets không có ở frontend/source/log
- [ ] Backup/PITR/restore drills
- [ ] Security scans trong CI/CD
- [ ] Staging/production separation + progressive rollout
- [ ] Load test checkout/inventory/webhook/storefront/AI queues
- [ ] Runbooks payment/carrier/marketplace/AI/publish

---

# 19. Kết luận

Kiến trúc v3.0 triển khai SRS Master v5.0 theo mô hình:

```text
Modular Commerce Core
+ Website Commerce Platform
+ Corporate GTM Website
+ Event-driven Integration
+ Analytics / Revenue Intelligence
+ Guardrailed AI Agent Plane
+ Enterprise Configurability
```

Trục kỹ thuật bất biến:

1. PostgreSQL = transactional truth  
2. Event/outbox = đồng bộ đáng tin cậy  
3. Search / analytics / vector / media tách OLTP  
4. Website = commerce runtime có theme/version/publish/rollback  
5. AI luôn sau Tool Gateway + policy + RBAC + audit + approval  
6. Modular monolith trước — tách service khi vận hành chứng minh cần  

Điều này cho phép PTT ra thị trường nhanh với Commerce CRM + Website Commerce, đồng thời đủ nền để mở Revenue Intelligence, private GPU AI và enterprise deployment ở các phase sau.
