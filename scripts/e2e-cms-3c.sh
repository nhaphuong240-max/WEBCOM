#!/usr/bin/env bash
# CMS-3 Could — Creator package stub · template reviews · page A/B flag
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"
SF="${STOREFRONT_ID:-sf_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: ten_aura" -H "x-actor-id: e2e-cms3c")

echo "== flags (creator / reviews / page_ab) =="
curl -sS "${H[@]}" "$BASE/v1/admin/builder/sections" | tee /tmp/cms3c-sections.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms3c-sections.json"))
for k in ("cms_creator","cms_reviews","cms_page_ab"):
    assert k in d, k
print("flags ok", {k:d[k] for k in ("cms_creator","cms_reviews","cms_page_ab")})
PY

echo "== creator validate + submit =="
PKG=$(python3 - <<'PY'
import json
files={
  "package.manifest.json": json.dumps({
    "code":"e2e-creator-pkg",
    "name":"E2E Creator",
    "version":"0.0.1",
    "supports":["hero"],
    "layouts":{"home":["hero"]},
  }),
  "starter/home.json": json.dumps({
    "schema_version":1,
    "section_order":["hero"],
    "sections":{"hero":{"type":"hero","id":"1","props":{"headline":"E2E Creator Hero"},"style":{}}},
  }),
  "starter/tokens.json": json.dumps({"accent":"#111111"}),
}
print(json.dumps({"files":files}))
PY
)
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/creator/packages/validate" -d "$PKG" \
  | tee /tmp/cms3c-validate.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms3c-validate.json"))
assert d["ok"] is True, d
assert d["package"]["code"]=="e2e-creator-pkg"
print("validate ok")
PY

curl -sS "${H[@]}" -X POST "$BASE/v1/admin/creator/packages" -d "$PKG" \
  | tee /tmp/cms3c-submit.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms3c-submit.json"))
assert d["ok"] is True and d["status"]=="validated", d
print("submit", d["id"], d["status"])
PY

curl -sS "${H[@]}" "$BASE/v1/admin/creator/packages" | tee /tmp/cms3c-list.json >/dev/null
python3 - <<'PY'
import json
rows=json.load(open("/tmp/cms3c-list.json"))
assert any(r["code"]=="e2e-creator-pkg" for r in rows), rows
print("list ok", len(rows))
PY

echo "== template reviews =="
curl -sS "$BASE/v1/public/templates" | tee /tmp/cms3c-tpls.json >/dev/null
CODE=$(python3 - <<'PY'
import json
rows=json.load(open("/tmp/cms3c-tpls.json"))
assert rows, "no templates"
print(rows[0]["code"])
PY
)
curl -sS -X POST "$BASE/v1/public/templates/$CODE/reviews" \
  -H "content-type: application/json" \
  -d '{"author_name":"E2E Reviewer","rating":5,"body":"CMS-3 Could review"}' \
  | tee /tmp/cms3c-review.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms3c-review.json"))
assert d["rating"]==5 and d["author_name"]=="E2E Reviewer", d
print("review created", d["id"])
PY

curl -sS "$BASE/v1/public/templates/$CODE/reviews" | tee /tmp/cms3c-reviews.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms3c-reviews.json"))
assert d["count"]>=1 and d["avg_rating"] is not None, d
print("reviews", d["count"], "avg", d["avg_rating"])
PY

curl -sS "$BASE/v1/public/templates/$CODE" | tee /tmp/cms3c-detail.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms3c-detail.json"))
assert "reviews" in d and d["reviews"]["count"]>=1, d.get("reviews")
print("detail embeds reviews ok")
PY

echo "== page experiment_code =="
curl -sS "${H[@]}" "$BASE/v1/admin/storefronts/$SF/pages/home" \
  | tee /tmp/cms3c-home.json >/dev/null

PUT_BODY=$(python3 - <<'PY'
import json
draft=json.load(open("/tmp/cms3c-home.json"))
content=draft.get("content_v1") or draft.get("content") or {
  "schema_version":1,
  "section_order":["hero"],
  "sections":{"hero":{"type":"hero","id":"1","props":{"headline":"AB"},"style":{}}},
}
body={"content":content,"create_if_missing":True,"experiment_code":"hero_cta_v1"}
if draft.get("version") is not None:
  body["expected_version"]=draft["version"]
print(json.dumps(body))
PY
)
curl -sS "${H[@]}" -X PUT "$BASE/v1/admin/storefronts/$SF/pages/home" -d "$PUT_BODY" \
  | tee /tmp/cms3c-home-put.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms3c-home-put.json"))
assert d.get("experiment_code")=="hero_cta_v1", d
print("page experiment_code set")
PY

curl -sS "${H[@]}" "$BASE/v1/admin/storefronts/$SF/pages/home" | tee /tmp/cms3c-home2.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms3c-home2.json"))
assert d.get("experiment_code")=="hero_cta_v1", d
print("draft has experiment_code")
PY

curl -sS "${H[@]}" "$BASE/v1/storefronts/$SF/runtime" | tee /tmp/cms3c-runtime.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms3c-runtime.json"))
home=d.get("home") or {}
assert home is not None
assert "experiment_code" in home, home
print("runtime experiment_code", home.get("experiment_code"))
PY

echo "CMS-3 Could OK"
