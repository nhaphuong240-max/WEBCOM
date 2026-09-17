#!/usr/bin/env bash
# W5 smoke: health → API key → headless products → agency delivery → theme-cli
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
T="${TENANT_ID:-ten_aura}"
SF="${STOREFRONT_ID:-sf_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-actor-id: e2e-w5" -H "x-brand-id: brd_aura")

echo "== health =="
curl -sS "$BASE/health" | tee /tmp/w5-health.json
grep -q '"phase":"W5"' /tmp/w5-health.json

echo "== create api key =="
curl -sS "${H[@]}" -X POST "$BASE/v1/headless/admin/api-keys" -d "{
  \"name\":\"e2e-w5\",\"storefront_id\":\"$SF\"
}" | tee /tmp/w5-key.json
KEY=$(python3 -c 'import json;print(json.load(open("/tmp/w5-key.json"))["api_key"])')

echo "== headless meta/products =="
curl -sS -H "Authorization: Bearer $KEY" -H "x-tenant-id: $T" "$BASE/v1/headless/meta" | tee /tmp/w5-meta.json
grep -q '"api_version":"v1"' /tmp/w5-meta.json
curl -sS -H "Authorization: Bearer $KEY" -H "x-tenant-id: $T" "$BASE/v1/headless/products" | tee /tmp/w5-products.json

echo "== agency submit =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/agency/deliveries" -d "{
  \"title\":\"E2E delivery\",\"agency_name\":\"E2E Agency\"
}" | tee /tmp/w5-agd.json
grep -q '"status":"submitted"' /tmp/w5-agd.json

echo "== theme-cli =="
node packages/theme-cli/bin/ptt-theme.js lint packages/theme-cli/fixtures/sample-theme.json | tee /tmp/w5-theme.json
grep -q '"ok": true' /tmp/w5-theme.json

echo "W5 e2e OK"
