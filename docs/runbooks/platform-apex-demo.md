# Runbook — Platform apex + themes sandbox (P0)

## Quyết định
- Apex `webecom.ngoinhahomnay.vn` = **Platform** (`corporate-web`)
- `themes.ngoinhahomnay.vn` = **sandbox storefront** (template demo)
- Trial trước paywall; phase 1 monetize = **mua theme**
- Alias cũ (optional): `demo.webecom.ngoinhahomnay.vn` vẫn resolve nếu còn trong `DEMO_HOSTS`

## DNS
Tạo A/AAAA `themes.ngoinhahomnay.vn` → cùng IP VPS (zone `ngoinhahomnay.vn`).

## SSL
```bash
certbot --nginx -d themes.ngoinhahomnay.vn --non-interactive --agree-tos --redirect
# apex (nếu cần renew/expand riêng)
certbot --nginx -d webecom.ngoinhahomnay.vn --non-interactive --agree-tos --redirect
nginx -t && systemctl reload nginx
```

## Env (VPS `/var/www/webecom/.env`)
```bash
DEMO_HOSTS=themes.ngoinhahomnay.vn
DEMO_PUBLIC_URL=https://themes.ngoinhahomnay.vn
DEMO_STOREFRONT_ID=sf_aura
```

## Smoke
```bash
curl -sS https://webecom.ngoinhahomnay.vn/api/health
curl -sS https://webecom.ngoinhahomnay.vn/api/v1/public/templates | head
curl -sS -o /dev/null -w "%{http_code}\n" https://webecom.ngoinhahomnay.vn/
curl -sS -o /dev/null -w "%{http_code}\n" https://themes.ngoinhahomnay.vn/
curl -sS -o /dev/null -w "%{http_code}\n" "https://themes.ngoinhahomnay.vn/?demo=beauty-glow"
```

## Rollback nhanh
Trong nginx apex `location /` đổi `webecom_corporate` → `webecom_storefront`, reload.
