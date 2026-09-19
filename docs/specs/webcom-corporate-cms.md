# Spec — WebCom Corporate CMS (Platform GTM)

| Thuộc tính | Nội dung |
|---|---|
| Phiên bản | 1.2 |
| Ngày | 2026-09-20 |
| Trạng thái | Draft → Ready to implement |
| Site đích | `https://webecom.ngoinhahomnay.vn` (`apps/corporate-web`) |
| Tham chiếu | SRS §8 FR-CORPWEB-001…006 · `docs/04` §9p · ADR-005 · [`shared-cms-themepackage.md`](./shared-cms-themepackage.md) · mockup `01-corporate-gtm.html` |
| Phụ thuộc | Shared CMS **GA đã ship** (ContentV1 · Section Registry · PageVersion · Builder) |
| Không đụng | Merchant storefront CMS / ThemePackage (đã GA) — chỉ **mở rộng owner + section types + runtime corporate** |

---

## 1. Mục tiêu

1. Marketing/ops **sửa nội dung** trang Platform (homepage, solutions, industry, pricing, case/ROI, resources, FAQ) **không cần deploy code**.
2. **Một CMS engine** với Shared CMS (cùng ContentV1, registry, versioning, preview, approval) — **không** fork Visual Builder.
3. Runtime `corporate-web` **đọc published content** theo slug; fallback hardcode khi flag tắt hoặc thiếu page.
4. Lead/Demo (FR-CORPWEB-004) vẫn qua API leads/CRM; CMS chỉ quản **copy/CTA/layout** form, không thay CRM logic.
5. Governance: draft → review → publish; audit; rollback version (FR-CORPWEB-006).

---

## 2. Non-goals (Won't wave này)

| Won't | Lý do |
|---|---|
| CMS riêng / editor fork cho corporate | Trái ADR-005 & §9p #5 |
| Merchant ThemePackage / storefront builder | Đã GA — ngoài phạm vi |
| Subscription Starter/Growth đầy đủ | `docs/04` Won't phase 1 |
| 400 theme marketplace | MKT catalog riêng |
| Arbitrary HTML/script block | Chỉ section registry allowlist |
| Multi-locale đầy đủ (i18n CMS) | CORP-CMS-3+; MVP `vi` (+ `en` stub optional) |
| A/B page corporate | CORP-CMS-3 Could |
| Creator Portal upload skin corporate | Không áp dụng |

---

## 3. Nghiệp vụ chuyên sâu (Platform GTM)

> CMS không chỉ là “sửa chữ trên web”. Spec này định nghĩa **cách WebCom bán nền tảng**: ai làm gì, funnel đo gì, CTA đi đâu, nội dung được phép nói gì, và gate publish ra sao.

### 3.1. Bối cảnh kinh doanh

| | |
|---|---|
| **Sản phẩm bán trên apex** | Nền tảng WebCom (commerce OS) + **ThemePackage** one-time + trial self-serve |
| **Không bán trên apex** | SKU hàng hóa AURA (đã tách sang `themes.` demo storefront) |
| **Promise cốt lõi** | “Chọn theme → demo → trial → mua → go-live” + điều hành theo **contribution margin**, không chỉ GMV |
| **Đối thủ tham chiếu** | Suite omnichannel VN (Haravan-class) — trên UI public dùng ngôn ngữ **capability**, không bắt buộc gọi tên (Legal) |
| **Đơn vị thành công** | Trial activated · Theme license paid · Storefront go-live · Demo booked (enterprise) |

### 3.2. Persona & Jobs-to-be-done

| Persona | Mục tiêu trên site | Việc CMS phải hỗ trợ | CTA ưu tiên |
|---|---|---|---|
| **P1 · Chủ shop / D2C** | Tìm theme đẹp, thử nhanh, mua khi chạy được | Catalog intro rõ; trial trước paywall; giá theme minh bạch | Demo live → Dùng thử → Mua theme |
| **P2 · Marketing lead** | Hiểu module (Web/Live/POS/CRM/AI) + KPI | Solution pages problem→workflow→KPI; case before/after | Đặt demo / Xem case |
| **P3 · CEO / Founder** | Tin cậy governance, AI có approval, margin | Trust, capability matrix, BR-018 messaging | Đặt demo / Assessment |
| **P4 · Agency / SI** | Multi-brand, preview, license | Pricing Growth/Platform; agency preview note | Đặt demo / Partner |
| **P5 · Ops nội bộ (Editor)** | Đổi campaign/copy không chờ deploy | Draft/review/publish; announce bar; schedule (CMS-2+) | — |
| **P6 · Sales** | Lead đủ field + UTM + SLA | Form chuẩn; routing CRM; không để CMS phá dedupe | — |

**Anti-persona:** Visitor chỉ cần “làm website miễn phí không trial” — không optimize funnel quanh đó; free theme vẫn gắn trial/onboarding.

### 3.3. North-star funnel & KPI

```text
Visit apex
  → View /templates | Solution | Pricing
  → Demo live (themes.?demo=)
  → Trial signup (/trial)
  → Console customize (Brand Kit / builder)
  → Buy theme (P3 VietQR) | Book demo (enterprise)
  → Go-live gate pass
```

