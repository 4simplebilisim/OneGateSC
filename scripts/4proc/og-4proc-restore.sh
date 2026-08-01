#!/bin/bash
# 4Proc dökümünü p4src şeması olarak onegate_wms'e hazırlar + taşıma öncesi yedek alır.
set -e
DUMP=$(ls -t /var/backups/onegate-wms/4proc-supabase-*.dump | head -1)
echo "dump: $DUMP"

echo "── onegate_wms taşıma öncesi yedek"
BK=/var/backups/onegate-wms/pre-4proc-$(date +%Y%m%d-%H%M%S).dump
sudo -u postgres pg_dump -Fc -d onegate_wms -f "$BK"
echo "yedek: $BK ($(du -h "$BK" | cut -f1))"

echo "── tmp4proc restore (yalnız public)"
sudo -u postgres dropdb --if-exists tmp4proc
sudo -u postgres createdb tmp4proc
cp "$DUMP" /tmp/4proc.dump && chmod 644 /tmp/4proc.dump
sudo -u postgres /usr/lib/postgresql/17/bin/pg_restore --no-owner --no-privileges \
  --schema=public -d tmp4proc /tmp/4proc.dump 2>/tmp/restore.err || true
echo "restore hata satırı: $(grep -ci error /tmp/restore.err || true)"
grep -i error /tmp/restore.err | head -5 || true

echo "── TBL4S_* + counters → p4src şeması"
sudo -u postgres psql -d tmp4proc -q <<'EOF'
CREATE SCHEMA IF NOT EXISTS p4src;
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND (table_name LIKE 'TBL4S\_%' ESCAPE '\' OR table_name='counters')
  LOOP
    EXECUTE format('ALTER TABLE public.%I SET SCHEMA p4src', t);
  END LOOP;
END $$;
EOF
sudo -u postgres psql -d tmp4proc -Atc "select count(*) from information_schema.tables where table_schema='p4src';" | xargs echo "p4src tablo:"

echo "── p4src → onegate_wms"
sudo -u postgres psql -d onegate_wms -qc 'DROP SCHEMA IF EXISTS p4src CASCADE;'
sudo -u postgres pg_dump -n p4src tmp4proc | sudo -u postgres psql -d onegate_wms -q
sudo -u postgres psql -d onegate_wms -Atc "select count(*) from information_schema.tables where table_schema='p4src';" | xargs echo "onegate_wms p4src tablo:"
rm -f /tmp/4proc.dump
echo "HAZIR"
