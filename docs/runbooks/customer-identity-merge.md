# Runbook — Customer identity match / merge (C2)

## Mục tiêu
Hợp nhất hồ sơ khách theo signal phone/email/social/marketplace (FR-CRM · BP-CRM) mà **không hard-delete** (BR-006).

## Khái niệm
| Entity | Vai trò |
|---|---|
| `CustomerIdentity` | Signal unique `(tenant, type, normalized_value)` |
| `CustomerMatchCandidate` | Cặp nghi trùng · `pending\|dismissed\|merged` |
| `CustomerMergeEvent` | Audit merge/unmerge + `before_snapshot` để unmerge soft |
| `Customer.status=merged` | Hồ sơ bị hấp thụ · `merged_into_id` → survivor |

## API nhanh
```bash
# Thêm identity (trùng → match candidate)
curl -X POST .../v1/admin/customers/$CID/identities \
  -d '{"type":"meta","value":"psid_x"}'

# Scan + list
curl -X POST .../v1/admin/crm/matches/scan
curl .../v1/admin/crm/matches?status=pending

# Merge / unmerge
curl -X POST .../v1/admin/crm/merge \
  -d '{"survivor_id":"...","merged_id":"...","reason":"manual"}'
curl -X POST .../v1/admin/crm/merge/$EVENT/unmerge
```

## Admin
- `/customers` — 360 + identities
- `/customers/matches` — queue + audit unmerge

## Auto-attach
Khi add identity `phone` / channel handle → link inbox `customerId=null` + guest orders theo `shippingPhone`.

## Kiểm tra
```bash
bash scripts/e2e-c2.sh
```

## Lỗi thường gặp
| Triệu chứng | Xử lý |
|---|---|
| `Identity owned by another customer` | Xem match queue · merge hoặc dismiss |
| Cannot remove primary phone/email | Clear profile field trước |
| Unmerge phone conflict | Snapshot phone bỏ trống nếu survivor đã giữ số |
