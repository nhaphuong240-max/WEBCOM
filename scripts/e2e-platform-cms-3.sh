#!/usr/bin/env bash
# CORP-CMS-3 — resources gated · tour · ROI · schedule · locale stub
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"
SITE="${PLATFORM_SITE_KEY:-webcom_apex}"
TENANT="${PLATFORM_TENANT_ID:-ten_platform}"
EDITOR="${PLATFORM_EDITOR_ID:-usr_platform_editor}"
APPROVER="${PLATFORM_APPROVER_ID:-usr_platform_approver}"

H_ED=(-H "content-type: application/json" -H "x-tenant-id: $TENANT" -H "x-actor-id: $EDITOR")
H_AP=(-H "content-type: application/json" -H "x-tenant-id: $TENANT" -H "x-actor-id: $APPROVER")
H_PUB=(-H "content-type: application/json" -H "x-tenant-id: $TENANT")

echo "== health =="
curl -sS "$BASE/health" >/dev/null

echo "== CMS-3 starters =="
curl -sS "${H_AP[@]}" "$BASE/v1/admin/platform/starters" | tee /tmp/pcms3-starters.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms3-starters.json"))
keys={s["key"] for s in d}
for k in ("gtm_resources","gtm_resource_detail","gtm_tour","gtm_case"):
    assert k in keys, (k, keys)
print("starters ok")
PY

echo "== registry CMS-3 types =="
curl -sS "${H_AP[@]}" "$BASE/v1/admin/builder/sections?scope=platform" | tee /tmp/pcms3-sec.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms3-sec.json"))
keys={s["key"] for s in d["sections"]}
for k in ("resource_list","gated_form","tour_steps","roi_assumptions"):
    assert k in keys, (k, keys)
assert "cta_resource_unlock" in d.get("platform_cta_codes", [])
print("cms-3 types ok")
PY

echo "== public resources + tour + case ROI =="
curl -sS "$BASE/v1/public/platform/$SITE/pages/resources" | tee /tmp/pcms3-res.json >/dev/null
curl -sS "$BASE/v1/public/platform/$SITE/pages/tour" | tee /tmp/pcms3-tour.json >/dev/null
CASE_ENC=$(python3 -c "import urllib.parse; print(urllib.parse.quote('case-studies/aura-beauty', safe=''))")
curl -sS "$BASE/v1/public/platform/$SITE/pages/$CASE_ENC" | tee /tmp/pcms3-case.json >/dev/null
python3 - <<'PY'
import json
res=json.load(open("/tmp/pcms3-res.json"))
tour=json.load(open("/tmp/pcms3-tour.json"))
case=json.load(open("/tmp/pcms3-case.json"))
rt=[res["content_v1"]["sections"][k]["type"] for k in res["content_v1"]["section_order"]]
assert "resource_list" in rt and "gated_form" in rt, rt
tt=[tour["content_v1"]["sections"][k]["type"] for k in tour["content_v1"]["section_order"]]
assert "tour_steps" in tt, tt
ct=[case["content_v1"]["sections"][k]["type"] for k in case["content_v1"]["section_order"]]
assert "roi_assumptions" in ct, ct
print("public pages ok")
PY

echo "== lead unlock_href =="
curl -sS "${H_PUB[@]}" -X POST "$BASE/v1/leads" \
  -d '{"name":"E2E","email":"e2e-cms3@webcom.local","consent":true,"cta_code":"cta_resource_unlock","landing_slug":"/resources","unlock_href":"/resources/golive-checklist"}' \
  | tee /tmp/pcms3-lead.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms3-lead.json"))
assert d.get("unlock_href")=="/resources/golive-checklist"
assert d.get("unlocked") is True
print("lead unlock ok", d["id"])
PY

echo "== reject bad unlock_href =="
CODE=$(curl -sS -o /tmp/pcms3-lead-bad.json -w "%{http_code}" "${H_PUB[@]}" -X POST "$BASE/v1/leads" \
  -d '{"name":"E2E","email":"e2e-bad@webcom.local","consent":true,"unlock_href":"javascript:alert(1)"}')
python3 - <<PY
code=int("$CODE")
assert code in (400, 422), (code, open("/tmp/pcms3-lead-bad.json").read())
print("bad unlock rejected", code)
PY

echo "== schedule publish (future) =="
FUTURE=$(python3 - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc)+timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ"))
PY
)
curl -sS "${H_ED[@]}" -X PUT "$BASE/v1/admin/platform/sites/$SITE/pages/tour" \
  -d '{"title":"Tour scheduled","content":{"schema_version":1,"section_order":["header"],"sections":{"header":{"type":"page_header","id":"h","props":{"title":"Scheduled tour MARK"},"style":{}}}}}' \
  >/dev/null
curl -sS "${H_ED[@]}" -X POST "$BASE/v1/admin/platform/sites/$SITE/pages/tour/transition" \
  -d '{"target":"review"}' >/dev/null
curl -sS "${H_AP[@]}" -X POST "$BASE/v1/admin/platform/sites/$SITE/pages/tour/transition" \
  -d "{\"target\":\"published\",\"checklist\":{\"seo_ok\":true,\"cta_codes_ok\":true,\"legal_ok\":true},\"publish_at\":\"$FUTURE\"}" \
  | tee /tmp/pcms3-sched.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms3-sched.json"))
assert d["status"]=="scheduled", d
assert "publish_at" in d
print("scheduled ok", d["publish_at"])
PY

echo "== flush-scheduled (none due yet) =="
curl -sS "${H_AP[@]}" -X POST "$BASE/v1/admin/platform/sites/$SITE/flush-scheduled" \
  | tee /tmp/pcms3-flush.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms3-flush.json"))
assert d["count"]==0
print("flush noop ok")
PY

echo "== restore tour from starter =="
curl -sS "${H_AP[@]}" "$BASE/v1/admin/platform/starters/gtm_tour" | tee /tmp/pcms3-tour-starter.json >/dev/null
python3 - <<'PY'
import json
s=json.load(open("/tmp/pcms3-tour-starter.json"))
open("/tmp/pcms3-tour-put.json","w").write(json.dumps({
  "title": s["title"],
  "template_key": "gtm_tour",
  "content": s["content"],
}))
PY
curl -sS "${H_ED[@]}" -X PUT "$BASE/v1/admin/platform/sites/$SITE/pages/tour" \
  -d @/tmp/pcms3-tour-put.json >/dev/null
curl -sS "${H_ED[@]}" -X POST "$BASE/v1/admin/platform/sites/$SITE/pages/tour/transition" -d '{"target":"review"}' >/dev/null
curl -sS "${H_AP[@]}" -X POST "$BASE/v1/admin/platform/sites/$SITE/pages/tour/transition" \
  -d '{"target":"published","checklist":{"seo_ok":true,"cta_codes_ok":true,"legal_ok":true}}' >/dev/null

echo "== locale stub webcom_en =="
curl -sS "${H_AP[@]}" "$BASE/v1/admin/platform/sites" | tee /tmp/pcms3-sites.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms3-sites.json"))
keys={s["site_key"] for s in d}
assert "webcom_en" in keys
en=next(s for s in d if s["site_key"]=="webcom_en")
assert en.get("locale")=="en"
print("webcom_en locale stub ok")
PY

echo "OK e2e-platform-cms-3"
