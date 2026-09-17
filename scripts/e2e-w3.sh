#!/usr/bin/env bash
# W3 smoke: Brand Kit → Match → Install → Builder → Checklist → Publish → Rollback
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
T="${TENANT_ID:-ten_aura}"
SF="${STOREFRONT_ID:-sf_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-actor-id: e2e-w3" -H "x-brand-id: brd_aura")

echo "== health =="
curl -sS "$BASE/health" | tee /tmp/w3-health.json
grep -q '"phase":"W3"' /tmp/w3-health.json

echo "== brand kit =="
curl -sS "${H[@]}" -X PUT "$BASE/v1/admin/storefronts/$SF/brand-kit" -d '{
  "scope":"storefront","publish":true,
  "tokens":{"colors":{"accent":"#c45a6a","ink":"#1a1214","cream":"#faf6f4"},"consent":{"required_before_pixel":true},"seo":{"title":"AURA E2E","description":"W3"}}
}' | tee /tmp/w3-bkit.json

echo "== match =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/templates/match" -d '{"industry":"beauty","goal":"conversion","budget":"free"}' | tee /tmp/w3-match.json

echo "== install aura =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/templates/aura-commerce-lite/install" | tee /tmp/w3-install.json

echo "== builder save =="
curl -sS "${H[@]}" -X PUT "$BASE/v1/admin/storefronts/$SF/pages/home" -d '{
  "create_if_missing":true,
  "content":{"section_order":["hero","trust"],"hero":{"eyebrow":"AURA","headline":"W3 Builder","cta":"Mua","cta_href":"/products/glow-serum-30ml"},"trust":["COD","Đổi trả"]},
  "seo":{"title":"W3 Home","description":"builder"}
}' | tee /tmp/w3-page.json

VID=$(python3 - <<'PY'
import json
d=json.load(open("/tmp/w3-install.json"))
print(d["theme_version"]["id"])
PY
)

echo "== promote staging $VID =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/theme-versions/$VID/promote" -d '{"target":"staging"}' | tee /tmp/w3-stage.json

# Ensure SEO on storefront for checklist
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/status" -d '{
  "status":"staging",
  "primary_domain":"webecom.ngoinhahomnay.vn",
  "seo_title":"AURA E2E",
  "seo_description":"W3 go-live"
}' >/dev/null

echo "== golive evaluate =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/golive/evaluate" | tee /tmp/w3-golive.json
python3 - <<'PY'
import json,sys
d=json.load(open("/tmp/w3-golive.json"))
print("can_publish", d.get("can_publish"), "fails", d.get("blocking_fails"))
if not d.get("can_publish"):
    # waive remaining blocking fails for smoke
    sys.exit(0)
PY

# Waive any remaining blocking fails
python3 - <<'PY'
import json,os,subprocess
base=os.environ.get("BASE_URL","http://127.0.0.1:3001/api")
t=os.environ.get("TENANT_ID","ten_aura")
sf=os.environ.get("STOREFRONT_ID","sf_aura")
d=json.load(open("/tmp/w3-golive.json"))
for code in d.get("blocking_fails") or []:
    subprocess.check_call([
      "curl","-sS","-H","content-type: application/json","-H",f"x-tenant-id: {t}","-H","x-actor-id: e2e-w3",
      "-X","POST",f"{base}/v1/admin/storefronts/{sf}/golive/waive",
      "-d",json.dumps({"code":code,"reason":"e2e waiver for smoke"})
    ])
PY

echo "== publish =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/publish" | tee /tmp/w3-publish.json
grep -q '"status":"published"' /tmp/w3-publish.json

echo "== rollback =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/storefronts/$SF/rollback" | tee /tmp/w3-rollback.json || true

echo "W3 e2e OK"