| KPI | Định nghĩa | Owner | CMS ảnh hưởng? |
|---|---|---|---|
| **CVR_browse_demo** | clicks Demo / sessions `/templates*` | Growth | Intro + card CTA copy |
| **CVR_demo_trial** | trial starts / demo sessions | Growth | Trial page copy |
| **CVR_trial_paid** | theme licenses paid / trials | Growth+Rev | Pricing & paywall messaging |
| **Demo_booked** | leads channel=website qualified | Sales | Lead form + CTA “Đặt demo” |
| **Time_to_publish_content** | draft→live median | Marketing | Workflow CMS |
| **Content_error_rate** | publish gây 5xx / blank section | Eng | Validation + fallback |
| **Contribution story** | Case/ROI pages dùng metric margin (không chỉ GMV) | PMM | Editorial rule §3.9 |

**Không** dùng chỉ “pageviews homepage” làm success CMS.

### 3.4. Content operating model (vai trò)

| Role | Permission | Được làm | Không được làm |
|---|---|---|---|
| **Editor** | `platform.cms.write` | Sửa draft, upload media, preview | Publish production |
| **Approver** | `platform.cms.publish` | Publish / rollback / schedule | Đổi RBAC |
| **PMM** | write + publish (thường) | Solution/capability/pricing copy | Đổi lead routing code |
| **Legal/Compliance** | review (optional queue) | Approve claim cạnh tranh, disclaimer | — |
| **Sales Ops** | read + lead config | Map CTA→pipeline (ngoài CMS) | Sửa homepage không qua Approver |
| **Eng** | admin | Flag, schema, section types | Copy marketing ad-hoc trên prod không audit |

**RACI nội dung định kỳ**

| Artifact | R | A | C | I |
|---|---|---|---|---|
| Homepage campaign | Editor | PMM | Sales | Eng |
| Pricing table | PMM | RevOps | Legal | Sales |
| Capability matrix | PMM | Legal | Eng | Sales |
| Case study | PMM | Customer Success | Legal | Sales |
| Announce bar promo | Growth | PMM | — | Support |

### 3.5. Intent từng nhóm trang (map FR)

#### FR-CORPWEB-001 — Homepage

| Block nghiệp vụ | Mục đích | Đo |
|---|---|---|
| Announce | Campaign / Unlimited / event — **1 message**, có hạn | CTR announce |
| Hero | Value prop + primary path (templates **hoặc** demo) | CTR primary |
| Social proof | Credibility (số liệu **có nguồn** nội bộ / anonymized) | Scroll depth |
| Module tour | Giáo dục OS (Web · Live · POS · CRM · AI) | Module CTR |
| Industry strip | Đưa P1 vào catalog đúng ngành | CTR → `/templates?industry=` |
| CTA band | Enterprise path (đặt demo) song song self-serve | Lead submit |

**Business rule:** Homepage **không** thay thế `/templates` — nếu primary CTA = “Chọn template” phải deep-link catalog; không mở modal giả catalog trong CMS MVP.

#### FR-CORPWEB-002 — Solution / Product

Cấu trúc bắt buộc mỗi module page:

1. **Problem** (pain ngành/role)  
2. **Workflow** (3–6 bước)  
3. **UI proof** (screenshot / collage — media CMS)  
4. **KPI** (metric vận hành: CVR, margin, SLA… — có định nghĩa)  
5. **CTA** (trial / demo theo ICP)

| Module page (slug gợi ý) | ICP chính | CTA mặc định |
|---|---|---|
| `/solutions/website` | P1, P2 | Xem templates / Trial |
| `/solutions/live` | P1, P2 | Đặt demo |
| `/solutions/pos` | P1, Ops | Đặt demo |
| `/solutions/crm` | P2, P3 | Đặt demo |
| `/solutions/ai` | P3 | Đặt demo + nhấn **approval / BR-018** |

#### FR-CORPWEB-003 — Industry / Role

| Dimension | Values MVP | Rule |
|---|---|---|
| Industry | beauty, fashion, fnb, electronics, b2b, … (align catalog facets) | Link sang `/templates?industry=` **cùng key** |
| Role | ceo, marketing, ops | CTA khác: CEO→demo; Mkt→templates/trial; Ops→POS/demo |

**Rule:** Industry page **không** duplicate toàn bộ catalog — 3–6 theme featured + “Xem tất cả ngành”.

#### FR-CORPWEB-004 — Lead & Demo (ranh giới nghiệp vụ)

| Bước | Hệ thống | SLA |
|---|---|---|
| Submit form | `POST /leads` | 200 + id |
| Consent | Bắt buộc checkbox; lưu timestamp | Block submit nếu thiếu |
| UTM | Capture `utm_*` + landing slug + `gclid` nếu có | Persist trên Lead |
| Dedupe | CRM/API theo email+phone (ngoài CMS) | — |
| Route | `channel=website`, tag page slug | Sales queue |
| First touch | Task SLA **≤ 4h giờ làm việc** (config Sales Ops) | Monitor CRM |
| Copilot summary | Optional AI — không block form | — |

**CTA taxonomy (bắt buộc thống nhất)**

