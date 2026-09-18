# Runbook — Self-serve trial (P2)

## Funnel
```text
/trial → POST /api/v1/public/trial/signup
  → Tenant(status=trial) + Brand + User(password) + Storefront(staging)
  → JWT → /console/auth/callback → /console/website/onboarding
```

## API
```bash
curl -sS -X POST https://webecom.ngoinhahomnay.vn/api/v1/public/trial/signup \
  -H 'content-type: application/json' \
  -d '{"email":"you@co.vn","password":"secret123","company":"Shop Demo","name":"You","template_code":"aura-commerce-lite"}'

curl -sS -X POST https://webecom.ngoinhahomnay.vn/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"you@co.vn","password":"secret123"}'
```

## UI
- Platform: https://webecom.ngoinhahomnay.vn/trial
- Login: https://webecom.ngoinhahomnay.vn/console/login

## Notes
- Không verify email (MVP).
- Trial trước paywall; mua theme = P3.
- `AUTH_DEV_BYPASS=true` vẫn cho phép console seed `ten_aura` không JWT.
