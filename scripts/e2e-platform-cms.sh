#!/usr/bin/env bash
# CORP-CMS-2 GA — case KPI gate · rollback · nav · starters · public pages
# Also runs CMS-0 + CMS-1 scripts when present.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"
SITE="${PLATFORM_SITE_KEY:-webcom_apex}"
TENANT="${PLATFORM_TENANT_ID:-ten_platform}"
EDITOR="${PLATFORM_EDITOR_ID:-usr_platform_editor}"
APPROVER="${PLATFORM_APPROVER_ID:-usr_platform_approver}"

H_ED=(-H "content-type: application/json" -H "x-tenant-id: $TENANT" -H "x-actor-id: $EDITOR")
H_AP=(-H "content-type: application/json" -H "x-tenant-id: $TENANT" -H "x-actor-id: $APPROVER")

if [[ -x "$ROOT/scripts/e2e-platform-cms-0.sh" ]]; then
  echo "== run e2e-platform-cms-0 =="
  BASE_URL="$BASE" "$ROOT/scripts/e2e-platform-cms-0.sh"
fi
if [[ -x "$ROOT/scripts/e2e-platform-cms-1.sh" ]]; then
  echo "== run e2e-platform-cms-1 =="
  BASE_URL="$BASE" "$ROOT/scripts/e2e-platform-cms-1.sh"
fi

echo "== health =="
curl -sS "$BASE/health" >/dev/null

echo "== platform starters include CMS-2 =="
curl -sS "${H_AP[@]}" "$BASE/v1/admin/platform/starters" | tee /tmp/pcms2-starters.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms2-starters.json"))
keys={s["key"] for s in d}
for k in ("gtm_solution","gtm_industry","gtm_case","gtm_home"):
    assert k in keys, (k, keys)
print("starters ok", sorted(keys))
PY

echo "== registry CMS-2 section types =="
curl -sS "${H_AP[@]}" "$BASE/v1/admin/builder/sections?scope=platform" | tee /tmp/pcms2-sec.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms2-sec.json"))
keys={s["key"] for s in d["sections"]}
for k in ("problem_workflow","before_after_kpi","capability_matrix","case_hero","page_header","use_case_cards","kpi_row","ui_showcase"):
    assert k in keys, (k, keys)
print("cms-2 types ok")
PY

CASE_SLUG="case-studies/aura-beauty"
CASE_ENC=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$CASE_SLUG', safe=''))")

echo "== case KPI gate blocks <2 metrics =="
curl -sS "${H_ED[@]}" -X PUT "$BASE/v1/admin/platform/sites/$SITE/pages/$CASE_ENC" \
  -d '{"title":"Case bad","template_key":"gtm_case","content":{"schema_version":1,"section_order":["kpi"],"sections":{"kpi":{"type":"before_after_kpi","id":"k","props":{"metrics":[{"label":"Only one","before":"1","after":"2"}]},"style":{}}}}}' \
  >/dev/null || true
curl -sS "${H_ED[@]}" -X POST "$BASE/v1/admin/platform/sites/$SITE/pages/$CASE_ENC/transition" \
  -d '{"target":"review"}' >/dev/null || true
CODE=$(curl -sS -o /tmp/pcms2-case-gate.json -w "%{http_code}" "${H_AP[@]}" \
  -X POST "$BASE/v1/admin/platform/sites/$SITE/pages/$CASE_ENC/transition" \
  -d '{"target":"published","checklist":{"seo_ok":true,"cta_codes_ok":true,"legal_ok":true}}')
python3 - <<PY
code=int("$CODE")
assert code in (400, 422), (code, open("/tmp/pcms2-case-gate.json").read())
blob=open("/tmp/pcms2-case-gate.json").read().lower()
assert "kpi" in blob or "before" in blob or "case" in blob, blob
print("case KPI gate ok", code)
PY

echo "== publish valid case (≥2 KPI) =="
curl -sS "${H_ED[@]}" -X PUT "$BASE/v1/admin/platform/sites/$SITE/pages/$CASE_ENC" \
  -d '{"title":"Case AURA","template_key":"gtm_case","content":{"schema_version":1,"section_order":["hero","kpi"],"sections":{"hero":{"type":"case_hero","id":"h","props":{"title":"AURA e2e","customer":"AURA","industry":"beauty","hero_metric":"+28%"},"style":{}},"kpi":{"type":"before_after_kpi","id":"k","props":{"metrics":[{"label":"CVR","before":"1.8%","after":"2.3%"},{"label":"LCP","before":"3.4s","after":"1.9s"}]},"style":{}}}}}' \
  | tee /tmp/pcms2-case-put.json >/dev/null
V1=$(python3 -c "import json; print(json.load(open('/tmp/pcms2-case-put.json')).get('version',1))")
curl -sS "${H_ED[@]}" -X POST "$BASE/v1/admin/platform/sites/$SITE/pages/$CASE_ENC/transition" \
  -d '{"target":"review"}' >/dev/null
curl -sS "${H_AP[@]}" -X POST "$BASE/v1/admin/platform/sites/$SITE/pages/$CASE_ENC/transition" \
  -d '{"target":"published","checklist":{"seo_ok":true,"cta_codes_ok":true,"legal_ok":true}}' \
  | tee /tmp/pcms2-case-pub.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms2-case-pub.json"))
assert d["status"]=="published"
print("case published v", d.get("version"))
PY

