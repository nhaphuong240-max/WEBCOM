#!/usr/bin/env bash
# A3: dual-write PG → Redpanda → ClickHouse; funnel from CH ≥95%
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
T="${TENANT_ID:-ten_aura}"
SF="${STOREFRONT_ID:-sf_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-brand-id: brd_aura" -H "x-actor-id: e2e-a3")
SID="a3-sess-$(date +%s)"

echo "== health wave A3+ =="
curl -sS "$BASE/health" | tee /tmp/a3-health.json
grep -qE '"wave":"A[3-6]"' /tmp/a3-health.json

echo "== pipeline =="
curl -sS "${H[@]}" "$BASE/v1/admin/analytics/pipeline" | tee /tmp/a3-pipe.json
grep -q redpanda /tmp/a3-pipe.json
grep -q clickhouse /tmp/a3-pipe.json

echo "== dual-write funnel events =="
for name in page_view view_item add_to_cart begin_checkout purchase; do
  curl -sS "${H[@]}" -d "{\"storefront_id\":\"$SF\",\"name\":\"$name\",\"session_id\":\"$SID\",\"landing_path\":\"/\",\"consent_state\":\"granted\",\"payload\":{\"total\":396790}}" \
    "$BASE/v1/events" | tee "/tmp/a3-evt-$name.json"
  grep -q redpanda "/tmp/a3-evt-$name.json" || grep -q clickhouse "/tmp/a3-evt-$name.json"
done

echo "== dashboard CH funnel =="
sleep 0.3
curl -sS "${H[@]}" "$BASE/v1/admin/storefronts/$SF/analytics?days=7" | tee /tmp/a3-dash.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/a3-dash.json"))
cov=d["coverage"]
assert cov.get("funnel_source")=="clickhouse", cov
assert cov.get("dual_write_ok") is True, cov
assert cov.get("ch_coverage_pct",0) >= 95 or cov.get("funnel_from_ch_ok") is True, cov
funnel={f["step"]:f for f in d["funnel"]}
assert funnel["page_view"]["count"]>=1
assert funnel["purchase"]["count"]>=1
print("funnel_ok", cov.get("ch_coverage_pct"), cov.get("sink"))
lands=d.get("landings") or []
assert isinstance(lands, list)
print("landings", len(lands))
PY

echo "== landings join =="
curl -sS "${H[@]}" "$BASE/v1/admin/storefronts/$SF/analytics/landings?days=7" | tee /tmp/a3-land.json
grep -q path /tmp/a3-land.json || grep -q '\[' /tmp/a3-land.json

echo "A3 OK"
