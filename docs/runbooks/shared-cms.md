# Runbook — Shared CMS / ThemePackage (CMS-0+)

## Khái niệm
- **CMS chung:** Page / PageVersion + section registry (`@ptt/themes`).
- **ThemePackage:** `packages/themes/catalog/<code>/` — manifest + starter.

## Thêm package mới
1. Tạo thư mục `packages/themes/catalog/<code>/`
2. Viết `package.manifest.json` (`supports[]`, `layouts.home`)
3. Viết `starter/home.json` (ContentV1) + `starter/tokens.json`
4. Đảm bảo mọi `section.type` ∈ registry và ∈ `supports`
5. `pnpm --filter @ptt/themes test`
6. Thêm/ cập nhật dòng trong `templates-catalog.ts` nếu chưa có
7. `pnpm --filter @ptt/admin-api seed`

## Flags
| Env | Mặc định |
|---|---|
| `FEATURE_CMS_REGISTRY_V1` | true |
| `FEATURE_CMS_PACKAGE_RESOLVE` | true |
| `FEATURE_CMS_CREATOR` | true |
| `FEATURE_CMS_REVIEWS` | true |
| `FEATURE_CMS_PAGE_AB` | true |

Tắt resolve: `FEATURE_CMS_PACKAGE_RESOLVE=false` → `GET /theme-packages` trả validation error.

## API
```bash
curl -sS "$BASE/api/v1/public/theme-packages"
curl -sS "$BASE/api/v1/public/theme-packages/aura-commerce-lite"
curl -sS -H "x-tenant-id: ten_aura" -H "x-actor-id: op" \
  "$BASE/api/v1/admin/builder/sections"
```

## CMS-1 notes
- PUT page → dual-write ContentV1 + legacy flat
- `POST …/pages` tạo static page
- `POST …/themes/compatibility-check`
- GoLive item `content_schema` (warning)
- Demo: `FEATURE_CMS_DEMO_PACKAGE` + storefront `?demo=<code>` load package starter

```bash
BASE_URL=http://127.0.0.1:3101/api bash scripts/e2e-cms-1.sh
```

## CMS-2 notes
- Builder canvas: `FEATURE_CMS_BUILDER_CANVAS` (default on) — add/remove/reorder · D/T/M · undo · inspector
- Media stub: `GET/POST /v1/admin/media` (URL)
- Nav: `GET/PUT …/navigation/:handle` (`header|footer|bottom`) — storefront đọc runtime.navigation
- Packages ≥5: `harvest-fnb`, `atelier-luxe` + 3 pilot
- Install template: compatibility modal trước confirm
- Section `footer_links`

```bash
BASE_URL=http://127.0.0.1:3101/api bash scripts/e2e-cms-2.sh
```

## CMS-3 notes
- Sections: `announcement`, `testimonial`, `video`, `product_grid`
- Blog: `template_key=blog_post` · `GET …/pages?template_key=blog_post` · storefront `/blog`, `/blog/[slug]`
- Saved blocks: `GET/POST/DELETE …/saved-blocks` (`FEATURE_CMS_SAVED_BLOCKS`)
- AI copy drawer: `POST …/builder/ai-copy` — **draft only**, không auto-publish (`FEATURE_CMS_AI_COPY`)

```bash
BASE_URL=http://127.0.0.1:3101/api bash scripts/e2e-cms-3.sh
```

## CMS-3 Could notes
- Creator Portal stub: `POST /v1/admin/creator/packages/validate` · `POST /v1/admin/creator/packages` (body `{ files: { "package.manifest.json": "...", "starter/home.json": "...", "starter/tokens.json": "..." } }`) — zip binary chưa; flag `FEATURE_CMS_CREATOR`
- Reviews: `GET/POST /v1/public/templates/:code/reviews` · corporate `/templates/[code]` — `FEATURE_CMS_REVIEWS`
- Page A/B: `PUT …/pages/:slug` field `experiment_code` · runtime `home.experiment_code` · storefront Hero assign — `FEATURE_CMS_PAGE_AB`

```bash
BASE_URL=http://127.0.0.1:3101/api bash scripts/e2e-cms-3c.sh
```

## MKT-1 notes
- `GET /v1/public/templates/facets` · list `?industry&goal&license&sort`
- Detail `GET /v1/public/templates/:code` → supports · demo_url · trial/buy CTA
- Corporate: `/templates` facets · `/templates/[code]` Demo / Trial / Buy

```bash
BASE_URL=http://127.0.0.1:3101/api bash scripts/e2e-mkt-1.sh
```

## Shared CMS GA hardening
- Page promote: `POST …/pages/:slug/promote` `{ "target": "published" }` — blog hiện trên `/blog`
- Builder: nút **Publish page** trên list
- OpenAPI: `docs/openapi-cms-ga.yaml` · Bruno: `docs/bruno/WebCom-CMS-GA.bru`
- Regression bundle:

```bash
BASE_URL=http://127.0.0.1:3101/api bash scripts/e2e-cms-ga.sh
# bỏ P2/P3: CMS_GA_P2P3=0 BASE_URL=… bash scripts/e2e-cms-ga.sh
```

Checklist GA:
- [x] CMS-0…3 e2e scripts
- [x] Blog draft → promote → storefront list
- [x] GoLive `content_schema`
- [x] P2 trial + P3 license smoke (trong e2e-cms-ga)

## Spec
- `docs/specs/shared-cms-themepackage.md`
- `docs/specs/shared-cms-implementation-plan.md` · wave CMS-0…CMS-3 · MKT-1
