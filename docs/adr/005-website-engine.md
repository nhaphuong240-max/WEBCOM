# ADR-005 / ADR-013 / ADR-014 — Website engine

- Status: Accepted (W0)
- Date: 2026-09-17

## Decision
1. **Storefront** = Next.js SSR/ISR + CDN tag invalidation.
2. **Theme/page** = schema-driven JSON versioned (không raw HTML làm truth).
3. **Admin Builder** = React schema editor (W3).

## Consequences
- Preview/staging/rollback trở thành first-class
- Custom code qua app-block allowlist (W3+)
