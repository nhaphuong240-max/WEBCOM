# Kế hoạch triển khai — Merchant CMS Pro v2.1

| Thuộc tính | Nội dung |
|---|---|
| Phiên bản | **2.1** |
| Ngày | 2026-09-22 |
| Trạng thái | Ready to execute |
| SRS | [`merchant-cms-pro-srs.md`](./merchant-cms-pro-srs.md) **v2.1** |
| Engine nền | Shared CMS 1.0 — giữ |
| Trọng tâm mới | **Website bán hàng (`commerce`)** — FR-CMS-PRO-011…018 |
| Ước lượng | **11–13 tuần lịch** (PRO-0…PRO-3 + **PRO-C0…C2**) |
| Đội | BE 1 · FE Console/SF 1–1.5 · QA 0.5 · PO/PMM 0.25 |

---

## 0. Tóm tắt điều hành

**GA CMS Pro v2.1** = đa ngành/đa thể loại **và** merchandising chuyên sâu cho **website bán hàng trực tuyến** (PLP/PDP/cart content/promo/home shop), không nhầm với quản lý SKU/giá.

```text
Tuần 1–2      PRO-0    SiteSettings + archetype + lead + cart gate
Tuần 3–4      PRO-1    Settings UI chung + Home P0 + GoLive cơ bản
Tuần 3–5      PRO-C0   ★ Commerce settings P0 + mini-cart + empty cart + announcement
Tuần 5–7      PRO-C1   ★ Home merch sections + product picker + ATC path
Tuần 6–8      PRO-2    Section parity chung + 8 industry presets
Tuần 7–9      PRO-C2   ★ PLP/PDP/cart-checkout content + promo landing + GoLive commerce
Tuần 10–13    PRO-3    UAT đa ngành + UAT bán hàng + leads + docs
```

`PRO-C*` chạy **song song** FE storefront với PRO-1/2 sau khi PRO-0 có `site_settings`.

---

## 1. Baseline bổ sung (commerce)

| # | Việc | Output |
|---|---|---|
| B1–B5 | Như plan v2.0 | — |
| B6 | Inventory SF: cart, PDP, collection, SectionStack merch gaps | Gap table |
| B7 | API product/collection search cho Builder picker | Contract |
| B8 | Chốt beauty = pilot commerce #1 (AURA) | PO sign |
| B9 | Phân ranh `/products` (Core) vs `/website/collections` (CMS) | IA console |

---

## 2. Workstream

```text
PRO-0 ──► PRO-1 ──► PRO-2 ──► PRO-3
              │         │
              ├─ PRO-C0 ┤
              │         ├─ PRO-C1
              │         └─ PRO-C2 ──► UAT commerce
```

---

## 3. PRO-0 / PRO-1 (giữ — nền tảng)

Giữ tasks P0-1…P0-12 và P1-1…P1-9 như v2.0.

**Bổ sung PRO-0:** default archetype install = `commerce` cho beauty/fashion/home (không chỉ lead_gen).  
**Bổ sung PRO-1:** tab Settings **placeholder “Bán hàng”** (disabled đến PRO-C0) hoặc ship C0 ngay sau P1-1.

---

## 4. Wave PRO-C0 — Commerce settings P0 (Tuần 3–5)

### Mục tiêu
Merchant bật được shop UX cơ bản: mini-cart, empty cart, announcement, compare-at, coupon flags.

| ID | Task | AC |
|---|---|---|
| PC0-1 | Schema group `commerce` trong SiteSettings (FR-011 P0 fields) | Ajv validate |
| PC0-2 | Settings UI tab **Bán hàng** | Save/load |
| PC0-3 | SF: mini-cart + cart count badge theo settings | On/off |
| PC0-4 | SF: empty cart title/CTA | Copy đúng |
| PC0-5 | SF: announcement_bar + schedule TZ VN | Ẩn hết hạn |
| PC0-6 | SF: `show_compare_at_price` trên card/PDP | Giá gạch |
| PC0-7 | Coupon entry flags (UI ô mã; apply mã = Core) | Hiện/ẩn ô |
| PC0-8 | checkout_policy_links render checkout | Links |
| PC0-9 | Flag `cms.commerce_merch.v1` | Rollback |
| PC0-10 | `e2e-cms-pro-c0.sh` | Pass |

### Exit PRO-C0
Shop settings P0 sống trên VPS; ATC path cũ không regress.

---

## 5. Wave PRO-C1 — Home merchandising (Tuần 5–7)

| ID | Task | AC |
|---|---|---|
| PC1-1 | Registry: `flash_sale`, `promo_banner`, `bundle_offer` (+ props_schema) | Validate |
| PC1-2 | SF renderers parity cho featured/product_grid/flash/promo/trust | CI |
| PC1-3 | Admin product/collection picker API + Builder inspector | Search SP |
| PC1-4 | Home starter beauty: hero_slider + featured + flash + trust | Demo |
| PC1-5 | ATC từ featured/flash → cart (Core) | UC-13 partial |
| PC1-6 | ends_at hết hạn → ẩn/ended | AR-08 |
| PC1-7 | `catalog_card.primary_cta` add_to_cart \| view_detail | Card |
| PC1-8 | e2e home merch + ATC | Pass |

