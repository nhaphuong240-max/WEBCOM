# SRS — Merchant CMS Pro (đa ngành · đa thể loại)

| Thuộc tính | Nội dung |
|---|---|
| Mã | SRS-WCP-CMS-PRO |
| Phiên bản | **2.1** |
| Ngày | 2026-09-22 |
| Trạng thái | Ready for implementation |
| Product | WebCom — Website Commerce Platform |
| Đối tượng chính | **Khách hàng merchant** (MKT / Ops / Owner tenant) |
| Trọng tâm 2.1 | **Website bán hàng trực tuyến (`commerce`)** — merchandising CMS chuyên sâu |
| Thừa kế | FR-WCP-004…009 · 011 · 014 · ADR-005 · Shared CMS 1.0 · SPEC KT (lead) |
| Kế hoạch | [`merchant-cms-pro-implementation-plan.md`](./merchant-cms-pro-implementation-plan.md) · [`merchant-cms-pro-dev-plan.md`](./merchant-cms-pro-dev-plan.md) · [runbook](../runbooks/merchant-cms-pro.md) |
| Thay thế / mở rộng | `shared-cms-themepackage.md` (engine) · `merchant-theme-settings-cms-plan.md` (gộp vào v2) |

---

## 1. Tầm nhìn

Một **CMS chuyên nghiệp dùng chung** cho mọi ThemePackage, phục vụ **đa ngành** (beauty, fashion, F&B, BĐS, B2B, health…) và **đa thể loại site** (bán hàng, lead-gen, booking, content), để merchant cấu hình & vận hành website **không cần lập trình**, ngang tầm kỳ vọng Theme Settings (Haravan-class) + governance Shopify-grade.

```text
Một engine CMS
  + Site archetype (thể loại vận hành)
  + Industry preset (ngành)
  + ThemePackage (skin/layout)
  = Website merchant chuyên nghiệp
```

**Không** fork CMS theo template. **Không** dùng Platform Corporate CMS (`/platform/*`) cho shop khách.

---

## 2. Định nghĩa

| Thuật ngữ | Định nghĩa |
|---|---|
| **Merchant CMS** | Console `/console/website/*` scoped theo `tenant` + `storefront` |
| **Site archetype** | Chế độ vận hành site: `commerce` \| `lead_gen` \| `booking` \| `content` |
| **Industry** | Nhãn ngành catalog + preset starter (IA, copy, settings mặc định) |
| **ThemePackage** | Artifact layout + `supports[]` + starter; không chứa nội dung merchant sau install |
| **Site Settings** | Cấu hình toàn site (identity, header, floating, popup, social, catalog card, archetype) |
| **Brand Kit** | Tokens thiết kế (màu, font, logo tokens) — kế thừa tenant→brand→storefront |
| **ContentV1** | Page content schema_version=1 (`section_order` + `sections{}`) |
| **Section Registry** | Catalog type section hợp lệ + JSON Schema props |
| **Go-live gate** | Checklist blocking trước publish theo archetype |
| **Commerce merchandising** | Lớp CMS trình bày bán hàng: collection UI, PDP layout, promo sections, cart/checkout copy — **không** thay PIM/pricing |
| **PLP** | Product Listing Page (collection / search) |
| **PDP** | Product Detail Page |
| **Merch section** | Section gắn catalog (collection_id, product_ids, rule query) |

---

## 3. Actors & quyền

| Actor | Mô tả | Quyền tối thiểu |
|---|---|---|
| Visitor | Khách xem storefront | Public pages |
| Lead | Visitor đã submit form | — |
| Merchant Editor | MKT tenant | Settings draft, Builder, Media, Nav |
| Merchant Approver | Owner / lead MKT | Publish page, approve Brand Kit |
| Merchant Ops | CS / sales ops | Xem leads, export |
| Platform Admin | PTT nội bộ | Catalog, packages — **không** sửa content tenant trên UI merchant |
| Agency | Multi-storefront | Cùng CMS, scoped storefront |

---

## 4. Mục tiêu & phi mục tiêu

### 4.1. Goals (Must)

