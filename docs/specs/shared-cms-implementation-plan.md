# Kế hoạch triển khai chi tiết — Shared CMS + ThemePackage

| Thuộc tính | Nội dung |
|---|---|
| Phiên bản | 1.0 |
| Ngày | 2026-09-18 |
| Trạng thái | Ready to execute |
| Spec | [`shared-cms-themepackage.md`](./shared-cms-themepackage.md) |
| Kế hoạch tổng | `docs/04` §9p · §9q |
| ADR | `docs/adr/005-website-engine.md` |
| SRS | FR-WCP-002 · 004 · 005 · 006 · 007 · GoLive |
| Ước lượng | **~7–9 tuần lịch** (CMS-0…CMS-2); CMS-3 backlog sau |

---

## 0. Tóm tắt điều hành

**Deliverable cuối CMS-2:** một CMS/Builder dùng chung; ≥5 ThemePackage trong `packages/themes`; demo `themes.?demo=<code>` khác nhau thật; đổi theme có compatibility warning; publish vẫn qua GoLive + ThemeLicense (P3).

```text
Tuần 1        CMS-0  Foundation (schema + 3 packages + resolve API)
Tuần 2–3      CMS-1  Runtime + demo + CMS pages/SEO + builder schema-driven
Tuần 4–6      CMS-2  Builder UX (mockup 06) + nav/media + 5 packages
Tuần 7+       CMS-3  Backlog (blog, saved blocks, AI drawer) — không chặn GA CMS chung
Song song     MKT-1  Marketplace Browse/Detail dùng supports[] (corporate-web)
```

**Đội gợi ý (1 squad):** BE 1 · FE Builder/Storefront 1 · FE Platform 0.5 · QA 0.5 · Tech lead review ADR/schema.

---

## 1. Nguyên tắc thực thi

1. **Không phá funnel đã ship:** trial P2, license P3, apex corporate, preview chrome D/M.
2. **Feature flags:** `builder.v1` (có) · `cms.registry.v1` · `cms.package_resolve` · `cms.demo_package` · `cms.builder_canvas`.
3. **Dual-read/dual-write** đến hết CMS-1; cấm big-bang migrate PageVersion production.
4. **Package trong monorepo trước**; Creator upload sau (CMS-3+).
5. Mỗi wave: **migrate (nếu có) → API → seed → UI → e2e → docs OpenAPI/Bruno → health note**.
6. Tiếng Việt cho runbook/user-facing; code/API English.

---

## 2. Workstream & phụ thuộc

```text
                    ┌─────────────┐
                    │  CMS-0      │
                    │  Registry + │
                    │  3 packages │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
     ┌──────────┐   ┌──────────┐   ┌──────────────┐
     │ CMS-1a   │   │ CMS-1b   │   │ MKT-1        │
     │ Normalize│   │ Demo     │   │ Detail page  │
     │ + Pages  │   │ resolve  │   │ supports UI  │
     └────┬─────┘   └────┬─────┘   └──────────────┘
          └───────┬──────┘
                  ▼
            ┌──────────┐
            │ CMS-2    │
            │ Builder  │
            │ canvas   │
            └────┬─────┘
                 ▼
            ┌──────────┐
            │ CMS-3    │
            │ backlog  │
            └──────────┘
```

| ID | Phụ thuộc cứng |
|---|---|
| CMS-1 | CMS-0 manifests + normalize helpers |
| CMS-2 | CMS-1 content contract ổn định |
| MKT-1 | CMS-0 public `supports` (có thể mock từ catalog JSON trước package) |
| Publish | Không đổi gate; chỉ thêm schema check `cms.registry.v1` |

---

## 3. Baseline audit (Day 0 — trước code CMS-0)

| # | Việc | Owner | Output |
|---|---|---|---|
| A1 | Inventory `SECTION_LIBRARY` + mọi chỗ đọc `pageContent` / `content.hero` | BE | Bảng dual-read |
| A2 | Inventory seed `templates-catalog.ts` (30) — map → 3 package pilot | BE | Danh sách code pilot |
| A3 | Storefront `getRuntime` / home render path | FE-SF | Điểm inject package demo |
| A4 | Admin builder PUT contract + concurrency | BE | Giữ `expected_version` |
| A5 | Flag matrix trên VPS `.env.example` | DevOps | PR flags |

