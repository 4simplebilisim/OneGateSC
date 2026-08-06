-- Ek saha DEĞERİ (legacy'de varlık başına ayrı tablo → tek polimorfik tablo)
CREATE TABLE "wms"."TBLEXTRAFIELDVALUE" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "extraFieldId" INTEGER NOT NULL,
    "entityType" "wms"."ExtraFieldEntity" NOT NULL,
    "entityId" INTEGER NOT NULL,
    "value" VARCHAR(400),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TBLEXTRAFIELDVALUE_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TBLEXTRAFIELDVALUE_extraFieldId_entityType_entityId_key"
    ON "wms"."TBLEXTRAFIELDVALUE"("extraFieldId", "entityType", "entityId");
CREATE INDEX "TBLEXTRAFIELDVALUE_companyId_entityType_entityId_idx"
    ON "wms"."TBLEXTRAFIELDVALUE"("companyId", "entityType", "entityId");

ALTER TABLE "wms"."TBLEXTRAFIELDVALUE" ADD CONSTRAINT "TBLEXTRAFIELDVALUE_extraFieldId_fkey"
    FOREIGN KEY ("extraFieldId") REFERENCES "wms"."TBLEXTRAFIELD"("id") ON DELETE CASCADE ON UPDATE CASCADE;