1. **G1 — Một CMS** cho mọi template đã cài; đổi theme không mất content tương thích.  
2. **G2 — Đa thể loại:** archetype điều khiển cart/lead/booking/content UX.  
3. **G3 — Đa ngành:** ≥8 industry preset sâu (starter settings + pages + nav khác nhau thật).  
4. **G4 — Site Settings** đầy đủ (logo, OG, floating, popup, header CTA, social, card).  
5. **G5 — Section parity:** mọi type trong registry có renderer storefront + inspector Builder.  
6. **G6 — Lead capture** chuẩn (validation VN phone, consent, thank-you, UTM).  
7. **G7 — Go-live** checklist theo archetype (REQUIRED_TOBE).  
8. **G8 — UX merchant** tiếng Việt, tab rõ, không lẫn Platform CMS.  
9. **G9 — Commerce CMS Pro:** merchandising đầy đủ cho website bán hàng (PLP/PDP/cart content/promo/home shop) — **ưu tiên ngang G1–G4 trong v2.1**.

### 4.2. Non-goals (Won't v2.x)

- CMS riêng per-template / Webflow full parity.  
- Port Haravan Liquid / App block Haravan.  
- Platform GTM content editing (track Corporate CMS riêng).  
- 400 theme mỏng; CRM PTT realtime bắt buộc (optional phase).  
- Booking calendar đầy đủ (MVP = CTA + form / embed allowlist).  
- **Không** đưa quản lý SKU/giá/tồn/kho vào CMS (thuộc Commerce Core `/products`, `/inventory`) — CMS chỉ **trình bày & merchandising**.  
- **Không** thay engine thanh toán/checkout tính tiền (FR-WCP-009) — CMS chỉ cấu hình **nội dung/UX** quanh cart/checkout.

---

## 5. Phân lớp kiến trúc (bắt buộc)

```text
A. Catalog          — listing, industry, tier, screenshot
B. ThemePackage     — skin, supports[], starter/{home,site_settings,nav,commerce}
C. Merchant CMS     — BrandKit · SiteSettings · Pages · Nav · Media · Leads
                      · Builder · **Commerce merchandising** (PLP/PDP/promo/cart UX)
D. Commerce Core    — Product · SKU · Price · Inventory · Cart · Checkout · Order
                      (CMS tham chiếu ID, không sở hữu dữ liệu giá/tồn)
E. Tenant instance  — ThemeVersion published · License · GoLive
F. Storefront RT    — getRuntime() → settings + ContentV1 + catalog queries
```

| Lớp | Đổi khi… | Không chứa |
|---|---|---|
| Catalog | Marketing bán template | Logic render |
| Package | Skin / default 1 code | Nội dung merchant sau install |
| Merchant CMS | Schema, merchandising, versioning | SKU price/stock |
| Commerce Core | Catalog & order truth | Layout/theme copy |
| Instance | Content + settings tenant | Định nghĩa section mới |
| Runtime | Hiển thị visitor | Business rule publish |

---

## 6. Site archetype (đa thể loại)

### 6.1. Enum

| Archetype | Mục tiêu | Cart | Primary CTA | Lead form |
|---|---|---|---|---|
| `commerce` | Bán hàng online | Bật | Thêm giỏ / Mua | Optional |
| `lead_gen` | Thu lead (BĐS, clinic, B2B) | **Tắt** | Đăng ký tư vấn / Gọi | **Bắt buộc** |
| `booking` | Đặt lịch / giữ chỗ | Tùy (voucher) | Đặt lịch | Form + slot (MVP link) |
| `content` | Blog / magazine / landing | Tắt | Đọc thêm / Subscribe | Newsletter |

Default khi install: lấy từ ThemePackage `manifest.default_archetype` hoặc industry map.

### 6.2. Business rules