| CTA code | Label gợi ý (VI) | Dest | Dùng khi |
|---|---|---|---|
| `cta_templates` | Chọn template | `/templates` | Self-serve P1 |
| `cta_demo_live` | Xem thực tế | `themes.?demo=` | Sau khi chọn theme |
| `cta_trial` | Dùng thử miễn phí | `/trial` | Sau demo / pricing |
| `cta_buy_theme` | Mua theme | Console focus template | Sau trial |
| `cta_book_demo` | Đặt demo | `#lead` / `/resources` gated | P3/P4/enterprise |
| `cta_pricing` | Xem pricing | `/pricing` | So sánh gói |

CMS props CTA phải có `cta_code` ∈ enum trên (analytics). **Cấm** CTA mơ hồ “Tìm hiểu thêm” không có `cta_code`.

#### FR-CORPWEB-005 — Case / ROI / Resource

| Loại | Bắt buộc có | Cấm |
|---|---|---|
| Case | Before/after ≥ 2 KPI; ngành; disclaimer nếu anonymized | Bịa số; GMV không kèm cost/margin khi claim “có lãi” |
| ROI | Assumptions liệt kê; công thức đơn giản; “ước tính” | Đảm bảo lợi nhuận tuyệt đối |
| Resource | Type (guide/checklist); gated? | Gate mà không lead fields |

**Gated content:** Sau submit lead thành công → unlock link / email (CORP-CMS-3). MVP: gated = CTA book demo.

#### FR-CORPWEB-006 — Pricing / Tour / Governance

**Ba lớp giá (nghiệp vụ):**

| Lớp | Ví dụ | Nơi nói | Thanh toán |
|---|---|---|---|
| **A. Platform plan** | Starter / Growth / Platform | `/pricing` | Sales-assisted (“Liên hệ”) phase 1 |
| **B. Theme license** | free / one_time VND | `/templates` cards + P3 | VietQR self-serve |
| **C. Unlimited (optional)** | Promo downloads | Announce / pricing footnote | Theo campaign |

**Rule:** Pricing page **tách rõ** A vs B — không để user tưởng mua theme = đủ Growth plan.

**Tour:** Interactive tour = CORP-CMS-2/3; MVP có thể deep-link console preview.

**Governance nội dung:** xem §3.11.

### 3.6. Marketplace hybrid — quy tắc nghiệp vụ

| Thành phần | Owner dữ liệu | CMS được sửa? |
|---|---|---|
| Intro / SEO `/templates` | Platform CMS | Có (`catalog_intro`) |
| Facets ngành/goal/license | Catalog API | Không |
| Theme card (tên, giá, score) | Catalog + license | Không (trừ badge campaign qua announce) |
| Demo URL | Package resolve | Không |
| Trial/Buy URL | Funnel P2/P3 | Không |

**Campaign trên catalog:** Dùng `announce_bar` hoặc badge **toàn site**, không sửa từng `TemplateCatalog` row từ corporate CMS.

### 3.7. Commercial messaging rules (compliance)

1. **Trial trước paywall** — mọi path mua theme phải nhắc dùng thử / demo khi phù hợp ICP P1.  
2. **AI claims** — luôn kèm “high-risk cần approval” (BR-018); cấm “AI tự refund / tự publish”.  
3. **Margin** — ưu tiên “contribution / sau fee & return”; tránh chỉ “tăng doanh thu X%” không ngữ cảnh.  
4. **Đối thủ** — capability matrix cột peer = “Omnichannel phổ biến” trừ khi Legal duyệt brand.  
5. **Số liệu social proof** — phải có `source_ref` trong props (internal doc id); Approver checklist.  
6. **Giá VND theme** — hiển thị từ hệ thống license; CMS không hardcode giá theme lệch P3.

### 3.8. Editorial lifecycle

```text
Ideate → Draft (Editor) → Review (PMM/Legal nếu claim) → Scheduled? → Published
                                                              ↓
                                                         Monitor KPI 7 ngày
                                                              ↓
                                                    Iterate / Rollback / Archive
```

| Trạng thái Page | Ai thấy | Index SEO |
|---|---|---|
| `draft` | Editor + preview token | noindex |
| `review` | Approver queue | noindex |
| `published` | Public | index (trừ noindex flag) |
| `archived` | 301/410 theo playbook | noindex |

**Change window:** Announce bar & pricing — ưu tiên publish **T3–T6** giờ VN trừ hotfix campaign; ghi `change_ticket` optional trên publish meta.

### 3.9. Analytics & attribution (nghiệp vụ đo)

| Event | Khi nào | Properties tối thiểu |
|---|---|---|
| `platform_cta_click` | Click CTA có `cta_code` | cta_code, slug, section_id |
| `platform_filter` | Đổi facet templates | industry, goal, license |
| `platform_demo_click` | Xem thực tế | template_code |
| `platform_trial_start` | Trial API success | template_code? |
| `platform_lead_submit` | Lead 200 | slug, cta_code |
| `platform_page_view` | Page CMS | slug, content_version |

CMS không host analytics pipeline — chỉ **bắt buộc** section/CTA emit `cta_code` + `section.id` để Growth gắn GTM/Pixel (consent gate đã có).

### 3.10. Multi-brand / multi-site (tương lai gần)

| site_key | Host | Ngôn ngữ | Dùng khi |
|---|---|---|---|
| `webcom_apex` | webecom.ngoinhahomnay.vn | vi | Prod |
| `webcom_staging` | staging… | vi | UAT nội dung |
| `webcom_en` (Could) | — | en | CORP-CMS-3 |

