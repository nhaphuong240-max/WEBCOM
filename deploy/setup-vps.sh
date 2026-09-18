#!/usr/bin/env bash
# Run on VPS as root from /var/www/webecom
set -euo pipefail
ROOT=/var/www/webecom
cd "$ROOT"

export PATH="/usr/bin:$PATH"
corepack enable
corepack prepare pnpm@9.15.4 --activate

if [[ ! -f "$ROOT/.env" ]]; then
  echo "Missing $ROOT/.env" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a

echo "==> pnpm install"
CI=true NODE_ENV=development pnpm install --frozen-lockfile </dev/null

echo "==> build packages + apps"
rm -f packages/shared-kernel/tsconfig.tsbuildinfo packages/ui/tsconfig.tsbuildinfo
pnpm --filter @ptt/shared-kernel build
pnpm --filter @ptt/ui build
pnpm --filter @ptt/admin-api exec prisma generate
pnpm --filter @ptt/admin-api exec prisma migrate deploy
pnpm --filter @ptt/admin-api build
NEXT_BASE_PATH=/console pnpm --filter @ptt/admin-web build
pnpm --filter @ptt/storefront-web build
pnpm --filter @ptt/corporate-web build

echo "==> copy static assets into standalone"
for app in admin-web storefront-web corporate-web; do
  STANDALONE="$ROOT/apps/$app/.next/standalone"
  APP_DIR="$STANDALONE/apps/$app"
  mkdir -p "$APP_DIR/.next"
  cp -a "$ROOT/apps/$app/.next/static" "$APP_DIR/.next/static"
  if [[ -d "$ROOT/apps/$app/public" ]]; then
    cp -a "$ROOT/apps/$app/public" "$APP_DIR/public"
  fi
done

echo "==> ownership"
chown -R deploy:www-data "$ROOT"

echo "==> systemd units"
cp "$ROOT/deploy/systemd/"*.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now webecom-admin-api webecom-admin-web webecom-storefront webecom-corporate
systemctl restart webecom-admin-api webecom-admin-web webecom-storefront webecom-corporate

echo "==> nginx"
cp "$ROOT/deploy/nginx-webecom.conf" /etc/nginx/sites-available/webecom
ln -sfn /etc/nginx/sites-available/webecom /etc/nginx/sites-enabled/webecom
nginx -t
systemctl reload nginx

echo "Setup complete. Run certbot if SSL not yet issued."
