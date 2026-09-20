#!/usr/bin/env bash
# MKT-2b — full 30/30 ThemePackages · unique headlines · marketplace has_package
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
BASE="${BASE%/}"

echo "== 30 packages on disk API =="
curl -sS "$BASE/v1/public/theme-packages" | tee /tmp/mkt2b-pkgs.json >/dev/null
python3 - <<'PY'
import json
pkgs=json.load(open("/tmp/mkt2b-pkgs.json"))
codes={p["code"] for p in pkgs}
assert len(codes)>=30, (len(codes), sorted(codes))
print("codes", len(codes))
PY

echo "== unique hero headlines =="
python3 - <<PY
import json, urllib.request
base="$BASE"
pkgs=json.load(open("/tmp/mkt2b-pkgs.json"))
heads=[]
for p in pkgs:
    with urllib.request.urlopen(f"{base}/v1/public/theme-packages/{p['code']}") as r:
        d=json.load(r)
    home=(d.get("starter") or {}).get("home") or {}
    hero=(home.get("sections") or {}).get("hero") or {}
    h=(hero.get("props") or {}).get("headline") or ""
    assert h, p["code"]
    heads.append((p["code"], h))
assert len(set(h for _,h in heads))==len(heads), heads
print("unique headlines", len(heads))
PY

echo "== sample marketplace has_package true =="
for CODE in bloom-kids spark-promo green-basket voyage-gear studio-agency; do
  curl -sS "$BASE/v1/public/templates/$CODE" | python3 -c "import json,sys; d=json.load(sys.stdin); assert d.get('has_package') is True, d; print('$CODE', 'ok')"
done

echo "OK e2e-mkt-2b"
