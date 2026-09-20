# Runbook — Platform CMS (Corporate WebCom)

| | |
|---|---|
| Wave | CORP-CMS-2 GA + CORP-CMS-3 + **debt PC2-10 / PC3-6 / webcom_en** |
| Site keys | `webcom_apex` (vi) · `webcom_staging` · `webcom_en` (en) |
| PlatformSite | table `platform_sites` · Page `owner_type=platform` |
| Interim SF | `sf_platform_webcom` · `sf_platform_webcom_en` · tenant `ten_platform` |
| ADR | `docs/adr/008-platform-cms.md` |
| OpenAPI | `docs/openapi-platform-cms.yaml` |
| Bruno | `docs/bruno/WebCom-Platform-CMS.bru` |

## Flags

| Env | Default | Meaning |
|---|---|---|
| `FEATURE_PLATFORM_CMS` | `false` | Corporate dual-path: on → render CMS; off → legacy React |
| `FEATURE_CMS_PAGE_AB` | on if unset | Page `experiment_code` + hero variant |
| `FEATURE_CMS_PLATFORM_REGISTRY_V1` | on if unset | Platform section types |
| `FEATURE_BUILDER_PLATFORM` | on if unset | Admin canvas scope=platform |
| `CORPORATE_REVALIDATE_URL` | — | Next `/api/revalidate` |
| `CORPORATE_REVALIDATE_SECRET` | — | Header `x-revalidate-secret` |

Hot rollback: `FEATURE_PLATFORM_CMS=false` + restart `webecom-corporate`.

## Edit & publish

1. Console → **Platform CMS** (`/console/platform/pages`) tenant `ten_platform`.
2. Pages VI: `home`, `pricing`, `templates`, `solutions/website`, `industries/beauty`, `case-studies/aura-beauty`, `resources`, `tour`.
3. Pages EN (`webcom_en`): set `NEXT_PUBLIC_PLATFORM_SITE_KEY=webcom_en` or edit via API; public at `/en`, `/en/pricing`.
4. **A/B (PC3-6):** editor panel → `experiment_code` (seed `platform_home_hero_v1`).
5. Approver checklist → **Publish** (revalidate).
6. **Rollback** in editor (AC-P3).

## Locale EN

- Site: `webcom_en` · SF `sf_platform_webcom_en` · owner `psite_webcom_en`
- Corporate routes: `/en`, `/en/pricing`
- Public: `GET /api/v1/public/platform/webcom_en/pages/home`

## A/B

Seed experiment `platform_home_hero_v1` (running) on `sf_platform_webcom`.
Homepage page linked via `experiment_code`. Corporate `PlatformHero` assigns
variant (API or client sticky) and emits `experiment_exposed` to dataLayer.

## Roles

| User (seed) | Role | Can |
|---|---|---|
| `usr_platform_editor` | `platform_cms_editor` | read/write |
| `usr_platform_approver` | `platform_cms_approver` | publish + rollback + flush-scheduled |

## Seed / e2e

```bash
cd apps/admin-api && pnpm exec prisma migrate deploy && pnpm exec prisma db seed
./scripts/e2e-platform-cms-0.sh
./scripts/e2e-platform-cms-1.sh
./scripts/e2e-platform-cms.sh
./scripts/e2e-platform-cms-3.sh
./scripts/e2e-platform-cms-debt.sh   # PC2-10 / PC3-6 / webcom_en
```
