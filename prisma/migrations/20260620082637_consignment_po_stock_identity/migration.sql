-- DropIndex
DROP INDEX "TBLSTOCK_companyId_locationId_productId_statusId_batchNo_se_key";

-- AlterTable
ALTER TABLE "TBLDOCUMENTLINE" ADD COLUMN     "customerId" INTEGER,
ADD COLUMN     "poLine" VARCHAR(50),
ADD COLUMN     "poNo" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "TBLSTOCK_companyId_locationId_productId_statusId_batchNo_se_key" ON "TBLSTOCK"("companyId", "locationId", "productId", "statusId", "batchNo", "serialNo", "palletId", "customerId", "poNo", "poLine");