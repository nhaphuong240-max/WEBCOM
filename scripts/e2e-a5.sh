#!/usr/bin/env bash
# A5: OpenSearch product search + outbox + PG fallback; P95 SLO
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
T="${TENANT_ID:-ten_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-brand-id: brd_aura" -H "x-actor-id: e2e-a5")

echo "== health wave A5 =="
curl -sS "$BASE/health" | tee /tmp/a5-health.json
grep -q '"wave":"A5"' /tmp/a5-health.json

echo "== search status / reindex =="
curl -sS "${H[@]}" "$BASE/v1/admin/search/status" | tee /tmp/a5-status.json
grep -q opensearch /tmp/a5-status.json
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/search/reindex" | tee /tmp/a5-reindex.json
grep -q indexed /tmp/a5-reindex.json

echo "== search serum (OS stub/live) =="
curl -sS "${H[@]}" "$BASE/v1/catalog/search?q=serum" | tee /tmp/a5-search.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/a5-search.json"))
assert d.get("meta",{}).get("source") in ("opensearch","opensearch_stub"), d.get("meta")
assert d.get("meta",{}).get("count",0) >= 1, d
assert d.get("meta",{}).get("latency_ms",999) <= 200 or d.get("meta",{}).get("within_slo") is True, d.get("meta")
titles=" ".join(i.get("title","").lower() for i in d.get("items") or [])
assert "serum" in titles or "glow" in titles, titles
print("search ok", d["meta"], "hits", len(d.get("items") or []))
PY

echo "== relevance smoke (glow) =="
curl -sS "${H[@]}" "$BASE/v1/catalog/search?q=glow" | tee /tmp/a5-glow.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/a5-glow.json"))
assert d["meta"]["count"] >= 1
assert d["items"][0]["title"].lower().find("glow") >= 0 or "serum" in d["items"][0]["title"].lower()
print("top", d["items"][0]["title"], "latency", d["meta"]["latency_ms"])
PY

echo "== status p95 =="
# warm a few queries
for i in 1 2 3 4 5; do curl -sS "${H[@]}" "$BASE/v1/catalog/search?q=serum" >/dev/null; done
curl -sS "${H[@]}" "$BASE/v1/admin/search/status" | tee /tmp/a5-p95.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/a5-p95.json"))
p95=d.get("latency_p95_ms")
slo=d.get("slo_p95_ms",200)
assert d.get("within_slo") is True or (p95 is not None and p95 <= slo), d
print("p95", p95, "slo", slo)
PY

echo "A5 OK"
