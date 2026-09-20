# ADR-008 — Platform CMS (Corporate WebCom)

- Status: Accepted (amended PC2-10 · 2026-09-20)
- Date: 2026-09-20
- Amends: [ADR-005](./005-website-engine.md) (Shared CMS owner scope)

## Context

`webecom.ngoinhahomnay.vn` (corporate-web) is hardcoded marketing. Spec
[`webcom-corporate-cms.md`](../specs/webcom-corporate-cms.md) requires GTM pages
editable via Shared CMS without forking the builder.

## Decision

1. **PlatformSite table (PC2-10):** First-class `platform_sites` rows keyed by
   `site_key` (`webcom_apex`, `webcom_staging`, `webcom_en`). Resolve from DB with
   code fallback `PLATFORM_SITES_FALLBACK`.
2. **Page owner:** `pages.owner_type` + `pages.owner_id` —
   `platform` / `psite_*` for GTM pages; `storefront` / `sf_*` for merchant.
   Unique `(owner_type, owner_id, slug)`. Dual-write: keep `storefront_id` for
   Shared CMS nav/media until NavigationMenu is platform-scoped.
3. **Interim Storefront retained:** `sf_platform_webcom` (VI) and
   `sf_platform_webcom_en` (EN) remain `interim_storefront_id` for nav, preview
   tokens, and Experiment.assign. Prefix `sf_platform_*` hides from merchant UX.
4. **API surface:** Admin `/api/v1/admin/platform/sites/:siteKey/pages…` and
   public `/api/v1/public/platform/:siteKey/pages/:slug` — wrap Shared CMS;
   responses include `owner_type`, `owner_id`, `interim_storefront_id`, `locale`.
5. **Workflow:** `draft → review → published` via `POST …/transition`.
   Permissions `platform.cms.read|write|publish` (Editor ≠ Approver).
6. **Runtime:** `FEATURE_PLATFORM_CMS` dual-path on corporate-web; `/en` reads
   `webcom_en`. Page A/B via `experiment_code` + `FEATURE_CMS_PAGE_AB` (PC3-6).

## Consequences

- Additive migrate `20260920120000_platform_site_owner`.
- Merchant CMS (`sf_aura`, …) unchanged; e2e-cms-ga must stay green.
- Deprecating interim SF entirely is a follow-up (nav/media owner migrate).

## Refs

- Spec v1.2 · Implementation plan v2.0 · PC2-10 / PC3-4 / PC3-6
- ADR-005 Shared CMS · ADR-006 HR IAM