| ID | Rule |
|---|---|
| AR-01 | `lead_gen` ⇒ `show_cart=false`, ẩn add-to-cart, mini-cart, coupon UI |
| AR-02 | `commerce` ⇒ cart/checkout theo FR-WCP-009 + **toàn bộ Commerce CMS §8.11+** |
| AR-03 | Đổi archetype sau go-live cần confirmation + GoLive re-check |
| AR-04 | GoLive blocking items phụ thuộc archetype (bảng §8.8) |
| AR-05 | `/cart` khi `lead_gen`: empty state + CTA catalog/projects — không checkout |
| AR-06 | `commerce` ⇒ bắt buộc bật mini-cart **hoặc** cart icon header; ATC trên PDP |
| AR-07 | Merch section chỉ resolve product/collection **published + in-stock policy** theo Core |
| AR-08 | Promo countdown hết hạn → section auto-hide hoặc trạng thái “ended” (không bán sai) |

---

## 7. Industry (đa ngành)

### 7.1. Industry taxonomy (v2)

`beauty` · `fashion` · `fnb` · `realestate` · `health` · `home` · `electronics` · `b2b` · `services` · `kids` · `agency` · `general` (+ các mã catalog hiện có giữ nguyên).

### 7.2. Industry preset (artifact)

Mỗi preset gồm:

```text
presets/<industry>/
  site_settings.json     # archetype + floating + header copy
  nav.json               # IA mặc định
  pages/home.json        # ContentV1
  pages/*.json           # about, contact, dang-ky, thank-you…
  playbook.md            # bước MKT sau install
```

**AC:** Install 2 industry khác nhau → khác `commerce_mode`/archetype **hoặc** khác `section_order` **và** khác headline home (không chỉ đổi màu).

### 7.3. Pilot sâu v2 (Must)

| Industry | Archetype mặc định | Ghi chú |
|---|---|---|
| beauty | commerce | Baseline AURA |
| fashion | commerce | |
| fnb | commerce / booking | Ẩn F&B sample khi pack BĐS |
| realestate | lead_gen | Map SPEC KT |
| health | lead_gen | |
| b2b | lead_gen | |
| home | commerce | |
| agency | content | |

---

## 8. Functional requirements

### 8.1. FR-CMS-PRO-001 — Site Settings

Merchant cấu hình thiết lập chung site, áp dụng mọi page/theme đọc runtime.

**Fields (nhóm):**

| Group | Fields chính | Priority |
|---|---|---|
| Archetype | `archetype` | P0 |
| Identity | logo, favicon, og_image, logo_visible | P0 |
| Header | bg, fg, cta_label, cta_href, show_account, show_cart | P0 |
| Floating | channels[] hotline/zalo/email/messenger/address | P0 |
| Lead popup | enabled, delay, variant, copy, suppress_paths | P1 |
| Social | links[] | P1 |
| Catalog card | ratio, show_price, show_vendor, show_rating, show_badge, primary_cta (`add_to_cart`\|`view_detail`\|`quick_view`) | P0 *(commerce)* |
| Privacy | lead_consent_required, consent_label | P0 |
| **Commerce shop** | xem §8.11 Site Settings commerce | **P0** |

**API:** `GET/PUT /api/v1/admin/storefronts/{id}/site-settings` · concurrency `expected_version`.  
**Runtime:** `getRuntime().site_settings`.  
**UI:** `/console/website/settings`.

**AC:**
- [ ] Đổi logo + CTA → storefront phản ánh sau publish/refresh.  
- [ ] `lead_gen` ẩn icon giỏ.  
- [ ] Hotline `tel:` mở dialer (mobile).

### 8.2. FR-CMS-PRO-002 — Brand Kit

Kế thừa FR-WCP-004. Merchant chỉnh màu/font trong Settings hoặc Brand panel; apply CSS variables storefront.

**AC:** Đổi primary color → button/link theo token; contrast fail → warning (không block draft).

### 8.3. FR-CMS-PRO-003 — Visual Builder & Section Registry

Kế thừa FR-WCP-005 + Shared CMS ContentV1.

**Bổ sung v2:**

| Requirement | Chi tiết |
|---|---|
| Schema-driven inspector | Mọi type có `props_schema` |
| Allowlist | Chỉ add type ∈ `theme.supports ∪ global_core` |
| Responsive preview | Desktop / Tablet / Mobile |
| Autosave + conflict | `expected_version` toast |
| Saved blocks | Tái sử dụng section (giữ CMS-3) |
| AI copy | Draft only, không auto-publish |

