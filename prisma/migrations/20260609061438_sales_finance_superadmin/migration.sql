-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "sales";

-- CreateEnum
CREATE TYPE "sales"."SalesOrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "procurement"."TBLPURCHASEORDER" ADD COLUMN     "discountTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN     "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
ADD COLUMN     "subTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN     "taxTotal" DECIMAL(18,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "procurement"."TBLPURCHASEORDERLINE" ADD COLUMN     "discountAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN     "discountRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN     "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TBLUSER" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "sales"."TBLSALESORDER" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "orderNo" VARCHAR(40) NOT NULL,
    "customerId" INTEGER NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "status" "sales"."SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedDate" TIMESTAMP(3),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "subTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "note" VARCHAR(500),
    "createdById" INTEGER NOT NULL,
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLSALESORDER_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."TBLSALESORDERLINE" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,
    "quantity" DECIMAL(28,8) NOT NULL,
    "shippedQty" DECIMAL(28,8) NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discountRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "note" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLSALESORDERLINE_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TBLSALESORDER_companyId_idx" ON "sales"."TBLSALESORDER"("companyId");

-- CreateIndex
CREATE INDEX "TBLSALESORDER_customerId_idx" ON "sales"."TBLSALESORDER"("customerId");

-- CreateIndex
CREATE INDEX "TBLSALESORDER_warehouseId_idx" ON "sales"."TBLSALESORDER"("warehouseId");

-- CreateIndex
CREATE INDEX "TBLSALESORDER_status_idx" ON "sales"."TBLSALESORDER"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TBLSALESORDER_companyId_orderNo_key" ON "sales"."TBLSALESORDER"("companyId", "orderNo");

-- CreateIndex
CREATE INDEX "TBLSALESORDERLINE_orderId_idx" ON "sales"."TBLSALESORDERLINE"("orderId");

-- CreateIndex
CREATE INDEX "TBLSALESORDERLINE_productId_idx" ON "sales"."TBLSALESORDERLINE"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLSALESORDERLINE_orderId_lineNo_key" ON "sales"."TBLSALESORDERLINE"("orderId", "lineNo");

-- AddForeignKey
ALTER TABLE "sales"."TBLSALESORDERLINE" ADD CONSTRAINT "TBLSALESORDERLINE_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "sales"."TBLSALESORDER"("id") ON DELETE CASCADE ON UPDATE CASCADE;

