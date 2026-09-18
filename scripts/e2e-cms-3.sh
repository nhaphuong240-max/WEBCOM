#!/usr/bin/env bash
# CMS-3 — SRS sections · blog · saved blocks · AI copy draft
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"
SF="${STOREFRONT_ID:-sf_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: ten_aura" -H "x-actor-id: e2e-cms3")

echo "== section registry CMS-3 types =="
curl -sS "${H[@]}" "$BASE/v1/admin/builder/sections" | tee /tmp/cms3-sections.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms3-sections.json"))
keys={s["key"] for s in d["sections"]}
for k in ("announcement","testimonial","video","product_grid","footer_links"):
    assert k in keys, k
assert d.get("cms_blog") is True or d.get("cms_blog") is False
assert "cms_saved_blocks" in d and "cms_ai_copy" in d
print("sections+flags ok")
PY

echo "== create blog_post =="
SLUG="cms3-post-$(date +%s)"
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/pages" \
  -d "{\"slug\":\"$SLUG\",\"title\":\"CMS3 Post\",\"template_key\":\"blog_post\"}" \
  | tee /tmp/cms3-blog.json >/dev/null
python3 - <<PY
import json
d=json.load(open("/tmp/cms3-blog.json"))
assert d["slug"]=="$SLUG"
assert d["template_key"]=="blog_post"
print("blog page", d["slug"])
PY

curl -sS "${H[@]}" "$BASE/v1/admin/storefronts/$SF/pages?template_key=blog_post" \
  | tee /tmp/cms3-blog-list.json >/dev/null
python3 - <<PY
import json
rows=json.load(open("/tmp/cms3-blog-list.json"))
assert any(p["slug"]=="$SLUG" for p in rows), rows
print("blog list ok", len(rows))
PY

echo "== saved blocks =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/saved-blocks" \
  -d '{"name":"Hero CMS3","section_type":"hero","content":{"type":"hero","id":"sec_blk","props":{"headline":"Saved hero"},"style":{}}}' \
  | tee /tmp/cms3-block.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms3-block.json"))
assert d["id"] and d["section_type"]=="hero"
open("/tmp/cms3-block-id.txt","w").write(d["id"])
print("block", d["id"])
PY
BID=$(cat /tmp/cms3-block-id.txt)
curl -sS "${H[@]}" "$BASE/v1/admin/storefronts/$SF/saved-blocks" | tee /tmp/cms3-blocks.json >/dev/null
python3 - <<PY
import json
rows=json.load(open("/tmp/cms3-blocks.json"))
assert any(b["id"]=="$BID" for b in rows)
print("blocks list", len(rows))
PY

echo "== AI copy draft only =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/builder/ai-copy" \
  -d '{"headline":"Serum CMS3","field":"headline"}' | tee /tmp/cms3-ai.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms3-ai.json"))
assert d.get("draft_only") is True
assert d.get("auto_publish") is False
assert d.get("policy",{}).get("auto_publish") is False
assert isinstance(d.get("variants"), list) and len(d["variants"])>=1
print("ai copy ok", d["variants"][0][:40])
PY

echo "== announcement section PUT =="
curl -sS "${H[@]}" -X PUT "$BASE/v1/admin/storefronts/$SF/pages/home" \
  -d '{"create_if_missing":true,"content":{"schema_version":1,"section_order":["announcement","hero"],"sections":{"announcement":{"type":"announcement","id":"sec_a","props":{"text":"CMS3 sale"},"style":{}},"hero":{"type":"hero","id":"sec_h","props":{"headline":"CMS3 home"},"style":{}}}}}' \
  | tee /tmp/cms3-put.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms3-put.json"))
assert "announcement" in d["content_v1"]["section_order"]
print("announcement ok")
PY

echo "== storefront blog list =="
curl -sS -H "x-tenant-id: ten_aura" "$BASE/v1/storefronts/$SF/blog" | tee /tmp/cms3-sf-blog.json >/dev/null
python3 - <<'PY'
import json
rows=json.load(open("/tmp/cms3-sf-blog.json"))
assert isinstance(rows, list)
print("sf blog", len(rows), "(published only)")
PY

echo "CMS-3 OK"