**Section core (parity bắt buộc v2):**  
`hero` · `hero_slider` · `intro_stats` · `collections` · `featured` · `product_grid` · `trust` · `services_grid` · `testimonials` · `gallery` · `rich_text` · `faq` · `cta_banner` · `lead_form` · `blog_list` · `footer_rich` · `map_stores` · `team_cards` · `countdown` · `announcement`

**Section commerce (parity bắt buộc khi archetype=`commerce` — §8.12):**  
`flash_sale` · `promo_banner` · `bundle_offer` · `recently_viewed` · `fbt_upsell` · `collection_banner` · `filter_bar` · `pdp_gallery` · `pdp_buybox` · `cart_trust` · `empty_cart` · `coupon_strip`

**AC:** Type có trong registry ⇒ có SF renderer; thiếu renderer = FAIL CI. Type commerce chỉ bắt buộc CI khi flag `cms.commerce_merch.v1`.

### 8.4. FR-CMS-PRO-004 — Pages & templates

- Tạo page static / landing / thank-you / đăng ký.  
- Promote draft → staging → published.  
- SEO: title, description, OG.  
- Clone page; redirect slug.

**AC:** Tạo `/pages/dang-ky` + `/pages/thank-you`; form redirect đúng.

### 8.5. FR-CMS-PRO-005 — Navigation & Media

- Header/footer menus; CTA đăng ký trong IA.  
- Media library: upload, alt, dùng cho logo/banner/OG.  
- Xóa media đang dùng → warning usage map.

### 8.6. FR-CMS-PRO-006 — Lead capture

**Contract lead:**

```text
lead_id, storefront_id, full_name, phone, email?, message?,
page_url, product_id?, utm_*, consent, source, created_at
```

**Rules:**
- SĐT VN bắt buộc (0xxxxxxxxx / +84).  
- Họ tên ≥ 2 ký tự.  
- Consent bắt buộc nếu `privacy.lead_consent_required`.  
- Chống double-submit.  
- Không hiện popup trên thank-you paths.

**API:** `POST /api/v1/public/storefronts/{id}/leads`  
**Admin:** list + CSV export (Ops).

**AC:** Submit thiếu SĐT fail; đủ → thank-you + lead trong console.

### 8.7. FR-CMS-PRO-007 — ThemePackage & compatibility

- Install copy starter (home + site_settings + nav).  
- Đổi theme: preserve section theo `type`; unsupported → legacy/hide + warnings[].  
- Public demo `?demo=<code>` khác content/tokens thật.

### 8.8. FR-CMS-PRO-008 — Go-live theo archetype

| Check | commerce | lead_gen | booking | content |
|---|---|---|---|---|
| Brand Kit published | B | B | B | B |
| Logo + favicon | B | B | B | B |
| Header CTA | W | **B** | **B** | W |
| Hotline hoặc Zalo | W | **B** | **B** | W |
| Lead form trên Home hoặc /dang-ky | W | **B** | **B** | — |
| Consent copy | W | **B** | **B** | W |
| ≥1 sản phẩm published | **B** | — | W | — |
| Payment method configured | **B** | — | W | — |
| Shipping / COD policy page | **B** | — | W | — |
| Cart icon + ATC PDP | **B** | — | W | — |
| Home có merch section (featured/grid/flash) | **B** | — | — | — |
| Empty cart + policy snippets | W | — | — | — |
| Pixel / CAPI consent gate | B | B | B | B |
| CWV budget | B | B | B | B |

B = blocking · W = warning.

### 8.9. FR-CMS-PRO-009 — Roles & audit

- Editor không publish nếu policy Approver bật.  
- Audit: settings.upsert, page.publish, archetype.change, merch.publish.  
- Preview token TTL 24h.

### 8.10. FR-CMS-PRO-010 — Storefront runtime

`getRuntime()` trả: `brand_kit`, `site_settings`, `home`, `nav`, `theme`, `features`, `commerce_ux`.  
Layout inject: CSS vars, FloatingBar, LeadPopup, Header CTA, **mini-cart**, cart gate.

