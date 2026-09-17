# PTT Commerce Intelligence OS

Monorepo triển khai theo **SRS v5.1**, **Architecture v3**, **Kế hoạch WebCom** — Phase **W0 Foundation** đã scaffold.

## Stack W0

| App / Package | Port | Mô tả |
|---|---|---|
| `apps/admin-api` | 3001 | NestJS modular API + Prisma + tenant JWT |
| `apps/admin-web` | 3000 | Next.js Admin shell (map mockup 02–07, 09) |
| `apps/storefront-web` | 3002 | Next.js Storefront shell (AURA) |
| `packages/shared-kernel` | — | Result, Id, errors, context, pagination |
| `packages/ui` | — | Design tokens + components từ mockup |

## Yêu cầu

- Node.js **22+**
- pnpm **9+** (`corepack enable`)
- Docker (khuyến nghị) cho Postgres/Redis/MinIO

## Quick start

```bash
# 1) Dependencies
pnpm install

# 2) Infra (nếu có Docker)
docker compose up -d

# 3) Build packages
pnpm --filter @ptt/shared-kernel build
pnpm --filter @ptt/ui build
pnpm --filter @ptt/admin-api exec prisma generate

# 4) Migrate DB (khi Postgres up)
pnpm --filter @ptt/admin-api exec prisma migrate dev --name w0_init

# 5) Dev (3 apps)
pnpm dev
```

- Admin: http://localhost:3000  
- API health: http://localhost:3001/api/health  
- Storefront: http://localhost:3002  
- Design system: http://localhost:3000/design-system  

### Dev auth (W0)

```bash
curl -s http://localhost:3001/api/v1/auth/dev-token \
  -H 'content-type: application/json' \
  -d '{"tenant_id":"ten_demo","actor_id":"usr_demo","roles":["admin"]}'

# Dùng token
curl -s http://localhost:3001/api/v1/tenancy/context \
  -H "Authorization: Bearer <token>"

# Hoặc bypass header (AUTH_DEV_BYPASS=true)
curl -s http://localhost:3001/api/v1/me \
  -H 'x-tenant-id: ten_demo' \
  -H 'x-actor-id: usr_demo'
```

## Scripts

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Tài liệu

- `docs/04_Ke_hoach_Trien_khai_WebCom_v1.md` — kế hoạch W0–W5
- `docs/adr/` — quyết định kiến trúc W0
- `mockups/` — UI baseline HTML

## W0 exit checklist

- [x] Monorepo turbo/pnpm
- [x] shared-kernel + ui tokens (7+ components + `/design-system`)
- [x] admin-api health + tenant middleware + dev JWT
- [x] admin-web shell + website route map (02–07, 09)
- [x] storefront-web shell
- [x] docker-compose + CI workflow + Dockerfile
- [x] ADR monolith / website engine / auth
- [ ] Postgres migrate trên máy có Docker (`docker compose up -d` rồi `prisma migrate`)
