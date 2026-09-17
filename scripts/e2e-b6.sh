#!/usr/bin/env bash
# B6: AI social reply approval + POS ≥2 locations + stock transfer
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
T="${TENANT_ID:-ten_aura}"
SF="${STOREFRONT_ID:-sf_aura}"
SKU="${SKU_ID:-sku_aura_glow_30}"
BARCODE="${BARCODE:-8938501234567}"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-brand-id: brd_aura" -H "x-actor-id: e2e-b6")

echo "== health wave B6 =="
curl -sS "$BASE/health" | tee /tmp/b6-health.json
grep -q '"wave":"B6"' /tmp/b6-health.json

echo "== social status B6 =="
curl -sS "${H[@]}" "$BASE/v1/admin/social/status" | tee /tmp/b6-social.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b6-social.json"))
assert d["wave"]=="B6"
assert d["features"]["ai_reply_approval"] is True
print("social ok")
PY

echo "== ensure channel + inbound =="
curl -sS "${H[@]}" -d "{\"provider\":\"meta\",\"channel_type\":\"messenger\",\"storefront_id\":\"$SF\",\"display_name\":\"E2E B6 Meta\",\"external_id\":\"e2e_b6_meta\"}" \
  "$BASE/v1/admin/social/channels/bind" | tee /tmp/b6-ch.json
CH=$(python3 -c 'import json;print(json.load(open("/tmp/b6-ch.json"))["id"])')
curl -sS "${H[@]}" -d "{\"channel_id\":\"$CH\",\"external_thread_id\":\"b6_thread_1\",\"contact_name\":\"Lan B6\",\"contact_handle\":\"lan_b6\",\"text\":\"Serum còn hàng không ạ?\"}" \
  "$BASE/v1/admin/social/webhooks/meta" | tee /tmp/b6-wh.json
CID=$(python3 -c 'import json;print(json.load(open("/tmp/b6-wh.json"))["conversation"]["id"])')
test -n "$CID"

echo "== AI reply suggest → pending_approval =="
curl -sS "${H[@]}" -d '{"tone":"friendly","upsell_sku_code":"AURA-GLOW-30"}' \
  "$BASE/v1/admin/social/inbox/$CID/ai-reply" | tee /tmp/b6-ai.json
AID=$(python3 - <<'PY'
import json
d=json.load(open("/tmp/b6-ai.json"))
assert d["requires_approval"] is True
a=d["ai_action"]
assert a["kind"]=="social_reply"
assert a["risk"]=="high"
assert a["status"]=="pending_approval"
assert a["output"].get("reply_draft") or a["output"].get("answer_draft")
open("/tmp/b6-aid.txt","w").write(a["id"])
print(a["id"])
PY
)

echo "== apply blocked without approval =="
CODE=$(curl -sS -o /tmp/b6-block.json -w "%{http_code}" "${H[@]}" -X POST "$BASE/v1/admin/ai/actions/$AID/apply")
test "$CODE" = "409" -o "$CODE" = "400"
echo "blocked http $CODE"

echo "== approve + apply → outbound =="
curl -sS "${H[@]}" -d '{"decision":"approved","note":"e2e-b6 social reply ok"}' \
  "$BASE/v1/admin/ai/actions/$AID/review" | tee /tmp/b6-rev.json
grep -q approved /tmp/b6-rev.json
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/ai/actions/$AID/apply" | tee /tmp/b6-apply.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b6-apply.json"))
assert d["status"]=="applied"
assert d["applied"]["message_sent"] is True
assert d["applied"]["auto_publish"] is False
print("sent", d["applied"]["message_id"])
PY

curl -sS "${H[@]}" "$BASE/v1/admin/social/inbox/$CID" | tee /tmp/b6-thread.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b6-thread.json"))
outs=[m for m in d["messages"] if m["direction"]=="outbound"]
assert outs, d["messages"]
print("outbound", outs[-1]["body"][:60])
PY

echo "== POS multi-location =="
curl -sS "${H[@]}" "$BASE/v1/admin/pos/status" | tee /tmp/b6-pos.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b6-pos.json"))
assert d["wave"]=="B6"
assert d["features"]["multi_location"] is True
assert d["features"]["stock_transfer"] is True
print("pos status ok")
PY

curl -sS "${H[@]}" -d '{"code":"store_q1","name":"AURA Store Q1","register_code":"reg_1"}' \
  "$BASE/v1/admin/pos/locations/ensure" >/tmp/b6-q1.json
curl -sS "${H[@]}" -d '{"code":"store_q3","name":"AURA Store Q3","address":"90 Le Loi","city":"HCM","register_code":"reg_1"}' \
  "$BASE/v1/admin/pos/locations/ensure" >/tmp/b6-q3.json