---

## 8.11–8.18. Website bán hàng trực tuyến (`commerce`) — chuyên sâu

> Phạm vi CMS: **trình bày & merchandising**. Giá / tồn / thanh toán = Commerce Core (`/products`, checkout).  
> Bật khi `site_settings.archetype = commerce`.

### 8.11. FR-CMS-PRO-011 — Commerce Site Settings (shop)

Group `commerce` trong Site Settings:

| Field | Type | Mô tả | P |
|---|---|---|---|
| `show_mini_cart` | bool | Drawer/mini-cart header | P0 |
| `show_cart_count` | bool | Badge số lượng | P0 |
| `sticky_atc_mobile` | bool | ATC dính mobile trên PDP | P0 |
| `quick_add_plp` | bool | Thêm nhanh từ PLP (SKU đơn) | P1 |
| `free_shipping_threshold` | number\|null | Copy “Freeship từ …” | P1 |
| `min_order_amount` | number\|null | Copy cảnh báo min order | P2 |
| `coupon_entry_cart` | bool | Ô mã trên cart | P0 |
| `coupon_entry_checkout` | bool | Ô mã checkout | P0 |
| `empty_cart_title` / `cta_label` / `cta_href` | text | Empty cart UX | P0 |
| `cart_trust_badges[]` | list | COD / đổi trả / authentic | P1 |
| `checkout_policy_links[]` | list | Điều khoản, vận chuyển, BH | P0 |
| `guest_checkout_hint` | text | Gợi ý guest vs login | P2 |
| `sold_out_behavior` | `hide`\|`badge`\|`waitlist` | Hết hàng | P1 |
| `show_compare_at_price` | bool | Giá gạch | P0 |
| `show_member_price_badge` | bool | Badge member | P2 |
| `announcement_bar` | object | Text/link/schedule | P0 |
| `search_placeholder` | text | Ô tìm | P1 |
| `plp_default_sort` | enum | manual\|newest\|price_asc\|price_desc\|bestseller | P0 |
| `plp_page_size` | number | 12/24/48 | P1 |
| `plp_filters_enabled` | string[] | price, brand, tag, type… | P1 |
| `pdp_tabs` | string[] | description, specs, reviews, shipping | P1 |
| `related_mode` | enum | same_collection\|manual\|ai | P1 |
| `related_limit` | number | 4–12 | P1 |
| `fbt_enabled` | bool | Frequently bought together | P2 |
| `promo_popup` | object | Coupon popup (≠ lead popup) | P1 |

**AC:** mini-cart on/off; empty cart copy; PLP sort; announcement ẩn đúng giờ VN.

### 8.12. FR-CMS-PRO-012 — Home shop & merchandising sections

| type | Chức năng | Props tối thiểu | P |
|---|---|---|---|
| `hero_slider` | Banner → collection/PDP/landing | slides[{media,alt,href,schedule?}] | P0 |
| `announcement` | Freeship / flash text | text, href, start/end | P0 |
| `collections` | Strip danh mục | source, slugs[] | P0 |
| `featured` / `product_grid` | Lưới SP | collection_id \| product_ids, limit | P0 |
| `flash_sale` | Deal + countdown | product_ids, ends_at, badge | P0 |
| `countdown` | Đồng hồ chiến dịch | ends_at, title, href | P0 |
| `promo_banner` | Banner KM | media, href, mobile_media? | P0 |
| `bundle_offer` | Bundle | sku_ids[], label | P1 |
| `trust` | Cam kết giao/COD | items[] | P0 |
| `testimonials` | Social proof | items[] | P1 |
| `recently_viewed` | Đã xem | limit | P1 |
| `fbt_upsell` | Mua kèm | limit | P2 |
| `cta_banner` | CTA cuối | headline, cta, href | P1 |

**Rules:** validate product/collection ID; `ends_at` hết hạn → ẩn/ended; Builder có product picker.

**AC:** Home có hero + featured + flash + trust; ATC từ featured vào cart.

### 8.13. FR-CMS-PRO-013 — PLP (Collection / Search) CMS

