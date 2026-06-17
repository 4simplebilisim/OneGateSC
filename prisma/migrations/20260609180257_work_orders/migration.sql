-- CreateEnum
CREATE TYPE "WorkOrderType" AS ENUM ('PICK', 'PUTAWAY', 'COUNT', 'TRANSFER', 'REPLENISH');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "TBLWORKORDER" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "orderNo" VARCHAR(40) NOT NULL,
    "type" "WorkOrderType" NOT NULL DEFAULT 'PICK',
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'PLANNED',
    "warehouseId" INTEGER NOT NULL,
    "assignedToUserId" INTEGER,
    "priority" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "note" VARCHAR(500),
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLWORKORDER_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLWORKORDERLINE" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,
    "quantity" DECIMAL(28,8) NOT NULL,
    "collectedQty" DECIMAL(28,8) NOT NULL DEFAULT 0,
    "sourceLocationId" INTEGER,
    "targetLocationId" INTEGER,
    "sourceStatusId" INTEGER,
    "targetStatusId" INTEGER,
    "palletId" INTEGER,
    "batchNo" VARCHAR(100),
    "serialNo" VARCHAR(100),
    "reasonId" INTEGER,
    "note" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLWORKORDERLINE_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TBLWORKORDER_companyId_idx" ON "TBLWORKORDER"("companyId");

-- CreateIndex
CREATE INDEX "TBLWORKORDER_status_idx" ON "TBLWORKORDER"("status");

-- CreateIndex
CREATE INDEX "TBLWORKORDER_assignedToUserId_idx" ON "TBLWORKORDER"("assignedToUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLWORKORDER_companyId_orderNo_key" ON "TBLWORKORDER"("companyId", "orderNo");

-- CreateIndex
CREATE INDEX "TBLWORKORDERLINE_workOrderId_idx" ON "TBLWORKORDERLINE"("workOrderId");

-- CreateIndex
CREATE INDEX "TBLWORKORDERLINE_productId_idx" ON "TBLWORKORDERLINE"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLWORKORDERLINE_workOrderId_lineNo_key" ON "TBLWORKORDERLINE"("workOrderId", "lineNo");

-- AddForeignKey
ALTER TABLE "TBLWORKORDER" ADD CONSTRAINT "TBLWORKORDER_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "TBLCOMPANY"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLWORKORDERLINE" ADD CONSTRAINT "TBLWORKORDERLINE_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "TBLWORKORDER"("id") ON DELETE CASCADE ON UPDATE CASCADE;

