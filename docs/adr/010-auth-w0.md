# ADR-010 — Auth W0

- Status: Accepted (W0 interim)
- Date: 2026-09-17

## Decision
- **W0/W1 local:** HS256 JWT (`jose`) + `AUTH_DEV_BYPASS` header mode cho dev.
- Claims bắt buộc: `tenant_id`, `sub` (actor), optional `brand_id`, `roles`.
- **Staging+:** chuyển Keycloak / managed OIDC (SAML/SCIM enterprise sau).

## Consequences
- Dev onboard nhanh không cần IdP
- Phải tắt bypass ở production
