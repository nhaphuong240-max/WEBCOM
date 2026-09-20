#!/usr/bin/env bash
# MKT-1 — public marketplace facets · detail · supports · demo_url
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"

echo "== facets =="
curl -sS "$BASE/v1/public/templates/facets" | tee /tmp/mkt1-facets.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/mkt1-facets.json"))
assert "industries" in d and len(d["industries"])>=1
assert "goals" in d and "licenses" in d
print("facets", len(d["industries"]), "industries")
PY

echo "== browse license=free sort=cvr =="
curl -sS "$BASE/v1/public/templates?license=free&sort=cvr" | tee /tmp/mkt1-list.json >/dev/null
python3 - <<'PY'
import json
rows=json.load(open("/tmp/mkt1-list.json"))
assert isinstance(rows, list) and len(rows)>=1
assert all(r.get("license")=="free" for r in rows)
assert "supports" in rows[0]
print("list", len(rows), "first", rows[0]["code"], "pkg", rows[0].get("has_package"))
PY

echo "== detail aura-commerce-lite =="
curl -sS "$BASE/v1/public/templates/aura-commerce-lite" | tee /tmp/mkt1-detail.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/mkt1-detail.json"))
assert d["code"]=="aura-commerce-lite"
assert d.get("has_package") is True
assert isinstance(d.get("supports"), list) and "hero" in d["supports"]
assert d.get("demo_url") and "demo=aura-commerce-lite" in d["demo_url"]
assert d.get("trial_url") and "template=" in d["trial_url"]
assert d.get("buy_theme_url")
assert d.get("license_tier")
assert d.get("cta",{}).get("demo")
print("detail ok supports", len(d["supports"]), "demo", d["demo_url"][:48])
PY

echo "== detail harvest-fnb package =="
curl -sS "$BASE/v1/public/templates/harvest-fnb" | tee /tmp/mkt1-fnb.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/mkt1-fnb.json"))
assert d["code"]=="harvest-fnb"
assert d.get("has_package") is True
assert "footer_links" in d.get("supports",[])
print("harvest ok")
PY

echo "== MKT-2a/2b packaged samples =="
for CODE in forge-b2b nest-home bloom-kids spark-promo green-basket; do
  curl -sS "$BASE/v1/public/templates/$CODE" | tee "/tmp/mkt1-$CODE.json" >/dev/null
  python3 - <<PY
import json
d=json.load(open("/tmp/mkt1-$CODE.json"))
assert d["code"]=="$CODE"
assert d.get("has_package") is True, d
assert "demo=$CODE" in (d.get("demo_url") or "")
print("$CODE ok")
PY
done

echo "MKT-1 OK"
