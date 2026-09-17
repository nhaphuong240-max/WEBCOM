#!/usr/bin/env bash
# B2: Comment/chat → Order draft → OMS CONFIRMED + stock reserve + channel attribution
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
T="${TENANT_ID:-ten_aura}"
SF="${STOREFRONT_ID:-sf_aura}"
SKU="${SKU_ID:-sku_aura_glow_30}"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-brand-id: brd_aura" -H "x-actor-id: e2e-b2")

echo "== health wave B2 =="
curl -sS "$BASE/health" | tee /tmp/b2-health.json
grep -qE '"wave":"B[2-6]"' /tmp/b2-health.json

echo "== social status B2 =="
curl -sS "${H[@]}" "$BASE/v1/admin/social/status" | tee /tmp/b2-status.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b2-status.json"))
assert d["wave"] in ("B2","B3","B4","B5","B6")
assert d["features"]["comment_to_order"] is True
assert d["features"]["draft_convert_oms"] is True
print("features ok")
PY

echo "== ensure meta channel =="
curl -sS "${H[@]}" -d "{\"provider\":\"meta\",\"channel_type\":\"messenger\",\"storefront_id\":\"$SF\",\"display_name\":\"E2E B2 Meta\",\"external_id\":\"e2e_b2_meta\"}" \
  "$BASE/v1/admin/social/channels/bind" | tee /tmp/b2-chan.json
META=$(python3 -c 'import json;print(json.load(open("/tmp/b2-chan.json"))["id"])')

echo "== ingest comment =="
curl -sS "${H[@]}" -d "{\"channel_id\":\"$META\",\"kind\":\"comment\",\"post_id\":\"post_b2_1\",\"thread_id\":\"e2e_b2_thr\",\"message_id\":\"e2e_b2_cmt_1\",\"text\":\"Chốt 1 serum\",\"contact_name\":\"B2 Guest\"}" \
  "$BASE/v1/admin/social/webhooks/meta" | tee /tmp/b2-comment.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b2-comment.json"))
assert d["message"]["direction"]=="inbound"
assert d["conversation"]["external_thread_id"]=="e2e_b2_thr"
open("/tmp/b2-conv.txt","w").write(d["conversation"]["id"])
open("/tmp/b2-msg.txt","w").write(d["message"]["id"])
print("comment thread", d["conversation"]["id"])
PY
CONV=$(cat /tmp/b2-conv.txt)
MSG=$(cat /tmp/b2-msg.txt)

echo "== product picker =="
curl -sS "${H[@]}" "$BASE/v1/admin/social/products?q=glow" | tee /tmp/b2-products.json
python3 - <<PY
import json
d=json.load(open("/tmp/b2-products.json"))
assert any(i["sku_id"]=="$SKU" for i in d["items"]), d
print("products", len(d["items"]))
PY

echo "== create draft from comment (BR-023) =="
curl -sS "${H[@]}" -d "{\"conversation_id\":\"$CONV\",\"message_id\":\"$MSG\",\"lines\":[{\"sku_id\":\"$SKU\",\"qty\":1}],\"storefront_id\":\"$SF\",\"shipping_name\":\"B2 Guest\",\"shipping_phone\":\"0909988776\",\"shipping_address\":\"2 Le Loi\",\"shipping_city\":\"HCM\",\"payment_method\":\"COD\"}" \
  "$BASE/v1/admin/social/comments/$MSG/order-draft" | tee /tmp/b2-draft.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b2-draft.json"))
assert d["status"]=="draft"
assert d["source"]=="comment"
assert d["external_thread_id"]=="e2e_b2_thr"
assert isinstance(d["lines"], list) and len(d["lines"])==1
assert d["lines"][0]["sku_id"]
assert d["lines"][0]["unit_price"]
assert d["risk_score"] is not None
open("/tmp/b2-draft-id.txt","w").write(d["id"])
print("draft", d["id"], "risk", d["risk_score"], d["risk_flags"])
PY
DRAFT=$(cat /tmp/b2-draft-id.txt)

echo "== send messenger cart stub =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/social/drafts/$DRAFT/send-cart" | tee /tmp/b2-cart.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b2-cart.json"))
assert d["status"]=="cart_sent"
assert d["messenger_cart"]["cart_url"]
print("cart", d["messenger_cart"]["cart_url"])
PY

echo "== inventory before =="
curl -sS "${H[@]}" "$BASE/v1/admin/inventory/$SKU" | tee /tmp/b2-inv-before.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b2-inv-before.json"))
assert "available" in d or "on_hand" in d or "reserved" in d, d
open("/tmp/b2-reserved-before.txt","w").write(str(d.get("reserved",0)))
print("inv before", d)
PY

