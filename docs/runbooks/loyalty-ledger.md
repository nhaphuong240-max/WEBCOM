# Runbook — Loyalty ledger (C4)

## Mục tiêu
Điểm thưởng bất biến (ledger) · tier · earn trên order `CONFIRMED` · redeem checkout stub · referral 1 cấp + soft fraud (FR-LOY).

## Kinh tế mặc định
| Rule | Giá trị |
|---|---|
| Earn | 1 điểm / 1.000₫ × tier multiplier |
| Redeem | 1 điểm = 100₫ · tối đa 50% subtotal |
| Referral bonus | 100 điểm mỗi bên (khi pass fraud) |

Tiers: bronze (×1) · silver ≥500 (×1.2) · gold ≥2000 (×1.5).

## API
```bash
curl -X POST .../v1/admin/loyalty/accounts/ensure -d '{"customer_id":"..."}'
curl -X POST .../v1/admin/loyalty/earn-order/$ORDER_ID
curl -X POST .../v1/admin/loyalty/redeem -d '{"customer_id":"...","points":50,"subtotal":200000,"idempotency_key":"..."}'
curl -X POST .../v1/admin/loyalty/referral/apply -d '{"customer_id":"...","referral_code":"REF..."}'
```

Checkout storefront: body `loyalty_points` + `customer_id` → redeem trước khi tạo order; sau CONFIRMED → auto earn.

## Soft fraud (referral)
`self_referral` · `same_phone` · `same_email` → `status=rejected`, không cộng điểm.

## Admin
- `/loyalty` — accounts, adjust, referral
- `/loyalty/:customerId` — ledger
- Customer 360 hiện balance / tier / code

## Verify
```bash
bash scripts/e2e-c4.sh
```

## Lỗi thường gặp
| Triệu chứng | Xử lý |
|---|---|
| Insufficient points | Adjust hoặc earn order trước |
| Already referred | Mỗi customer 1 referral record |
| Earn skipped no_customer | Gắn `customer_id` trên order |
