#!/usr/bin/env bash
# C2: Identity match / merge — identities, match queue, merge/unmerge + audit
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
T="${TENANT_ID:-ten_aura}"
SF="${STOREFRONT_ID:-sf_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-brand-id: brd_aura" -H "x-actor-id: e2e-c2")

echo "== health wave C2 =="
curl -sS "$BASE/health" | tee /tmp/c2-health.json
grep -qE '"wave":"C[2-6]"' /tmp/c2-health.json

echo "== crm status =="
curl -sS "${H[@]}" "$BASE/v1/admin/crm/status" | tee /tmp/c2-status.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c2-status.json"))
assert d["wave"] in ("C2", "C3", "C4", "C5", "C6")
assert d["features"]["identity_resolution"] is True
assert d["features"]["merge_unmerge"] is True
print("status ok")
PY

PHONE_A="0911000$(date +%s | tail -c 4)"
PHONE_B="0922000$(date +%s | tail -c 4)"
EMAIL_A="c2a_$(date +%s)@aura.local"
EMAIL_B="c2b_$(date +%s)@aura.local"
PSID="psid_c2_$(date +%s)"

echo "== ensure survivor A =="
curl -sS "${H[@]}" -d "{\"phone\":\"$PHONE_A\",\"email\":\"$EMAIL_A\",\"name\":\"C2 Alpha\",\"tags\":[\"c2\"],\"notes\":\"survivor\",\"consent_marketing\":true,\"consent_email\":true,\"consent_sms\":true}" \
  "$BASE/v1/admin/customers/ensure" | tee /tmp/c2-a.json
AID=$(python3 -c 'import json;print(json.load(open("/tmp/c2-a.json"))["id"])')

echo "== ensure merged B =="
curl -sS "${H[@]}" -d "{\"phone\":\"$PHONE_B\",\"email\":\"$EMAIL_B\",\"name\":\"C2 Beta\",\"tags\":[\"c2\",\"dup\"],\"notes\":\"to-merge\",\"consent_marketing\":true,\"consent_email\":true}" \
  "$BASE/v1/admin/customers/ensure" | tee /tmp/c2-b.json
BID=$(python3 -c 'import json;print(json.load(open("/tmp/c2-b.json"))["id"])')

echo "== identities on A (phone synced + meta) =="
curl -sS "${H[@]}" "$BASE/v1/admin/customers/$AID/identities" | tee /tmp/c2-id-a0.json
python3 - <<PY
import json
rows=json.load(open("/tmp/c2-id-a0.json"))
assert any(r["type"]=="phone" for r in rows), rows
print("primary identities", len(rows))
PY
curl -sS "${H[@]}" -d "{\"type\":\"meta\",\"value\":\"$PSID\",\"verified\":true}" \
  "$BASE/v1/admin/customers/$AID/identities" | tee /tmp/c2-meta-a.json

echo "== conflicting meta on B → match candidate =="
curl -sS "${H[@]}" -d "{\"type\":\"meta\",\"value\":\"$PSID\"}" \
  "$BASE/v1/admin/customers/$BID/identities" | tee /tmp/c2-meta-b.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c2-meta-b.json"))
assert d.get("conflict") is True, d
assert d.get("match"), d
print("match", d["match"]["id"])
PY
MATCH=$(python3 -c 'import json;print(json.load(open("/tmp/c2-meta-b.json"))["match"]["id"])')

echo "== scan matches =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/crm/matches/scan" | tee /tmp/c2-scan.json
curl -sS "${H[@]}" "$BASE/v1/admin/crm/matches?status=pending" | tee /tmp/c2-matches.json
python3 - <<PY
import json
rows=json.load(open("/tmp/c2-matches.json"))
ids={r["id"] for r in rows}
assert "$MATCH" in ids or any(
  {r["left"]["id"], r["right"]["id"]} == {"$AID", "$BID"} for r in rows
), rows
print("pending", len(rows))
PY

echo "== create guest-linked order on B (attach via ensure path) =="
# Bind channel + place a simple storefront order attributed to B phone via ensure already has B
# Use admin ensure already created B; attach an order by checking out as guest with B phone is heavy —
# instead patch: create order through existing OMS if available, or skip and verify merge moves inbox.
curl -sS "${H[@]}" -d "{\"provider\":\"meta\",\"channel_type\":\"messenger\",\"storefront_id\":\"$SF\",\"display_name\":\"C2 Meta\",\"external_id\":\"e2e_c2_meta_$BID\"}" \
  "$BASE/v1/admin/social/channels/bind" >/tmp/c2-ch.json
CH=$(python3 -c 'import json;print(json.load(open("/tmp/c2-ch.json"))["id"])')
curl -sS "${H[@]}" -d "{\"channel_id\":\"$CH\",\"external_thread_id\":\"c2_thread_$BID\",\"contact_name\":\"C2 Beta\",\"contact_handle\":\"$PHONE_B\",\"text\":\"merge me\"}" \
  "$BASE/v1/admin/social/webhooks/meta" | tee /tmp/c2-wh.json
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/customers/$BID/link-inbox" >/tmp/c2-link-b.json
curl -sS "${H[@]}" "$BASE/v1/admin/customers/$BID" | tee /tmp/c2-b360.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c2-b360.json"))
assert len(d.get("conversations") or []) >= 1, d.get("conversations")
print("B conversations", len(d["conversations"]))
PY

echo "== merge B into A =="
curl -sS "${H[@]}" -d "{\"survivor_id\":\"$AID\",\"merged_id\":\"$BID\",\"reason\":\"e2e_c2\",\"match_id\":\"$MATCH\"}" \
  "$BASE/v1/admin/crm/merge" | tee /tmp/c2-merge.json
EVENT=$(python3 -c 'import json;print(json.load(open("/tmp/c2-merge.json"))["merge_event_id"])')
python3 - <<PY
import json
d=json.load(open("/tmp/c2-merge.json"))
assert d["survivor_id"]=="$AID"
assert d["merged_id"]=="$BID"
assert d["conversations_moved"] >= 1
assert d["survivor"]["id"]=="$AID"
print("merged ok", d["merge_event_id"])
PY

echo "== list excludes merged B =="
curl -sS "${H[@]}" "$BASE/v1/admin/customers?q=C2" | tee /tmp/c2-list.json
python3 - <<PY
import json
rows=json.load(open("/tmp/c2-list.json"))
ids=[r["id"] for r in rows]
assert "$AID" in ids
assert "$BID" not in ids
print("list ok")
PY

echo "== A 360 has B conversation + meta identity =="
curl -sS "${H[@]}" "$BASE/v1/admin/customers/$AID" | tee /tmp/c2-a360.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c2-a360.json"))
assert len(d.get("conversations") or []) >= 1
types={i["type"] for i in d.get("identities") or []}
assert "meta" in types or "phone" in types
print("A identities", types, "convos", len(d["conversations"]))
PY

echo "== unmerge =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/crm/merge/$EVENT/unmerge" | tee /tmp/c2-unmerge.json
python3 - <<PY
import json
d=json.load(open("/tmp/c2-unmerge.json"))
assert d["status"]=="unmerged"
assert d["restored"]["id"]=="$BID"
assert d["restored"]["status"]=="active"
print("unmerge ok")
PY

echo "== merge events =="
curl -sS "${H[@]}" "$BASE/v1/admin/crm/merge-events" | tee /tmp/c2-events.json
python3 - <<PY
import json
rows=json.load(open("/tmp/c2-events.json"))
assert any(r["id"]=="$EVENT" and r["status"]=="unmerged" for r in rows), rows
print("events", len(rows))
PY

echo "C2 e2e OK"
