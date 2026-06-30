-- TBLPRINTER → legacy-sade: Tesis (facilityId) + Yazıcı (name) + Yazıcı Adresi (address).
-- IPP/ZPL ağ-protokol modeli (type/host/port/path/location/discovered + PrinterType + code) kaldırıldı.
-- Tablo BOŞTU → NOT NULL + kolon düşürme güvenli (backfill yok).

ALTER TABLE "wms"."TBLPRINTER" DROP CONSTRAINT IF EXISTS "TBLPRINTER_companyId_code_key";
DROP INDEX IF EXISTS "wms"."TBLPRINTER_companyId_code_key";

ALTER TABLE "wms"."TBLPRINTER" ADD COLUMN "facilityId" INTEGER NOT NULL;
ALTER TABLE "wms"."TBLPRINTER" ADD COLUMN "address" VARCHAR(200) NOT NULL;
ALTER TABLE "wms"."TBLPRINTER" ALTER COLUMN "name" SET NOT NULL;

ALTER TABLE "wms"."TBLPRINTER" DROP COLUMN "code";
ALTER TABLE "wms"."TBLPRINTER" DROP COLUMN "type";
ALTER TABLE "wms"."TBLPRINTER" DROP COLUMN "host";
ALTER TABLE "wms"."TBLPRINTER" DROP COLUMN "port";
ALTER TABLE "wms"."TBLPRINTER" DROP COLUMN "path";
ALTER TABLE "wms"."TBLPRINTER" DROP COLUMN "location";
ALTER TABLE "wms"."TBLPRINTER" DROP COLUMN "discovered";

DROP TYPE IF EXISTS "wms"."PrinterType";

CREATE UNIQUE INDEX "TBLPRINTER_companyId_facilityId_name_key" ON "wms"."TBLPRINTER"("companyId", "facilityId", "name");
CREATE INDEX "TBLPRINTER_facilityId_idx" ON "wms"."TBLPRINTER"("facilityId");
ALTER TABLE "wms"."TBLPRINTER" ADD CONSTRAINT "TBLPRINTER_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "wms"."TBLFACILITY"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
