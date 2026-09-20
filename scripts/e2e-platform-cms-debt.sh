#!/usr/bin/env bash
# Platform CMS debt — PC2-10 PlatformSite/owner · PC3-6 A/B · webcom_en EN content
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"
TENANT="${PLATFORM_TENANT_ID:-ten_platform}"
APPROVER="${PLATFORM_APPROVER_ID:-usr_platform_approver}"
H_AP=(-H "content-type: application/json" -H "x-tenant-id: $TENANT" -H "x-actor-id: $APPROVER")

echo "== health =="
curl -sS "$BASE/health" >/dev/null

echo "== PC2-10 PlatformSite list =="
curl -sS "${H_AP[@]}" "$BASE/v1/admin/platform/sites" | tee /tmp/pcms-debt-sites.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms-debt-sites.json"))
keys={s["site_key"] for s in d}
for k in ("webcom_apex","webcom_staging","webcom_en"):
    assert k in keys, (k, keys)
apex=next(s for s in d if s["site_key"]=="webcom_apex")
en=next(s for s in d if s["site_key"]=="webcom_en")
assert apex.get("owner")=="platform_site" or apex.get("interim_storefront_id"), apex
assert en.get("locale")=="en", en
assert en.get("interim_storefront_id")=="sf_platform_webcom_en" or "en" in str(en.get("interim_storefront_id","")), en
print("sites ok", sorted(keys))
PY

echo "== PC2-10 public home owner fields =="
curl -sS "$BASE/v1/public/platform/webcom_apex/pages/home" | tee /tmp/pcms-debt-home.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms-debt-home.json"))
assert d.get("owner_type")=="platform", d.get("owner_type")
assert d.get("owner_id")=="psite_webcom_apex", d.get("owner_id")
assert d.get("interim_storefront_id")=="sf_platform_webcom"
assert d.get("locale") in ("vi","en")
print("apex owner ok", d["owner_id"])
PY

echo "== PC3-6 experiment on home =="
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms-debt-home.json"))
assert d.get("experiment_code")=="platform_home_hero_v1", d.get("experiment_code")
exp=d.get("experiment") or {}
assert exp.get("code")=="platform_home_hero_v1", exp
vars=exp.get("variants") or []
assert len(vars)>=2, vars
keys={v.get("key") for v in vars}
assert "control" in keys and "benefit" in keys, keys
print("ab experiment ok", keys)
PY

echo "== webcom_en EN home content =="
curl -sS "$BASE/v1/public/platform/webcom_en/pages/home" | tee /tmp/pcms-debt-en.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms-debt-en.json"))
assert d.get("locale")=="en", d.get("locale")
assert d.get("owner_id")=="psite_webcom_en", d.get("owner_id")
cv=d["content_v1"]
hero=None
for k in cv["section_order"]:
    n=cv["sections"][k]
    if n["type"] in ("platform_hero","hero"):
        hero=n; break
assert hero, cv["section_order"]
h=hero["props"].get("headline","")
assert "Vietnam" in h or "Commerce" in h, h
assert "bán lẻ" not in h.lower()
print("en home ok", h[:60])
PY

echo "== webcom_en EN pricing =="
curl -sS "$BASE/v1/public/platform/webcom_en/pages/pricing" | tee /tmp/pcms-debt-en-pricing.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms-debt-en-pricing.json"))
assert d.get("locale")=="en"
cv=d["content_v1"]
types=[cv["sections"][k]["type"] for k in cv["section_order"]]
assert "pricing_table" in types, types
print("en pricing ok", types)
PY

echo "== admin draft exposes experiment_code =="
curl -sS "${H_AP[@]}" "$BASE/v1/admin/platform/sites/webcom_apex/pages/home" | tee /tmp/pcms-debt-draft.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/pcms-debt-draft.json"))
assert d.get("experiment_code")=="platform_home_hero_v1", d.get("experiment_code")
print("draft ab field ok")
PY

echo "OK e2e-platform-cms-debt"