Nội dung **không** share draft giữa site_key; media có thể share library theo tenant.

### 3.11. Governance publish — checklist nghiệp vụ

Trước `published`, Approver xác nhận (UI checklist CORP-CMS-1+):

- [ ] CTA có `cta_code` hợp lệ  
- [ ] Không claim AI vượt BR-018  
- [ ] Số liệu proof có `source_ref` hoặc đã gỡ  
- [ ] Pricing không lẫn theme license vs platform plan  
- [ ] Link nội bộ 200 (smoke)  
- [ ] Preview đã xem desktop + mobile  
- [ ] Legal (nếu capability/competitor/ROI)

Audit log: actor, from_version, to_version, checklist JSON, timestamp.

### 3.12. AC nghiệp vụ (bổ sung)

| ID | Acceptance |
|---|---|
| AC-B1 | Mọi primary CTA trên page published có `cta_code` ∈ taxonomy §3.5 |
| AC-B2 | Homepage primary path self-serve tới `/templates` hoặc `/trial` trong ≤2 click từ hero |
| AC-B3 | Industry key trên CMS trùng facet catalog (beauty≠“Mỹ phẩm” slug lệch) |
| AC-B4 | Lead form thiếu consent → không tạo Lead |
| AC-B5 | Pricing page có đoạn tách “Theme one-time / VietQR” vs “Gói Platform” |
| AC-B6 | Case publish có ≥2 before/after KPI hoặc bị chặn checklist |
| AC-B7 | Editor không publish được; Approver publish có audit |
| AC-B8 | `/templates` đổi intro CMS không làm mất facets/API cards |
| AC-B9 | Announce campaign hết hạn (`ends_at`) tự ẩn |
| AC-B10 | Event `platform_cta_click` nhận đủ cta_code trên GTM dataLayer (khi consent) |

---

## 4. Phân lớp — chỗ Corporate ngồi

```text
┌────────────────────────────────────────────────────────────┐
│ Shared CMS Engine (đã có)                                    │
│   ContentV1 · Section Registry · Builder · Media · Nav · SEO │
├────────────────────────────────────────────────────────────┤
│ Owner scopes                                                 │
│   A. Storefront  → merchant shop (đã ship)                   │
│   B. PlatformSite → WebCom apex / regional GTM (SPEC NÀY)    │
├────────────────────────────────────────────────────────────┤
│ Runtime                                                      │
│   storefront-web  ← Storefront pages                         │
│   corporate-web   ← PlatformSite pages (SPEC NÀY)            │
└────────────────────────────────────────────────────────────┘
```

**Nguyên tắc:** Section type **chung registry**; corporate thêm type prefix hoặc namespace `platform.*` / types dành riêng (vd. `capability_matrix`) — validate cùng Ajv pipeline.

---

## 5. Mô hình dữ liệu

### 5.1. PlatformSite (mới)

| Field | Type | Mô tả |
|---|---|---|
| `id` | cuid | `psite_…` |
| `tenant_id` | FK | Tenant platform (`ten_platform` / `ten_aura` ops) |
| `site_key` | string unique | `webcom_apex` (prod), `webcom_staging` |
| `name` | string | WebCom Platform |
| `primary_host` | string | `webecom.ngoinhahomnay.vn` |
| `default_locale` | string | `vi` |
| `status` | enum | `draft` \| `live` |
| `seo_defaults` | JSON | title template, og image |
| `feature_flags` | JSON | mirror env overrides |

### 5.2. Page ownership (mở rộng)

**Chốt CORP-CMS-0:**

```text
Page {
  id
  tenant_id
  owner_type   // "storefront" | "platform"
  owner_id     // storefrontId | platformSiteId
  slug         // "/", "pricing", "solutions/website", ...
  title
  template_key // optional layout hint: "gtm_home" | "gtm_article" | ...
  status       // draft | published | archived
  versions[]   PageVersion  // reuse — content ContentV1
}
```

- Migrate: `storefront_id` hiện tại → `owner_type=storefront` + `owner_id`; unique `(owner_type, owner_id, slug)`.
- **Interim (nếu migrate chậm):** seed Storefront ảo `sf_platform_webcom` — runtime corporate đọc như platform; đánh dấu deprecated trong ADR follow-up.

### 5.3. ContentV1

Giống Shared CMS:

```json
{
  "schema_version": 1,
  "section_order": ["announce", "hero", "proof", "modules", "cta"],
  "sections": {
    "hero": { "type": "platform_hero", "id": "sec_…", "props": { }, "style": { } }
  },
  "seo": { "title": "…", "description": "…", "og_image_media_id": null }
}
```

---

## 6. Sitemap CMS (map FR-CORPWEB)

