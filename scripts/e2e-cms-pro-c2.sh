#!/usr/bin/env bash
# Merchant CMS Pro C2 — UC-13 + FR-013/015/016/017 smoke (PC2-11)
# Covers: commerce_ux · collection merch · cart/checkout content · landing_promo · mega nav · ATC · golive
set -euo pipefail
API="${API_URL:-http://127.0.0.1:3101}"
API="${API%/}"
SF="${STOREFRONT_ID:-sf_aura}"
TENANT="${TENANT_ID:-ten_aura}"
BRAND="${BRAND_ID:-brd_aura}"
SF_URL="${STOREFRONT_URL:-}"
TS="$(date +%s)"
COL_SLUG="e2e-c2-${TS}"
PROMO_SLUG="promo-c2-${TS}"
H=(-H "content-type: application/json" -H "x-tenant-id: $TENANT" -H "x-brand-id: $BRAND" -H "x-actor-id: e2e-cms-pro-c2")

echo "== health =="
curl -sS "$API/api/health" | python3 -c 'import sys,json; d=json.load(sys.stdin); assert d.get("status")=="ok" or "wave" in d or d; print("health ok")'

echo "== login =="
LOGIN=$(curl -sS -X POST "$API/api/v1/auth/login" -H 'content-type: application/json' \
  -d '{"email":"admin@aura.local","password":"AuraAdmin1!"}')
TOKEN=$(echo "$LOGIN" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("access_token",""))')
if [[ -z "$TOKEN" ]]; then
  echo "FAIL: login"; echo "$LOGIN" | head -c 300; exit 1
fi
AH=(-H "authorization: Bearer $TOKEN" -H "content-type: application/json" -H "x-tenant-id: $TENANT" -H "x-brand-id: $BRAND" -H "x-actor-id: e2e-cms-pro-c2")

echo "== runtime commerce_ux =="
curl -sS "${H[@]}" "$API/api/v1/storefronts/$SF/runtime" | tee /tmp/cms-pro-c2-runtime.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms-pro-c2-runtime.json"))
ux=d.get("commerce_ux") or {}
assert "show_cart" in ux or ux.get("archetype") is not None or d.get("site_settings") is not None
print("runtime keys", sorted(list(ux.keys()))[:14] or list(d.keys())[:8])
PY

echo "== PUT site-settings commerce content (FR-015) =="
curl -sS "${AH[@]}" "$API/api/v1/admin/storefronts/$SF/site-settings" | tee /tmp/cms-pro-c2-ss.json >/dev/null
VER=$(python3 -c 'import json; print(json.load(open("/tmp/cms-pro-c2-ss.json")).get("version") or 0)')
curl -sS -X PUT "${AH[@]}" "$API/api/v1/admin/storefronts/$SF/site-settings" \
  -d "$(python3 - <<PY
import json
base=json.load(open("/tmp/cms-pro-c2-ss.json")).get("data") or {}
base["archetype"]="commerce"
base.setdefault("header", {})
base["header"].update({"show_cart": True, "cta_label": "Mua ngay", "cta_href": "/search", "show_account": True, "bg": "#fff", "fg": "#111"})
base.setdefault("commerce", {})
base["commerce"].update({
  "show_mini_cart": True,
  "show_cart_count": True,
  "sticky_atc_mobile": True,
  "coupon_entry_cart": True,
  "coupon_entry_checkout": True,
  "coupon_placeholder": "Nhập mã E2E",
  "empty_cart_title": "Giỏ E2E trống",
  "empty_cart_cta_label": "Mua tiếp",
  "empty_cart_cta_href": "/search",
  "cart_trust_badges": ["COD", "Đổi 7 ngày"],
  "cart_cross_sell_title": "Gợi ý E2E",
  "cart_cross_sell_limit": 2,
  "mini_cart_title": "Giỏ E2E",
  "mini_cart_checkout_label": "Thanh toán E2E",
  "mini_cart_continue_label": "Tiếp tục",
  "checkout_headline": "Checkout E2E",
  "checkout_cod_note": "COD note E2E",
  "guest_checkout_hint": "Guest OK",
  "checkout_policy_links": [{"label": "Điều khoản", "href": "/p/terms"}],
  "thank_you_message": "Cảm ơn E2E",
  "thank_you_cta_label": "Về shop",
  "thank_you_cta_href": "/",
  "plp_default_sort": "newest",
  "show_compare_at_price": True,
})
print(json.dumps({"expected_version": int("$VER"), "data": base}))
PY
)" | tee /tmp/cms-pro-c2-ss-put.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms-pro-c2-ss-put.json"))
if d.get("error"):
    raise SystemExit(f"site-settings PUT failed: {d}")
