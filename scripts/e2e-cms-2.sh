#!/usr/bin/env bash
# CMS-2 — canvas ContentV1 · nav/media · ≥5 packages · compat
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"
SF="${STOREFRONT_ID:-sf_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: ten_aura" -H "x-actor-id: e2e-cms2")

echo "== section library canvas flag =="
curl -sS "${H[@]}" "$BASE/v1/admin/builder/sections" | tee /tmp/cms2-sections.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms2-sections.json"))
assert any(s["key"]=="footer_links" for s in d["sections"]), d
assert "cms_builder_canvas" in d
print("sections ok canvas=", d.get("cms_builder_canvas"))
PY

echo "== ≥30 theme packages (MKT-2b full catalog) =="
curl -sS "$BASE/v1/public/theme-packages" | tee /tmp/cms2-pkgs.json >/dev/null
python3 - <<'PY'
import json
pkgs=json.load(open("/tmp/cms2-pkgs.json"))
codes={p["code"] for p in pkgs}
assert len(codes)>=30, codes
for c in (
    "aura-commerce-lite","harvest-fnb","atelier-luxe","lumen-fashion","live-drop",
    "forge-b2b","nest-home","pulse-gadget","cafe-corner","zen-wellness",
    "bloom-kids","spark-promo","green-basket","voyage-gear","motor-parts",
):
    assert c in codes, c
print("packages", len(codes))
PY

echo "== PUT ContentV1 reorder =="
curl -sS "${H[@]}" -X PUT "$BASE/v1/admin/storefronts/$SF/pages/home" \
  -d '{"create_if_missing":true,"content":{"schema_version":1,"section_order":["trust","hero"],"sections":{"hero":{"type":"hero","id":"sec_hero","props":{"headline":"CMS-2 reordered"},"style":{}},"trust":{"type":"trust","id":"sec_trust","props":{"items":["A","B"]},"style":{}}}},"seo":{"title":"CMS2","description":"cms2"}}' \
  | tee /tmp/cms2-put.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms2-put.json"))
assert d["content_v1"]["section_order"]==["trust","hero"], d["content_v1"]
assert d["content_v1"]["sections"]["hero"]["props"]["headline"]=="CMS-2 reordered"
print("reorder ok v", d.get("version"))
PY

echo "== media stub =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/media" \
  -d '{"url":"https://example.com/cms2.jpg","alt":"cms2"}' | tee /tmp/cms2-media.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms2-media.json"))
assert d.get("id") and d.get("url")
print("media", d["id"])
open("/tmp/cms2-media-id.txt","w").write(d["id"])
PY
MID=$(cat /tmp/cms2-media-id.txt)
curl -sS "${H[@]}" -X PUT "$BASE/v1/admin/storefronts/$SF/pages/home" \
  -d "{\"content\":{\"schema_version\":1,\"section_order\":[\"hero\"],\"sections\":{\"hero\":{\"type\":\"hero\",\"id\":\"sec_hero\",\"props\":{\"headline\":\"With media\",\"media_id\":\"$MID\"},\"style\":{}}}}}" \
  | tee /tmp/cms2-media-put.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms2-media-put.json"))
assert d["content_v1"]["sections"]["hero"]["props"].get("media_id")
print("media attached")
PY

echo "== navigation CRUD =="
curl -sS "${H[@]}" -X PUT "$BASE/v1/admin/storefronts/$SF/navigation/header" \
  -d '{"items":[{"label":"CMS2 Nav","href":"/search"},{"label":"About","href":"/p/about"}]}' \
  | tee /tmp/cms2-nav.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms2-nav.json"))
assert d["handle"]=="header"
assert any(i["label"]=="CMS2 Nav" for i in d["items"])
print("nav upsert ok")
PY
curl -sS "${H[@]}" "$BASE/v1/admin/storefronts/$SF/navigation" | tee /tmp/cms2-nav-list.json >/dev/null
python3 - <<'PY'
import json
rows=json.load(open("/tmp/cms2-nav-list.json"))
assert any(r["handle"]=="header" for r in rows)
print("nav list ok")
PY

echo "== compatibility-check =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/themes/compatibility-check" \
  -d '{"template_code":"live-drop"}' | tee /tmp/cms2-compat.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms2-compat.json"))
assert "supports" in d and "warnings" in d
print("compat ok")
PY

echo "== theme library supports =="
curl -sS "${H[@]}" "$BASE/v1/admin/storefronts/$SF/themes" | tee /tmp/cms2-themes.json >/dev/null
python3 - <<'PY'
import json
themes=json.load(open("/tmp/cms2-themes.json"))
assert isinstance(themes, list) and len(themes)>=1
t=themes[0]
assert "supports" in t or "package_version" in t
print("theme library fields ok", t.get("code"), t.get("package_version"))
PY

echo "CMS-2 OK"
