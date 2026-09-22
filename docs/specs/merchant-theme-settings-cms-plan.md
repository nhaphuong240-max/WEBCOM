# Kế hoạch triển khai — Merchant Site CMS (thiết lập chung mọi Template)

> **Superseded (2026-09-22):** dùng bộ v2.0  
> - SRS: [`merchant-cms-pro-srs.md`](./merchant-cms-pro-srs.md)  
> - Plan: [`merchant-cms-pro-implementation-plan.md`](./merchant-cms-pro-implementation-plan.md)  
> Tài liệu dưới đây giữ làm lịch sử map SPEC KT → MSC; wave MSC-* ≡ PRO-0/1 trong plan mới.

| Thuộc tính | Nội dung |
|---|---|
| Phiên bản | 1.0 *(superseded)* |
| Ngày | 2026-09-21 |
| Trạng thái | **Superseded** bởi Merchant CMS Pro v2.0 |
| Nguồn SPEC | `SPEC-CHUC-NANG-CHI-TIET.md` (KT-WEB-SPEC-001 v2.0 — Haravan Theme Settings BĐS) |
| Đối tượng | **Khách hàng merchant** (Admin MKT / Ops / CEO tenant) — **không** phải Platform CMS GTM |
| Tham chiếu WebCom | `shared-cms-themepackage.md` · ADR-005 · BrandKit · GoLive · FR-WCP-005/006/007 |

---

## 0. Tóm tắt điều hành

SPEC Haravan mô tả **Theme Customize** (Brand + Global + Header + Home sections + Collection/Product/Blog/Contact…).  
Trên WebCom, tương đương là **một Merchant Site CMS dùng chung** cho mọi ThemePackage:

```text
Khách hàng (tenant)
  └─ Console /website/*
       ├─ Thiết lập chung (Site Settings)  ← map F-BRAND / F-GLB / F-HDR / floating / popup
       ├─ Brand Kit                         ← màu / font (đã có nền)
       ├─ Site Builder (pages + sections) ← map F-HOME / F-ABOUT / F-FAQ / …
       ├─ Navigation                        ← F-GLB-04
       ├─ Template Store / Themes           ← đổi skin, giữ content theo registry
       └─ Go-live                           ← REQUIRED_TOBE trước publish
```

**Nguyên tắc cứng**

1. **Một schema Site Settings + Section Registry** — mọi template đọc cùng contract; ThemePackage chỉ khai `supports[]` + starter defaults.  
2. **CMS cho khách hàng** = tenant-scoped (`storefront_id`); tách biệt Platform CMS (`/platform/*`).  
3. **Industry preset** (BĐS / Beauty / F&B…) chỉ là starter + copy mặc định — không fork CMS.  
4. **Commerce mode** (SPEC D1): `lead_only` | `cart_on` — ẩn/hiện giỏ, coupon, add-to-cart theo setting chung.  
5. Không ship Haravan Liquid; map chức năng → API + storefront React + console forms.

**Ước lượng:** ~6–8 tuần lịch (MSC-0…MSC-3), chạy song song/nối tiếp Shared CMS đã ship.

---

## 1. Phạm vi & non-goals

### In scope (Merchant)

| Module SPEC | WebCom target |
|---|---|
| F-BRAND-* | Brand Kit tokens + CSS variables storefront |
| F-GLB-01 Logo/Favicon/OG | Site Settings · identity |
| F-GLB-02 Floating contact | Site Settings · floating_channels[] |
| F-GLB-03 Popup lead | Site Settings · lead_popup |
| F-GLB-04 Menu | NavigationMenu (đã có) |
| F-GLB-05 Product card | Site Settings · catalog_card |
| F-GLB-06 Coupon/Mini-cart | Gate bởi `commerce_mode` |
| F-GLB-07 Social | Site Settings · social_links |
| F-HDR-01 | Site Settings · header + CTA |
| F-HOME-* / F-ABOUT-* / F-FAQ-* / F-CTT-* / F-EVT-* / F-LDP-* | Page ContentV1 sections (+ page templates) |
| F-COL-* / F-PRD-* | Collection/PDP layout flags + lead form section |
| F-REG-* | Page `dang-ky` / `thank-you` + lead API |
| F-X-* SEO/UTM/privacy | PageVersion.seo + lead consent + analytics |
| D1/D2/D3 | Site Settings · commerce_mode · page visibility · CRM webhook phase 2 |

### Out of scope (giai đoạn này)

- Platform Corporate CMS (`/platform/pages`) — đã có track riêng.  
- Port Haravan theme Liquid / App block Haravan.  
- CRM PTT `rs.pttads.vn` realtime (D3 = phase sau; giữ lead contract).  
- Webflow-parity canvas; đủ schema-driven forms + canvas hiện có.  
- 1 CMS riêng per template.