| Slug | FR | Mục đích | Section types chính (MVP+) |
|---|---|---|---|
| `/` | 001 | Homepage GTM | `announce_bar`, `platform_hero`, `social_proof`, `module_tour`, `industry_strip`, `faq`, `cta_band` |
| `/solutions` hoặc `/solutions/[module]` | 002 | Product/Solution | `page_header`, `problem_workflow`, `kpi_row`, `ui_showcase`, `cta_band` |
| `/industries/[slug]` · `/roles/[slug]` | 003 | Industry / Role | `page_header`, `rich_text`, `use_case_cards`, `cta_band` |
| `/pricing` | 006 | Pricing | `pricing_table`, `faq`, `cta_band` |
| `/case-studies` · `/case-studies/[slug]` | 005 | Case / ROI | `case_hero`, `before_after_kpi`, `roi_assumptions`, `cta_band` |
| `/resources` · `/resources/[slug]` | 005 | Resource / gated | `resource_list`, `gated_form` (lead fields only) |
| `/templates` · `/templates/[code]` | MKT | **Hybrid** | Catalog **API-driven**; CMS chỉ **banner/intro** (`catalog_intro`) — không CMS từng theme card |
| `/trial` | 004 | Trial CTA | `trial_hero`, `steps`, `cta_band` — form logic giữ TrialClient |
| `/tour` (optional) | 006 | Product tour | `tour_steps` |
| Global | — | Header / Footer / Nav | `NavigationMenu` scope=`platform` (reuse nav CMS-2) |

**Hybrid rule:** Trang có data động (templates facets, template detail, trial submit) = **shell CMS + islands React**. Không nhét listing API vào PageVersion.

---

## 7. Section Registry — Corporate additions

### 7.1. Reuse từ Shared CMS

`hero` (alias map), `rich_text`, `faq`, `cta_banner` / `cta_band`, `trust` → map `social_proof`.

### 7.2. Types mới (CORP-CMS-1+)

| type | Label | Props tối thiểu | Wave |
|---|---|---|---|
| `announce_bar` | Announcement | text, cta_label?, href?, cta_code?, tone, **ends_at?** | 0 |
| `platform_hero` | Hero GTM | headline, sub, primary_cta{label,href,**cta_code**}, secondary_cta?, media?, search_enabled? | 0 |
| `social_proof` | Proof strip | items[{n,label}] \| logos[] | 0 |
| `module_tour` | Module cards | items[{title,body,href,icon}] | 0 |
| `industry_strip` | Industry grid | items[{key,label,href,icon}] | 1 |
| `capability_matrix` | So sánh capability | rows[{feature,webcom,peer_label}] — **không bắt buộc tên đối thủ** | 1 |
| `pricing_table` | Pricing | plans[{name,price,features[],cta,featured?}] | 1 |
| `case_hero` | Case header | title, customer, industry, hero_metric | 1 |
| `before_after_kpi` | Before/After | metrics[{label,before,after}] | 1 |
| `roi_assumptions` | ROI notes | assumptions[], disclaimer | 2 |
| `resource_list` | Resources | items[{title,type,href,gated?}] | 2 |
| `gated_form` | Gated CTA | headline, fields[], submit_label → POST leads | 2 |
| `catalog_intro` | Templates intro | headline, body | 1 |
| `tour_steps` | Tour | steps[{title,body,media?}] | 2 |
| `problem_workflow` | Solution flow | problem, steps[], ui_media? | 1 |
| `kpi_row` | KPI row | items[{label,value}] | 1 |

Feature flag: `cms.platform_registry.v1`.

### 7.3. Registry API

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/v1/admin/builder/sections?scope=platform` | Registry filter platform-allowed |
| GET | `/api/v1/public/section-registry?scope=platform` | Public (docs / corporate preview) |

---

## 8. API (Platform CMS)

Prefix gợi ý: `/api/v1/admin/platform/sites/:siteKey/…`  
Public: `/api/v1/public/platform/:siteKey/…`

| Method | Path | Mô tả |
|---|---|---|
| GET | `/admin/platform/sites` | List sites |
| GET/PATCH | `/admin/platform/sites/:siteKey` | Meta / SEO defaults |
| GET | `/admin/platform/sites/:siteKey/pages` | List pages |
| POST | `/admin/platform/sites/:siteKey/pages` | Create page |
| GET/PUT | `…/pages/:slug` | Draft get/update ContentV1 |
| POST | `…/pages/:slug/transition` | `draft→review→published` (permission) |
| POST | `…/pages/:slug/rollback` | Rollback to version N |
| GET | `/public/platform/:siteKey/pages/:slug` | **Published** content (+ fallback 404) |
| GET | `/public/platform/:siteKey/nav` | Header/footer menus |
| GET | `/public/platform/:siteKey/preview?token=` | Preview draft (reuse preview token pattern) |

**Permissions:** `platform.cms.read` · `platform.cms.write` · `platform.cms.publish` (tách writer/publisher — FR-CORPWEB-006).

**Flags:** `FEATURE_PLATFORM_CMS` (runtime corporate) · `cms.platform_registry.v1` · `builder.platform` (admin canvas).

---

## 9. Admin UX

| Màn | Path | Hành vi |
|---|---|---|
| Platform pages | `/console/platform/pages` | List slug, status, updated |
| Editor | `/console/platform/pages/[slug]` | **Reuse builder canvas** (CMS-2) + scope=platform section palette |
| Nav | `/console/platform/nav` | Header/footer menus |
| Media | Reuse media library + tag `platform` | |
| Preview | “Mở preview” → `webecom…/preview?token=` hoặc chrome iframe | |

**Không** nhân đôi inspector — chỉ filter section palette theo `scope`.

### 9.1. Design system công khai (corporate-web) — hiện đại

Baseline đã có trên `/templates` (Haravan-inspired). CMS **không** invent skin mới mỗi page; mọi section render qua **token + component map** cố định.

#### Tokens (CSS variables — bắt buộc)

| Token | Giá trị gợi ý | Dùng cho |
|---|---|---|
| `--hv-blue` | `#2f6bff` | CTA primary, link, focus |
| `--hv-blue-2` | `#1f54d8` | Hover CTA |
| `--hv-navy` | `#0b1f44` | Headline |
| `--hv-text` | `#1f2937` | Body |
| `--hv-muted` | `#6b7280` | Subcopy |
| `--hv-line` | `#e5e7eb` | Border |
| `--hv-bg` / `--hv-soft` | `#fff` / `#f5f7fb` | Canvas / band |
| `--hv-radius-card` | `12–14px` | Card, industry |
| `--hv-radius-pill` | `999px` | Search, chip, pill |
| `--hv-shadow-card` | soft 8–24px | Elevation |
| `--hv-font` | Be Vietnam Pro + Plus Jakarta (display) | Không Inter/Roboto default stack |

