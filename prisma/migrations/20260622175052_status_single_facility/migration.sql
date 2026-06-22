-- Statü artık TAM OLARAK tek tesise aittir (çoka-çok junction kaldırılıyor → tek facilityId kolonu).
-- 1) facilityId kolonu (önce nullable — mevcut satırlar için)
ALTER TABLE "TBLSTATUS" ADD COLUMN "facilityId" INTEGER;

-- 2) Junction'dan tek tesise indirge (her statünün en küçük facilityId'si)
UPDATE "TBLSTATUS" s
SET "facilityId" = sf."facilityId"
FROM (SELECT DISTINCT ON ("statusId") "statusId", "facilityId"
      FROM "TBLSTATUSFACILITY" ORDER BY "statusId", "facilityId") sf
WHERE s."id" = sf."statusId";

-- 3) Junction kaydı olmayan statülere tenant'ın ilk tesisini ata (güvenlik ağı)
UPDATE "TBLSTATUS" s
SET "facilityId" = (SELECT f."id" FROM "TBLFACILITY" f WHERE f."companyId" = s."companyId" ORDER BY f."id" LIMIT 1)
WHERE s."facilityId" IS NULL;

-- 4) NOT NULL + index + FK
ALTER TABLE "TBLSTATUS" ALTER COLUMN "facilityId" SET NOT NULL;
CREATE INDEX "TBLSTATUS_facilityId_idx" ON "TBLSTATUS"("facilityId");
ALTER TABLE "TBLSTATUS" ADD CONSTRAINT "TBLSTATUS_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "TBLFACILITY"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5) Çoka-çok junction tablosunu kaldır
DROP TABLE "TBLSTATUSFACILITY";
