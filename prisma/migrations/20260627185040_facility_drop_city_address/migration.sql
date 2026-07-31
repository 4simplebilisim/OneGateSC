-- TBLFACILITY: şehir (city) + adres (address) tutulmuyor — gereksiz bilgi, kaldırıldı.
-- Kolonlar nullable → veriyle birlikte düşürmek güvenli.
ALTER TABLE "wms"."TBLFACILITY" DROP COLUMN IF EXISTS "city";
ALTER TABLE "wms"."TBLFACILITY" DROP COLUMN IF EXISTS "address";
