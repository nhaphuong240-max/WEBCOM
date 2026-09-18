# Runbook — Theme license billing (P3)

## Mục tiêu
Mua theme `one_time` qua VietQR/TRANSFER **tách** khỏi Order hàng hóa. Trial (P2) trước paywall.

## Giá
Env `THEME_LICENSE_PRICE_VND` (mặc định `1990000`). Template `license=free` → grant ngay, không QR.

## API
```bash
# Quote
GET /api/v1/admin/theme-licenses/quote?template_code=live-drop

# Tạo hóa đơn + QR
POST /api/v1/admin/theme-licenses/invoices
{ "template_code": "live-drop" }

# Stub thanh toán
POST /api/v1/admin/theme-licenses/invoices/:id/simulate-paid

# Install (cần license nếu one_time)
POST /api/v1/admin/storefronts/:sfId/templates/:code/install
```

## UI
`/console/website/templates` — nút **Mua theme** → QR → Simulate paid → **Install**

## Verify
```bash
bash scripts/e2e-p3.sh
```
