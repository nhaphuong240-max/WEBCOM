#!/usr/bin/env bash
# A6: AI Gateway — high-risk approval 100%, budget, no auto-publish/price
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
T="${TENANT_ID:-ten_aura}"
SF="${STOREFRONT_ID:-sf_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-brand-id: brd_aura" -H "x-actor-id: e2e-a6")

echo "== health wave A6 =="
curl -sS "$BASE/health" | tee /tmp/a6-health.json
grep -qE '"wave":"(A6|B[1-6])"' /tmp/a6-health.json

echo "== ai status =="
curl -sS "${H[@]}" "$BASE/v1/admin/ai/status" | tee /tmp/a6-status.json
grep -q guardrails /tmp/a6-status.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/a6-status.json"))
assert d["guardrails"]["auto_publish"] is False
assert d["guardrails"]["price_mutation"] is False
assert d["budget"]["cap_usd"] > 0
print("status ok", d["gateway"]["mode"], "budget", d["budget"])
PY

echo "== low-risk headline =="
curl -sS "${H[@]}" -d "{\"storefront_id\":\"$SF\",\"kind\":\"headline_variants\",\"payload\":{\"headline\":\"Serum Glow\"}}" \
  "$BASE/v1/admin/ai/actions" | tee /tmp/a6-low.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/a6-low.json"))
assert d["risk"]=="low" and d["status"]=="draft", d
assert d.get("cost_usd") is not None
assert "variants" in (d.get("output") or {})
open("/tmp/a6-low-id.txt","w").write(d["id"])
print("low", d["id"], d["cost_usd"])
PY

echo "== high-risk shopping_qa =="
curl -sS "${H[@]}" -d "{\"storefront_id\":\"$SF\",\"kind\":\"shopping_qa\",\"payload\":{\"question\":\"Serum có đổi trả được không?\"}}" \
  "$BASE/v1/admin/ai/actions" | tee /tmp/a6-high.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/a6-high.json"))
assert d["risk"]=="high", d
assert d["status"]=="pending_approval", d
assert d["output"].get("policy",{}).get("price_mutation") is False
open("/tmp/a6-high-id.txt","w").write(d["id"])
print("high", d["id"], d["status"])
PY

echo "== apply blocked without approval =="
HID=$(cat /tmp/a6-high-id.txt)
CODE=$(curl -sS -o /tmp/a6-apply-block.json -w "%{http_code}" "${H[@]}" -X POST "$BASE/v1/admin/ai/actions/$HID/apply")
test "$CODE" = "409" -o "$CODE" = "400"
grep -qi approval /tmp/a6-apply-block.json || grep -qi conflict /tmp/a6-apply-block.json || true
echo "blocked http $CODE"

echo "== review + apply =="
curl -sS "${H[@]}" -d '{"decision":"approved","note":"e2e-a6 approved draft only"}' \
  "$BASE/v1/admin/ai/actions/$HID/review" | tee /tmp/a6-review.json
grep -q approved /tmp/a6-review.json
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/ai/actions/$HID/apply" | tee /tmp/a6-apply.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/a6-apply.json"))
assert d["status"]=="applied", d
assert d["applied"]["auto_publish"] is False
assert d["applied"]["price_changed"] is False
print("applied ok")
PY

echo "== high-risk coverage 100% =="
curl -sS "${H[@]}" "$BASE/v1/admin/ai/status" | tee /tmp/a6-cov.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/a6-cov.json"))
c=d["high_risk_coverage"]
assert c["ok"] is True and c["coverage_pct"] >= 100, c
print("coverage", c)
PY

echo "A6 OK"