**Pilot packages (chốt):**

| code | Lý do |
|---|---|
| `aura-commerce-lite` | Default beauty — baseline |
| `lumen-fashion` | Layout/order + tokens khác |
| `live-drop` | Social/campaign — section_order khác (hero→cta→featured) |

---

## 4. Wave CMS-0 — Foundation (Tuần 1 · 3–5 ngày)

### 4.1. Mục tiêu
Khóa contract nội dung + 3 ThemePackage + API đọc package; **chưa** bắt buộc đổi UI demo.

### 4.2. Task breakdown

| ID | Task | Files / khu vực | AC |
|---|---|---|---|
| C0-1 | Tạo `packages/themes` workspace + tsconfig export | `packages/themes/*`, `pnpm-workspace.yaml` | `pnpm --filter @ptt/themes build` OK |
| C0-2 | `package.manifest.json` × 3 + `starter/home.json` + `starter/tokens.json` | `packages/themes/<code>/` | Ajv validate |
| C0-3 | Module `@ptt/themes`: `listPackages()`, `getPackage(code)`, `getStarter(code)` | `packages/themes/src/index.ts` | Unit test 3 codes |
| C0-4 | JSON Schema section registry v1 + Ajv helper | `packages/shared-kernel` hoặc `packages/themes/src/schema` | Reject unknown type |
| C0-5 | `normalizeContent(raw) → ContentV1` + `toLegacyFlat(v1)` | shared | Round-trip flat↔v1 |
| C0-6 | `GET /api/v1/public/theme-packages` + `/:code` | `website.controller` / platform | 200 + supports + starter |
| C0-7 | Seed: sync `themeConfig`/`pageContent`/`features` từ manifest cho 3 code | `seed.ts` | DB khớp package |
| C0-8 | Mở rộng `GET …/builder/sections` trả `props_schema` | `platform.service` | UI có thể đọc schema |
| C0-9 | Flag `cms.registry.v1`, `cms.package_resolve` | `.env.example` | Default on staging |
| C0-10 | Docs: OpenAPI snippet + Bruno + `scripts/e2e-cms-0.sh` | `docs/`, `scripts/` | e2e xanh local/VPS |
| C0-11 | Runbook ngắn | `docs/runbooks/shared-cms.md` | Cách thêm package mới |

### 4.3. ContentV1 (nhắc lại)

```json
{
  "schema_version": 1,
  "section_order": ["hero", "trust", "featured"],
  "sections": {
    "hero": { "type": "hero", "id": "sec_hero", "props": { }, "style": {} }
  }
}
```

Legacy vẫn hợp lệ: `{ "section_order": [...], "hero": {...}, "trust": [...] }`.

### 4.4. Exit CMS-0
- [ ] 3 packages trong repo, seed sync
- [ ] Public package API
- [ ] normalize + Ajv unit tests
- [ ] `e2e-cms-0.sh` pass
- [ ] Không regression builder PUT hiện tại (dual-write flat vẫn OK)

### 4.5. Rollback CMS-0
Tắt `cms.package_resolve`; xóa route public nếu cần — không đụng PageVersion production.

---

## 5. Wave CMS-1 — Runtime + CMS pages (Tuần 2–3 · ~10 ngày)

Chia **CMS-1a** (BE/CMS) và **CMS-1b** (demo/storefront) song song sau C0.

### 5.1. CMS-1a — Normalize + Pages + SEO + Preview

| ID | Task | Files | AC |
|---|---|---|---|
| C1-1 | PUT page: luôn persist ContentV1; dual-write flat mirror 1 release | `platform.service` save page | DB `schema_version: 1` |
| C1-2 | GET page: trả V1; optional `?legacy=1` | API | Admin builder không gãy |
| C1-3 | Pages list UI + create static page (`templateKey=static`) | `admin-web/website/pages` hoặc mở rộng builder | Tạo slug + rich_text |
| C1-4 | SEO panel (title, description, og) trên builder | builder page | Lưu `PageVersion.seo` |
| C1-5 | Preview token: create / resolve / TTL 24h | API + storefront `?preview=` | Token revoke được |
| C1-6 | `POST …/compatibility-check` | platform | warnings[] + legacy_sections[] |
| C1-7 | Install template: copy starter V1 từ package nếu có, else catalog JSON | `installTemplate` | Install live-drop ≠ aura content |
| C1-8 | GoLive: thêm check `content_schema` khi flag on | golive | Invalid schema → blocking |
| C1-9 | `scripts/e2e-cms-1a.sh` | scripts | Pass |

