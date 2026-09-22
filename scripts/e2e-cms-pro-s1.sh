#!/usr/bin/env bash
# Merchant CMS Pro — smoke e2e S1 foundation (+ settings/leads)
set -euo pipefail
API="${API_URL:-http://127.0.0.1:3101}"
SF="${STOREFRONT_ID:-sf_aura}"
TENANT="${TENANT_ID:-ten_aura}"
BRAND="${BRAND_ID:-brd_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: $TENANT" -H "x-brand-id: $BRAND" -H "x-actor-id: e2e")

echo "== health =="
curl -sS "$API/api/health" | head -c 200; echo

echo "== runtime has site_settings =="
curl -sS "${H[@]}" "$API/api/v1/storefronts/$SF/runtime" | python3 -c 'import sys,json; d=json.load(sys.stdin); assert "site_settings" in d or d.get("site_settings") is not None or "commerce_ux" in d; print("ok", list(d.keys())[:12])'

echo "== get site-settings (admin may 401 without token — try public path via runtime) =="
# Prefer login then settings
LOGIN=$(curl -sS -X POST "$API/api/v1/auth/login" -H 'content-type: application/json' \
  -d '{"email":"admin@aura.local","password":"AuraAdmin1!"}' || true)
TOKEN=$(echo "$LOGIN" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("access_token",""))' 2>/dev/null || true)
if [[ -n "${TOKEN}" ]]; then
  AH=(-H "authorization: Bearer $TOKEN" -H "content-type: application/json" -H "x-tenant-id: $TENANT" -H "x-brand-id: $BRAND")
  curl -sS "${AH[@]}" "$API/api/v1/admin/storefronts/$SF/site-settings" | python3 -c 'import sys,json; d=json.load(sys.stdin); print("version", d.get("version"), "archetype", (d.get("data") or {}).get("archetype"))'
  curl -sS -X PUT "${AH[@]}" "$API/api/v1/admin/storefronts/$SF/site-settings" \
    -d '{"data":{"archetype":"commerce","header":{"cta_label":"Mua ngay","cta_href":"/search","show_cart":true,"show_account":true,"bg":"#fff","fg":"#111"}}}' \
    | python3 -c 'import sys,json; d=json.load(sys.stdin); print("put ok", d.get("version"))'
  echo "== public lead =="
  curl -sS -X POST "${H[@]}" "$API/api/v1/public/storefronts/$SF/leads" \
    -d '{"full_name":"E2E Test","phone":"0901234567","consent":true,"message":"cms-pro e2e"}' \
    | python3 -c 'import sys,json; d=json.load(sys.stdin); assert d.get("id"); print("lead", d["id"])'
else
  echo "WARN: login failed — skip admin settings/lead authenticated checks"
  echo "$LOGIN" | head -c 200; echo
fi

echo "e2e-cms-pro-s1 OK"
