# Spec — Shared CMS + ThemePackage

| Thuộc tính | Nội dung |
|---|---|
| Phiên bản | 1.0 |
| Ngày | 2026-09-18 |
| Trạng thái | CMS-0 **shipped** (code) — tiếp CMS-1 theo [`shared-cms-implementation-plan.md`](./shared-cms-implementation-plan.md) |
| Tham chiếu | ADR-005 · `docs/04` §9p #5–8 · §9q · SRS FR-WCP-004…007 · mockup 05/06 |
| Phạm vi | Một CMS/Builder dùng chung mọi template; ThemePackage tách khỏi CMS engine |

---

## 1. Mục tiêu

1. Merchant sửa nội dung / SEO / media / nav bằng **một Visual Builder + CMS** cho mọi theme đã cài.
2. Template marketplace bán **ThemePackage** (layout + `supports[]` + starter), không bán CMS riêng.
3. Demo `themes.?demo=<code>` render đúng package của code (khác layout/default, cùng section schema).
4. Đổi theme: preserve content theo `section.type`; type không hỗ trợ → legacy/ẩn + warning.

## 2. Non-goals (Won't giai này)

- CMS per-template / fork editor Enterprise.
- Drag-drop canvas đầy đủ parity Webflow (CMS-2 đủ reorder + inspector; full polish sau).
- Blog CMS đầy đủ + Creator Portal upload (CMS-3+ / T4).
- 400 theme mỏng; arbitrary script ngoài app-block allowlist.
- Corporate GTM CMS (FR-CORPWEB) — xem [`webcom-corporate-cms.md`](./webcom-corporate-cms.md) (tái dùng engine này, không fork).

---

## 3. Phân lớp (bắt buộc)

```text
┌─────────────────────────────────────────────────────────┐
│ A. Catalog (marketplace)                                  │
│    TemplateCatalog · TemplateVersion · Media · tier       │
├─────────────────────────────────────────────────────────┤
│ B. ThemePackage (artifact chạy/demo)                      │
│    package.json manifest · layouts · supports[] · starter │
├─────────────────────────────────────────────────────────┤
│ C. Shared CMS (một hệ — FR-WCP-005/006/007)                │
│    Section Registry · Page · PageVersion · Media · Nav    │
│    Visual Builder · SEO · preview token                   │
├─────────────────────────────────────────────────────────┤
│ D. Tenant instance                                        │
│    Theme · ThemeVersion · TemplateInstall · ThemeLicense  │
│    BrandKit overlay · GoLive gate                         │
└─────────────────────────────────────────────────────────┘
```

| Lớp | Đổi khi… | Không chứa |
|-----|----------|------------|
| Catalog | Marketing listing, giá, screenshot | Logic render |
| Package | Skin/layout/default của 1 template code | User content sau install |
| CMS | Schema section, editor, versioning | Brand màu/font (Brand Kit) |
| Instance | Nội dung merchant + theme đang published | Định nghĩa section mới (trừ Enterprise embed) |

---

## 4. Section Registry (schema chung)

### 4.1. Nguyên tắc

- Mọi block trên page phải có `type` ∈ registry.
- Validate bằng JSON Schema (Ajv) trước autosave / publish.
- Feature flag: `builder.v1` (đã có) → mở rộng `cms.registry.v1`.

### 4.2. Contract section (PageVersion.content)

```json
{
  "schema_version": 1,
  "section_order": ["hero", "collections", "featured", "trust"],
  "sections": {
    "hero": {
      "type": "hero",
      "id": "sec_hero_1",
      "props": {
        "eyebrow": "AURA Beauty",
        "headline": "Serum tái tạo da đêm",
        "cta": "Mua ngay",
        "cta_href": "/products/glow-serum-30ml",
        "media_id": null
      },
      "style": { "padding_y": "lg" }
    }
  }
}
```

**Migration từ format hiện tại:** hôm nay builder dùng flat keys (`content.hero`, `content.section_order`). CMS-0 chấp nhận **cả hai**; normalize về `sections{}` khi save. Storefront reader hỗ trợ dual-read đến hết CMS-1.

### 4.3. MVP registry (CMS-0 / CMS-1)

