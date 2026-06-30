-- Faz 2: Belge Durum Kriter veri-güdümlü kural tablosu.
-- Ölü serbest-metin "criteria" yerine yapılandırılmış: condition + targetStatusId + priority.
ALTER TABLE wms."TBLDOCUMENTSTATUSCRITERIA"
  ADD COLUMN "condition" VARCHAR(30),
  ADD COLUMN "targetStatusId" INTEGER,
  ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0,
  ALTER COLUMN "criteria" DROP NOT NULL;

ALTER TABLE wms."TBLDOCUMENTSTATUSCRITERIA"
  ADD CONSTRAINT "TBLDOCUMENTSTATUSCRITERIA_targetStatusId_fkey"
  FOREIGN KEY ("targetStatusId") REFERENCES wms."TBLDOCUMENTSTATUS"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "TBLDOCUMENTSTATUSCRITERIA_operationTypeId_idx" ON wms."TBLDOCUMENTSTATUSCRITERIA"("operationTypeId");