---

## 2. Actors (map SPEC → WebCom)

| SPEC | WebCom | Quyền console |
|---|---|---|
| Admin MKT | Merchant editor | Site Settings, Builder, Nav, Media |
| Admin Ops | Merchant ops / CS | Leads list, customers (sau) |
| CEO | Merchant owner | Go-live approve, commerce_mode |
| Visitor / Lead | Storefront public | Không vào CMS |

**UI entry (khách hàng):**  
`https://…/console/website/settings` (mới) + Builder / Templates / Go-live hiện có.  
**Không** để merchant vào `/platform/*`.

---

## 3. Kiến trúc đích

```text
┌──────────────────────────────────────────────────────────────┐
│ Catalog / ThemePackage                                       │
│  supports[] · starter/home.json · starter/site_settings.json │
├──────────────────────────────────────────────────────────────┤
│ Merchant Site CMS (SHARED)                                   │
│  A. BrandKit          — colors, fonts                        │
│  B. SiteSettings      — identity, header, floating, popup,   │
│                         commerce_mode, social, catalog_card  │
│  C. Pages+ContentV1   — section registry (hero, faq, form…)  │
│  D. NavigationMenu    — header/footer IA                     │
│  E. Media             — logo, banners, OG                    │
│  F. Leads             — form submit + thank-you              │
├──────────────────────────────────────────────────────────────┤
│ Storefront runtime                                           │
│  getRuntime() → brand_kit + site_settings + pages + nav      │
│  Section renderer + FloatingBar + LeadPopup + Cart gate      │
└──────────────────────────────────────────────────────────────┘
```

### 3.1. Contract `SiteSettings` (JSON — versioned)

```json
{
  "schema_version": 1,
  "commerce_mode": "lead_only",
  "identity": {
    "logo_media_id": null,
    "favicon_media_id": null,
    "og_image_media_id": null,
    "logo_visible": true
  },
  "brand_note": "Brand colors/fonts sống ở BrandKit — không duplicate",
  "header": {
    "bg": "#ffffff",
    "fg": "#0B2A4A",
    "cta_label": "Đăng ký tư vấn",
    "cta_href": "/pages/dang-ky",
    "show_account": false,
    "show_cart": false
  },
  "floating_channels": [
    { "key": "hotline", "visible": true, "label": "Gọi tư vấn", "href": "tel:+84...", "color1": "#1E5AA8", "color2": "#0B2A4A" },
    { "key": "zalo", "visible": true, "label": "Zalo", "href": "https://zalo.me/...", "color1": "", "color2": "" }
  ],
  "lead_popup": {
    "enabled": true,
    "delay_seconds": 12,
    "variant": "signup",
    "title": "Đăng ký nhận thông tin dự án",
    "cta_label": "Nhận tư vấn",
    "cta_href": "/pages/dang-ky",
    "suppress_paths": ["/pages/thank-you"]
  },
  "social_links": [{ "network": "facebook", "url": "https://...", "visible": true }],
  "catalog_card": {
    "image_ratio": "landscape",
    "show_price": true,
    "show_vendor": false,
    "primary_cta": "view_detail"
  },
  "privacy": { "lead_consent_required": true, "consent_label": "Tôi đồng ý xử lý dữ liệu cá nhân" }
}
```

`commerce_mode`:

| Value | Hành vi storefront |
|---|---|
| `lead_only` | Ẩn cart/mini-cart/coupon/add-to-cart; CTA → form tư vấn (SPEC D1=TẮT) |
| `cart_on` | Bật cart flow; coupon theo setting (D1=GIỮ) |

### 3.2. Section registry bổ sung (map Home/About/Contact SPEC)

| type (mới hoặc mở rộng) | Map SPEC | Phase |
|---|---|---|
| `hero_slider` | F-HOME-01 | MSC-1 |
| `intro_stats` | F-HOME-02 / F-ABOUT-02 | MSC-1 |
| `collection_grid` | F-HOME-03 | MSC-1 (alias `collections`) |
| `logo_cloud` | F-HOME-04 | MSC-2 |
| `services_grid` | F-HOME-05 | MSC-1 |
| `testimonials` | F-HOME-07 | MSC-1 |
| `gallery` | F-HOME-08 | MSC-2 |
| `lead_form` | F-HOME-09 / F-PRD-02 / F-CTT-02 | **MSC-0 P0** |
| `blog_list` | F-HOME-10 | MSC-2 |
| `footer_rich` | F-HOME-11 | MSC-1 |
| `faq` | F-FAQ-01 (đã có) | MSC-1 |
| `map_stores` | F-CTT-03 / F-STORE-01 | MSC-2 |
| `team_cards` | F-ABOUT-04 | MSC-2 |
| `event_cards` | F-EVT-02 | MSC-2 |
| `countdown_banner` | F-LDP-03 | MSC-2 |

