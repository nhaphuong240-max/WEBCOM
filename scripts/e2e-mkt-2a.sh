#!/usr/bin/env bash
# MKT-2a — ≥10 ThemePackages · unique headlines · catalog-only miss
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"

echo "== ≥10 packages (compat; full = e2e-mkt-2b) =="
curl -sS "$BASE/v1/public/theme-packages" | tee /tmp/mkt2a-pkgs.json >/dev/null
python3 - <<'PY'
import json
pkgs=json.load(open("/tmp/mkt2a-pkgs.json"))
codes={p["code"] for p in pkgs}
assert len(codes)>=10, codes
need={"forge-b2b","nest-home","pulse-gadget","cafe-corner","zen-wellness"}
assert need <= codes, (need - codes, codes)
print("codes", len(codes), sorted(need))
PY

echo "== unique hero headlines =="
python3 - <<PY
import json, urllib.request
base="$BASE"
pkgs=json.load(open("/tmp/mkt2a-pkgs.json"))
heads=[]
for p in pkgs:
    with urllib.request.urlopen(f"{base}/v1/public/theme-packages/{p['code']}") as r:
        d=json.load(r)
    # public detail shape: content_v1 or starter.home
    home = (d.get("starter") or {}).get("home") or d.get("content_v1")
    secs = (home or {}).get("sections") or {}
    hero = secs.get("hero")
    assert hero, (p["code"], list(secs.keys()), list(d.keys())[:12])
    h = (hero.get("props") or {}).get("headline") or ""
    assert h, p["code"]
    heads.append((p["code"], h))
assert len(set(h for _, h in heads))==len(heads), heads
print("unique headlines", len(heads))
PY

echo "== bloom-kids now packaged (MKT-2b) =="
curl -sS "$BASE/v1/public/theme-packages/bloom-kids" | tee /tmp/mkt2a-bloom-pkg.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/mkt2a-bloom-pkg.json"))
assert d.get("code")=="bloom-kids"
print("bloom-kids package ok")
PY

echo "== no-package code 404 (fake) =="
CODE=$(curl -sS -o /tmp/mkt2a-miss.json -w "%{http_code}" "$BASE/v1/public/theme-packages/not-a-real-theme-zzz")
python3 - <<PY
code=int("$CODE")
assert code in (404, 400), (code, open("/tmp/mkt2a-miss.json").read()[:200])
print("missing package", code)
PY

echo "== marketplace has_package flags =="
curl -sS "$BASE/v1/public/templates/forge-b2b" | tee /tmp/mkt2a-forge.json >/dev/null
curl -sS "$BASE/v1/public/templates/bloom-kids" | tee /tmp/mkt2a-bloom.json >/dev/null
python3 - <<'PY'
import json
f=json.load(open("/tmp/mkt2a-forge.json"))
b=json.load(open("/tmp/mkt2a-bloom.json"))
assert f.get("has_package") is True
assert b.get("has_package") is True
assert "hero" in (f.get("supports") or [])
print("marketplace flags ok")
PY

echo "OK e2e-mkt-2a"
