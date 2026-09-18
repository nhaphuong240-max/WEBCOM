# ADR-005 / ADR-013 / ADR-014 — Website engine

- Status: Accepted (W0); **amended 2026-09-18** (shared CMS + ThemePackage)
- Date: 2026-09-17

## Decision
1. **Storefront** = Next.js SSR/ISR + CDN tag invalidation.
2. **Theme/page** = schema-driven JSON versioned (không raw HTML làm truth).
3. **Admin Builder** = React schema editor (W3).
4. **CMS dùng chung** cho toàn bộ template marketplace (chốt 2026-09-18):
   - Một hệ Page / PageVersion / Media / Nav / SEO / Visual Builder.
   - **Không** triển khai CMS riêng theo từng website template.
   - **ThemePackage** = layout shell + section whitelist (`supports[]`) + starter content + default tokens.
   - **Brand Kit** = overlay design tokens (không thay CMS schema).
   - **Enterprise / Agency custom** = cùng CMS + app embed / section allowlist theo tenant — không fork CMS.
5. **Listing ≠ Package ≠ Install:** `TemplateCatalog` (bán) → `ThemePackage` (chạy/demo) → tenant `Theme`/`PageVersion` (sau install).

## Consequences
- Preview/staging/rollback trở thành first-class trên một pipeline.
- Custom code qua app-block allowlist (W3+).
- Merchant đổi theme không đổi cách dùng editor; cần compatibility check theo `supports[]`.
- Demo host phải load package theo `?demo=<code>`, không chỉ metadata trên một shell cố định.
- Creator Portal upload package + defaults, không ship CMS engine riêng.

## Refs
- `docs/04` §9p quyết định 5–8 · §9q waves CMS-0…CMS-3
- Spec: `docs/specs/shared-cms-themepackage.md`
- Implementation plan: `docs/specs/shared-cms-implementation-plan.md`
- SRS FR-WCP-002 · FR-WCP-005 · FR-WCP-006 · FR-WCP-007
