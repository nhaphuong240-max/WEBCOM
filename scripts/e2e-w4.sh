#!/usr/bin/env bash
# W4 smoke: health → analytics → experiment → AI high-risk approval → health window
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
T="${TENANT_ID:-ten_aura}"
SF="${STOREFRONT_ID:-sf_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-actor-id: e2e-w4" -H "x-brand-id: brd_aura")

echo "== health =="
curl -sS "$BASE/health" | tee /tmp/w4-health.json
grep -q '"phase":"W4"' /tmp/w4-health.json

echo "== track page_view =="
curl -sS "${H[@]}" -X POST "$BASE/v1/events" -d "{
  \"storefront_id\":\"$SF\",\"name\":\"page_view\",\"session_id\":\"ses_e2e\",
  \"landing_path\":\"/\",\"consent_state\":\"granted\"
}" | tee /tmp/w4-evt.json

echo "== analytics =="
curl -sS "${H[@]}" "$BASE/v1/admin/storefronts/$SF/analytics?days=7" | tee /tmp/w4-dash.json
grep -q '"web_contribution"' /tmp/w4-dash.json

echo "== experiment assign =="
curl -sS "${H[@]}" "$BASE/v1/storefronts/$SF/experiments/hero_cta_v1/assign?session_id=ses_e2e" | tee /tmp/w4-exp.json

echo "== AI high-risk =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/ai/actions" -d "{
  \"storefront_id\":\"$SF\",\"kind\":\"shopping_qa\",\"payload\":{\"question\":\"Có hoàn tiền không?\"}
}" | tee /tmp/w4-ai.json
AID=$(python3 -c 'import json;print(json.load(open("/tmp/w4-ai.json"))["id"])')
grep -q '"pending_approval"' /tmp/w4-ai.json
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/ai/actions/$AID/review" -d '{"decision":"approved","note":"e2e ok"}' | tee /tmp/w4-ai-ok.json
grep -q '"approved"' /tmp/w4-ai-ok.json

echo "== health window =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/health-window" -d '{}' | tee /tmp/w4-hw.json

echo "W4 e2e OK"