**Tránh (anti-pattern AI):** purple-indigo gradient theme; cream + terracotta serif; flat single-color hero không visual; emoji làm icon; card trong hero; overlay badge rời trên media.

#### Component map (section → UI)

| Section type | Component | Visual rule |
|---|---|---|
| `announce_bar` | `AnnounceBar` | Full-bleed, 1 dòng + CTA; dismissible optional (cookie key) |
| `platform_hero` | `PlatformHero` | 2 cột: copy + collage/media; search pill nếu `search_enabled` |
| `social_proof` | `ProofStrip` | Số lớn + label; không card border nặng |
| `module_tour` | `ModuleGrid` | 2–3 cột; icon SVG + title + 1 câu; hover lift |
| `industry_strip` | `IndustryGrid` | Icon circle + label (reuse `ThemeIcons`) |
| `pricing_table` | `PricingTable` | 3 cột; 1 plan `featured` ring blue |
| `catalog_intro` | `CatalogIntro` | Center head + lead; **không** render theme cards |
| `faq` | `FaqAccordion` | Disclosure; 1 mở mặc định optional |
| `cta_band` | `CtaBand` | Navy/blue gradient; max 2 CTA |
| `capability_matrix` | `CapabilityTable` | Table sạch; sticky first col mobile |
| Islands | `TemplatesCatalog`, `TrialForm`, `LeadForm` | Giữ UX hiện tại; CMS chỉ bọc intro |

#### Iconography

- Chỉ **SVG line icons** (`ThemeIcons` / registry `icon` key ∈ allowlist).
- CMS props `icon`: string enum (`fashion`, `beauty`, `search`…) — **không** upload arbitrary SVG trong MVP.
- Builder hiển thị icon picker grid.

#### Motion (ship tối thiểu 2–3 intentional)

| Motion | Trigger | Spec |
|---|---|---|
| `hv-rise` | Section enter (viewport / SSR first paint) | fade + 14px Y · 0.55s · stagger ≤ 40ms |
| `hv-float` | Hero collage cards | 5–7s loop; `prefers-reduced-motion: reduce` → off |
| Card hover | Industry / theme / module | translateY(-3…-6px) + shadow; 0.2–0.25s |
| Overlay | Theme card | opacity + CTA slide up |
| Focus ring | Inputs / pills | 3px `--hv-blue` soft |

---

### 9.2. UI logic — Public site (corporate-web)

Logic UX **bắt buộc** khi render từ CMS (và giữ parity hardcode fallback).

#### A. Navigation & filter (đặc biệt `/templates`)

```text
[Nav search] ──submit──► /templates?q=…
[Industry card] ──click──► toggle industry query + scroll #catalog
[Goal / license pill] ──click──► patch query (giữ industry/q) + #catalog
[Active chip ×] ──click──► clear đúng facet đó
[Xóa lọc] ──click──► /templates#catalog
[Sort] ──click──► chỉ đổi sort, giữ filter
```

| Rule | Chi tiết |
|---|---|
| Toggle | Click lại industry/pill đang active → **clear** facet đó |
| Preserve | Đổi industry **không** xóa `goal` / `q` trừ khi product quyết ngược (mặc định preserve) |
| Deep link | Mọi filter encode URL; share/refresh giữ state |
| Empty | 0 template → empty state + CTA “Xem tất cả” (không blank) |
| Hybrid | CMS `catalog_intro` trên đầu; grid **luôn** từ API |

#### B. Homepage / marketing pages

| Flow | Logic |
|---|---|
| Hero CTA primary | `props.primary_cta.href` — internal Link hoặc external |
| Hero search | GET `/templates?q=` (+ hidden goal nếu page context) |
| Module card | Navigate `href`; prefetch on hover (Next) |
| FAQ | Accordion: một hoặc multi-open theo prop `mode` |
| Announce dismiss | `localStorage` key `wc_announce_{pageVersionId}` |
| Lead/Trial island | Validate client → POST API → success/error inline; CMS chỉ đổi copy |

#### C. States (mọi page CMS)

| State | UI |
|---|---|
| Loading (client island) | Skeleton pulse (soft gray), không spinner full-page |
| Empty section | Ẩn section nếu `props.items` rỗng (trừ island bắt buộc) |
| Unknown section type | Ẩn + `console.warn` / server log (AC-P6) |
| Preview mode | Banner cố định “Bản nháp · không index”; `noindex` |
| Fallback legacy | Hardcode page; không hiện lỗi CMS |