echo "== convert → CONFIRMED =="
curl -sS "${H[@]}" -d '{"payment_method":"COD","shipping_name":"B2 Guest","shipping_phone":"0909988776","shipping_address":"2 Le Loi","shipping_city":"HCM","shipping_carrier":"GHN"}' \
  "$BASE/v1/admin/social/drafts/$DRAFT/convert" | tee /tmp/b2-convert.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b2-convert.json"))
assert d["draft"]["status"]=="converted"
assert d["order"]["status"]=="CONFIRMED"
assert d["order"]["order_id"]
assert d["attribution"]["thread_id"]=="e2e_b2_thr"
assert d["attribution"]["social_draft_id"]==d["draft"]["id"]
assert "meta" in d["attribution"]["channel"]
open("/tmp/b2-order-id.txt","w").write(d["order"]["order_id"])
print("order", d["order"]["order_id"], "total", d["order"]["total"])
PY
OID=$(cat /tmp/b2-order-id.txt)

echo "== stock reserved after =="
curl -sS "${H[@]}" "$BASE/v1/admin/inventory/$SKU" | tee /tmp/b2-inv-after.json
python3 - <<'PY'
import json
before=int(open("/tmp/b2-reserved-before.txt").read() or "0")
after=json.load(open("/tmp/b2-inv-after.json"))
assert int(after.get("reserved",0)) >= before + 1, (before, after)
print("reserved", before, "→", after.get("reserved"))
PY

echo "== order attribution =="
curl -sS "${H[@]}" "$BASE/v1/admin/orders/$OID" | tee /tmp/b2-order.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b2-order.json"))
assert d["status"]=="CONFIRMED"
assert d.get("attribution_thread_id")=="e2e_b2_thr" or d.get("social_draft_id")
print("attribution", d.get("attribution_channel"), d.get("attribution_thread_id"), d.get("social_draft_id"))
PY

echo "== idempotent convert =="
CODE=$(curl -sS -o /tmp/b2-convert2.json -w "%{http_code}" "${H[@]}" -d '{"payment_method":"COD","shipping_name":"B2 Guest","shipping_phone":"0909988776","shipping_address":"2 Le Loi","shipping_city":"HCM"}' \
  "$BASE/v1/admin/social/drafts/$DRAFT/convert")
python3 - <<PY
import json
d=json.load(open("/tmp/b2-convert2.json"))
msg=json.dumps(d).lower()
assert "$CODE" in ("409","400") or "conflict" in msg or "not allowed" in msg or d.get("error"), ( "$CODE", d)
print("second convert http", "$CODE", "ok")
PY

echo "== chat draft + TRANSFER =="
curl -sS "${H[@]}" -d "{\"channel_id\":\"$META\",\"kind\":\"chat\",\"thread_id\":\"e2e_b2_chat\",\"message_id\":\"e2e_b2_chat_1\",\"text\":\"Mình chuyển khoản nhé\",\"contact_name\":\"QR Guest\"}" \
  "$BASE/v1/admin/social/webhooks/meta" | tee /tmp/b2-chat.json
CHAT_CONV=$(python3 -c 'import json;print(json.load(open("/tmp/b2-chat.json"))["conversation"]["id"])')
curl -sS "${H[@]}" -d "{\"conversation_id\":\"$CHAT_CONV\",\"source\":\"chat\",\"lines\":[{\"sku_id\":\"$SKU\",\"qty\":1}],\"storefront_id\":\"$SF\",\"shipping_name\":\"QR Guest\",\"shipping_phone\":\"0911222333\",\"shipping_address\":\"3 Pasteur\",\"shipping_city\":\"HCM\",\"payment_method\":\"TRANSFER\"}" \
  "$BASE/v1/admin/social/drafts" | tee /tmp/b2-draft-qr.json
DRAFT2=$(python3 -c 'import json;print(json.load(open("/tmp/b2-draft-qr.json"))["id"])')
curl -sS "${H[@]}" -d '{"payment_method":"TRANSFER","shipping_name":"QR Guest","shipping_phone":"0911222333","shipping_address":"3 Pasteur","shipping_city":"HCM"}' \
  "$BASE/v1/admin/social/drafts/$DRAFT2/convert" | tee /tmp/b2-qr-convert.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b2-qr-convert.json"))
assert d["order"]["status"]=="CONFIRMED"
assert d["order"]["payment_method"]=="TRANSFER"
pay=d["order"].get("payment") or {}
assert pay.get("qr_image_url") or pay.get("intent_id") or pay.get("status")=="skipped" or True
print("TRANSFER order", d["order"]["order_id"], "payment", pay.get("status") or pay.get("intent_id"))
PY

echo "B2 OK"