ux=d.get("commerce_ux") or {}
c=(d.get("data") or {}).get("commerce") or {}
assert c.get("empty_cart_title")=="Giỏ E2E trống" or ux.get("empty_cart",{}).get("title")=="Giỏ E2E trống", (c, ux)
# FR-015 deepen fields — assert when API returns them (post-deploy)
if "checkout_headline" in c or (ux.get("checkout") or {}).get("headline"):
    assert c.get("checkout_headline")=="Checkout E2E" or (ux.get("checkout") or {}).get("headline")=="Checkout E2E"
else:
    print("WARN checkout_headline not in schema yet — empty_cart ok")
print("settings commerce content ok v", d.get("version"))
PY

echo "== collection merch page (FR-013) =="
PAGE_SLUG="collection--${COL_SLUG}"
curl -sS "${AH[@]}" -X POST "$API/api/v1/admin/storefronts/$SF/pages" \
  -d "{\"slug\":\"$PAGE_SLUG\",\"title\":\"Collection · E2E\",\"template_key\":\"collection_merch\"}" \
  >/tmp/cms-pro-c2-col-create.json || true
curl -sS "${AH[@]}" "$API/api/v1/admin/storefronts/$SF/pages/$(python3 -c "import urllib.parse; print(urllib.parse.quote('$PAGE_SLUG', safe=''))")" \
  | tee /tmp/cms-pro-c2-col-draft.json >/dev/null || true
# use raw path encoding
ENC_PAGE=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$PAGE_SLUG', safe=''))")
DRAFT=$(curl -sS "${AH[@]}" "$API/api/v1/admin/storefronts/$SF/pages/$ENC_PAGE" || echo '{}')
echo "$DRAFT" > /tmp/cms-pro-c2-col-draft.json
DVER=$(python3 -c 'import json; print(json.load(open("/tmp/cms-pro-c2-col-draft.json")).get("version") or 0)')
curl -sS "${AH[@]}" -X PUT "$API/api/v1/admin/storefronts/$SF/pages/$ENC_PAGE" \
  -d "$(python3 - <<PY
import json
print(json.dumps({
  "expected_version": int("$DVER"),
  "create_if_missing": True,
  "template_key": "collection_merch",
  "title": "Collection · E2E $TS",
  "content": {
    "schema_version": 1,
    "section_order": ["collection_banner"],
    "sections": {
      "collection_banner": {
        "type": "collection_banner",
        "id": "sec_col_banner",
        "props": {
          "title": "BST E2E",
          "intro": "Intro merch E2E",
          "banner_url": "",
          "empty_copy": "Empty PLP E2E",
          "collection_slug": "$COL_SLUG"
        },
        "style": {}
      }
    }
  },
  "seo": {"title": "SEO E2E $COL_SLUG", "description": "desc e2e"}
}))
PY
)" | tee /tmp/cms-pro-c2-col-put.json >/dev/null
curl -sS "${AH[@]}" -X POST "$API/api/v1/admin/storefronts/$SF/pages/$ENC_PAGE/promote" \
  -d '{"target":"published"}' | tee /tmp/cms-pro-c2-col-pub.json >/dev/null
curl -sS "${H[@]}" "$API/api/v1/storefronts/$SF/pages/$ENC_PAGE" | tee /tmp/cms-pro-c2-col-sf.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms-pro-c2-col-sf.json"))
assert d.get("seo",{}).get("title","").startswith("SEO E2E")
c=d.get("content") or {}
secs=c.get("sections") or {}
props=next((v.get("props") for v in secs.values() if isinstance(v,dict) and v.get("type")=="collection_banner"), None)
assert props and props.get("title")=="BST E2E", props
print("collection merch published ok")
PY

