#!/usr/bin/env bash
# A2: shipping quote + voucher + TRANSFER VietQR + webhook idempotent → paid
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
T="${TENANT_ID:-ten_aura}"
SF="${STOREFRONT_ID:-sf_aura}"
SKU="${SKU_ID:-sku_aura_glow_30}"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-brand-id: brd_aura" -H "x-actor-id: e2e-a2")
SECRET="${PAYMENT_WEBHOOK_SECRET:-ptt-dev-webhook-secret}"

echo "== health wave A2 =="
curl -sS "$BASE/health" | tee /tmp/a2-health.json
grep -q '"wave":"A2"' /tmp/a2-health.json

echo "== shipping quotes =="
curl -sS "${H[@]}" "$BASE/v1/shipping/quotes?city=HCM" | tee /tmp/a2-quotes.json
grep -q GHN /tmp/a2-quotes.json

echo "== cart =="
CART=$(curl -sS "${H[@]}" -d "{\"storefront_id\":\"$SF\"}" "$BASE/v1/carts")
echo "$CART" | tee /tmp/a2-cart.json
CART_ID=$(python3 -c 'import json;print(json.load(open("/tmp/a2-cart.json"))["id"])')
curl -sS "${H[@]}" -d "{\"sku_id\":\"$SKU\",\"qty\":1}" "$BASE/v1/carts/$CART_ID/items" >/dev/null

echo "== voucher validate =="
curl -sS "${H[@]}" -d "{\"storefront_id\":\"$SF\",\"code\":\"AURA10\",\"subtotal\":413100}" \
  "$BASE/v1/vouchers/validate" | tee /tmp/a2-voucher.json
grep -q discount_amount /tmp/a2-voucher.json

IDEM="a2-$(date +%s)"
BODY=$(python3 - <<PY
import json
print(json.dumps({
  "cart_id": "$CART_ID",
  "payment_method": "TRANSFER",
  "shipping_name": "A2 E2E",
  "shipping_phone": "0901111222",
  "shipping_address": "1 Test St",
  "shipping_city": "HCM",
  "shipping_carrier": "GHN",
  "voucher_code": "AURA10",
  "client_total": 1
}))
PY
)

echo "== checkout TRANSFER =="
curl -sS "${H[@]}" -H "Idempotency-Key: $IDEM" -d "$BODY" "$BASE/v1/checkout" | tee /tmp/a2-checkout.json
OID=$(python3 -c 'import json;print(json.load(open("/tmp/a2-checkout.json"))["order_id"])')
PI=$(python3 -c 'import json;d=json.load(open("/tmp/a2-checkout.json"));print(d.get("payment",{}).get("intent_id") or "")')
test -n "$PI"
python3 - <<'PY'
import json
d=json.load(open("/tmp/a2-checkout.json"))
assert float(d["discount"]) > 0, d
assert float(d["shipping"]) > 0, d
assert d["payment"]["qr_image_url"], d["payment"]
print("totals ok", d["subtotal"], d["discount"], d["shipping"], d["total"])
PY

echo "== webhook paid x2 (idempotent) =="
REF=$(python3 -c 'import json;print(json.load(open("/tmp/a2-checkout.json"))["payment"]["provider_ref"])')
AMT=$(python3 -c 'import json;print(json.load(open("/tmp/a2-checkout.json"))["payment"]["amount"])')
EVT="evt-a2-$OID"
PAYLOAD=$(python3 - <<PY
import json
print(json.dumps({
  "event_id": "$EVT",
  "order_id": "$OID",
  "provider_ref": "$REF",
  "amount": float("$AMT"),
  "status": "paid"
}))
PY
)
curl -sS -H "content-type: application/json" -H "x-ptt-webhook-secret: $SECRET" \
  -d "$PAYLOAD" "$BASE/v1/payments/webhooks/vietqr" | tee /tmp/a2-wh1.json
grep -q '"paid":true\|"duplicate":true' /tmp/a2-wh1.json || grep -q paid /tmp/a2-wh1.json
curl -sS -H "content-type: application/json" -H "x-ptt-webhook-secret: $SECRET" \
  -d "$PAYLOAD" "$BASE/v1/payments/webhooks/vietqr" | tee /tmp/a2-wh2.json
grep -q duplicate /tmp/a2-wh2.json

echo "== order paid =="
curl -sS "${H[@]}" "$BASE/v1/orders/$OID" | tee /tmp/a2-order.json
grep -q '"payment_status":"paid"' /tmp/a2-order.json

echo "A2 OK"