| Khả năng | Chi tiết | P |
|---|---|---|
| Collection banner | Ảnh + title + intro | P0 |
| Sort / filter UI | Theo settings | P0/P1 |
| Card + quick_add | `catalog_card` | P0 |
| Empty PLP | Copy khi 0 kết quả | P1 |
| SEO collection | title/description/OG | P0 |
| Pagination | mode + page_size | P1 |

**Console:** `/website/collections` — banner/SEO; link sang `/products` để quản lý SP.

**AC:** Đổi banner → SF; filter giá; ATC trên card khi cấu hình.

### 8.14. FR-CMS-PRO-014 — PDP CMS

| Block | Cấu hình | P |
|---|---|---|
| Gallery | tỉ lệ, zoom, video, thumbnail | P0 |
| Buy box | compare-at, stock text, shipping copy | P0 |
| Sticky ATC | on/off + label | P0 |
| Trust row | COD / đổi trả / chính hãng | P0 |
| Tabs | mô tả, specs, shipping, reviews | P0 |
| Size guide | media/link | P1 |
| Related / FBT | mode, limit, title | P0/P1 |
| Contact fallback | Hotline/Zalo cạnh ATC | P1 |
| SEO override | title/description | P1 |

Template key `product`: CMS chọn **layout**; Core giữ **mô tả/giá/tồn**.

**AC:** Gallery + sticky ATC + related; hết hàng theo `sold_out_behavior`.

### 8.15. FR-CMS-PRO-015 — Cart & Checkout content CMS

| Surface | Field | P |
|---|---|---|
| Mini-cart | title, checkout CTA, continue | P0 |
| Cart page | empty, trust, coupon placeholder, cross-sell | P0 |
| Checkout | headline, policy links, COD note | P0 |
| Order thank-you | message, next CTA | P1 |
| Abandoned copy | template hook (nội dung) | P2 |

**AC:** Empty cart đúng copy; checkout hiện policy; CMS **không** sửa số tiền.

### 8.16. FR-CMS-PRO-016 — Promo & campaign landing

- Template `landing_promo`: countdown + product_grid + coupon_strip + FAQ.  
- Schedule publish; UTM trên CTA; clone campaign.

**AC:** Countdown TZ `Asia/Ho_Chi_Minh`; hết hạn ẩn deal.

### 8.17. FR-CMS-PRO-017 — Commerce IA & navigation

1. Trang chủ · 2. Danh mục (mega) · 3. Mới / Best seller · 4. Khuyến mãi · 5. Blog/About · 6. Liên hệ · 7. Giỏ · Tài khoản.  
Mega menu: collection + featured products picker.

### 8.18. FR-CMS-PRO-018 — Commerce analytics hooks (CMS-side)