### 5.2. CMS-1b — Demo package resolve

| ID | Task | Files | AC |
|---|---|---|---|
| C1-10 | Storefront: khi `?demo=<code>` hoặc demo host + code → fetch package starter | `storefront-web` page/runtime | Hash content A ≠ B |
| C1-11 | Apply starter tokens → CSS variables (song song Brand Kit) | StoreShell / layout | Fashion accent ≠ beauty |
| C1-12 | Section renderer map: `section_order` → components | `components/sections/*` | Render faq/cta nếu có |
| C1-13 | ThemePreviewChrome: truyền `templateCode` đã có; back link ổn | ThemePreviewChrome | Không regression |
| C1-14 | Flag `cms.demo_package` | env | Tắt → hành vi cũ |
| C1-15 | `e2e-cms-1.sh` gộp demo diff | scripts | curl 2 demo codes, assert khác headline |

### 5.3. Exit CMS-1
- [ ] Builder save V1; dual-read OK
- [ ] ≥1 static page tạo được
- [ ] Preview token hoạt động
- [ ] `?demo=aura-commerce-lite` vs `?demo=lumen-fashion` khác headline + tokens
- [ ] compatibility-check trả warning khi supports hẹp
- [ ] e2e-cms-1 pass trên VPS

### 5.4. Rollback CMS-1
`cms.demo_package=false` + `cms.registry.v1=false` (validate lỏng); reader vẫn đọc flat.

---

## 6. Wave CMS-2 — Builder UX + Nav/Media + scale packages (Tuần 4–6 · ~15 ngày)

### 6.1. Builder canvas (mockup 06)

| ID | Task | AC |
|---|---|---|
| C2-1 | Client builder shell: canvas + section list + inspector | Khớp structure mockup 06 |
| C2-2 | Add section từ registry (chỉ type ∈ theme.supports ∪ global) | Không add type ngoài allowlist |
| C2-3 | Remove + reorder (`section_order`) kéo thả hoặc up/down | Persist PUT |
| C2-4 | Responsive tabs Desktop / Tablet / Mobile trong builder | Preview width đổi |
| C2-5 | Autosave debounce + conflict toast (`expected_version`) | Giữ concurrency |
| C2-6 | Flag `cms.builder_canvas`; fallback form CMS-1 nếu off | Safe rollout |
| C2-7 | Undo/redo session (client stack) — Should | 20 bước |

### 6.2. Nav & Media (FR-WCP-007 tối thiểu)

| ID | Task | AC |
|---|---|---|
| C2-8 | Media library list/upload stub (URL hoặc MinIO nếu có) | Gắn `media_id` vào hero |
| C2-9 | NavigationMenu CRUD header links | Storefront đọc menu khi published |
| C2-10 | Footer từ Brand Kit + `footer_links` section | Không hardcode |

### 6.3. Scale packages

| ID | Task | AC |
|---|---|---|
| C2-11 | Thêm package #4 `#5` (vd. `harvest-fnb`, `atelier-luxe`) | supports khác nhau |
| C2-12 | Seed sync tất cả package có folder | Catalog `supports` đúng |
| C2-13 | Admin Theme Library: hiện package version + supports | mockup 05 |

### 6.4. Đổi theme UX

| ID | Task | AC |
|---|---|---|
| C2-14 | Install/switch flow gọi compatibility-check trước confirm | Modal warnings |
| C2-15 | Legacy sections: render ẩn trên storefront + badge trong builder | Merchant thấy |

### 6.5. Exit CMS-2
- [x] AC mockup 06 chính (add/reorder/inspector/responsive)
- [x] ≥5 packages; demo 5 codes phân biệt
- [x] Nav + media stub
- [x] e2e-cms-2 pass
- [x] Không regression P2/P3/GoLive (`scripts/e2e-cms-ga.sh`)

---