#### D. Responsive

| Breakpoint | Hành vi |
|---|---|
| ≥1100 | Industry 5 cột; theme grid 4; hero 2 cột |
| 900–1099 | Industry 3; theme 3; nav links collapse |
| &lt;900 | Hamburger; search full width; theme 2 |
| &lt;640 | Industry 2; theme 1; ẩn secondary nav CTA |

---

### 9.3. UI logic — Admin Builder (platform scope)

Mở rộng canvas Shared CMS; **không** UI khác hẳn.

#### Editor chrome

```text
┌─ Pages list ─┬─ Canvas (desktop/mobile toggle) ─┬─ Inspector ─┐
│ slug/status  │ SectionStack preview live         │ props form  │
│ + New page   │ Drag reorder (CMS-2 pattern)      │ SEO tab     │
│ Publish bar  │ Add section (platform palette)    │ Version     │
└──────────────┴───────────────────────────────────┴─────────────┘
```

| Action | Logic |
|---|---|
| Autosave draft | Debounce 800ms PUT; indicator “Đã lưu / Đang lưu / Lỗi” |
| Reorder | Update `section_order`; optimistic UI; rollback on 4xx |
| Add section | Palette chỉ type `scope∈{platform,shared}`; default props từ registry |
| Delete section | Confirm nếu có copy &gt; 0; không xóa island bắt buộc (`required: true` trong page template) |
| Publish | Disabled nếu validation Ajv fail hoặc thiếu `platform.cms.publish` |
| Preview | Mở tab token; canvas vẫn draft |
| Rollback | Chọn version → confirm → PUT content + optional re-publish |
| Unsaved leave | `beforeunload` / Next navigation guard |

#### Validation UX

- Field error inline (headline required, CTA href URL).
- Publish blocked summary toast: “2 lỗi · Hero thiếu CTA”.
- Compatibility: type không trong palette → badge “Legacy” (ẩn trên public).

#### Page templates (starter)

Khi **New page**, chọn template_key:

| template_key | section_order mặc định |
|---|---|
| `gtm_home` | announce → platform_hero → social_proof → module_tour → industry_strip → cta_band |
| `gtm_pricing` | page_header → pricing_table → faq → cta_band |
| `gtm_catalog` | catalog_intro (+ island templates cố định runtime) |
| `gtm_blank` | page_header only |

---

### 9.4. Hiện đại — checklist chất lượng UI

Mỗi section/wave phải đạt:

1. **Brand-first:** Logo/WebCom nhận diện rõ viewport đầu (nav); headline không át brand.
2. **Một việc / section:** 1 H2 + 1 lead ngắn; tránh stat strip chồng chéo trong cùng band.
3. **Whitespace:** Section padding ≥ 56px desktop; max-width content 1200px.
4. **Hierarchy:** Display headline → muted lead → CTA; không cạnh tranh 2 primary CTA cạnh nhau (trừ CtaBand có primary+ghost).
5. **Touch:** Hit area pill/industry ≥ 44px chiều cao.
6. **A11y:** Focus visible; accordion `aria-expanded`; icon `aria-hidden`; form label.
7. **Performance:** LCP hero &lt; 2.5s mục tiêu; không autoplay video nặng MVP; image CMS qua media CDN + sizes.
8. **Dark-free default:** Public light; không ép dark mode MVP.

---

### 9.5. Props UI chung (mọi section)

```json
{
  "style": {
    "padding_y": "sm|md|lg",
    "tone": "default|soft|ink",
    "align": "left|center"
  },
  "motion": {
    "enter": "none|rise",
    "stagger_ms": 40
  }
}
```

Runtime bỏ qua `motion` nếu `prefers-reduced-motion`.

---

## 10. Runtime `corporate-web`

### 10.1. Resolve

```text
request path → slug
if FEATURE_PLATFORM_CMS:
  GET public platform page
  if 200 → SectionStackPlatform(content)
  else → LegacyReactPage (hardcode hiện tại)
else:
  LegacyReactPage
```

### 10.2. SectionStackPlatform

- Port pattern `storefront-web` `SectionStack` + normalize ContentV1.
- Islands: `<TemplatesCatalog />`, `<TrialForm />`, `<LeadForm />` đăng ký như section type `island_*` hoặc slot trong props `island: "templates_catalog"`.
- Mọi CTA render phải đọc `cta_code` (§3.5) và emit analytics khi consent.

### 10.3. Caching

- ISR/`revalidate` 60s public pages; on publish → webhook/`revalidatePath` (CORP-CMS-1).
- Preview: `Cache-Control: no-store`.
- `announce_bar.ends_at` quá hạn → section tự ẩn (server filter).

---

## 11. Lead & Demo (FR-CORPWEB-004) — ranh giới kỹ thuật

Chi tiết nghiệp vụ / SLA / CTA taxonomy: **§3.5**. Phần này chỉ ranh giới hệ thống:

| CMS làm | CMS không làm |
|---|---|
| Copy form, CTA label, disclaimer consent, `cta_code` | Dedup lead, CRM routing, SLA task engine |
| UTM fields hiển thị (optional) | Copilot summary |
| Success message | Permission/RBAC CRM |
| Map `submit_channel` = `website` \| `platform` | Thay P2 trial / P3 billing |

