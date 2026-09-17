#!/usr/bin/env bash
# C3: RFM scoring + segment rules · preview · materialize
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:3001/api}"
T="${TENANT_ID:-ten_aura}"
H=(-H "content-type: application/json" -H "x-tenant-id: $T" -H "x-brand-id: brd_aura" -H "x-actor-id: e2e-c3")

echo "== health wave C3 =="
curl -sS "$BASE/health" | tee /tmp/c3-health.json
grep -qE '"wave":"C[3-6]"' /tmp/c3-health.json

echo "== crm status =="
curl -sS "${H[@]}" "$BASE/v1/admin/crm/status" | tee /tmp/c3-status.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c3-status.json"))
assert d["wave"] in ("C3", "C4", "C5", "C6")
assert d["features"]["rfm_scoring"] is True
assert d["features"]["segmentation"] is True
print("status ok")
PY

PHONE="0933$(date +%s | tail -c 7)"
EMAIL="c3_$(date +%s)@aura.local"

echo "== ensure customer with spend signal =="
curl -sS "${H[@]}" -d "{\"phone\":\"$PHONE\",\"email\":\"$EMAIL\",\"name\":\"C3 RFM Guest\",\"tags\":[\"vip\",\"c3\"],\"notes\":\"e2e-c3\",\"consent_marketing\":true,\"consent_email\":true,\"consent_sms\":true}" \
  "$BASE/v1/admin/customers/ensure" | tee /tmp/c3-ensure.json
CID=$(python3 -c 'import json;print(json.load(open("/tmp/c3-ensure.json"))["id"])')

# Bump lifetime via direct profile isn't enough for monetary — RFM uses lifetime_* fields.
# Patch notes only; refreshLifetime from orders may be 0 → still gets New/Other labels.
curl -sS "${H[@]}" -X PATCH -d '{"tags":["vip","c3","e2e"]}' \
  "$BASE/v1/admin/customers/$CID" >/tmp/c3-patch.json

echo "== RFM refresh =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/crm/rfm/refresh" | tee /tmp/c3-rfm.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c3-rfm.json"))
assert d["customers_scored"] >= 1
assert "summary" in d
print("scored", d["customers_scored"], d["summary"])
PY

curl -sS "${H[@]}" "$BASE/v1/admin/crm/rfm/summary" | tee /tmp/c3-rfm-sum.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c3-rfm-sum.json"))
assert d["total_scored"] >= 1
assert d["last_job"]
print("summary ok", d["by_segment"])
PY

curl -sS "${H[@]}" "$BASE/v1/admin/customers/$CID" | tee /tmp/c3-360.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c3-360.json"))
assert d.get("rfm") and d["rfm"].get("segment"), d.get("rfm")
assert d["rfm"]["r"] is not None
print("customer rfm", d["rfm"])
PY

SEG_NAME="e2e_c3_vip_$(date +%s)"
echo "== create segment =="
curl -sS "${H[@]}" -d "{\"name\":\"$SEG_NAME\",\"description\":\"e2e\",\"logic\":\"AND\",\"rules\":[{\"field\":\"tags\",\"op\":\"has_tag\",\"value\":\"vip\"},{\"field\":\"consent_email\",\"op\":\"eq\",\"value\":true}]}" \
  "$BASE/v1/admin/segments" | tee /tmp/c3-seg.json
SID=$(python3 -c 'import json;print(json.load(open("/tmp/c3-seg.json"))["id"])')
python3 - <<'PY'
import json
d=json.load(open("/tmp/c3-seg.json"))
assert d["logic"]=="AND"
assert len(d["rules"])==2
print("segment", d["id"])
PY

echo "== preview =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/segments/$SID/preview" | tee /tmp/c3-preview.json
python3 - <<PY
import json
d=json.load(open("/tmp/c3-preview.json"))
assert d["count"] >= 1
assert "$CID" in d["sample_ids"] or any(s["id"]=="$CID" for s in d["sample"])
print("preview", d["count"])
PY

echo "== materialize =="
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/segments/$SID/materialize" | tee /tmp/c3-mat.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c3-mat.json"))
assert d["member_count"] >= 1
print("members", d["member_count"])
PY

curl -sS "${H[@]}" "$BASE/v1/admin/segments/$SID/members" | tee /tmp/c3-members.json
python3 - <<PY
import json
rows=json.load(open("/tmp/c3-members.json"))
assert any(r["customer_id"]=="$CID" for r in rows), rows
print("member list", len(rows))
PY

curl -sS "${H[@]}" "$BASE/v1/admin/customers/$CID" | tee /tmp/c3-360b.json
python3 - <<PY
import json
d=json.load(open("/tmp/c3-360b.json"))
assert any(s["segment_id"]=="$SID" for s in d.get("segments") or []), d.get("segments")
print("360 segments ok")
PY

echo "== OR segment + list =="
curl -sS "${H[@]}" -d "{\"name\":\"${SEG_NAME}_or\",\"logic\":\"OR\",\"rules\":[{\"field\":\"rfm_segment\",\"op\":\"in\",\"value\":[\"New\",\"Other\",\"Hibernating\",\"Champions\",\"Loyal\",\"Potential\",\"AtRisk\",\"NeedAttention\"]},{\"field\":\"tags\",\"op\":\"has_tag\",\"value\":\"nope\"}]}" \
  "$BASE/v1/admin/segments" | tee /tmp/c3-seg-or.json
ORID=$(python3 -c 'import json;print(json.load(open("/tmp/c3-seg-or.json"))["id"])')
curl -sS "${H[@]}" -X POST "$BASE/v1/admin/segments/$ORID/preview" | tee /tmp/c3-or-prev.json
python3 - <<'PY'
import json
d=json.load(open("/tmp/c3-or-prev.json"))
assert d["count"] >= 1
print("OR preview", d["count"])
PY

curl -sS "${H[@]}" "$BASE/v1/admin/segments" | tee /tmp/c3-list.json
python3 - <<'PY'
import json
rows=json.load(open("/tmp/c3-list.json"))
assert len(rows) >= 2
print("segments", len(rows))
PY

echo "C3 e2e OK"
