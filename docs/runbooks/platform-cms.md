# Runbook — Platform CMS (Corporate WebCom)

| | |
|---|---|
| Wave | CORP-CMS-0 / CORP-CMS-1 |
| Site key | `webcom_apex` |
| Interim SF | `sf_platform_webcom` · tenant `ten_platform` |
| ADR | `docs/adr/008-platform-cms.md` |

## Flags

| Env | Default | Meaning |
|---|---|---|
| `FEATURE_PLATFORM_CMS` | `false` | Corporate dual-path: on → render CMS; off → legacy React |
| `FEATURE_CMS_PLATFORM_REGISTRY_V1` | on if unset | Platform section types in registry |
| `FEATURE_BUILDER_PLATFORM` | on if unset | Admin canvas scope=platform |

Hot rollback: set `FEATURE_PLATFORM_CMS=false` and restart `webecom-corporate`.

## Edit & publish

1. Open Console → **Platform CMS** (`/console/platform/pages`) with tenant `ten_platform`.
2. Open a page (`home`, `pricing`, `templates`).
3. Edit in visual builder (palette = platform + shared sections).
4. **Editor** saves draft / sends **review**.
5. **Approver** checks SEO / CTA codes / Legal → **Publish**.
6. Public: `GET /api/v1/public/platform/webcom_apex/pages/{slug}`.
7. Corporate (flag on) reads published content within ~60s (ISR) or hard refresh.

Preview: `POST …/preview-token` → open `preview_url` (`/?preview=TOKEN`) — works even if flag off.

## Roles

| User (seed) | Role | Can |
|---|---|---|
| `usr_platform_editor` | `platform_cms_editor` | read/write, not publish |
| `usr_platform_approver` | `platform_cms_approver` | read/write/publish |

## CTA codes (AC-B1)

`cta_templates` · `cta_demo_live` · `cta_trial` · `cta_buy_theme` · `cta_book_demo` · `cta_pricing`

Unknown `cta_code` → save/publish **400**.

## Announce bar (AC-B9)

If `ends_at` &lt; now (UTC parse), section is stripped on **public** GET.

## Seed / e2e

```bash
cd apps/admin-api && pnpm exec prisma db seed
./scripts/e2e-platform-cms-0.sh
./scripts/e2e-platform-cms-1.sh
```

## Hybrid `/templates`

CMS page slug `templates` only supplies `catalog_intro`. Facets + product cards remain API-driven.