ThemePackage `supports[]` whitelist section; đổi theme → preserve theo `type`, legacy warning như Shared CMS.

### 3.3. Lead contract (từ SPEC §4.9 — Phase 1 lưu WebCom)

```text
lead_id, full_name, phone, email?, message?,
page_url, product_id?, utm_*, consent, created_at, storefront_id
```

API: mở rộng public lead hiện có (corporate) → tenant storefront lead endpoint.  
CRM PTT webhook = MSC-3 / flag `crm.ptt_webhook`.

---

## 4. Quyết định mở (chốt trước code MSC-1)

| ID | Câu hỏi | Đề xuất mặc định WebCom | Ảnh hưởng |
|---|---|---|---|
| D1 | Cart on/off | Default **`lead_only`** cho preset BĐS; Beauty giữ `cart_on` | Header, PDP, coupon |
| D2 | Page “menu” F&B | Unpublish + gỡ nav trong starter BĐS; không hardcode mọi tenant | IA |
| D3 | CRM PTT phase 1? | **Không** — chỉ persist lead + export CSV; webhook phase sau | Ops |

CEO tenant có thể đổi D1 trong Site Settings (không cần deploy).

---

## 5. Waves triển khai

```text
MSC-0 (1 tuần)   Foundation SiteSettings + Brand Kit UX + lead_form + commerce_mode gate
MSC-1 (2 tuần)   Settings UI đầy đủ + Home/About sections P0–P1 + thank-you flow
MSC-2 (2 tuần)   Collection/PDP flags + maps/stores + event/landing + industry presets
MSC-3 (1–2 tuần) Polish UAT SPEC TC01–10 + CRM webhook optional + docs khách hàng
```

### 5.1. MSC-0 — Foundation (P0 SPEC)

| ID | Task | AC |
|---|---|---|
| M0-1 | Prisma `SiteSettings` (storefrontId unique, json, version) hoặc cột JSON trên Storefront | Migrate OK |
| M0-2 | `GET/PUT /api/v1/admin/storefronts/:id/site-settings` + concurrency `expected_version` | 200 + conflict 409 |
| M0-3 | Runtime storefront: merge `site_settings` vào `getRuntime` | SF đọc được |
| M0-4 | Brand Kit console panel rõ ràng (màu/font) — map F-BRAND | Đổi màu → CSS var |
| M0-5 | Identity: logo / favicon / OG upload Media | Tab/OG đúng |
| M0-6 | `commerce_mode` gate: ẩn cart icon + add-to-cart khi `lead_only` | TC cart off |
| M0-7 | Section `lead_form` + public `POST /api/v1/public/storefronts/:id/leads` | TC02/TC03 |
| M0-8 | Floating channels render (hotline/zalo tối thiểu) | TC04 |
| M0-9 | Console nav: **Thiết lập website** dưới Website · CMS | Merchant tìm được |
| M0-10 | Flag `cms.site_settings.v1` | Rollback = tắt flag |
| M0-11 | `e2e-msc-0.sh` | Pass VPS |

**Exit MSC-0:** Merchant đổi logo + màu + CTA header + submit lead form; `lead_only` ẩn giỏ.

### 5.2. MSC-1 — Settings UI + sections Home (P0–P1)

| ID | Task | AC |
|---|---|---|
| M1-1 | UI `/website/settings` tabs: Brand · Identity · Header · Floating · Popup · Social · Commerce | Form save |
| M1-2 | Header CTA bắt buộc non-empty khi go-live check | GoLive blocking |
| M1-3 | Lead popup delay + suppress thank-you | Không spam thank-you |
| M1-4 | Sections: `hero_slider`, `intro_stats`, `services_grid`, `testimonials`, `footer_rich` | Render SF |
| M1-5 | Pages `dang-ky` + `thank-you` starter trong ThemePackage BĐS | F-REG-* |
| M1-6 | Builder: chỉ add section ∈ theme.supports ∪ global | Compatibility |
| M1-7 | Nav IA starter BĐS (Home/Dự án/Giới thiệu/Tin/Liên hệ/Đăng ký) | F-GLB-04 |
| M1-8 | GoLive checklist: logo, favicon, hotline, zalo, lead form, CTA header | REQUIRED_TOBE |
| M1-9 | e2e + screenshot UAT mobile/desktop | TC01 |

**Exit MSC-1:** Merchant cấu hình gần đủ Theme Settings Haravan P0 không cần dev.

### 5.3. MSC-2 — Catalog / Contact / Industry (P1–P2)

