# Runbook — Payment / Checkout

## Triệu chứng
- Checkout 429 (rate limit)
- Idempotency conflict
- Insufficient stock

## Kiểm tra
1. Header `Idempotency-Key` bắt buộc
2. `CHECKOUT_RATE_LIMIT_RPM` (default 30)
3. Redis lock / inventory reserve
4. Order status trong admin `/orders`

## Khôi phục
- Retry với cùng Idempotency-Key nếu network fail
- Không double-charge COD — kiểm tra order id trước khi tạo lại
