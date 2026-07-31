-- Barkod kural motoru: bildirimsel segment tabanlı ayrıştırma (legacy TXTSCRIPT karşılığı)

-- Enums
CREATE TYPE wms."BarcodeMode" AS ENUM ('EAN', 'PALLET', 'SEGMENT');
CREATE TYPE wms."BarcodeField" AS ENUM ('PALLET', 'PRODUCT', 'BATCH', 'PRODUCTION', 'EXPIRY', 'QUANTITY', 'UNIT', 'SERIAL', 'IGNORE');
CREATE TYPE wms."BarcodeParseType" AS ENUM ('FIXED', 'UNTIL');

-- TBLBARCODETYPE: kural alanları
ALTER TABLE wms."TBLBARCODETYPE"
  ADD COLUMN "facilityId"    INTEGER,
  ADD COLUMN "sortOrder"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "mode"          wms."BarcodeMode" NOT NULL DEFAULT 'EAN',
  ADD COLUMN "matchPrefix"   VARCHAR(20),
  ADD COLUMN "matchContains" VARCHAR(20),
  ADD COLUMN "minLen"        INTEGER,
  ADD COLUMN "maxLen"        INTEGER,
  ADD COLUMN "separator"     VARCHAR(4),
  ADD COLUMN "palletKeyLen"  INTEGER;
CREATE INDEX "TBLBARCODETYPE_companyId_facilityId_sortOrder_idx" ON wms."TBLBARCODETYPE"("companyId", "facilityId", "sortOrder");

-- TBLBARCODESEGMENT
CREATE TABLE wms."TBLBARCODESEGMENT" (
  "id"            SERIAL PRIMARY KEY,
  "companyId"     INTEGER NOT NULL,
  "barcodeTypeId" INTEGER NOT NULL,
  "sortOrder"     INTEGER NOT NULL DEFAULT 0,
  "field"         wms."BarcodeField" NOT NULL,
  "parseType"     wms."BarcodeParseType" NOT NULL DEFAULT 'UNTIL',
  "length"        INTEGER,
  "separator"     VARCHAR(4),
  "dateFormat"    VARCHAR(12),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TBLBARCODESEGMENT_barcodeTypeId_fkey" FOREIGN KEY ("barcodeTypeId")
    REFERENCES wms."TBLBARCODETYPE"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TBLBARCODESEGMENT_companyId_idx" ON wms."TBLBARCODESEGMENT"("companyId");
CREATE INDEX "TBLBARCODESEGMENT_barcodeTypeId_idx" ON wms."TBLBARCODESEGMENT"("barcodeTypeId");