API giữ `POST /api/v1/leads`. Payload tối thiểu nghiệp vụ: `email`, `consent_at`, `landing_slug`, `cta_code`, `utm_*`.

---

## 12. Governance & AC

Gộp checklist §3.11 + AC kỹ thuật:

| ID | Acceptance |
|---|---|
| AC-P1 | Đổi headline homepage trên admin → publish → apex hiển thị &lt; 2 phút (revalidate) |
| AC-P2 | User chỉ `write` không publish được; `publish` cần permission riêng |
| AC-P3 | Rollback về version trước khôi phục content đúng hash |
| AC-P4 | `/templates` vẫn facets API; chỉ intro CMS đổi được |
| AC-P5 | Flag `FEATURE_PLATFORM_CMS=false` → UI cứng như hiện tại (no blank) |
| AC-P6 | Section type lạ → ẩn + log; không 500 trang |
| AC-P7 | Preview token hết hạn không lộ draft |
| AC-P8 | e2e: draft→publish homepage + pricing |
| AC-UI1…UI7 | Xem §9 (UI) |
| AC-B1…B10 | Xem §3.12 (nghiệp vụ) |

---

## 13. Waves triển khai

| Wave | Tên | Deliverable | Ước lượng |
|---|---|---|---|
| **CORP-CMS-0** | Foundation | PlatformSite · Page owner · public GET · flag + fallback · seed roles Editor/Approver | 1 tuần |
| **CORP-CMS-1** | Homepage + Pricing + Catalog + **nghiệp vụ MVP** | Sections · CTA taxonomy · checklist publish · announce ends_at · analytics cta_code · e2e | 1.5–2 tuần |
| **CORP-CMS-2** | Solutions / Industry / Case / Nav | FR-002/003/005 types · nav · revalidate · capability matrix (Legal) | 2 tuần |
| **CORP-CMS-3** | Resources gated · Tour · ROI · i18n stub | Lead unlock · assumptions ROI | 1–2 tuần |

**Kickoff điều kiện:** Shared CMS GA ổn định (đã đạt).

Chi tiết task: [`webcom-corporate-cms-implementation-plan.md`](./webcom-corporate-cms-implementation-plan.md) **v2.0**.

---

## 14. Rủi ro

| Rủi ro | Mitigation |
|---|---|
| Migrate Page.storefrontId phá merchant | Dual-write owner; migrate batch; e2e storefront regression |
| Corporate hardcode lệch schema | Fallback path bắt buộc đến hết CORP-CMS-1 |
| Marketing paste HTML độc | Sanitize rich_text; cấm raw script |
| `/templates` bị “CMS hóa” listing | Hybrid rule §3.6 + code review |
| Nhầm tenant platform vs aura shop | `site_key` + host allowlist |
| Claim AI / đối thủ / số liệu sai | Checklist §3.11 + Legal gate + `source_ref` |
| Lẫn giá Theme vs Platform plan | AC-B5 + seed copy + Approver |
| CTA không đo được | Bắt buộc `cta_code` Ajv + AC-B1 |
| Lead spam / thiếu consent | AC-B4; CRM dedupe ngoài CMS |

---

## 15. Open questions (chốt trước CORP-CMS-0 code)

1. Tenant sở hữu PlatformSite: `ten_platform` mới hay `ten_aura` ops?
2. Migrate Page ngay vs interim `sf_platform_webcom`?
3. Capability matrix: cột peer public = “Omnichannel phổ biến” hay được nêu brand (Legal)?
4. Domain staging: `site_key=webcom_staging` riêng?
5. SLA lead first-touch: **4h giờ làm việc** có đủ Sales VN không?
6. Ai sở hữu `source_ref` social proof (PMM vs Finance) trước publish?
7. Platform plan phase 1: chỉ “Liên hệ” hay soft-launch giá niêm yết?
8. `announce_bar.ends_at` timezone cố định `Asia/Ho_Chi_Minh`?

---

## 16. Tài liệu liên quan

| Doc | Vai trò |
|---|---|
| [`shared-cms-themepackage.md`](./shared-cms-themepackage.md) | Engine ContentV1 / registry / builder |
| [`shared-cms-implementation-plan.md`](./shared-cms-implementation-plan.md) | Lịch sử ship merchant CMS |
| SRS §8 | FR-CORPWEB AC gốc |
| `docs/04` §9p · §9r | Apex Platform · funnel trial→license · Platform CMS |
| ADR-005 | Website engine — bổ sung PlatformSite khi CORP-CMS-0 |

---

## 17. Definition of Done (GA Platform CMS)

- [ ] Homepage + Pricing + ≥1 Solution page edit/publish qua admin
- [ ] Nav header/footer CMS
- [ ] Preview + rollback + publish checklist §3.11
- [ ] FEATURE flag dual-path
- [ ] e2e-platform-cms.sh xanh trên VPS
- [ ] OpenAPI + Bruno + runbook `docs/runbooks/platform-cms.md`
- [ ] Hardcode chỉ còn fallback cho slug chưa migrate
- [ ] Design tokens + SectionStackPlatform (AC-UI*)
- [ ] AC-B1…B10 (CTA taxonomy, funnel, consent, pricing 2 lớp, case KPI, audit, analytics)
- [ ] Roles Editor ≠ Approver trên môi trường prod