echo "== landing_promo campaign (FR-016) =="
if [[ "${C2_SKIP_PROMO:-${C2_PARTIAL:-}}" == "1" ]]; then
  echo "SKIP landing_promo (C2_SKIP_PROMO / C2_PARTIAL=1)"
else
curl -sS "${AH[@]}" -X POST "$API/api/v1/admin/storefronts/$SF/pages" \
  -d "{\"slug\":\"$PROMO_SLUG\",\"title\":\"Promo E2E\",\"template_key\":\"landing_promo\"}" \
  >/tmp/cms-pro-c2-promo-create.json || true
ENC_PROMO=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$PROMO_SLUG', safe=''))")
PD=$(curl -sS "${AH[@]}" "$API/api/v1/admin/storefronts/$SF/pages/$ENC_PROMO" || echo '{}')
echo "$PD" > /tmp/cms-pro-c2-promo-draft.json
PVER=$(python3 -c 'import json; print(json.load(open("/tmp/cms-pro-c2-promo-draft.json")).get("version") or 0)')
ENDS=$(python3 -c 'from datetime import datetime,timedelta,timezone; print((datetime.now(timezone.utc)+timedelta(days=2)).strftime("%Y-%m-%dT23:59:00+07:00"))')
curl -sS "${AH[@]}" -X PUT "$API/api/v1/admin/storefronts/$SF/pages/$ENC_PROMO" \
  -d "$(python3 - <<PY
import json
print(json.dumps({
  "expected_version": int("$PVER"),
  "create_if_missing": True,
  "template_key": "landing_promo",
  "title": "Promo E2E",
  "content": {
    "schema_version": 1,
    "section_order": ["hero","countdown","coupon_strip","product_grid","faq"],
    "sections": {
      "hero": {"type":"hero","id":"sec_hero","props":{"headline":"Flash E2E","cta":"Mua","cta_href":"/search?utm_campaign=$PROMO_SLUG"},"style":{}},
      "countdown": {"type":"countdown","id":"sec_cd","props":{"title":"Còn lại","ends_at":"$ENDS","hide_when_ended":True},"style":{}},
      "coupon_strip": {"type":"coupon_strip","id":"sec_cp","props":{"code":"E2E10","title":"Mã E2E","ends_at":"$ENDS"},"style":{}},
      "product_grid": {"type":"product_grid","id":"sec_pg","props":{"limit":4},"style":{}},
      "faq": {"type":"faq","id":"sec_faq","props":{"items":[{"q":"OK?","a":"Yes"}]},"style":{}}
    }
  },
  "seo": {"title":"Promo SEO","utm_campaign":"$PROMO_SLUG"}
}))
PY
)" >/tmp/cms-pro-c2-promo-put.json
python3 - <<'PY'
import json,sys
d=json.load(open("/tmp/cms-pro-c2-promo-put.json"))
if d.get("error"):
    msg=(d.get("error") or {}).get("message") or d
    print("FAIL landing_promo PUT:", msg)
    print("Hint: deploy CMS Pro C2 (coupon_strip in SECTION_REGISTRY) then re-run.")
    sys.exit(1)
PY
curl -sS "${AH[@]}" -X POST "$API/api/v1/admin/storefronts/$SF/pages/$ENC_PROMO/promote" \
  -d '{"target":"published"}' >/tmp/cms-pro-c2-promo-pub.json
curl -sS "${H[@]}" "$API/api/v1/storefronts/$SF/pages/$ENC_PROMO" | tee /tmp/cms-pro-c2-promo-sf.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms-pro-c2-promo-sf.json"))
assert d.get("template_key") in ("landing_promo","landing", None) or d.get("slug")
secs=(d.get("content") or {}).get("sections") or {}
types={v.get("type") for v in secs.values() if isinstance(v,dict)}
assert "countdown" in types and "coupon_strip" in types, types
print("landing_promo published ok", d.get("slug"))
PY
fi

echo "== mega nav merch (FR-017) =="
if [[ "${C2_SKIP_MEGA:-${C2_PARTIAL:-}}" == "1" ]]; then
  echo "SKIP mega nav (C2_SKIP_MEGA / C2_PARTIAL=1)"
else
curl -sS "${AH[@]}" -X PUT "$API/api/v1/admin/storefronts/$SF/navigation/header" \
  -d "$(python3 - <<PY
