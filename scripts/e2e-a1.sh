#!/usr/bin/env bash
# A1 smoke: 30 playbooks + domain connect + host resolve + go-live domain_ssl
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
T="${TENANT_ID:-ten_aura}"
SF="${STOREFRONT_ID:-sf_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-actor-id: e2e-a1" -H "x-brand-id: brd_aura")

echo "== health wave A1 =="
curl -sS "$BASE/health" | tee /tmp/a1-health.json
grep -q '"wave":"A1"' /tmp/a1-health.json

echo "== templates count >= 30 =="
curl -sS "${H[@]}" "$BASE/v1/admin/templates?sort=cvr" | tee /tmp/a1-templates.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/a1-templates.json"))
assert isinstance(d, list), d
assert len(d) >= 30, len(d)
assert all("cvr" in (t.get("scores") or {}) for t in d[:3])
print("templates", len(d))
PY

echo "== install playbook returned =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/templates/live-drop/install" | tee /tmp/a1-install.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/a1-install.json"))
pb=d.get("playbook") or []
assert len(pb) >= 4, pb
print("playbook steps", len(pb))
PY

echo "== add custom domain + verify =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/domains" -d '{
  "hostname":"shop-a1-e2e.example.test","kind":"custom"
}' | tee /tmp/a1-dom.json
DOM=$(python3 - <<'PY'
import json
print(json.load(open("/tmp/a1-dom.json"))["id"])
PY
)
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/domains/$DOM/verify" | tee /tmp/a1-verify.json
grep -q '"dns_status":"verified"' /tmp/a1-verify.json
grep -q '"tls_status":"active"' /tmp/a1-verify.json

echo "== set primary + host resolve =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/domains/$DOM/primary" | tee /tmp/a1-primary.json
curl -sS "$BASE/v1/public/host-resolve?host=shop-a1-e2e.example.test" | tee /tmp/a1-resolve.json
grep -q "$SF" /tmp/a1-resolve.json
grep -q "$T" /tmp/a1-resolve.json

echo "== subdomain resolve aura.ptt.shop =="
curl -sS "$BASE/v1/public/host-resolve?host=aura.ptt.shop" | tee /tmp/a1-resolve-sub.json
grep -q "$SF" /tmp/a1-resolve-sub.json

echo "== golive domain_ssl =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/golive/evaluate" >/dev/null
curl -sS "${H[@]}" "$BASE/v1/admin/storefronts/$SF/golive" | tee /tmp/a1-golive.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/a1-golive.json"))
item=next(i for i in d["items"] if i["code"]=="domain_ssl")
assert item["status"] in ("pass","waived"), item
print("domain_ssl", item["status"], item.get("evidence"))
PY

echo "A1 OK"
