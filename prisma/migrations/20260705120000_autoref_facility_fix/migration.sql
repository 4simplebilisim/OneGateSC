-- Otomatik Referansli Belge: legacy LNGKAYNAKDISTKOD/LNGHEDEFDISTKOD = TESIS (yanlislikla cari eslenmisti)
-- Kolonlar tesise cevrildi; hedef tesis opsiyonel (facility=true "tesis ici" iken bos = kaynakla ayni).
ALTER TABLE wms."TBLAUTOREFERENCEDOCUMENT" RENAME COLUMN "sourcePartnerId" TO "sourceFacilityId";
ALTER TABLE wms."TBLAUTOREFERENCEDOCUMENT" RENAME COLUMN "targetPartnerId" TO "targetFacilityId";
ALTER TABLE wms."TBLAUTOREFERENCEDOCUMENT" ALTER COLUMN "targetFacilityId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TBLAUTOREFERENCEDOCUMENT_sourceOperationTypeId_idx" ON wms."TBLAUTOREFERENCEDOCUMENT"("sourceOperationTypeId");
