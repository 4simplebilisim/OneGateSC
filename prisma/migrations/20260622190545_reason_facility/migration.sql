-- Nedene opsiyonel tesis (facilityId) — operasyon tipiyle aynı desen (boş=tüm tesisler). Legacy LNGDISTKOD.
ALTER TABLE wms."TBLREASON" ADD COLUMN IF NOT EXISTS "facilityId" INTEGER;
CREATE INDEX IF NOT EXISTS "TBLREASON_facilityId_idx" ON wms."TBLREASON"("facilityId");
