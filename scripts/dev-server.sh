#!/bin/bash
# Sunucudaki GELİŞTİRME ortamını başlatır/durdurur (canlıya dokunmaz).
#
#   /opt/onegate-dev/scripts/dev-server.sh start|stop|status|logs|pull
#
# Neden Docker yok: sunucuda zaten native PostgreSQL 16 çalışıyor; ikinci bir
# Postgres konteyneri boşuna ~200 MB RAM yerdi (makine 3.7 GB ve swap'ta).
# Geliştirme veritabanı: onegate_dev (canlı onegate_wms'ten kopya).
#
# Yeni PC'den erişim (tünel — dışarı port açmıyoruz, sertifika/DNS gerekmiyor):
#   ssh -L 5180:localhost:5180 -L 3020:localhost:3020 hetzner
#   sonra tarayıcıda http://localhost:5180
set -u
DIR=/opt/onegate-dev
API_LOG=/var/log/onegate-dev-api.log
WEB_LOG=/var/log/onegate-dev-web.log
API_PID=/run/onegate-dev-api.pid
WEB_PID=/run/onegate-dev-web.pid

calisiyor() { [ -f "$1" ] && kill -0 "$(cat "$1")" 2>/dev/null; }

case "${1:-status}" in
  start)
    cd "$DIR" || exit 1
    if calisiyor $API_PID; then echo "API zaten çalışıyor (pid $(cat $API_PID))"
    else
      nohup npm run dev >"$API_LOG" 2>&1 & echo $! > $API_PID
      echo "API başladı → :3020 (log: $API_LOG)"
    fi
    if calisiyor $WEB_PID; then echo "Web zaten çalışıyor (pid $(cat $WEB_PID))"
    else
      nohup npm --prefix web run dev -- --port 5180 --host 127.0.0.1 >"$WEB_LOG" 2>&1 & echo $! > $WEB_PID
      echo "Web başladı → :5180 (log: $WEB_LOG)"
    fi
    echo
    echo "Kendi bilgisayarından bağlanmak için:"
    echo "  ssh -L 5180:localhost:5180 -L 3020:localhost:3020 hetzner"
    echo "  → http://localhost:5180"
    ;;
  stop)
    for p in $API_PID $WEB_PID; do
      if calisiyor "$p"; then pkill -P "$(cat "$p")" 2>/dev/null; kill "$(cat "$p")" 2>/dev/null; rm -f "$p"; fi
    done
    echo "Geliştirme sunucuları durduruldu (canlı etkilenmedi)"
    ;;
  status)
    calisiyor $API_PID && echo "API  : çalışıyor (pid $(cat $API_PID)) :3020" || echo "API  : kapalı"
    calisiyor $WEB_PID && echo "Web  : çalışıyor (pid $(cat $WEB_PID)) :5180" || echo "Web  : kapalı"
    echo -n "DB   : "; sudo -u postgres psql -d onegate_dev -Atc "select 'onegate_dev · ürün=' || count(*) from wms.\"TBLPRODUCT\"" 2>/dev/null || echo "erişilemedi"
    echo -n "RAM  : "; free -m | awk '/Mem:/{printf "%d/%d MB kullanımda\n", $3, $2}'
    ;;
  logs)  tail -n "${2:-40}" "$API_LOG" "$WEB_LOG" ;;
  pull)  cd "$DIR" && git pull origin main && npm ci --silent && npx prisma generate && echo "Güncellendi — 'start' ile yeniden başlat" ;;
  *)     echo "Kullanım: $0 start|stop|status|logs [satır]|pull"; exit 1 ;;
esac
