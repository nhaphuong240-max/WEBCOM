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

Tắt resolve: `FEATURE_CMS_PACKAGE_RESOLVE=false` → `GET /theme-packages` trả validation error.

## API
```bash
curl -sS "$BASE/api/v1/public/theme-packages"
curl -sS "$BASE/api/v1/public/theme-packages/aura-commerce-lite"
curl -sS -H "x-tenant-id: ten_aura" -H "x-actor-id: op" \
  "$BASE/api/v1/admin/builder/sections"
```

## e2e
```bash
BASE_URL=http://127.0.0.1:3101/api bash scripts/e2e-cms-0.sh
```

## Spec
- `docs/specs/shared-cms-themepackage.md`
- `docs/specs/shared-cms-implementation-plan.md` · wave CMS-0
