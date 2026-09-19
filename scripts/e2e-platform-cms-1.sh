#!/usr/bin/env bash
# CORP-CMS-1 — registry · cta_code · announce ends_at · dual-path smoke
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"
SITE="${PLATFORM_SITE_KEY:-webcom_apex}"
TENANT="${PLATFORM_TENANT_ID:-ten_platform}"
EDITOR="${PLATFORM_EDITOR_ID:-usr_platform_editor}"
APPROVER="${PLATFORM_APPROVER_ID:-usr_platform_approver}"

H_ED=(-H "content-type: application/json" -H "x-tenant-id: $TENANT" -H "x-actor-id: $EDITOR")
H_AP=(-H "content-type: application/json" -H "x-tenant-id: $TENANT" -H "x-actor-id: $APPROVER")

echo "== health =="
curl -sS "$BASE/health" >/dev/null

echo "== builder sections scope=platform =="
curl -sS "${H_AP[@]}" "$BASE/v1/admin/builder/sections?scope=platform" | tee /tmp/pcms1-sec.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms1-sec.json"))
keys={s["key"] for s in d["sections"]}
for k in ("platform_hero","announce_bar","pricing_table","catalog_intro","cta_band","faq"):
    assert k in keys, (k, keys)
assert "product_grid" not in keys
assert "cta_templates" in d.get("platform_cta_codes", [])
print("platform registry ok", len(keys))
PY

echo "== reject unknown cta_code =="
CODE=$(curl -sS -o /tmp/pcms1-bad.json -w "%{http_code}" "${H_ED[@]}" \
  -X PUT "$BASE/v1/admin/platform/sites/$SITE/pages/home" \
  -d '{"content":{"schema_version":1,"section_order":["cta"],"sections":{"cta":{"type":"cta_band","id":"x","props":{"headline":"x","cta":{"label":"Go","href":"/","cta_code":"cta_HACKED"}},"style":{}}}}}')
python3 - <<PY
code=int("$CODE")
assert code in (400, 422), (code, open("/tmp/pcms1-bad.json").read())
print("unknown cta_code rejected", code)
PY

echo "== publish homepage with valid CTA =="
MARK="pcms1-$(date +%s)"
curl -sS "${H_ED[@]}" -X PUT "$BASE/v1/admin/platform/sites/$SITE/pages/home" \
  -d "{\"title\":\"Home\",\"content\":{\"schema_version\":1,\"section_order\":[\"hero\",\"cta\"],\"sections\":{\"hero\":{\"type\":\"platform_hero\",\"id\":\"h\",\"props\":{\"headline\":\"$MARK\",\"sub\":\"e2e\",\"primary_cta\":{\"label\":\"Templates\",\"href\":\"/templates\",\"cta_code\":\"cta_templates\"}},\"style\":{}},\"cta\":{\"type\":\"cta_band\",\"id\":\"c\",\"props\":{\"headline\":\"Go\",\"cta\":{\"label\":\"Demo\",\"href\":\"/#lead\",\"cta_code\":\"cta_book_demo\"}},\"style\":{}}}}}" \
  >/dev/null
curl -sS "${H_ED[@]}" -X POST "$BASE/v1/admin/platform/sites/$SITE/pages/home/transition" \
  -d '{"target":"review"}' >/dev/null
curl -sS "${H_AP[@]}" -X POST "$BASE/v1/admin/platform/sites/$SITE/pages/home/transition" \
  -d '{"target":"published","checklist":{"seo_ok":true,"cta_codes_ok":true,"legal_ok":true}}' \
  | tee /tmp/pcms1-pub.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms1-pub.json"))
assert d["status"]=="published"
print("published ok")
PY

curl -sS "$BASE/v1/public/platform/$SITE/pages/home" | tee /tmp/pcms1-pub-get.json >/dev/null
python3 - <<PY
import json
d=json.load(open("/tmp/pcms1-pub-get.json"))
assert "$MARK" in json.dumps(d)
print("public has headline")
PY

echo "== announce_bar ends_at past filtered =="
PAST=$(python3 - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc)-timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ"))
PY
)
curl -sS "${H_ED[@]}" -X PUT "$BASE/v1/admin/platform/sites/$SITE/pages/home" \
  -d "{\"content\":{\"schema_version\":1,\"section_order\":[\"announce\",\"hero\"],\"sections\":{\"announce\":{\"type\":\"announce_bar\",\"id\":\"a\",\"props\":{\"text\":\"EXPIRED\",\"ends_at\":\"$PAST\",\"cta_code\":\"cta_trial\"},\"style\":{}},\"hero\":{\"type\":\"platform_hero\",\"id\":\"h\",\"props\":{\"headline\":\"Keep\",\"primary_cta\":{\"label\":\"T\",\"href\":\"/templates\",\"cta_code\":\"cta_templates\"}},\"style\":{}}}}}" \
  >/dev/null
curl -sS "${H_ED[@]}" -X POST "$BASE/v1/admin/platform/sites/$SITE/pages/home/transition" -d '{"target":"review"}' >/dev/null
curl -sS "${H_AP[@]}" -X POST "$BASE/v1/admin/platform/sites/$SITE/pages/home/transition" \
  -d '{"target":"published","checklist":{"seo_ok":true,"cta_codes_ok":true,"legal_ok":true}}' >/dev/null
curl -sS "$BASE/v1/public/platform/$SITE/pages/home" | tee /tmp/pcms1-ann.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms1-ann.json"))
blob=json.dumps(d)
assert "EXPIRED" not in blob, d
assert "announce" not in (d.get("content_v1") or {}).get("section_order", [])
print("expired announce filtered")
PY

echo "== templates page still has catalog intro slug =="
curl -sS "$BASE/v1/public/platform/$SITE/pages/templates" | tee /tmp/pcms1-tpl.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms1-tpl.json"))
assert d["slug"]=="templates"
types=[d["content_v1"]["sections"][k]["type"] for k in d["content_v1"]["section_order"]]
assert "catalog_intro" in types
print("catalog intro ok")
PY

echo "== public theme-packages regression =="
curl -sS "$BASE/v1/public/theme-packages" | python3 -c 'import json,sys; assert len(json.load(sys.stdin))>=5; print("packages ok")'

echo "OK e2e-platform-cms-1"