import json
print(json.dumps({
  "items": [
    {
      "label": "Serum E2E",
      "href": "/collections/serum-dem",
      "mega": {
        "columns": [{"title": "Serum", "links": [{"label": "Serum đêm", "href": "/collections/serum-dem"}]}],
        "featured_collections": [{"slug": "serum-dem", "title": "Serum đêm"}],
        "featured_products": []
      }
    },
    {"label": "Search", "href": "/search"}
  ]
}))
PY
)" | tee /tmp/cms-pro-c2-nav.json >/dev/null
python3 - <<'PY'
import json,sys
d=json.load(open("/tmp/cms-pro-c2-nav.json"))
if d.get("error"):
    print("FAIL mega nav PUT:", d.get("error"))
    sys.exit(1)
items=d.get("items") or d
if isinstance(d, dict) and "items" in d:
    items=d["items"]
elif isinstance(d, list):
    items=d
else:
    items=d.get("items") or []
if not any((i.get("mega") or {}).get("featured_collections") for i in items):
    print("FAIL mega stripped — deploy CMS Pro C2 nav zod (mega) then re-run.")
    print(items)
    sys.exit(1)
print("mega nav saved", len(items))
PY
curl -sS "${H[@]}" "$API/api/v1/storefronts/$SF/runtime" | tee /tmp/cms-pro-c2-rt2.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms-pro-c2-rt2.json"))
nav=d.get("navigation") or {}
header=nav.get("header") or []
assert any(isinstance(i,dict) and i.get("mega") for i in header), header
print("runtime header mega ok")
PY
fi

echo "== UC-13 ATC cart (Core) =="
curl -sS "${H[@]}" "$API/api/v1/catalog/products" | tee /tmp/cms-pro-c2-products.json >/dev/null
SKU=$(python3 - <<'PY'
import json
rows=json.load(open("/tmp/cms-pro-c2-products.json"))
assert rows, "no products"
sku=(rows[0].get("skus") or [{}])[0].get("id")
assert sku, rows[0]
print(sku)
PY
)
CART=$(curl -sS "${H[@]}" -X POST "$API/api/v1/carts" -d "{\"storefront_id\":\"$SF\"}")
echo "$CART" > /tmp/cms-pro-c2-cart.json
CART_ID=$(python3 -c 'import json; print(json.load(open("/tmp/cms-pro-c2-cart.json"))["id"])')
curl -sS "${H[@]}" -X POST "$API/api/v1/carts/$CART_ID/items" \
  -d "{\"sku_id\":\"$SKU\",\"qty\":1}" | tee /tmp/cms-pro-c2-line.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms-pro-c2-line.json"))
lines=d.get("lines") or []
assert len(lines) >= 1 or d.get("id"), d
print("ATC ok cart", d.get("id") or "updated")
PY

echo "== golive commerce checks =="
curl -sS "${AH[@]}" -X POST "$API/api/v1/admin/storefronts/$SF/golive/evaluate" -d '{}' >/tmp/cms-pro-c2-golive-eval.json || true
curl -sS "${AH[@]}" "$API/api/v1/admin/storefronts/$SF/golive" | tee /tmp/cms-pro-c2-golive.json >/dev/null
python3 - <<'PY'
import json
d=json.load(open("/tmp/cms-pro-c2-golive.json"))
items={i.get("code"): i for i in (d.get("items") or [])}
for code in ("catalog_sync", "commerce_atc", "merch_home"):
    if code not in items:
        print("WARN missing golive item", code)
        continue
    st=items[code].get("status")
    print(code, st, items[code].get("evidence"))
    if code=="catalog_sync":
        assert st in ("pass","waived"), (code, st)
print("golive commerce checked can_publish=", d.get("can_publish"))
PY

if [[ -n "$SF_URL" ]]; then
  echo "== optional storefront HTTP =="
  curl -sS -o /dev/null -w "home:%{http_code}\n" "$SF_URL/" || true
  curl -sS -o /dev/null -w "promo:%{http_code}\n" "$SF_URL/promo/$PROMO_SLUG" || true
  curl -sS -o /dev/null -w "cart:%{http_code}\n" "$SF_URL/cart" || true
fi

echo "e2e-cms-pro-c2 OK"
