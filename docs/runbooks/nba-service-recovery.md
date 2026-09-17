# Runbook — NBA + Service Recovery (C6)

## Mục tiêu
Service ticket + playbook triggers + Next Best Action + AI `care_reply` / `nba_suggest` qua approval (**FR-CX · BR-018**). Không auto-refund / auto-mass-send.

## Playbooks (scan)
| Code | Trigger stub |
|---|---|
| `delay_cod` | COD `payment_status=pending` > 24h |
| `fail_payment` | `payment_status` failed/cancelled |
| `negative_keyword` | Inbound inbox chứa từ tiêu cực |
| `manual` / `vip_care` | Tạo tay |

## NBA actions
`call` · `voucher` (stub code) · `live_invite` · `no_contact` · `reminder` · `care` · `escalation`

Apply chỉ tag / voucher stub / escalate ticket — **không refund**.

## AI (high-risk → pending_approval)
```bash
# Care draft
curl -X POST .../v1/admin/cx/tickets/$TID/care-reply
curl -X POST .../v1/admin/ai/actions/$AID/review -d '{"decision":"approved","note":"..."}'
curl -X POST .../v1/admin/ai/actions/$AID/apply
# → lưu care_reply_draft trên ticket (không gửi kênh)

# NBA AI
curl -X POST .../v1/admin/cx/nba/suggest-ai -d '{"customer_id":"...","ticket_id":"..."}'
# approve + apply → materialize NbaRecommendation rows
```

## Admin
- `/recovery` — scan, tickets, NBA apply/dismiss
- Customer 360 — panel **Recovery (C6)**

## Verify
```bash
bash scripts/e2e-c6.sh
```

## Lỗi thường gặp
| Triệu chứng | Xử lý |
|---|---|
| AI create fails | `FEATURE_AI_GATEWAY` / budget |
| Apply blocked | High-risk phải `approved` trước |
| Care draft empty | Approve+apply care_reply trước |
