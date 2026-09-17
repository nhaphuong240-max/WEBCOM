# OpenSearch catalog (A5)

## Path
Product create/update → `search_outbox` → indexer → OpenSearch → `GET /v1/catalog/search` hydrate PG.

## Modes
| Mode | When |
|---|---|
| `opensearch_stub` | Default (in-memory index) |
| `opensearch` (live) | `OPENSEARCH_URL` set + healthy |
| `postgres` | Fallback when OS disabled/down or no q/collection |

## Flags
- `FEATURE_OPENSEARCH` (default on)
- `FEATURE_SEARCH_BACKFILL` — index active products on boot
- `SEARCH_P95_SLO_MS` (default 200)

## Local live
```bash
docker compose --profile search up -d
# OPENSEARCH_URL=http://127.0.0.1:9200
```

## Checks
- `scripts/e2e-a5.sh`
- `GET /v1/admin/search/status` → `within_slo`
