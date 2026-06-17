-- CreateEnum
CREATE TYPE "procurement"."PurchaseOrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "procurement"."TBLPURCHASEORDER" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "orderNo" VARCHAR(40) NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "status" "procurement"."PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "totalAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "note" VARCHAR(500),
    "createdById" INTEGER NOT NULL,
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLPURCHASEORDER_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement"."TBLPURCHASEORDERLINE" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,
    "quantity" DECIMAL(28,8) NOT NULL,
    "receivedQty" DECIMAL(28,8) NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "note" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLPURCHASEORDERLINE_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TBLPURCHASEORDER_companyId_idx" ON "procurement"."TBLPURCHASEORDER"("companyId");

-- CreateIndex
CREATE INDEX "TBLPURCHASEORDER_supplierId_idx" ON "procurement"."TBLPURCHASEORDER"("supplierId");

-- CreateIndex
CREATE INDEX "TBLPURCHASEORDER_warehouseId_idx" ON "procurement"."TBLPURCHASEORDER"("warehouseId");

-- CreateIndex
CREATE INDEX "TBLPURCHASEORDER_status_idx" ON "procurement"."TBLPURCHASEORDER"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TBLPURCHASEORDER_companyId_orderNo_key" ON "procurement"."TBLPURCHASEORDER"("companyId", "orderNo");

-- CreateIndex
CREATE INDEX "TBLPURCHASEORDERLINE_orderId_idx" ON "procurement"."TBLPURCHASEORDERLINE"("orderId");

-- CreateIndex
CREATE INDEX "TBLPURCHASEORDERLINE_productId_idx" ON "procurement"."TBLPURCHASEORDERLINE"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLPURCHASEORDERLINE_orderId_lineNo_key" ON "procurement"."TBLPURCHASEORDERLINE"("orderId", "lineNo");

-- AddForeignKey
ALTER TABLE "procurement"."TBLPURCHASEORDERLINE" ADD CONSTRAINT "TBLPURCHASEORDERLINE_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "procurement"."TBLPURCHASEORDER"("id") ON DELETE CASCADE ON UPDATE CASCADE;