Bật/tắt surface event (Core/pixel emit): `view_item_list`, `select_item`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase`, `view_promotion`.  
GoLive cảnh báo nếu tracking bật mà consent gate tắt.

---

## 9. Non-functional

| ID | Yêu cầu |
|---|---|
| NFR-01 | LCP hero ảnh chấp nhận được 4G (budget theo GoLive CWV) |
| NFR-02 | Autosave Builder < 2s p95 (debounce) |
| NFR-03 | Settings GET/PUT p95 < 300ms nội bộ |
| NFR-04 | Mọi public form HTTPS + consent |
| NFR-05 | Feature flags: `cms.site_settings.v1`, `cms.archetype.v1`, `cms.section_parity.v1`, `cms.commerce_merch.v1` |
| NFR-06 | Server-side admin-web dùng `INTERNAL_API_URL` (không self-TLS) |
| NFR-07 | i18n UI console VI (EN backlog) |
| NFR-08 | PLP first contentful merch < 2.5s p75 4G (cùng budget CWV) |
| NFR-09 | Product picker search < 300ms p95 (admin) |

---

## 10. Use cases chính

| UC | Actor | Tóm tắt |
|---|---|---|
| UC-01 | Editor | Cài template ngành → nhận preset archetype |
| UC-02 | Editor | Đổi logo, màu, hotline, CTA trong Settings |
| UC-03 | Editor | Sửa Home bằng Builder (slider, form, FAQ) |
| UC-04 | Visitor | Submit form tư vấn → thank-you |
| UC-05 | Ops | Xem/export leads |
| UC-06 | Approver | Go-live pass → publish theme |
| UC-07 | Editor | Đổi theme fashion→beauty: content tương thích giữ, warning type lạ |
| UC-08 | Editor | Chuyển archetype commerce→lead_gen: ẩn cart sau confirm |
| UC-09 | Editor | Cấu hình shop: mini-cart, empty cart, PLP sort, announcement |
| UC-10 | Editor | Home: hero + featured + flash_sale gắn collection/SP |
| UC-11 | Editor | Collection: banner + SEO; card ATC |
| UC-12 | Editor | PDP layout: gallery, sticky ATC, related |
| UC-13 | Visitor | PLP → PDP → ATC → mini-cart → checkout (Core) |
| UC-14 | Editor | Landing promo countdown + product grid |
| UC-15 | Approver | GoLive commerce block khi thiếu SP / payment / ATC |

---

## 11. Acceptance tổng (Definition of Done v2.1)

### Chung
- [ ] Settings UI live trên VPS `/console/website/settings`.  
- [ ] ≥8 industry preset sâu; beauty vs realestate khác archetype + home content.  
- [ ] Section core list §8.3 có SF renderer + e2e smoke.  
- [ ] TC lead (thiếu SĐT / đủ SĐT / thank-you) pass.  
- [ ] `lead_gen` không hiện cart icon.  
- [ ] GoLive blocking đúng bảng §8.8.  
- [ ] Đổi theme có compatibility warnings.  
- [ ] Docs user guide VI cập nhật.  
- [ ] Không regression Platform CMS / trial / license.

### Commerce (bắt buộc GA bán hàng)
- [ ] Tab **Bán hàng** trong Settings (FR-011) hoạt động trên VPS.  
- [ ] Home merch: featured/product_grid + flash_sale + ATC.  
- [ ] PLP: banner collection + sort + card ATC.  
- [ ] PDP: gallery + sticky ATC + related.  
- [ ] Mini-cart + empty cart copy + coupon entry flag.  
- [ ] Checkout hiện policy links từ settings.  
- [ ] GoLive commerce block thiếu sản phẩm / payment / ATC.  
- [ ] UC-13 smoke: PLP→PDP→ATC→cart trên themes host.  
- [ ] Countdown/flash ẩn đúng khi hết hạn (TZ VN).

---

## 12. Ma trận ưu tiên

| P | FR | Wave plan |
|---|---|---|
| P0 | 001–003, 006, 008, 010, **011–015 (commerce P0 fields)**, 017 | PRO-0 · PRO-1 · **PRO-C0/C1** |
| P1 | 004, 005, 007 presets, 009, 011–014 P1, 016 | PRO-2 · **PRO-C2** |
| P2 | booking, maps, CRM, FBT, abandoned copy, member badge | PRO-3 |

---

## 13. Traceability

| Nguồn | Map |
|---|---|
| SRS Master FR-WCP-004…009, 011, 014 | FR-CMS-PRO-* + commerce §8.11–18 |
| Shared CMS 1.0 | Engine ContentV1 / package — giữ |
| SPEC KT (BĐS) | Preset `realestate` + lead_gen |
| Haravan Theme Settings (shop) | FR-011…015 (merchandising parity có chọn lọc) |

---

## 14. Rủi ro sản phẩm

| Rủi ro | Mitigation |
|---|---|
| Scope phình “Haravan 1:1 mọi field” | Schema chung + preset; backlog field lạ |
| Nhầm CMS với quản lý sản phẩm | UI tách `/website/*` vs `/products`; copy rõ |
| Merchant nhầm Platform CMS | Nav + role merchant |
| Section registry phình không render | CI parity + `cms.commerce_merch.v1` |
| CMS sửa giá/tồn | Cấm — chỉ reference ID |
| Flash sale hết hạn vẫn bán | AR-08 + scheduler hide |

---

*Hết SRS Merchant CMS Pro v2.1 — bổ sung chuyên sâu website bán hàng trực tuyến.*
