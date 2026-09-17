# Analytics pipeline (A3)

## Path
`POST /v1/events` → Postgres (OLTP) → Redpanda topic → ClickHouse (funnel / contribution).

## Modes
| Component | Default | Live |
|---|---|---|
| Redpanda | In-process bus + consumer | `REDPANDA_BROKERS` / `REDPANDA_HTTP_PROXY` |
| ClickHouse | In-memory stub + TTL prune | `CLICKHOUSE_URL` HTTP |

## Flags
- `FEATURE_REDPANDA` / `FEATURE_CLICKHOUSE` (default on)
- `FEATURE_ANALYTICS_BACKFILL` — seed CH from PG last N days on boot
- `ANALYTICS_RETENTION_DAYS` (default 90)

## Local live stack
```bash
docker compose --profile analytics up -d
# then set CLICKHOUSE_URL=http://127.0.0.1:8123 and REDPANDA_HTTP_PROXY=http://127.0.0.1:8082
```

## Checks
- `GET /api/health` → `wave: A3`
- `GET /v1/admin/analytics/pipeline`
- `scripts/e2e-a3.sh`