| type | Label | Props tối thiểu | Storefront |
|---|---|---|---|
| `hero` | Hero | eyebrow, headline, cta, cta_href, media? | ✓ (đã có) |
| `collections` | Collections strip | source: theme\|manual, slugs? | ✓ |
| `featured` | Product grid | limit, collection_slug? | ✓ |
| `trust` | Trust badges | items: string[] | ✓ |
| `rich_text` | Rich text | html/markdown sanitized | CMS-1 |
| `faq` | FAQ | items[{q,a}] | CMS-1 |
| `cta_banner` | CTA band | headline, cta, href | CMS-1 |
| `footer_links` | Footer links | columns[] | CMS-2 |
| `header_nav` | Header (global) | menu_id | CMS-2 — thường qua NavigationMenu |

SRS list đầy đủ (announcement, flash sale, livestream…) = backlog sau CMS-2; đăng ký dần, không ship hết MVP.

### 4.4. Registry API

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/v1/admin/builder/sections` | Đã có — mở rộng schema JSON + `props_schema` |
| GET | `/api/v1/public/section-registry` | Public read (marketplace compatibility matrix) |

---

## 5. ThemePackage

### 5.1. Vị trí artifact (chốt CMS-0)

**Monorepo path** (ưu tiên phase 1):

```text
packages/themes/<code>/
  package.manifest.json   # code, name, version, supports[], layouts
  starter/
    home.json             # PageVersion.content starter
    tokens.json           # default tokens (trước Brand Kit)
  layouts/
    desktop.css | notes   # optional; phase 1 có thể chỉ tokens + section chrome
  README.md
```

DB `TemplateCatalog.themeConfig` / `pageContent` = **cache/denormalize** từ manifest khi seed/publish package — source of truth = package folder (hoặc blob versioned sau Creator Portal).

### 5.2. `package.manifest.json` (tóm tắt)

```json
{
  "code": "aura-commerce-lite",
  "version": "1.0.0",
  "supports": ["hero", "collections", "featured", "trust", "faq"],
  "layouts": { "home": ["hero", "collections", "featured", "trust"] },
  "demo_fixtures": { "brand_name": "AURA Beauty" },
  "compatible_app_blocks": []
}
```

### 5.3. Resolve runtime

| Context | Resolver |
|---|---|
| Merchant storefront | Published `ThemeVersion.config` + published `PageVersion` + Brand Kit |
| Demo `?demo=<code>` | Load package starter (+ optional demo fixtures); **không** ghi đè tenant production |
| Install template | Copy starter → draft PageVersion; merge tokens → ThemeVersion; check `ThemeLicense` nếu premium |

### 5.4. Compatibility (đổi theme)

```text
incoming.supports = package.supports
for section in current PageVersion:
  if section.type not in incoming.supports → mark legacy_hidden + warning
  else → keep props (best-effort field map)
