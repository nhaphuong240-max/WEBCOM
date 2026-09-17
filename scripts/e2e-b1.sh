#!/usr/bin/env bash
# B1: Channel binding + Unified Inbox — ≥2 kênh stub; thread + SLA/tag
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
T="${TENANT_ID:-ten_aura}"
SF="${STOREFRONT_ID:-sf_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-brand-id: brd_aura" -H "x-actor-id: e2e-b1")

echo "== health wave B1 =="
curl -sS "$BASE/health" | tee /tmp/b1-health.json
grep -qE '"wave":"B[12]"' /tmp/b1-health.json

echo "== social status =="
curl -sS "${H[@]}" "$BASE/v1/admin/social/status" | tee /tmp/b1-status.json
grep -qE '"wave":"B[12]"' /tmp/b1-status.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b1-status.json"))
assert "meta" in d["connectors"] and "zalo" in d["connectors"]
print("connectors", {k: v["mode"] for k,v in d["connectors"].items()})
PY

echo "== bind meta + zalo =="
curl -sS "${H[@]}" -d "{\"provider\":\"meta\",\"channel_type\":\"messenger\",\"storefront_id\":\"$SF\",\"display_name\":\"E2E Meta\",\"external_id\":\"e2e_meta_page\"}" \
  "$BASE/v1/admin/social/channels/bind" | tee /tmp/b1-meta.json
curl -sS "${H[@]}" -d "{\"provider\":\"zalo\",\"channel_type\":\"oa\",\"storefront_id\":\"$SF\",\"display_name\":\"E2E Zalo\",\"external_id\":\"e2e_zalo_oa\"}" \
  "$BASE/v1/admin/social/channels/bind" | tee /tmp/b1-zalo.json
python3 - <<'PY'
import json
m=json.load(open("/tmp/b1-meta.json"))
z=json.load(open("/tmp/b1-zalo.json"))
assert m["status"]=="connected" and m["provider"]=="meta", m
assert z["status"]=="connected" and z["provider"]=="zalo", z
open("/tmp/b1-meta-id.txt","w").write(m["id"])
open("/tmp/b1-zalo-id.txt","w").write(z["id"])
print("bound", m["id"], z["id"])
PY

echo "== list channels ≥2 =="
curl -sS "${H[@]}" "$BASE/v1/admin/social/channels" | tee /tmp/b1-channels.json
python3 - <<'PY'
import json
rows=json.load(open("/tmp/b1-channels.json"))
connected=[r for r in rows if r["status"]=="connected"]
assert len(connected)>=2, connected
providers={r["provider"] for r in connected}
assert "meta" in providers and "zalo" in providers, providers
print("channels", len(connected), providers)
PY

META=$(cat /tmp/b1-meta-id.txt)
echo "== ingest meta stub message =="
curl -sS "${H[@]}" -d "{\"channel_id\":\"$META\",\"thread_id\":\"e2e_thr_1\",\"message_id\":\"e2e_msg_1\",\"text\":\"Xin chao serum\",\"contact_name\":\"E2E Guest\"}" \
  "$BASE/v1/admin/social/webhooks/meta" | tee /tmp/b1-ingest.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b1-ingest.json"))
assert d["deduped"] is False
assert d["conversation"]["id"]
assert d["message"]["direction"]=="inbound"
open("/tmp/b1-conv-id.txt","w").write(d["conversation"]["id"])
print("conv", d["conversation"]["id"], "sla", d["conversation"]["sla_status"])
PY

echo "== ingest dedupe =="
curl -sS "${H[@]}" -d "{\"channel_id\":\"$META\",\"thread_id\":\"e2e_thr_1\",\"message_id\":\"e2e_msg_1\",\"text\":\"Xin chao serum\"}" \
  "$BASE/v1/admin/social/webhooks/meta" | tee /tmp/b1-dedupe.json
grep -q '"deduped":true' /tmp/b1-dedupe.json

CONV=$(cat /tmp/b1-conv-id.txt)
echo "== assign owner + tags =="
curl -sS "${H[@]}" -d '{"owner_id":"agent_e2e","tags":["lead","hot"],"notes":"e2e assign","status":"open"}' \
  "$BASE/v1/admin/social/inbox/$CONV/assign" | tee /tmp/b1-assign.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b1-assign.json"))
assert d["owner_id"]=="agent_e2e"
assert "lead" in d["tags"] and "hot" in d["tags"]
assert d["sla_due_at"]
print("assigned", d["owner_id"], d["tags"], d["sla_status"])
PY

echo "== reply stub =="
curl -sS "${H[@]}" -d '{"body":"Dạ shop còn hàng ạ (e2e)"}' \
  "$BASE/v1/admin/social/inbox/$CONV/reply" | tee /tmp/b1-reply.json
grep -q outbound /tmp/b1-reply.json

echo "== get thread =="
curl -sS "${H[@]}" "$BASE/v1/admin/social/inbox/$CONV" | tee /tmp/b1-thread.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/b1-thread.json"))
dirs={m["direction"] for m in d["messages"]}
assert "inbound" in dirs and "outbound" in dirs, dirs
assert d["owner_id"]=="agent_e2e"
print("messages", len(d["messages"]))
PY

echo "== zalo ingest =="
ZALO=$(cat /tmp/b1-zalo-id.txt)
curl -sS "${H[@]}" -d "{\"channel_id\":\"$ZALO\",\"thread_id\":\"e2e_zalo_1\",\"text\":\"Zalo hello\",\"contact_name\":\"Zalo Guest\"}" \
  "$BASE/v1/admin/social/webhooks/zalo" | tee /tmp/b1-zalo-in.json
grep -q '"direction":"inbound"' /tmp/b1-zalo-in.json

echo "B1 OK"
