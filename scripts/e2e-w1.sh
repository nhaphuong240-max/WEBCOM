#!/usr/bin/env bash
# E2E W1: browse → cart → checkout COD → order (idempotent)
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:3001/api}"
T="ten_aura"
SF="sf_aura"
SKU="sku_aura_glow_30"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-brand-id: brd_aura")

echo "== health =="
curl -sS "$BASE/health" | tee /tmp/w1-health.json
grep -q W1 /tmp/w1-health.json

echo "== catalog =="
curl -sS "${H[@]}" "$BASE/v1/catalog/products" | tee /tmp/w1-products.json
grep -q Glow /tmp/w1-products.json

echo "== cart =="
CART=$(curl -sS "${H[@]}" -d "{\"storefront_id\":\"$SF\"}" "$BASE/v1/carts")
echo "$CART" | tee /tmp/w1-cart.json
CART_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/w1-cart.json','utf8')).id)")
curl -sS "${H[@]}" -d "{\"sku_id\":\"$SKU\",\"qty\":1}" "$BASE/v1/carts/$CART_ID/items" | tee /tmp/w1-cart2.json

IDEM="e2e-$(date +%s)"
BODY="{\"cart_id\":\"$CART_ID\",\"payment_method\":\"COD\",\"shipping_name\":\"E2E\",\"shipping_phone\":\"0901111222\",\"shipping_address\":\"1 Test\",\"shipping_city\":\"HCM\",\"client_total\":1}"

echo "== checkout 1 =="
R1=$(curl -sS "${H[@]}" -H "Idempotency-Key: $IDEM" -d "$BODY" "$BASE/v1/checkout")
echo "$R1" | tee /tmp/w1-order1.json
OID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/w1-order1.json','utf8')).order_id)")

echo "== checkout 2 same idem =="
R2=$(curl -sS "${H[@]}" -H "Idempotency-Key: $IDEM" -d "$BODY" "$BASE/v1/checkout")
echo "$R2" | tee /tmp/w1-order2.json
OID2=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/w1-order2.json','utf8')).order_id)")
test "$OID" = "$OID2"

echo "== order get =="
curl -sS "${H[@]}" "$BASE/v1/orders/$OID" | tee /tmp/w1-order-get.json
grep -q CONFIRMED /tmp/w1-order-get.json

echo "E2E W1 OK order=$OID"