## 7. Wave CMS-3 — Backlog (không chặn “CMS chung GA”)

| ID | Item | Ưu tiên | Status |
|---|---|---|---|
| C3-1 | Section SRS thêm: announcement, product grid advanced, testimonial, video | Should | **shipped** |
| C3-2 | Blog post `templateKey=blog_post` + list | Should | **shipped** |
| C3-3 | Saved blocks / global header section | Should | **shipped** (saved blocks) |
| C3-4 | AI copy drawer → draft only, BR-018 | Should | **shipped** |
| C3-5 | Creator Portal upload zip package | Could | **shipped** (files-map stub; zip binary later) |
| C3-6 | Reviews trên marketplace detail | Could | **shipped** |
| C3-7 | A/B experiment flag trên page | Could | **shipped** |

**Exit CMS-3 (Should):** e2e-cms-3 · flags `FEATURE_CMS_BLOG` / `FEATURE_CMS_SAVED_BLOCKS` / `FEATURE_CMS_AI_COPY`.

**Exit CMS-3 Could:** `scripts/e2e-cms-3c.sh` · flags `FEATURE_CMS_CREATOR` / `FEATURE_CMS_REVIEWS` / `FEATURE_CMS_PAGE_AB`.

**GA “Shared CMS”** = xong CMS-2 exit + docs + flags on production.

---

## 8. Song song — Marketplace IA (MKT-1)

Không thuộc CMS engine nhưng dùng `supports` từ CMS-0.

| ID | Task | AC | Status |
|---|---|---|---|
| M1-1 | `GET /public/templates/:code` trả supports, scores, media, license tier | Detail đủ | **shipped** |
| M1-2 | corporate `/templates/[code]` | CTA Demo/Trial/Buy | **shipped** |
| M1-3 | Browse facets: industry, goal, tier, sort cvr/mobile | § IA | **shipped** |
| M1-4 | Deep-link demo `themes.?demo=` + chrome | Đã có chrome | **shipped** |

API thêm: `GET /v1/public/templates/facets` · list `?license=` · enrich `supports`/`has_package`.

```bash
BASE_URL=http://127.0.0.1:3101/api bash scripts/e2e-mkt-1.sh
```

Lịch: bắt đầu sau C0-6; hoàn thành trong cửa sổ CMS-1.

---

## 9. Lịch sprint chi tiết (gợi ý 2 tuần / sprint)

### Sprint S-CMS-A (Tuần 1–2)
- CMS-0 toàn bộ
- CMS-1a bắt đầu (normalize + PUT)
- MKT-1 scaffold detail route

**Demo nội bộ cuối sprint:** public package API + 1 page V1 trong DB.

### Sprint S-CMS-B (Tuần 3–4)
- CMS-1b demo resolve 3 codes
- CMS-1a pages/SEO/preview/compatibility
- MKT-1 browse facets
- e2e-cms-1 trên VPS

**Demo:** `themes.?demo=lumen-fashion` khác Aura rõ.

### Sprint S-CMS-C (Tuần 5–6)
- CMS-2 builder canvas + media/nav stub
- Packages 4–5
- e2e-cms-2
- Flag on staging → production

**Demo:** Builder add/reorder + publish qua GoLive.

### Sprint S-CMS-D (Tuần 7+) — optional
- CMS-3 chọn lọc theo PO

---

## 10. Ma trận trách nhiệm (RACI rút gọn)

| Hạng mục | BE | FE-SF | FE-Admin | FE-Corp | QA |
|---|---|---|---|---|---|
| Registry / Ajv / normalize | R | C | C | — | C |
| packages/themes | R | C | — | — | I |
| Public package + install | R | C | C | — | R |
| Demo resolve | C | R | — | I | R |
| Builder canvas | C | I | R | — | R |
| `/templates/[code]` | C | — | — | R | C |
| e2e scripts | C | C | C | C | R |
| VPS flags / deploy | C | — | — | — | C |

R=Responsible · C=Consulted · I=Informed

---

## 11. Kế hoạch kiểm thử

