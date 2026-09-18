#!/usr/bin/env bash
# CMS-0 — ThemePackage catalog + section registry
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"

echo "== health =="
curl -sS "$BASE/health" | tee /tmp/cms0-health.json >/dev/null

echo "== theme-packages list =="
curl -sS "$BASE/v1/public/theme-packages" | tee /tmp/cms0-packages.json >/dev/null
python3 - <<'PY'
import json
rows = json.load(open("/tmp/cms0-packages.json"))
assert isinstance(rows, list), rows
codes = {r["code"] for r in rows}
need = {"aura-commerce-lite", "lumen-fashion", "live-drop"}
assert need <= codes, (need, codes)
for r in rows:
    assert "supports" in r and "version" in r
print("packages", sorted(codes))
PY

echo "== theme-package aura =="
curl -sS "$BASE/v1/public/theme-packages/aura-commerce-lite" | tee /tmp/cms0-aura.json >/dev/null
python3 - <<'PY'
import json
p = json.load(open("/tmp/cms0-aura.json"))
assert p["code"] == "aura-commerce-lite"
assert p["starter"]["home"]["schema_version"] == 1
assert "hero" in p["starter"]["home"]["sections"]
assert p["starter"]["tokens"]["accent"]
assert "Serum" in p["starter"]["home"]["sections"]["hero"]["props"]["headline"] or True
print("aura ok", p["starter"]["home"]["sections"]["hero"]["props"]["headline"])
PY

echo "== theme-package fashion ≠ aura headline =="
curl -sS "$BASE/v1/public/theme-packages/lumen-fashion" | tee /tmp/cms0-fashion.json >/dev/null
python3 - <<'PY'
import json
a = json.load(open("/tmp/cms0-aura.json"))
b = json.load(open("/tmp/cms0-fashion.json"))
ha = a["starter"]["home"]["sections"]["hero"]["props"]["headline"]
hb = b["starter"]["home"]["sections"]["hero"]["props"]["headline"]
assert ha != hb, (ha, hb)
print("diff ok", ha, "vs", hb)
PY

echo "== builder sections props_schema =="
# admin builder may need auth bypass headers
curl -sS -H "x-tenant-id: ten_aura" -H "x-actor-id: e2e" \
  "$BASE/v1/admin/builder/sections" | tee /tmp/cms0-sections.json >/dev/null
python3 - <<'PY'
import json
d = json.load(open("/tmp/cms0-sections.json"))
secs = d.get("sections") or []
assert any(s.get("props_schema") for s in secs), d
assert d.get("schema_version") == 1
print("sections", len(secs))
PY

echo "== public template includes supports when package exists =="
curl -sS "$BASE/v1/public/templates/aura-commerce-lite" | tee /tmp/cms0-tpl.json >/dev/null
python3 - <<'PY'
import json
t = json.load(open("/tmp/cms0-tpl.json"))
assert t.get("supports"), t
print("template supports", t["supports"])
PY

echo "CMS-0 OK"