echo "== second publish for rollback history =="
curl -sS "${H_ED[@]}" -X PUT "$BASE/v1/admin/platform/sites/$SITE/pages/$CASE_ENC" \
  -d '{"title":"Case AURA v2","template_key":"gtm_case","content":{"schema_version":1,"section_order":["hero","kpi"],"sections":{"hero":{"type":"case_hero","id":"h","props":{"title":"AURA e2e ROLLBACK_MARK","customer":"AURA","industry":"beauty","hero_metric":"+30%"},"style":{}},"kpi":{"type":"before_after_kpi","id":"k","props":{"metrics":[{"label":"CVR","before":"1.8%","after":"2.5%"},{"label":"LCP","before":"3.4s","after":"1.7s"}]},"style":{}}}}}' \
  >/dev/null
curl -sS "${H_ED[@]}" -X POST "$BASE/v1/admin/platform/sites/$SITE/pages/$CASE_ENC/transition" -d '{"target":"review"}' >/dev/null
curl -sS "${H_AP[@]}" -X POST "$BASE/v1/admin/platform/sites/$SITE/pages/$CASE_ENC/transition" \
  -d '{"target":"published","checklist":{"seo_ok":true,"cta_codes_ok":true,"legal_ok":true}}' \
  | tee /tmp/pcms2-case-pub2.json >/dev/null
V2=$(python3 -c "import json; print(json.load(open('/tmp/pcms2-case-pub2.json'))['version'])")

curl -sS "$BASE/v1/public/platform/$SITE/pages/$CASE_ENC" | tee /tmp/pcms2-case-pub-get.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms2-case-pub-get.json"))
assert "ROLLBACK_MARK" in json.dumps(d)
print("public has v2 mark")
PY

echo "== rollback to previous version =="
# Prefer V1 if still available; else V2-1
RB_VER=$(python3 - <<PY
v1=int("$V1")
v2=int("$V2")
print(v1 if v1 < v2 else max(1, v2 - 1))
PY
)
curl -sS "${H_AP[@]}" -X POST "$BASE/v1/admin/platform/sites/$SITE/pages/$CASE_ENC/rollback" \
  -d "{\"version\":$RB_VER}" | tee /tmp/pcms2-rb.json >/dev/null
python3 - <<PY
import json
d=json.load(open("/tmp/pcms2-rb.json"))
assert d["status"]=="published"
assert d["version"]==int("$RB_VER")
print("rollback ok to v", d["version"])
PY
curl -sS "$BASE/v1/public/platform/$SITE/pages/$CASE_ENC" | tee /tmp/pcms2-rb-pub.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms2-rb-pub.json"))
blob=json.dumps(d)
assert "ROLLBACK_MARK" not in blob, blob[:400]
print("public after rollback without mark")
PY

SOL_ENC=$(python3 -c "import urllib.parse; print(urllib.parse.quote('solutions/website', safe=''))")
IND_ENC=$(python3 -c "import urllib.parse; print(urllib.parse.quote('industries/beauty', safe=''))")

echo "== public solution + industry =="
curl -sS "$BASE/v1/public/platform/$SITE/pages/$SOL_ENC" | tee /tmp/pcms2-sol.json >/dev/null
curl -sS "$BASE/v1/public/platform/$SITE/pages/$IND_ENC" | tee /tmp/pcms2-ind.json >/dev/null
python3 - <<'PY'
import json
sol=json.load(open("/tmp/pcms2-sol.json"))
ind=json.load(open("/tmp/pcms2-ind.json"))
types=[sol["content_v1"]["sections"][k]["type"] for k in sol["content_v1"]["section_order"]]
assert "capability_matrix" in types or "problem_workflow" in types, types
assert "Omnichannel phổ biến" in json.dumps(sol, ensure_ascii=False)
assert ind["slug"].startswith("industries/")
print("solution+industry ok")
PY

echo "== platform nav upsert + public =="
curl -sS "${H_ED[@]}" -X PUT "$BASE/v1/admin/platform/sites/$SITE/nav/header" \
  -d '{"items":[{"label":"E2E Solutions","href":"/solutions/website"},{"label":"E2E Cases","href":"/case-studies"}]}' \
  >/dev/null
curl -sS "${H_ED[@]}" -X PUT "$BASE/v1/admin/platform/sites/$SITE/nav/footer" \
  -d '{"items":[{"label":"E2E Pricing","href":"/pricing"}]}' >/dev/null
curl -sS "$BASE/v1/public/platform/$SITE/nav" | tee /tmp/pcms2-nav.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms2-nav.json"))
header=d.get("header") or []
footer=d.get("footer") or []
assert any(i.get("label")=="E2E Solutions" for i in header), d
assert any(i.get("label")=="E2E Pricing" for i in footer), d
print("nav ok")
PY

echo "== revalidate endpoint smoke (optional) =="
CORP="${CORPORATE_PUBLIC_URL:-}"
if [[ -n "$CORP" ]]; then
  CODE=$(curl -sS -o /tmp/pcms2-rev.json -w "%{http_code}" -X POST "${CORP%/}/api/revalidate" \
    -H "content-type: application/json" \
    ${CORPORATE_REVALIDATE_SECRET:+-H "x-revalidate-secret: $CORPORATE_REVALIDATE_SECRET"} \
    -d '{"paths":["/","/case-studies/aura-beauty"],"tags":["platform:'"$SITE"'"]}' || echo 000)
  echo "revalidate http $CODE"
else
  echo "skip revalidate (CORPORATE_PUBLIC_URL unset)"
fi

echo "OK e2e-platform-cms (GA CORP-CMS-2)"