curl -sS "${H[@]}" "$BASE/v1/admin/pos/locations" | tee /tmp/b6-locs.json
python3 - <<'PY'
import json
rows=json.load(open("/tmp/b6-locs.json"))
assert len(rows)>=2, rows
codes=sorted(r["code"] for r in rows)
assert "store_q1" in codes and "store_q3" in codes
q1=next(r for r in rows if r["code"]=="store_q1")
q3=next(r for r in rows if r["code"]=="store_q3")
open("/tmp/b6-q1id.txt","w").write(q1["id"])
open("/tmp/b6-q3id.txt","w").write(q3["id"])
open("/tmp/b6-q1reg.txt","w").write(q1["registers"][0]["id"])
open("/tmp/b6-q3reg.txt","w").write(q3["registers"][0]["id"])
print("locations", codes)
PY
Q1=$(cat /tmp/b6-q1id.txt)
Q3=$(cat /tmp/b6-q3id.txt)
R1=$(cat /tmp/b6-q1reg.txt)
R3=$(cat /tmp/b6-q3reg.txt)

echo "== stock before transfer =="
curl -sS "${H[@]}" "$BASE/v1/admin/pos/locations/$Q1/stock" | tee /tmp/b6-st1.json
curl -sS "${H[@]}" "$BASE/v1/admin/pos/locations/$Q3/stock" | tee /tmp/b6-st3.json
SKU="$SKU" python3 - <<'PY'
import json, os
sku = os.environ["SKU"]
s1 = json.load(open("/tmp/b6-st1.json"))
s3 = json.load(open("/tmp/b6-st3.json"))

def on(rows):
    for r in rows:
        if r.get("sku_id") == sku:
            return r["on_hand_location"]
    return rows[0]["on_hand_location"] if rows else 0

print("q1", on(s1), "q3", on(s3))
assert on(s1) >= 5, "need >=5 at Q1 to transfer"
PY

echo "== transfer Q1 → Q3 =="
curl -sS "${H[@]}" -d "{\"from_location_id\":\"$Q1\",\"to_location_id\":\"$Q3\",\"sku_id\":\"$SKU\",\"qty\":5,\"reason\":\"e2e-b6\"}" \
  "$BASE/v1/admin/pos/transfers" | tee /tmp/b6-xfer.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b6-xfer.json"))
assert d["qty"]==5
assert d["from_on_hand"] is not None
print("xfer", d["from_location_code"], "→", d["to_location_code"], d["qty"])
PY

echo "== sell at both locations =="
open_or_get_shift() {
  local REG="$1" OUT="$2"
  local CODE
  CODE=$(curl -sS -o "$OUT" -w "%{http_code}" "${H[@]}" -d "{\"register_id\":\"$REG\",\"opening_cash\":100000}" \
    "$BASE/v1/admin/pos/shifts/open" || true)
  if [[ "$CODE" != "200" && "$CODE" != "201" ]]; then
    curl -sS "${H[@]}" "$BASE/v1/admin/pos/shifts/open?register_id=$REG" >"$OUT"
  fi
  python3 -c 'import json,sys;d=json.load(open(sys.argv[1]));assert d and d.get("id");print(d["id"])' "$OUT"
}

S1=$(open_or_get_shift "$R1" /tmp/b6-sh1.json)
LOOKUP=$(curl -sS "${H[@]}" "$BASE/v1/admin/pos/lookup?q=$BARCODE&location_id=$Q1")
PRICE=$(python3 -c 'import json,sys;print(json.loads(sys.argv[1])["unit_price"])' "$LOOKUP")
curl -sS "${H[@]}" -d "{\"shift_id\":\"$S1\",\"lines\":[{\"sku_id\":\"$SKU\",\"qty\":1}],\"payments\":[{\"method\":\"cash\",\"amount\":$PRICE}],\"customer_name\":\"Q1 Guest\"}" \
  "$BASE/v1/admin/pos/sales" | tee /tmp/b6-sale1.json
grep -q completed /tmp/b6-sale1.json

S3=$(open_or_get_shift "$R3" /tmp/b6-sh3.json)
curl -sS "${H[@]}" -d "{\"shift_id\":\"$S3\",\"lines\":[{\"sku_id\":\"$SKU\",\"qty\":1}],\"payments\":[{\"method\":\"cash\",\"amount\":$PRICE}],\"customer_name\":\"Q3 Guest\"}" \
  "$BASE/v1/admin/pos/sales" | tee /tmp/b6-sale3.json
grep -q completed /tmp/b6-sale3.json

echo "== transfers listed =="
curl -sS "${H[@]}" "$BASE/v1/admin/pos/transfers?limit=5" | tee /tmp/b6-xfers.json
python3 - <<'PY'
import json
rows=json.load(open("/tmp/b6-xfers.json"))
assert any(r["qty"]==5 for r in rows), rows
print("transfers", len(rows))
PY

echo "B6 OK"
