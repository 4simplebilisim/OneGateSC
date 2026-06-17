-- CreateEnum
CREATE TYPE "CountStatus" AS ENUM ('DRAFT', 'COUNTING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QualityResult" AS ENUM ('PENDING', 'PASSED', 'FAILED');

-- CreateTable
CREATE TABLE "TBLSTOCKCOUNT" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "countNo" VARCHAR(40) NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "status" "CountStatus" NOT NULL DEFAULT 'DRAFT',
    "countDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" VARCHAR(500),
    "createdById" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLSTOCKCOUNT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLSTOCKCOUNTLINE" (
    "id" SERIAL NOT NULL,
    "countId" INTEGER NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "stockId" INTEGER,
    "locationId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "statusId" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,
    "batchNo" VARCHAR(100),
    "serialNo" VARCHAR(100),
    "palletId" INTEGER,
    "systemQty" DECIMAL(28,8) NOT NULL DEFAULT 0,
    "countedQty" DECIMAL(28,8),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLSTOCKCOUNTLINE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLQUALITYINSPECTION" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "inspectionNo" VARCHAR(40) NOT NULL,
    "productId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "statusId" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,
    "batchNo" VARCHAR(100),
    "serialNo" VARCHAR(100),
    "palletId" INTEGER,
    "quantity" DECIMAL(28,8) NOT NULL,
    "result" "QualityResult" NOT NULL DEFAULT 'PENDING',
    "note" VARCHAR(500),
    "createdById" INTEGER NOT NULL,
    "inspectedById" INTEGER,
    "inspectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLQUALITYINSPECTION_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TBLSTOCKCOUNT_companyId_idx" ON "TBLSTOCKCOUNT"("companyId");

-- CreateIndex
CREATE INDEX "TBLSTOCKCOUNT_warehouseId_idx" ON "TBLSTOCKCOUNT"("warehouseId");

-- CreateIndex
CREATE INDEX "TBLSTOCKCOUNT_status_idx" ON "TBLSTOCKCOUNT"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TBLSTOCKCOUNT_companyId_countNo_key" ON "TBLSTOCKCOUNT"("companyId", "countNo");

-- CreateIndex
CREATE INDEX "TBLSTOCKCOUNTLINE_countId_idx" ON "TBLSTOCKCOUNTLINE"("countId");

-- CreateIndex
CREATE INDEX "TBLSTOCKCOUNTLINE_productId_idx" ON "TBLSTOCKCOUNTLINE"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLSTOCKCOUNTLINE_countId_lineNo_key" ON "TBLSTOCKCOUNTLINE"("countId", "lineNo");

-- CreateIndex
CREATE INDEX "TBLQUALITYINSPECTION_companyId_idx" ON "TBLQUALITYINSPECTION"("companyId");

-- CreateIndex
CREATE INDEX "TBLQUALITYINSPECTION_productId_idx" ON "TBLQUALITYINSPECTION"("productId");

-- CreateIndex
CREATE INDEX "TBLQUALITYINSPECTION_result_idx" ON "TBLQUALITYINSPECTION"("result");

-- CreateIndex
CREATE UNIQUE INDEX "TBLQUALITYINSPECTION_companyId_inspectionNo_key" ON "TBLQUALITYINSPECTION"("companyId", "inspectionNo");

-- AddForeignKey
ALTER TABLE "TBLSTOCKCOUNTLINE" ADD CONSTRAINT "TBLSTOCKCOUNTLINE_countId_fkey" FOREIGN KEY ("countId") REFERENCES "TBLSTOCKCOUNT"("id") ON DELETE CASCADE ON UPDATE CASCADE;