```

API: `POST /api/v1/admin/storefronts/:id/themes/compatibility-check` body `{ template_code }` → `{ ok, warnings[], legacy_sections[] }`.

---

## 6. CMS capabilities theo page type

| `Page.templateKey` | CMS-1 | CMS-2 | Ghi chú |
|---|---|---|---|
| `home` | ✓ edit sections | ✓ | Đã có stub |
| `system` (legal…) | ✓ rich_text | ✓ | |
| `static` | ✓ | ✓ slug/SEO | |
| `landing` | ✓ | ✓ clone/schedule | |
| `blog_post` | — | stub | Full blog CMS-3 |
| `collection` / `product` | layout chrome only | — | Data từ PIM, không CMS body đầy đủ |

**Navigation & Media:** FR-WCP-007 — CMS-1 media picker tối thiểu; CMS-2 menu editor.

---

## 7. Visual Builder (UI)

| Wave | UI |
|---|---|
| **CMS-0** | Spec + registry schema; giữ form builder hiện tại (`/website/builder`) |
| **CMS-1** | Page list · chọn page · edit props theo schema · section_order reorder đơn giản · SEO panel · preview link |
| **CMS-2** | Canvas gần mockup 06: thêm/xóa section, desktop/tablet/mobile preview, inspector style cơ bản |
| **CMS-3** | Saved blocks, global section, AI copy drawer (không auto-publish), blog MVP |

**Luồng dữ liệu (Arch 8.4):**

```text
Builder UI → Draft API → Ajv(registry) → PageVersion
→ Preview token → Publish / GoLive gate → CDN revalidate
```

Giữ: autosave, `expected_version` optimistic concurrency, audit `builder.autosave` / `builder.save_version`.

---

## 8. Brand Kit vs CMS

| | Brand Kit | CMS PageVersion |
|---|---|---|
| Nội dung | colors, fonts, logo, SEO defaults, legal snippets | section props, page SEO override, media refs |
| Scope | tenant→brand→storefront | per page |
| Apply | overlay CSS variables / token merge lúc render | JSON content |

Builder **không** nhân bản color picker thay Brand Kit; chỉ cho phép style override giới hạn trong `section.style` (CMS-2).

---

## 9. API surface (delta)

### Đã có (giữ)
- `GET/PUT …/admin/storefronts/:id/pages/:slug`
- `GET …/admin/builder/sections`
- Storefront `GET …/pages/:slug`
- Install template + ThemeLicense gate (P3)

### Thêm theo wave

| Wave | API |
|---|---|
| CMS-0 | `GET /api/v1/public/theme-packages/:code` (manifest + starter) |
| CMS-1 | Pages CRUD list/create/clone; SEO patch; `POST …/preview-token`; dual-read content normalize |
| CMS-1 | `POST …/compatibility-check` |
| CMS-2 | Section insert/remove/reorder endpoints hoặc generic PUT; nav CRUD |
| CMS-3 | Saved blocks; blog routes |

Public marketplace (T1 song song): `GET /public/templates/:code` trả `supports`, `compatible_blocks`, `package_version`.

---

## 10. Waves triển khai

| Wave | Thời lượng gợi ý | Scope | Exit criteria |
|---|---|---|---|
| **CMS-0** | 3–5 ngày | Chốt schema `sections{}`; `packages/themes` cho **3** code (`aura-commerce-lite`, `lumen-fashion`, `live-drop`); seed sync manifest; public package resolve stub; dual-read storefront | 3 manifest hợp lệ; docs §9q + e2e schema validate |
| **CMS-1** | 1.5–2 tuần | Normalize save; page list + static page; SEO; preview token; demo host load starter theo `?demo=`; compatibility-check; builder form theo `props_schema` | Demo 3 code **nhìn khác** (headline/layout order/tokens); e2e-cms-1 |
| **CMS-2** | 2–3 tuần | Builder UX mockup 06 (add/remove/reorder); D/T/M preview trong builder; nav/media tối thiểu; ≥5 packages | AC mockup 06 chính; đổi theme có warning legacy |
| **CMS-3** | sau | rich sections SRS; blog stub; saved blocks; AI copy drawer | Theo backlog FR-WCP |

**Phụ thuộc marketplace IA (T1):** Browse/Detail dùng `supports` từ package — có thể song song CMS-0/1.

---

## 11. Bảo mật & governance

- Sanitize HTML (`rich_text`) — allowlist tags.
- App embed chỉ registry (BR / ADR-005).
- Publish qua GoLive checklist (đã có); schema fail → block.
- Preview token TTL + revoke.
- RBAC: `website.editor` vs `website.publisher` (nếu chưa tách, CMS-2).
- AI assistant: draft only → `pending_approval` với high-risk (đồng bộ BR-018).

---

## 12. Kiểm thử

| Script | Nội dung |
|---|---|
| `scripts/e2e-cms-0.sh` | Load 3 manifests; Ajv validate starter; public package GET |
| `scripts/e2e-cms-1.sh` | PUT home normalize; demo resolve code A ≠ code B content hash; compatibility-check |
| `scripts/e2e-cms-2.sh` | Reorder sections; preview token; publish gate |

OpenAPI: `docs/openapi-cms.yaml` (gộp dần) · Bruno `WebCom-CMS.bru`.

---

## 13. Mapping SRS / mockup

| Spec | SRS | Mockup |
|---|---|---|
| Registry + Builder | FR-WCP-005 | 06 |
| Pages / SEO / landing | FR-WCP-006 | 06 |
| Nav / Media | FR-WCP-007 | 06/05 |
| Brand Kit overlay | FR-WCP-004 | 02 |
| Package + marketplace | FR-WCP-002 | 04 |
| Theme library / version | FR-WCP-003 | 05 |
| Publish | FR-WCP-015 / GoLive | 07 |

---

## 14. Quyết định đã khóa (không mở lại trừ ADR mới)

1. **Một CMS chung** — không CMS per template.  
2. **ThemePackage** trong monorepo phase 1 (`packages/themes/*`).  
3. Content truth = **PageVersion** (+ ThemeVersion config layout).  
4. Enterprise = CMS chung + allowlist embed.  
5. Demo phải resolve package theo code trước khi gọi theme “đa dạng”.