### Exit PRO-C1
Home bán hàng cấu hình được; flash gắn SP thật.

---

## 6. Wave PRO-C2 — PLP / PDP / Cart content / Promo (Tuần 7–9)

| ID | Task | AC |
|---|---|---|
| PC2-1 | `/website/collections` merch UI: banner + SEO | FR-013 |
| PC2-2 | PLP SF: sort/filter theo settings; empty PLP | TC filter |
| PC2-3 | PDP template slots: gallery, buybox, sticky ATC, trust, tabs, related | FR-014 |
| PC2-4 | `sold_out_behavior` | hide/badge |
| PC2-5 | Cart cross-sell + mini-cart copy | FR-015 |
| PC2-6 | Checkout policy + thank-you content | FR-015 |
| PC2-7 | Landing `landing_promo` + countdown | FR-016 |
| PC2-8 | Mega menu merch picker (nav) | FR-017 |
| PC2-9 | GoLive commerce checks (SP, payment, ATC, merch home) | §8.8 |
| PC2-10 | Analytics surface flags (document + toggles) | FR-018 |
| PC2-11 | `e2e-cms-pro-c2.sh` UC-13 full | Pass VPS |

### Exit PRO-C2
PLP→PDP→ATC→cart→checkout content đủ UAT bán hàng.

---

## 7. PRO-2 / PRO-3 (cập nhật)

### PRO-2
Giữ presets ×8; **commerce presets** (beauty, fashion, fnb, home, electronics, kids) phải kèm `starter/site_settings.json` archetype=`commerce` + home merch sections.

### PRO-3 — bổ sung UAT bán hàng

| ID | Task | AC |
|---|---|---|
| P3-1…P3-8 | Như v2.0 (leads, roles, docs…) | — |
| P3-9 | UAT commerce matrix: beauty + fashion + fnb | UC-09…15 |
| P3-10 | Runbook VI “Cấu hình website bán hàng” | Guide |
| P3-11 | Phân biệt rõ trong guide: `/products` vs Settings Bán hàng | No confusion |
| P3-12 | Perf spot-check PLP/PDP LCP | NFR-08 |

### Exit PRO-3 = GA v2.1
SRS §11 DoD **chung + commerce** đủ.

---

## 8. Console IA (commerce)

```text
Website · CMS
  ├─ Thiết lập website
  │    ├─ Chung / Brand / Header / Floating
  │    └─ ★ Bán hàng          ← PRO-C0
  ├─ CMS · Site Builder       ← home merch PRO-C1
  ├─ ★ Bộ sưu tập (merch)     ← PRO-C2 /website/collections
  ├─ Template Store / Themes / Go-live
Sản phẩm (Điều hành)
  └─ /products · /inventory   ← Core — không gộp vào CMS
```

---

## 9. Feature flags (bổ sung)

| Flag | Staging | Prod GA |
|---|---|---|
| `cms.commerce_merch.v1` | true | true |
| `cms.commerce_plp_filters.v1` | true | true |
| `cms.commerce_promo_landing.v1` | true | tenant |

---

## 10. Test strategy (commerce)

| TC | Kỳ vọng |
|---|---|
| TC-C01 | Mini-cart mở, badge count |
| TC-C02 | Empty cart CTA |
| TC-C03 | Announcement ẩn sau ends_at |
| TC-C04 | Featured ATC → cart line |
| TC-C05 | Flash hết hạn không hiện giá sale |
| TC-C06 | PLP sort giá |
| TC-C07 | PDP sticky ATC mobile |
| TC-C08 | Related cùng collection |
| TC-C09 | Checkout hiện policy links |
| TC-C10 | GoLive block khi 0 products |

Regression: lead_gen vẫn ẩn cart; Platform CMS nguyên.

---

## 11. Milestone demo

| M | Demo |
|---|---|
| M0 | Settings + lead/cart gate |
| M1 | Settings UI chung |
| **MC0** | Tab Bán hàng + mini-cart |
| **MC1** | Home flash + ATC |
| **MC2** | PLP/PDP/cart content |
| M3 GA | UAT 3 ngành shop + guide |

---

## 12. Rủi ro thêm

| Rủi ro | Mitigation |
|---|---|
| Scope checkout engine | Chỉ content CMS; tiền = Core |
| Picker chậm | Cache search + pagination |
| Trùng announcement vs promo popup | 1 schedule engine |
| Dev nhầm edit product trong Builder | Picker read-only + link “Sửa SP” |

---

## 13. Bước bắt đầu

1. PRO-0 như đã hoạch định.  
2. Ngay khi Settings API xong → **PRO-C0** tab Bán hàng (không chờ hết lead UX).  
3. Beauty package = golden path UC-13.

---

*Hết kế hoạch Merchant CMS Pro v2.1 — bổ sung chuyên sâu website bán hàng.*
