-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "finance";

-- CreateEnum
CREATE TYPE "finance"."InvoiceType" AS ENUM ('PURCHASE', 'SALES');

-- CreateEnum
CREATE TYPE "finance"."InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "finance"."InvoiceSource" AS ENUM ('PURCHASE_ORDER', 'SALES_ORDER');

-- CreateTable
CREATE TABLE "finance"."TBLINVOICE" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "invoiceNo" VARCHAR(40) NOT NULL,
    "type" "finance"."InvoiceType" NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "sourceOrderType" "finance"."InvoiceSource",
    "sourceOrderId" INTEGER,
    "status" "finance"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "subTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "note" VARCHAR(500),
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLINVOICE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."TBLINVOICELINE" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,
    "quantity" DECIMAL(28,8) NOT NULL,
    "unitPrice" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discountRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "note" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLINVOICELINE_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TBLINVOICE_companyId_idx" ON "finance"."TBLINVOICE"("companyId");

-- CreateIndex
CREATE INDEX "TBLINVOICE_partnerId_idx" ON "finance"."TBLINVOICE"("partnerId");

-- CreateIndex
CREATE INDEX "TBLINVOICE_status_idx" ON "finance"."TBLINVOICE"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TBLINVOICE_companyId_invoiceNo_key" ON "finance"."TBLINVOICE"("companyId", "invoiceNo");

-- CreateIndex
CREATE INDEX "TBLINVOICELINE_invoiceId_idx" ON "finance"."TBLINVOICELINE"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLINVOICELINE_invoiceId_lineNo_key" ON "finance"."TBLINVOICELINE"("invoiceId", "lineNo");

-- AddForeignKey
ALTER TABLE "finance"."TBLINVOICELINE" ADD CONSTRAINT "TBLINVOICELINE_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "finance"."TBLINVOICE"("id") ON DELETE CASCADE ON UPDATE CASCADE;