| ID | Task | AC |
|---|---|---|
| M2-1 | `catalog_card` + collection sort/filter flags (SF listing) | TC05 |
| M2-2 | PDP: gallery + `lead_form` context product_id | TC06 |
| M2-3 | `map_stores` + JSON stores schema validate | TC10 |
| M2-4 | FAQ / Event / Landing countdown sections | TC09 |
| M2-5 | Industry preset packs: `realestate-lite`, reuse beauty | Install starter khác nhau |
| M2-6 | Cleanup starter: không F&B copy trong preset BĐS | TC07 |
| M2-7 | Privacy consent checkbox trên mọi lead form | F-X-04 |

### 5.4. MSC-3 — Nghiệm thu SPEC + tích hợp

| ID | Task | AC |
|---|---|---|
| M3-1 | QA matrix TC01–TC10 trên VPS themes host | All pass |
| M3-2 | Runbook khách hàng (VI): “Cấu hình website của bạn” | PDF/MD trong docs guide |
| M3-3 | Optional CRM webhook + export leads CSV | D3 |
| M3-4 | Backup: SiteSettings version history / rollback last | F-X-03 tinh gọn |

---

## 6. Map ưu tiên SPEC → wave

| Priority SPEC | Function IDs | Wave |
|---|---|---|
| P0 | F-BRAND-*, F-GLB-01/02, F-HDR-01, F-HOME-01/09, F-REG-* | MSC-0 → MSC-1 |
| P1 | F-HOME-02..08/10/11, F-COL-*, F-PRD-*, F-CTT-*, F-ABOUT-* | MSC-1 → MSC-2 |
| P2 | F-FAQ-*, F-STORE-*, F-EVT-*, F-LDP-* | MSC-2 |
| P0-CLEAN | F-MENU-*, F-CART-* theo D1/D2 | MSC-0 gate + MSC-2 starter |

---

## 7. UI console (khách hàng)

```text
Website · CMS
  ├─ CMS · Site Builder      (đã có — pages/sections)
  ├─ Thiết lập website  ★NEW — Site Settings + Brand Kit deep-link
  ├─ Template Store
  ├─ Theme Library
  ├─ Go-live
  └─ …
```

**Không** đổi label thành “Haravan”; dùng ngôn ngữ merchant: *Thiết lập website*, *Thương hiệu*, *Liên hệ nổi*, *Chế độ bán hàng*.

---

## 8. Storefront consume

1. `getRuntime()` trả `brand_kit` + `site_settings` + published pages.  
2. Layout: inject CSS vars từ Brand Kit; render FloatingBar + LeadPopup từ settings.  
3. Header đọc `header.*` + NavigationMenu.  
4. Cart routes: nếu `lead_only` → empty state + CTA “Xem dự án/sản phẩm”.  
5. Section renderer: map `type` → component; ẩn section `visible=false` trong props.

---

## 9. Quan hệ Shared CMS đã có

| Đã có | MSC bổ sung |
|---|---|
| ContentV1 + Builder canvas | Thêm section types lead/slider/stats… |
| BrandKit API | UI merchant + apply tokens |
| Navigation / Media | Gắn vào Settings + Header |
| ThemePackage supports | `starter/site_settings.json` |
| GoLive | Checks identity + floating + lead form |
| Platform CMS | **Không đụng** |

---

## 10. Rủi ro & mitigation

| Rủi ro | Mitigation |
|---|---|
| Trùng màu BrandKit vs SiteSettings | Brand chỉ ở BrandKit; Header chỉ override bg/fg optional |
| Template không support section mới | `supports[]` + legacy hide + warning |
| Merchant nhầm Platform CMS | Nav tách; docs rõ “website bán hàng của bạn” |
| TLS/self-fetch API (đã gặp) | Giữ `INTERNAL_API_URL` server-side |
| Scope phình theo Haravan 1:1 | Chỉ schema chung; copy BĐS = preset, không hardcode Khang Thịnh |

---

## 11. Deliverables

1. Spec này (kế hoạch)  
2. JSON Schema `site_settings.schema.json` + section schemas mới  
3. API + migrate + flags  
4. Console `/website/settings`  
5. Storefront runtime consumers  
6. Preset ThemePackage `realestate-lite` (pilot từ SPEC KT)  
7. e2e MSC-0/1 + runbook khách hàng VI  
8. Biên bản chốt D1/D2/D3  

---

## 12. Đề xuất bước tiếp theo (ngay)

1. **Chốt D1/D2/D3** (mặc định đề xuất ở §4).  
2. Implement **MSC-0** (SiteSettings model + lead_form + commerce gate + Settings nav).  
3. Pilot nội dung BĐS trên 1 ThemePackage để UAT theo TC01–04.  

---

*Hết kế hoạch v1.0 — Merchant Site CMS = lớp thiết lập chung cho mọi template, dành riêng khách hàng tenant.*
