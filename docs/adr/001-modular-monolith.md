# ADR-001 — Modular monolith first

- Status: Accepted (W0)
- Date: 2026-09-17

## Context
PTT cần ra mắt WebCom nhanh nhưng đủ chỗ mở rộng OMS, AI, analytics.

## Decision
Dùng **NestJS modular monolith** trong monorepo (`apps/admin-api` + `packages/*`). Tách microservice chỉ khi có lý do đo được (Arch ADR-001).

## Consequences
- Deploy đơn giản ở MVP
- Bounded context rõ trong `packages/` / module folders
- Tránh distributed complexity sớm
