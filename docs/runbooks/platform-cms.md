# Runbook — Platform CMS (Corporate WebCom)

| | |
|---|---|
| Wave | CORP-CMS-2 GA + **CORP-CMS-3** backlog Should |
| Site key | `webcom_apex` (`webcom_en` locale stub) |
| Interim SF | `sf_platform_webcom` · tenant `ten_platform` |
| ADR | `docs/adr/008-platform-cms.md` |
| OpenAPI | `docs/openapi-platform-cms.yaml` |
| Bruno | `docs/bruno/WebCom-Platform-CMS.bru` |

## Flags

| Env | Default | Meaning |
|---|---|---|
| `FEATURE_PLATFORM_CMS` | `false` | Corporate dual-path: on → render CMS; off → legacy React |
| `FEATURE_CMS_PLATFORM_REGISTRY_V1` | on if unset | Platform section types in registry |
| `FEATURE_BUILDER_PLATFORM` | on if unset | Admin canvas scope=platform |
| `CORPORATE_REVALIDATE_URL` | — | Full URL to Next `/api/revalidate` |
| `CORPORATE_REVALIDATE_SECRET` | — | Header `x-revalidate-secret` |

Hot rollback: set `FEATURE_PLATFORM_CMS=false` and restart `webecom-corporate`. Nav falls back to SiteChrome defaults.

## Edit & publish

1. Console → **Platform CMS** (`/console/platform/pages`) with tenant `ten_platform`.
2. Pages: `home`, `pricing`, `templates`, `solutions/website`, `industries/beauty`, `case-studies/aura-beauty`, `resources`, `resources/golive-checklist`, `tour`.
3. **Navigation** → `/console/platform/nav`.
4. Editor saves draft / sends **review**.
5. Approver checklist → **Publish** (revalidate).
6. Optional **schedule**: `publish_at` ISO on transition → `scheduled`; `POST …/flush-scheduled` or public GET auto-promotes when due.
7. **Rollback** in editor (AC-P3).
8. Public: `GET /api/v1/public/platform/webcom_apex/pages/{slug}` (encode `/` as `%2F`).

## CORP-CMS-3 — Resources · Tour · ROI

| Type | Behavior |
|---|---|
| `resource_list` | Items; `gated:true` locked until session unlock |
| `gated_form` | Lead → `unlock_href`; sessionStorage unlock |
| `tour_steps` | Interactive step tabs |
| `roi_assumptions` | Assumptions + mandatory disclaimer |

Lead: `POST /api/v1/leads` + `unlock_href` (`/` or `https://`) → `{ unlocked, unlock_href }`. CTA: `cta_resource_unlock`.

## Case KPI gate (AC-B6)

`gtm_case*` / `case-studies/*` need ≥2 `before_after_kpi` metrics on publish.

## Capability matrix

Peer default: **Omnichannel phổ biến** — no competitor brand names.

## Roles

| User (seed) | Role | Can |
|---|---|---|
| `usr_platform_editor` | `platform_cms_editor` | read/write |
| `usr_platform_approver` | `platform_cms_approver` | publish + rollback + flush-scheduled |

## CTA codes

`cta_templates` · `cta_demo_live` · `cta_trial` · `cta_buy_theme` · `cta_book_demo` · `cta_pricing` · `cta_resource_unlock`

## Seed / e2e

```bash
cd apps/admin-api && pnpm exec prisma db seed
./scripts/e2e-platform-cms-0.sh
./scripts/e2e-platform-cms-1.sh
./scripts/e2e-platform-cms.sh
./scripts/e2e-platform-cms-3.sh
```

## Deferred

- PC2-10 `owner_type` / PlatformSite table
- PC3-6 A/B UI (column `experiment_code` exists)
- Full EN content for `webcom_en`
