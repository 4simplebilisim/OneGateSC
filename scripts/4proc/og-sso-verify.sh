#!/bin/bash
# İki giriş yolunu da doğrular: (1) OneGate'ten devir bileti (2) şifreyle giriş.
# Bilet sunucuda doğrudan üretilir → OneGate'e login YAPILMAZ (kullanıcının oturumu düşmesin).
set -e
BASE=https://onegate.4simple.com.tr
SEC=$(cat /root/.onegate_sso_secret)

mint() { # $1 = exp ofseti ms
  SSO_SECRET="$SEC" OFF="$1" node -e '
    const c = require("crypto");
    const p = { sub: 1, username: "admin", aud: "PROC", jti: "t"+Date.now(), exp: Date.now()+Number(process.env.OFF) };
    const body = Buffer.from(JSON.stringify(p)).toString("base64url");
    const sig = c.createHmac("sha256", process.env.SSO_SECRET).update(body).digest("base64url");
    process.stdout.write(body + "." + sig);
  '
}

echo "== 1) DEVIR BILETI ILE GECIS (sifresiz)"
TICKET=$(mint 60000)
rm -f /tmp/j1
curl -s -c /tmp/j1 -o /dev/null -w "  devir      : %{http_code} -> %{redirect_url}\n" "$BASE/satinalma/api/sso?ticket=$TICKET"
echo "  oturum cerezi: $(grep -ci authjs /tmp/j1 || echo 0) adet"
curl -s -b /tmp/j1 -o /tmp/p1 -w "  dashboard  : %{http_code}\n" "$BASE/satinalma/dashboard"
grep -oE "<title>[^<]*</title>" /tmp/p1 | head -1 | sed 's/^/  baslik     : /'
printf "  oturum API : "; curl -s -b /tmp/j1 "$BASE/satinalma/api/auth/session" | head -c 130; echo

echo
echo "== 2) SIFREYLE GIRIS (form akisi)"
PW=$(grep -m1 "^admin" /root/.onegate_wms_users.txt | awk '{print $NF}')
rm -f /tmp/j2
CSRF=$(curl -s -c /tmp/j2 "$BASE/satinalma/api/auth/csrf" | python3 -c 'import sys,json;print(json.load(sys.stdin)["csrfToken"])')
curl -s -b /tmp/j2 -c /tmp/j2 -o /dev/null -w "  callback   : %{http_code} -> %{redirect_url}\n" \
  -X POST "$BASE/satinalma/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF" --data-urlencode "code=admin" --data-urlencode "password=$PW" \
  --data-urlencode "callbackUrl=$BASE/satinalma/dashboard"
curl -s -b /tmp/j2 -o /tmp/p2 -w "  dashboard  : %{http_code}\n" "$BASE/satinalma/dashboard"
printf "  oturum API : "; curl -s -b /tmp/j2 "$BASE/satinalma/api/auth/session" | head -c 130; echo

echo
echo "== 3) GUVENLIK"
curl -s -o /dev/null -w "  sahte bilet   : %{http_code} -> %{redirect_url}\n" "$BASE/satinalma/api/sso?ticket=sahte.imza"
EXPIRED=$(mint -1000)
curl -s -o /dev/null -w "  suresi gecmis : %{http_code} -> %{redirect_url}\n" "$BASE/satinalma/api/sso?ticket=$EXPIRED"
rm -f /tmp/j1 /tmp/j2 /tmp/p1 /tmp/p2
