#!/usr/bin/env bash
# CMS-1 — ContentV1 dual-write · compatibility · demo package resolve
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"
SF="${STOREFRONT_ID:-sf_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: ten_aura" -H "x-actor-id: e2e-cms1")

echo "== PUT home dual-write ContentV1 =="
curl -sS "${H[@]}" -X PUT "$BASE/v1/admin/storefronts/$SF/pages/home" \
  -d '{"create_if_missing":true,"content":{"section_order":["hero","trust"],"hero":{"eyebrow":"CMS1","headline":"CMS-1 headline","cta":"Go","cta_href":"/"},"trust":["A","B"]},"seo":{"title":"CMS1 SEO","description":"desc"}}' \
  | tee /tmp/cms1-put.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms1-put.json"))
assert d.get("schema_version")==1, d
assert d["content_v1"]["sections"]["hero"]["props"]["headline"]=="CMS-1 headline"
assert d["content"]["hero"]["headline"]=="CMS-1 headline"
print("put ok v", d.get("version"))
PY

echo "== GET home =="
curl -sS "${H[@]}" "$BASE/v1/admin/storefronts/$SF/pages/home" | tee /tmp/cms1-get.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms1-get.json"))
assert d.get("schema_version")==1
assert "content_v1" in d and "content" in d
print("get ok")
PY

echo "== create static page =="
SLUG="cms1-about-$(date +%s)"
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/pages" \
  -d "{\"slug\":\"$SLUG\",\"title\":\"About CMS1\",\"template_key\":\"static\"}" \
  | tee /tmp/cms1-page.json >/dev/null
python3 - <<PY
import json
d=json.load(open("/tmp/cms1-page.json"))
assert d["slug"]=="$SLUG"
assert d["template_key"]=="static"
print("page", d["slug"])
PY

echo "== preview token =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/preview-token" \
  -d '{"hours":24}' | tee /tmp/cms1-preview.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms1-preview.json"))
assert d.get("token") or d.get("preview_path"), d
print("preview", d.get("preview_path") or d.get("token")[:8])
PY

echo "== compatibility-check =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/themes/compatibility-check" \
  -d '{"template_code":"live-drop"}' | tee /tmp/cms1-compat.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms1-compat.json"))
assert "supports" in d and "warnings" in d
print("compat ok", "legacy", d.get("legacy_sections"))
PY

echo "== theme packages differ (demo source) =="
curl -sS "$BASE/v1/public/theme-packages/aura-commerce-lite" > /tmp/cms1-a.json
curl -sS "$BASE/v1/public/theme-packages/lumen-fashion" > /tmp/cms1-b.json
python3 - <<'PY'
import json
a=json.load(open("/tmp/cms1-a.json"))
b=json.load(open("/tmp/cms1-b.json"))
ha=a["starter"]["home"]["sections"]["hero"]["props"]["headline"]
hb=b["starter"]["home"]["sections"]["hero"]["props"]["headline"]
assert ha!=hb, (ha,hb)
print("demo source diff ok")
PY

echo "== golive has content_schema =="
curl -sS "${H[@]}" "$BASE/v1/admin/storefronts/$SF/golive" | tee /tmp/cms1-golive.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms1-golive.json"))
items=d.get("items") or d.get("checklist") or []
if isinstance(d, dict) and not items:
    # shape may be { items: [...] }
    items = d.get("items") or []
codes=[(i.get("code") if isinstance(i, dict) else None) for i in (items if isinstance(items, list) else [])]
# also accept nested
if not any(c=="content_schema" for c in codes):
    blob=json.dumps(d)
    assert "content_schema" in blob, d
print("golive content_schema present")
PY

echo "CMS-1 OK"
