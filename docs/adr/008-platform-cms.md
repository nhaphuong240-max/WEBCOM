# ADR-008 — Platform CMS (Corporate WebCom)

- Status: Accepted (CORP-CMS-0)
- Date: 2026-09-20
- Amends: [ADR-005](./005-website-engine.md) (Shared CMS owner scope)

## Context

`webecom.ngoinhahomnay.vn` (corporate-web) is hardcoded marketing. Spec
[`webcom-corporate-cms.md`](../specs/webcom-corporate-cms.md) requires GTM pages
editable via Shared CMS without forking the builder. Full `PlatformSite` + Page
`owner_type` migration is larger than wave 0.

## Decision

1. **Interim ownership (CORP-CMS-0…1):** Platform pages live on a dedicated
   Storefront `sf_platform_webcom` under tenant `ten_platform`. Prefix
   `sf_platform_*` marks non-merchant storefronts — hide from theme-install UX
   that targets merchant SF ids.
2. **Site key registry (code):** `webcom_apex` → `{ tenantId: ten_platform,
   storefrontId: sf_platform_webcom }`. Staging key `webcom_staging` reserved.
3. **API surface:** Admin
   `/api/v1/admin/platform/sites/:siteKey/pages…` and public
   `/api/v1/public/platform/:siteKey/pages/:slug` — wrap Shared CMS
   Page/PageVersion; do not expose interim SF id to PMM.
4. **Workflow:** `draft → review → published` via `POST …/transition`.
   Permissions `platform.cms.read|write|publish` (Editor ≠ Approver).
5. **Runtime:** `FEATURE_PLATFORM_CMS` dual-path on corporate-web; default
   **off** → legacy React (AC-P5).
6. **Follow-up (CORP-CMS-2):** Introduce `PlatformSite` model + migrate Page to
   `owner_type` / `owner_id`; deprecate interim SF (keep data via migration).

## Consequences

- No Prisma schema break in CORP-CMS-0 (additive seed only).
- Merchant CMS (`sf_aura`, …) unchanged; e2e-cms-ga must stay green.
- Theme install / onboarding UIs that hardcode `sf_aura` are safe; any future
  SF picker must filter `id.startsWith('sf_platform_')` or `slug` convention.
- Number note: `docs/03` historically reserved ADR-008 for “AI strategy”; this
  file is the Platform CMS ADR as planned in CORP-CMS plan v2.0.

## Refs

- Spec v1.2 · Implementation plan v2.0 §5 CORP-CMS-0
- ADR-005 Shared CMS · ADR-006 HR IAM (permission catalog)
