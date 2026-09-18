# Runbook — Platform apex + demo subdomain (P0)

## Quyết định
- Apex `webecom.ngoinhahomnay.vn` = **Platform** (`corporate-web`)
- `demo.webecom.ngoinhahomnay.vn` = **sandbox storefront**
- Trial trước paywall; phase 1 monetize = **mua theme**

## DNS
Tạo A/AAAA (hoặc CNAME) `demo` → cùng IP VPS với apex.

## SSL
```bash
certbot --nginx -d webecom.ngoinhahomnay.vn -d demo.webecom.ngoinhahomnay.vn --expand
nginx -t && systemctl reload nginx
```

## Deploy checklist
```bash
cd /var/www/webecom
git fetch && git reset --hard origin/main
# … build gồm corporate-web …
systemctl enable --now webecom-corporate
systemctl restart webecom-admin-api webecom-admin-web webecom-storefront webecom-corporate
cp deploy/nginx-webecom.conf /etc/nginx/sites-available/webecom
nginx -t && systemctl reload nginx
```

## Smoke
```bash
curl -sS https://webecom.ngoinhahomnay.vn/api/health
curl -sS https://webecom.ngoinhahomnay.vn/api/v1/public/templates | head
curl -sS -o /dev/null -w "%{http_code}\n" https://webecom.ngoinhahomnay.vn/
curl -sS -o /dev/null -w "%{http_code}\n" https://demo.webecom.ngoinhahomnay.vn/
curl -sS -o /dev/null -w "%{http_code}\n" "https://demo.webecom.ngoinhahomnay.vn/?demo=beauty-glow"
```

## Rollback nhanh
Trong nginx apex `location /` đổi `webecom_corporate` → `webecom_storefront`, reload.
