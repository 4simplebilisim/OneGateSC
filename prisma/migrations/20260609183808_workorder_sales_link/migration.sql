-- AlterTable
ALTER TABLE "TBLWORKORDER" ADD COLUMN     "salesOrderId" INTEGER;

-- CreateIndex
CREATE INDEX "TBLWORKORDER_salesOrderId_idx" ON "TBLWORKORDER"("salesOrderId");

