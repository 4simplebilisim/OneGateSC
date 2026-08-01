#!/bin/bash
# 4Proc'u onegate.4simple.com.tr/satinalma altına taşır (basePath + nginx).
set -e
APP=/opt/4proc/4proc-next
NEWBASE="https://onegate.4simple.com.tr/satinalma"

echo "── 1) 4proc kodu: ortak çekirdek dalına geç (basePath içerir)"
cd "$APP"
git fetch -q origin feat/ortak-cekirdek-onegate
git checkout -q feat/ortak-cekirdek-onegate
git reset -q --hard origin/feat/ortak-cekirdek-onegate
grep -n 'basePath' next.config.ts

echo "── 2) auth adresleri yeni yola"
python3 - "$NEWBASE" <<'PY'
import sys, io, re
base = sys.argv[1]
p = '/opt/4proc/4proc-next/.env'
s = io.open(p, encoding='utf-8').read()
for key in ('NEXTAUTH_URL', 'AUTH_URL'):
    s, n = re.subn(rf'^{key}=.*$', f'{key}="{base}"', s, flags=re.M)
    print(f'{key}: {n} satır güncellendi')
io.open(p, 'w', encoding='utf-8', newline='').write(s)
PY
grep -E '^(NEXTAUTH_URL|AUTH_URL)=' .env

echo "── 3) build + restart"
npx prisma generate >/dev/null 2>&1
npm run build 2>&1 | tail -3
pm2 restart 4proc --update-env >/dev/null
sleep 5

echo "── 4) nginx: /satinalma yolu WMS alan adına eklendi"
CONF=/etc/nginx/sites-enabled/onegate-wms
cp "$CONF" "/root/nginx-onegate-wms.yedek-$(date +%Y%m%d-%H%M%S)"
if grep -q 'location /satinalma' "$CONF"; then
  echo "zaten var, atlandı"
else
  python3 - <<'PY'
p = '/etc/nginx/sites-enabled/onegate-wms'
s = open(p).read()
block = '''
    # 4Proc satınalma uygulaması (Next.js :3000) — tek alan adı altında
    location /satinalma {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        client_max_body_size 50m;
    }

    location / {'''
# SSL sunucu bloğundaki 'location / {' satırının ÖNÜNE ekle (ilk eşleşme = 443 bloğu)
assert 'location /satinalma' not in s
i = s.index('    location / {')
s = s[:i] + block.lstrip('\n') + s[i + len('    location / {'):]
open(p, 'w').write(s)
print('eklendi')
PY
fi
nginx -t 2>&1 | tail -2
systemctl reload nginx
echo "nginx yeniden yüklendi"

echo "── 5) doğrulama"
curl -s -o /dev/null -w "  WMS kök:            %{http_code}\n" https://onegate.4simple.com.tr/
curl -s -o /dev/null -w "  WMS api/health:     %{http_code}\n" https://onegate.4simple.com.tr/api/health
curl -s -o /dev/null -w "  /satinalma:         %{http_code}\n" -L https://onegate.4simple.com.tr/satinalma
curl -s -o /dev/null -w "  /satinalma/login:   %{http_code}\n" https://onegate.4simple.com.tr/satinalma/login
curl -s "https://onegate.4simple.com.tr/satinalma/api/health" | head -c 90; echo
