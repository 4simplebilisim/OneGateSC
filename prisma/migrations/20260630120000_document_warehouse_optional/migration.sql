-- Belge tesise bagli (operationType.facilityId), depoya degil -> warehouseId opsiyonel
ALTER TABLE "wms"."TBLDOCUMENT" ALTER COLUMN "warehouseId" DROP NOT NULL;
