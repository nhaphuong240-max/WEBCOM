#!/usr/bin/env bash
# Shared CMS GA hardening — blog promote · golive · cms-1/2/3 smoke · optional P2/P3
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"
SF="${STOREFRONT_ID:-sf_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: ten_aura" -H "x-actor-id: e2e-cms-ga")
RUN_P2P3="${CMS_GA_P2P3:-1}"

echo "== health =="
curl -sS "$BASE/health" | tee /tmp/cms-ga-health.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms-ga-health.json"))
assert d.get("status")=="ok"
print("health", d.get("wave"), d.get("phase"))
PY

echo "== flags / registry =="
curl -sS "${H[@]}" "$BASE/v1/admin/builder/sections" | tee /tmp/cms-ga-sec.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms-ga-sec.json"))
for k in ("cms_builder_canvas","cms_blog","cms_saved_blocks","cms_ai_copy","cms_registry_v1"):
    assert k in d, k
keys={s["key"] for s in d["sections"]}
for k in ("hero","announcement","footer_links","product_grid"):
    assert k in keys, k
print("flags+sections ok")
PY

echo "== packages ≥5 =="
curl -sS "$BASE/v1/public/theme-packages" | tee /tmp/cms-ga-pkgs.json >/dev/null
python3 - <<'PY'
import json
pkgs=json.load(open("/tmp/cms-ga-pkgs.json"))
assert len(pkgs)>=5
print("packages", len(pkgs))
PY

echo "== blog create + promote published =="
SLUG="ga-blog-$(date +%s)"
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/pages" \
  -d "{\"slug\":\"$SLUG\",\"title\":\"GA Blog\",\"template_key\":\"blog_post\"}" \
  | tee /tmp/cms-ga-blog.json >/dev/null
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/pages/$SLUG/promote" \
  -d '{"target":"published"}' | tee /tmp/cms-ga-promote.json >/dev/null
python3 - <<PY
import json
d=json.load(open("/tmp/cms-ga-promote.json"))
assert d["status"]=="published"
assert d["slug"]=="$SLUG"
assert "/blog/" in d.get("href","")
print("promoted", d["href"])
PY

curl -sS -H "x-tenant-id: ten_aura" "$BASE/v1/storefronts/$SF/blog" \
  | tee /tmp/cms-ga-sf-blog.json >/dev/null
python3 - <<PY
import json
rows=json.load(open("/tmp/cms-ga-sf-blog.json"))
assert any(r["slug"]=="$SLUG" for r in rows), rows
print("storefront blog lists published post")
PY

curl -sS -H "x-tenant-id: ten_aura" "$BASE/v1/storefronts/$SF/pages/$SLUG" \
  | tee /tmp/cms-ga-sf-page.json >/dev/null
python3 - <<PY
import json
d=json.load(open("/tmp/cms-ga-sf-page.json"))
assert d["slug"]=="$SLUG"
assert d.get("template_key")=="blog_post"
print("published page readable")
PY

echo "== golive content_schema =="
curl -sS "${H[@]}" "$BASE/v1/admin/storefronts/$SF/golive" | tee /tmp/cms-ga-golive.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms-ga-golive.json"))
blob=json.dumps(d)
codes=[]
for key in ("items","checklist","groups"):
    for it in d.get(key) or []:
        if isinstance(it, dict):
            codes.append(it.get("code"))
            for sub in it.get("items") or []:
                if isinstance(sub, dict):
                    codes.append(sub.get("code"))
if not any(c=="content_schema" for c in codes):
    assert "content_schema" in blob, d
print("golive content_schema present · can_publish=", d.get("can_publish"))
PY

echo "== CMS-1 smoke (dual-write) =="
curl -sS "${H[@]}" -X PUT "$BASE/v1/admin/storefronts/$SF/pages/home" \
  -d '{"create_if_missing":true,"content":{"section_order":["hero"],"hero":{"headline":"GA dual"}},"seo":{"title":"GA"}}' \
  | tee /tmp/cms-ga-put.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms-ga-put.json"))
assert d.get("schema_version")==1
assert d["content_v1"]["sections"]["hero"]["props"]["headline"]=="GA dual"
assert d["content"]["hero"]["headline"]=="GA dual"
print("dual-write ok")
PY

echo "== CMS-2 smoke (nav + media) =="
curl -sS "${H[@]}" -X PUT "$BASE/v1/admin/storefronts/$SF/navigation/header" \
  -d '{"items":[{"label":"GA","href":"/"}]}' >/dev/null
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/media" \
  -d '{"url":"https://example.com/ga.jpg","alt":"ga"}' | tee /tmp/cms-ga-media.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms-ga-media.json"))
assert d.get("id")
print("media", d["id"])
PY

echo "== CMS-3 smoke (ai-copy draft only) =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/builder/ai-copy" \
  -d '{"headline":"GA copy"}' | tee /tmp/cms-ga-ai.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms-ga-ai.json"))
assert d.get("draft_only") is True
assert d.get("auto_publish") is False
print("ai draft-only ok")
PY

echo "== MKT-1 smoke =="
curl -sS "$BASE/v1/public/templates/facets" >/dev/null
curl -sS "$BASE/v1/public/templates/aura-commerce-lite" | tee /tmp/cms-ga-mkt.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms-ga-mkt.json"))
assert d.get("has_package") and d.get("demo_url")
print("mkt detail ok")
PY

if [[ "$RUN_P2P3" == "1" || "$RUN_P2P3" == "true" ]]; then
  echo "== regression P2 =="
  BASE_URL="$BASE" bash "$ROOT/scripts/e2e-p2.sh"
  echo "== regression P3 =="
  BASE_URL="$BASE" bash "$ROOT/scripts/e2e-p3.sh"
else
  echo "== skip P2/P3 (CMS_GA_P2P3=0) =="
fi

echo "CMS-GA OK"
