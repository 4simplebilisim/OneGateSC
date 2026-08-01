#!/bin/bash
# 4Proc canlı uygulamasını ortak DB'ye (onegate_wms) geçirir. Sırlar sunucuda kalır.
set -e
APP=/opt/4proc/4proc-next
cd "$APP"

PW=$(cat /root/.onegate_wms_p4app)
NEWURL="postgresql://p4app:${PW}@localhost:5432/onegate_wms?schema=procurement"

echo "── 1) .env yedeği"
[ -f .env.supabase-yedek ] || cp .env .env.supabase-yedek
chmod 600 .env.supabase-yedek
echo "yedek: $APP/.env.supabase-yedek"

echo "── 2) DATABASE_URL değiştiriliyor"
python3 - "$NEWURL" <<'PY'
import sys, io, re
url = sys.argv[1]
p = '/opt/4proc/4proc-next/.env'
s = io.open(p, encoding='utf-8').read()
new, n = re.subn(r'^DATABASE_URL=.*$', 'DATABASE_URL="' + url.replace('\\', '\\\\') + '"', s, flags=re.M)
assert n == 1, f'DATABASE_URL satırı {n} kez bulundu'
io.open(p, 'w', encoding='utf-8', newline='').write(new)
print('DATABASE_URL güncellendi')
PY
grep -E '^DATABASE_URL=' .env | sed -E 's#://[^@]*@#://***@#'

echo "── 3) bağlantı testi (uygulamanın göreceği kimlikle)"
PGPASSWORD="$PW" psql -h localhost -U p4app -d onegate_wms -Atc \
  'SELECT (SELECT count(*) FROM "TBL4S_Suppliers")||'"'"' tedarikçi / '"'"'||(SELECT count(*) FROM "TBL4S_Materials")||'"'"' malzeme / '"'"'||(SELECT count(*) FROM "TBL4S_Orders")||'"'"' sipariş'"'"';'

echo "── 4) prisma generate + build"
npx prisma generate 2>&1 | tail -2
npm run build 2>&1 | tail -3

echo "── 5) pm2 restart (yalnız 4proc)"
pm2 restart 4proc --update-env
sleep 6
pm2 jlist | python3 -c "import sys,json;[print(' ',p['name'],p['pm2_env']['status'],'restart:',p['pm2_env']['restart_time']) for p in json.load(sys.stdin) if p['name']=='4proc']"

echo "── 6) uygulama logu (son 15 satır)"
pm2 logs 4proc --nostream --lines 15 --raw 2>/dev/null | tail -15 || true
