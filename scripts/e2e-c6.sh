#!/usr/bin/env bash
# C6: NBA + service recovery — tickets, playbooks, NBA, AI care/nba approval
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
T="${TENANT_ID:-ten_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-brand-id: brd_aura" -H "x-actor-id: e2e-c6")

echo "== health wave C6 =="
curl -sS "$BASE/health" | tee /tmp/c6-health.json
grep -qE '"wave":"C6"' /tmp/c6-health.json

echo "== cx status =="
curl -sS "${H[@]}" "$BASE/v1/admin/cx/status" | tee /tmp/c6-status.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c6-status.json"))
assert d["wave"]=="C6"
assert d["features"]["service_tickets"] is True
assert d["features"]["nba_recommend"] is True
assert d["features"]["no_auto_refund"] is True
print("status ok")
PY

TS=$(date +%s)
PHONE="0901$(echo $TS | tail -c 7)"
EMAIL="c6_${TS}@aura.local"

echo "== ensure customer =="
curl -sS "${H[@]}" -d "{\"phone\":\"$PHONE\",\"email\":\"$EMAIL\",\"name\":\"C6 Care\",\"tags\":[\"c6\"],\"consent_email\":true,\"consent_marketing\":true}" \
  "$BASE/v1/admin/customers/ensure" | tee /tmp/c6-cus.json
CID=$(python3 -c 'import json;print(json.load(open("/tmp/c6-cus.json"))["id"])')

echo "== create fail_payment ticket =="
curl -sS "${H[@]}" -d "{\"customer_id\":\"$CID\",\"subject\":\"Payment failed stub\",\"description\":\"e2e\",\"playbook_code\":\"fail_payment\",\"priority\":\"high\",\"evidence\":{\"payment_status\":\"failed\"}}" \
  "$BASE/v1/admin/cx/tickets" | tee /tmp/c6-tkt.json
TID=$(python3 -c 'import json;print(json.load(open("/tmp/c6-tkt.json"))["id"])')

echo "== rule NBA suggest =="
curl -sS "${H[@]}" -d "{\"customer_id\":\"$CID\",\"ticket_id\":\"$TID\"}" \
  "$BASE/v1/admin/cx/nba/suggest" | tee /tmp/c6-nba.json
NBA=$(python3 -c 'import json;print(json.load(open("/tmp/c6-nba.json"))["recommendations"][0]["id"])')
python3 - <<'PY'
import json
d=json.load(open("/tmp/c6-nba.json"))
assert len(d["recommendations"]) >= 1
acts={r["action"] for r in d["recommendations"]}
assert "voucher" in acts or "care" in acts
print("nba", acts)
PY

echo "== apply NBA (no refund) =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/cx/nba/$NBA/apply" | tee /tmp/c6-apply-nba.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c6-apply-nba.json"))
assert d["status"]=="applied"
assert d["applied"]["refund"] is False
print("applied", d["applied"]["side_effects"])
PY

echo "== AI care_reply → pending_approval =="
curl -sS "${H[@]}" -d '{"tone":"empathetic"}' \
  "$BASE/v1/admin/cx/tickets/$TID/care-reply" | tee /tmp/c6-care.json
AID=$(python3 -c 'import json;print(json.load(open("/tmp/c6-care.json"))["ai_action"]["id"])')
python3 - <<'PY'
import json
d=json.load(open("/tmp/c6-care.json"))
assert d["requires_approval"] is True
assert d["ai_action"]["status"]=="pending_approval"
assert d["ai_action"]["kind"]=="care_reply"
assert d["ai_action"]["risk"]=="high"
print("care pending", d["ai_action"]["id"])
PY

echo "== approve + apply care (draft only) =="
curl -sS "${H[@]}" -X POST -d '{"decision":"approved","note":"e2e-c6-care"}' \
  "$BASE/v1/admin/ai/actions/$AID/review" | tee /tmp/c6-rev.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c6-rev.json"))
assert d["status"]=="approved"
print("approved")
PY
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/ai/actions/$AID/apply" | tee /tmp/c6-apply-care.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c6-apply-care.json"))
assert d["status"]=="applied"
applied=d.get("applied") or {}
assert applied.get("refund") is False
assert "care_reply_draft_saved" in (applied.get("side_effects") or [])
print("care apply ok", applied["side_effects"])
PY

curl -sS "${H[@]}" "$BASE/v1/admin/cx/tickets/$TID" | tee /tmp/c6-tkt2.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c6-tkt2.json"))
assert d.get("care_reply_draft")
print("draft saved", d["care_reply_draft"][:60])
PY

echo "== AI nba_suggest → approve → apply materialize =="
curl -sS "${H[@]}" -d "{\"customer_id\":\"$CID\",\"ticket_id\":\"$TID\"}" \
  "$BASE/v1/admin/cx/nba/suggest-ai" | tee /tmp/c6-nba-ai.json
AID2=$(python3 -c 'import json;print(json.load(open("/tmp/c6-nba-ai.json"))["ai_action"]["id"])')
python3 - <<'PY'
import json
d=json.load(open("/tmp/c6-nba-ai.json"))
assert d["ai_action"]["kind"]=="nba_suggest"
assert d["ai_action"]["status"]=="pending_approval"
print("nba_suggest pending")
PY

curl -sS "${H[@]}" -X POST -d '{"decision":"approved","note":"e2e-nba"}' \
  "$BASE/v1/admin/ai/actions/$AID2/review" | tee /tmp/c6-rev2.json
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/ai/actions/$AID2/apply" | tee /tmp/c6-apply-nba-ai.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c6-apply-nba-ai.json"))
assert d["status"]=="applied"
applied=d.get("applied") or {}
assert applied.get("refund") is False
print("nba ai apply", applied.get("side_effects") or applied)
PY

echo "== customer 360 recovery =="
curl -sS "${H[@]}" "$BASE/v1/admin/customers/$CID" | tee /tmp/c6-360.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c6-360.json"))
assert "recovery" in d
assert len(d["recovery"]["tickets"]) >= 1
assert len(d["recovery"]["nba"]) >= 1
print("360 recovery ok", len(d["recovery"]["tickets"]), "tickets", len(d["recovery"]["nba"]), "nba")
PY

echo "== playbook scan =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/cx/playbooks/scan" | tee /tmp/c6-scan.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c6-scan.json"))
assert "created_count" in d
print("scan", d["created_count"])
PY

echo "C6 e2e OK"
