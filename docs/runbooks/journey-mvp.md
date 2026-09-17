# Runbook — Journey MVP (C5)

## Mục tiêu
Orchestration tối thiểu: **Trigger → Condition → Delay → Action → Exit** với guard consent (BR-011), frequency cap, conflict 1 active / customer / category (FR-JRN · BP-JOURNEY).

## Step kinds
| Kind | Config |
|---|---|
| `trigger` | `{ type: manual\|… }` — pass-through khi enroll |
| `condition` | `{ field, op, value }` — fail → exit |
| `delay` | `{ minutes }` — `waiting` until elapsed |
| `action` | `tag` · `voucher_stub` · `send_email\|sms\|zns\|messenger` (stub) |
| `exit` | complete enrollment |

## Guards khi enroll
1. Journey `status=active`
2. `required_consent` khớp customer (thiếu → enrollment `blocked`)
3. Frequency: ≤ `frequency_cap_count` enrollments / `frequency_cap_days` cho cùng journey
4. Conflict: không có enrollment `active|waiting` khác cùng `category`

## API
```bash
curl -X POST .../v1/admin/journeys -d '{...}'
curl -X PATCH .../v1/admin/journeys/$JID -d '{"status":"active"}'
curl -X POST .../v1/admin/journeys/$JID/enroll -d '{"customer_id":"..."}'
curl -X POST .../v1/admin/journeys/drain -d '{"limit":50}'
curl .../v1/admin/journey-enrollments/$EID/logs
```

## Admin
- `/journeys` — create / activate / enroll / drain
- `/journeys/:id` — steps + enrollments
- `/journeys/:id/enrollments/:enrollmentId` — run logs

## Verify
```bash
bash scripts/e2e-c5.sh
```

## Lỗi thường gặp
| Triệu chứng | Xử lý |
|---|---|
| Consent blocked | Bật consent kênh trên customer |
| Frequency cap | Đợi window hoặc tăng cap |
| Category conflict | Complete/exit enrollment cũ hoặc đổi category |
| Send skipped | Thiếu consent kênh — xem run log |
