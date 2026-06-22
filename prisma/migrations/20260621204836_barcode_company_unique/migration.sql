-- Barkod tekilliği firma içinde: TBLPRODUCTUNITBARCODE'a companyId + @@unique([companyId, barcode])
ALTER TABLE "wms"."TBLPRODUCTUNITBARCODE" ADD COLUMN "companyId" INTEGER;

-- Backfill: mevcut barkodların firmasını ürün-birim → ürün üzerinden doldur
UPDATE "wms"."TBLPRODUCTUNITBARCODE" AS b
  SET "companyId" = p."companyId"
  FROM "wms"."TBLPRODUCTUNIT" pu, "wms"."TBLPRODUCT" p
  WHERE pu."id" = b."productUnitId" AND p."id" = pu."productId";

ALTER TABLE "wms"."TBLPRODUCTUNITBARCODE" ALTER COLUMN "companyId" SET NOT NULL;

CREATE UNIQUE INDEX "TBLPRODUCTUNITBARCODE_companyId_barcode_key" ON "wms"."TBLPRODUCTUNITBARCODE"("companyId", "barcode");
CREATE INDEX "TBLPRODUCTUNITBARCODE_companyId_idx" ON "wms"."TBLPRODUCTUNITBARCODE"("companyId");
