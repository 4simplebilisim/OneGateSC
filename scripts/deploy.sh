#!/usr/bin/env bash
# OneGate WMS — sunucu deploy (tek komut): pull → bağımlılık → migrate+generate → web build → restart → sağlık.
# Local'den:  ssh hetzner "/opt/onegate-wms/scripts/deploy.sh"
#
# NOT: git pull bu dosyanın KENDİSİNİ güncelleyebilir — gövde {} bloğunda (bash bloğu komple parse eder,
# yarı-okunmuş dosya çalıştırma riski yok); sondaki exit şarttır, silme.
{
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"
PORT=$(sed -n 's/^PORT=//p' .env 2>/dev/null | tr -d '"' | head -1); PORT=${PORT:-3000}

echo "── OneGate deploy $(date '+%F %T') @ $APP_DIR (API :$PORT)"
BEFORE=$(git rev-parse --short HEAD)
git pull --ff-only
AFTER=$(git rev-parse --short HEAD)
echo "── kod: $BEFORE → $AFTER ($(git log -1 --format=%s | cut -c1-60))"

echo "── api bağımlılıkları"
npm ci --no-audit --no-fund 2>&1 | tail -1

echo "── prisma migrate + generate (generate ŞART: npm ci client'ı siler)"
npx prisma migrate deploy 2>&1 | tail -2
npx prisma generate 2>&1 | tail -1

echo "── web build"
(cd web && npm ci --no-audit --no-fund 2>&1 | tail -1 && npm run build 2>&1 | tail -2)

echo "── servis restart + sağlık"
systemctl restart onegate-wms-api
sleep 4
if ! systemctl is-active --quiet onegate-wms-api; then
  echo "!! servis ayakta değil — son log:"
  journalctl -u onegate-wms-api -n 20 --no-pager
  exit 1
fi
if ! curl -sf "http://127.0.0.1:${PORT}/api/branding" -o /dev/null; then
  echo "!! API sağlık kontrolü başarısız — son log:"
  journalctl -u onegate-wms-api -n 20 --no-pager
  exit 1
fi
echo "── OK: $AFTER canlı — https://onegate.4simple.com.tr"
exit 0
}
