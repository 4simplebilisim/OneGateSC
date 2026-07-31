-- TBLAREA + TBLLOCATION: facilityId (Tesis) eklenir — firma>tesis>depo>alan>lokasyon hiyerarşisi.
-- facilityId DEPODAN türetilir (her depo bir tesise ait) → mevcut kayıtlar backfill edilir. Nullable.

-- ── TBLAREA ──
ALTER TABLE "wms"."TBLAREA" ADD COLUMN "facilityId" INTEGER;
UPDATE "wms"."TBLAREA" a SET "facilityId" = w."facilityId" FROM "wms"."TBLWAREHOUSE" w WHERE w."id" = a."warehouseId";
CREATE INDEX "TBLAREA_facilityId_idx" ON "wms"."TBLAREA"("facilityId");
ALTER TABLE "wms"."TBLAREA" ADD CONSTRAINT "TBLAREA_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "wms"."TBLFACILITY"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── TBLLOCATION ──
ALTER TABLE "wms"."TBLLOCATION" ADD COLUMN "facilityId" INTEGER;
UPDATE "wms"."TBLLOCATION" l SET "facilityId" = w."facilityId" FROM "wms"."TBLWAREHOUSE" w WHERE w."id" = l."warehouseId";
CREATE INDEX "TBLLOCATION_facilityId_idx" ON "wms"."TBLLOCATION"("facilityId");
ALTER TABLE "wms"."TBLLOCATION" ADD CONSTRAINT "TBLLOCATION_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "wms"."TBLFACILITY"("id") ON DELETE SET NULL ON UPDATE CASCADE;
