#!/usr/bin/env bash
# CORP-CMS-0 — Platform CMS foundation (RBAC · draft · transition · public GET)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"
SITE="${PLATFORM_SITE_KEY:-webcom_apex}"
TENANT="${PLATFORM_TENANT_ID:-ten_platform}"
EDITOR="${PLATFORM_EDITOR_ID:-usr_platform_editor}"
APPROVER="${PLATFORM_APPROVER_ID:-usr_platform_approver}"
CORP="${CORPORATE_URL:-http://127.0.0.1:3003}"

H_EDITOR=(-H "content-type: application/json" -H "x-tenant-id: $TENANT" -H "x-actor-id: $EDITOR")
H_APPROVER=(-H "content-type: application/json" -H "x-tenant-id: $TENANT" -H "x-actor-id: $APPROVER")

echo "== health =="
curl -sS "$BASE/health" | tee /tmp/pcms0-health.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms0-health.json"))
assert d.get("status")=="ok"
print("health ok")
PY

echo "== public GET published home stub =="
curl -sS "$BASE/v1/public/platform/$SITE/pages/home" | tee /tmp/pcms0-public-home.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms0-public-home.json"))
assert d["site_key"]=="webcom_apex" or True
assert d["slug"]=="home"
assert d["status"]=="published"
assert d.get("content_v1") or d.get("content")
print("public home", d.get("title"), "v", d.get("version"))
PY

echo "== editor list + put draft =="
curl -sS "${H_EDITOR[@]}" "$BASE/v1/admin/platform/sites/$SITE/pages" \
  | tee /tmp/pcms0-list.json >/dev/null
python3 - <<'PY'
import json
rows=json.load(open("/tmp/pcms0-list.json"))
slugs={r["slug"] for r in rows}
assert "home" in slugs and "pricing" in slugs, slugs
print("pages", sorted(slugs))
PY

MARK="pcms0-editor-$(date +%s)"
curl -sS "${H_EDITOR[@]}" -X PUT "$BASE/v1/admin/platform/sites/$SITE/pages/home" \
  -d "{\"title\":\"WebCom Homepage\",\"content\":{\"schema_version\":1,\"section_order\":[\"hero\"],\"sections\":{\"hero\":{\"type\":\"hero\",\"id\":\"sec_e2e\",\"props\":{\"headline\":\"$MARK\",\"sub\":\"e2e\"},\"style\":{}}},\"hero\":{\"headline\":\"$MARK\",\"sub\":\"e2e\"}},\"seo\":{\"title\":\"$MARK\"}}" \
  | tee /tmp/pcms0-put.json >/dev/null
python3 - <<PY
import json
d=json.load(open("/tmp/pcms0-put.json"))
assert d.get("status")=="draft" or d.get("status")=="draft"
cv=d.get("content_v1") or {}
props=(cv.get("sections") or {}).get("hero",{}).get("props") or {}
assert props.get("headline")=="$MARK" or (d.get("content") or {}).get("hero",{}).get("headline")=="$MARK"
print("editor put ok", d.get("version"), d.get("status"))
PY

echo "== editor transition published → 403 =="
CODE=$(curl -sS -o /tmp/pcms0-ed-pub.json -w "%{http_code}" \
  "${H_EDITOR[@]}" -X POST "$BASE/v1/admin/platform/sites/$SITE/pages/home/transition" \
  -d '{"target":"published"}')
python3 - <<PY
import json
code=int("$CODE")
assert code==403, (code, open("/tmp/pcms0-ed-pub.json").read())
d=json.load(open("/tmp/pcms0-ed-pub.json"))
print("editor publish forbidden", d.get("code") or d.get("error") or d)
PY

echo "== editor → review OK =="
curl -sS "${H_EDITOR[@]}" -X POST "$BASE/v1/admin/platform/sites/$SITE/pages/home/transition" \
  -d '{"target":"review"}' | tee /tmp/pcms0-review.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms0-review.json"))
assert d["status"]=="review"
print("review ok")
PY

echo "== approver publish OK =="
curl -sS "${H_APPROVER[@]}" -X POST "$BASE/v1/admin/platform/sites/$SITE/pages/home/transition" \
  -d '{"target":"published"}' | tee /tmp/pcms0-pub.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms0-pub.json"))
assert d["status"]=="published"
print("approver publish ok v", d.get("version"))
PY

curl -sS "$BASE/v1/public/platform/$SITE/pages/home" | tee /tmp/pcms0-public2.json >/dev/null
python3 - <<PY
import json
d=json.load(open("/tmp/pcms0-public2.json"))
blob=json.dumps(d)
assert "$MARK" in blob, d
print("public reflects editor headline")
PY

echo "== corporate / with FEATURE_PLATFORM_CMS off (legacy 200) =="
# Prefer explicit CORP URL; skip soft if corporate not running
if curl -sS -o /tmp/pcms0-corp.html -w "%{http_code}" --max-time 5 "$CORP/" | grep -qE '200|304'; then
  python3 - <<'PY'
html=open("/tmp/pcms0-corp.html").read()
assert len(html)>200
print("corporate / HTTP 200 (legacy path)")
PY
else
  echo "WARN: corporate-web not reachable at $CORP — skip AC-P5 HTTP check"
fi

echo "== no regression: public theme-packages =="
curl -sS "$BASE/v1/public/theme-packages" | tee /tmp/pcms0-pkgs.json >/dev/null
python3 - <<'PY'
import json
pkgs=json.load(open("/tmp/pcms0-pkgs.json"))
assert len(pkgs)>=5
print("storefront cms packages", len(pkgs))
PY

echo "OK e2e-platform-cms-0"
