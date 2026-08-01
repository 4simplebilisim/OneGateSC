#!/bin/bash
# 4Proc uygulaması için DDL YETKİSİZ DB kullanıcısı (p4app).
# Amaç: 'prisma db push' gibi bir komut kazara çalışsa bile ortak şemayı BOZAMASIN.
set -e
PWFILE=/root/.onegate_wms_p4app
if [ ! -f "$PWFILE" ]; then
  head -c 24 /dev/urandom | base64 | tr -d '/+=' | head -c 28 > "$PWFILE"
  chmod 600 "$PWFILE"
  echo "yeni şifre üretildi (yalnız sunucuda): $PWFILE"
else
  echo "mevcut şifre kullanılıyor: $PWFILE"
fi
PW=$(cat "$PWFILE")

sudo -u postgres psql -d onegate_wms -v ON_ERROR_STOP=1 -q <<EOF
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'p4app') THEN
    CREATE ROLE p4app LOGIN PASSWORD '$PW';
  ELSE
    ALTER ROLE p4app LOGIN PASSWORD '$PW';
  END IF;
END \$\$;

-- Bağlantı + okuma/yazma; ŞEMA ÜZERİNDE CREATE YOK (DDL engelli)
GRANT CONNECT ON DATABASE onegate_wms TO p4app;
GRANT USAGE ON SCHEMA procurement, wms TO p4app;
REVOKE CREATE ON SCHEMA procurement, wms, public FROM p4app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA procurement TO p4app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA procurement TO p4app;
-- wms: yalnız ortak masterlar (view'lar üzerinden yazma trigger'la olur; trigger sahibi haklarıyla değil,
-- çağıranın haklarıyla çalıştığı için taban tablolara da DML gerekir)
GRANT SELECT, INSERT, UPDATE, DELETE ON
  wms."TBLUSER", wms."TBLUSERROLE", wms."TBLROLE", wms."TBLUSERSCREENRIGHT",
  wms."TBLBUSINESSPARTNER", wms."TBLPRODUCT", wms."TBLUNIT", wms."TBLCURRENCY",
  wms."TBLPAYMENTTERM", wms."TBLINCOTERM", wms."TBLPARTNERGROUP", wms."TBLPRODUCTTYPE",
  wms."TBLPRODUCTGROUP", wms."TBLWAREHOUSE", wms."TBLLOCATION", wms."TBLSEQUENCE",
  wms."TBLFACILITY", wms."TBLREGION", wms."TBLCOMPANY"
TO p4app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA wms TO p4app;
-- Diğer WMS tabloları (stok/belge/operasyon...) p4app'e KAPALI — varsayılan hak yok.

ALTER DEFAULT PRIVILEGES IN SCHEMA procurement GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO p4app;
ALTER DEFAULT PRIVILEGES IN SCHEMA procurement GRANT USAGE, SELECT ON SEQUENCES TO p4app;
ALTER ROLE p4app SET search_path = procurement, wms, public;
EOF

echo "── doğrulama: DDL denemesi başarısız olmalı"
PGPASSWORD="$PW" psql -h localhost -U p4app -d onegate_wms -Atc 'CREATE TABLE procurement.zz_ddl_test(x int);' 2>&1 | head -2 || true
echo "── doğrulama: okuma çalışmalı"
PGPASSWORD="$PW" psql -h localhost -U p4app -d onegate_wms -Atc 'select count(*) from "TBL4S_Suppliers";' | xargs echo "TBL4S_Suppliers:"
echo "── doğrulama: yazma (view→wms) çalışmalı, sonra geri alınacak"
PGPASSWORD="$PW" psql -h localhost -U p4app -d onegate_wms -q <<'EOF'
BEGIN;
INSERT INTO "TBL4S_Units" ("Code","Name","IsActive") VALUES ('ZZP4','p4app testi',true);
SELECT 'yazma OK: ' || "Code" FROM "TBL4S_Units" WHERE "Code"='ZZP4';
ROLLBACK;
EOF
echo "── doğrulama: WMS stok tablosuna erişim OLMAMALI"
PGPASSWORD="$PW" psql -h localhost -U p4app -d onegate_wms -Atc 'select count(*) from wms."TBLSTOCK";' 2>&1 | head -1
echo BITTI