| Tầng | Việc |
|---|---|
| Unit | normalize round-trip; Ajv accept/reject; getPackage unknown → 404 |
| Integration | PUT page concurrency 409; install + license gate; preview TTL |
| e2e-cms-0/1/2 | Scripts bash như spec |
| Visual | 3–5 demo codes screenshot Desktop/Mobile chrome |
| Regression | `e2e-p2.sh` · `e2e-p3.sh` · golive smoke · health wave |
| Perf | Home TTFB demo resolve < budget hiện có; không N+1 package |

**Definition of Done mỗi PR:** typecheck · e2e wave liên quan · OpenAPI/Bruno cập nhật · flag documented.

---

## 12. Deploy & rollout VPS

```text
1. Merge main → VPS git reset
2. pnpm install · build themes · shared-kernel · admin-api · admin-web · storefront · corporate
3. prisma migrate (nếu CMS-1+ có bảng PreviewToken / Nav)
4. seed sync packages
5. Bật flags theo bậc:
   staging: cms.registry.v1 + cms.package_resolve
   rồi: cms.demo_package
   rồi: cms.builder_canvas
6. Smoke: package API · 2 demo URLs · builder PUT · golive · trial/license
7. Rollback = tắt flag (không revert DB V1 nếu dual-read còn)
```

Systemd: restart `webecom-admin-api` · `webecom-admin-web` · `webecom-storefront` · (`webecom-corporate` nếu MKT-1).

---

## 13. Rủi ro & giảm thiểu

| Rủi ro | Impact | Mitigation |
|---|---|---|
| Dual format lệch data | Cao | normalize bắt buộc lúc PUT; job backfill optional CMS-1 |
| Demo vẫn “giống Aura” | Cao (uy tín marketplace) | Exit CMS-1 bắt buộc content hash khác |
| Builder canvas scope creep | Cao | Flag + MVP reorder; không Webflow |
| 30 catalog chưa có package folder | Trung | Chỉ pilot 3→5; catalog còn lại legacy flat đến khi port |
| Perf đọc package mỗi request | Trung | Cache manifest in-memory / ISR 60s |
| Conflict với Brand Kit tokens | Trung | Thứ tự merge: package defaults → Brand Kit → section.style |
| GoLive chặn hết publish khi schema mới | Trung | Check `content_schema` warning trước, blocking sau 1 sprint |

---

## 14. Metric thành công

| Metric | Mục tiêu sau CMS-2 |
|---|---|
| Số ThemePackage thật | ≥ 5 |
| Demo codes phân biệt (manual QA) | 5/5 |
| Builder: thời gian sửa hero → preview | < 2 phút merchant |
| Regression P2/P3 | 100% e2e xanh |
| % PageVersion `schema_version=1` (tenant demo) | ≥ 95% sau backfill |
| Support tickets “đổi theme mất content” | Giảm nhờ compatibility modal |

---

## 15. Checklist mở đầu CMS-0 (ngay khi kickoff)

- [ ] PO xác nhận 3 pilot codes (+ 2 candidates cho CMS-2)
- [ ] Tech lead merge schema ContentV1 vào shared-kernel/themes
- [ ] Tạo branch `feat/cms-0-themepackage` (hoặc ship thẳng main theo nhịp hiện tại)
- [ ] Thêm flags vào `.env.example`
- [ ] Gán owner C0-1…C0-11
- [ ] Đặt lịch demo cuối Tuần 1

---

## 16. Tài liệu cần cập nhật khi ship từng wave

| Wave | Docs |
|---|---|
| CMS-0 | Spec § status · §9q checkbox · OpenAPI · runbook · README |
| CMS-1 | Runbook demo resolve · e2e · SRS traceability note |
| CMS-2 | Mockup 06 AC sign-off · Theme library help |
| CMS-3 | Backlog only trong §9q |

---

## 17. Kết luận kế hoạch

| Câu hỏi | Trả lời |
|---|---|
| Bắt đầu từ đâu? | **CMS-0** — package + schema, không nhảy canvas |
| Khi nào marketplace “thật”? | Sau **CMS-1b** (demo khác nhau) + **MKT-1** detail |
| Khi nào gọi là xong CMS chung? | **Exit CMS-2** + flags on prod |
| CMS-3? | Không chặn GA |

**Next action đề xuất:** kickoff CMS-0 (C0-1…C0-5 trong 2 ngày đầu) ngay sau khi PO chốt danh sách package #4/#5 cho CMS-2.
