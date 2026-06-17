-- AlterTable
ALTER TABLE "TBLPRODUCT" ADD COLUMN     "costPrice" DECIMAL(18,4),
ADD COLUMN     "productGroupId" INTEGER;

-- AlterTable
ALTER TABLE "TBLSTOCK" ADD COLUMN     "unitCost" DECIMAL(18,4);

-- CreateTable
CREATE TABLE "TBLPRODUCTGROUP" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "parentId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLPRODUCTGROUP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLLOT" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "lotNo" VARCHAR(100) NOT NULL,
    "productionDate" DATE,
    "expiryDate" DATE,
    "supplierId" INTEGER,
    "note" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLLOT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLSERIAL" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "serialNo" VARCHAR(100) NOT NULL,
    "statusId" INTEGER,
    "note" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLSERIAL_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLSTOCKLEDGER" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "statusId" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,
    "batchNo" VARCHAR(100),
    "serialNo" VARCHAR(100),
    "palletId" INTEGER,
    "qtyChange" DECIMAL(28,8) NOT NULL,
    "balanceAfter" DECIMAL(28,8) NOT NULL,
    "refType" VARCHAR(20) NOT NULL,
    "refId" INTEGER,
    "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TBLSTOCKLEDGER_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TBLPRODUCTGROUP_companyId_idx" ON "TBLPRODUCTGROUP"("companyId");

-- CreateIndex
CREATE INDEX "TBLPRODUCTGROUP_parentId_idx" ON "TBLPRODUCTGROUP"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLPRODUCTGROUP_companyId_code_key" ON "TBLPRODUCTGROUP"("companyId", "code");

-- CreateIndex
CREATE INDEX "TBLLOT_companyId_idx" ON "TBLLOT"("companyId");

-- CreateIndex
CREATE INDEX "TBLLOT_productId_idx" ON "TBLLOT"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLLOT_companyId_productId_lotNo_key" ON "TBLLOT"("companyId", "productId", "lotNo");

-- CreateIndex
CREATE INDEX "TBLSERIAL_companyId_idx" ON "TBLSERIAL"("companyId");

-- CreateIndex
CREATE INDEX "TBLSERIAL_productId_idx" ON "TBLSERIAL"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLSERIAL_companyId_productId_serialNo_key" ON "TBLSERIAL"("companyId", "productId", "serialNo");

-- CreateIndex
CREATE INDEX "TBLSTOCKLEDGER_companyId_productId_idx" ON "TBLSTOCKLEDGER"("companyId", "productId");

-- CreateIndex
CREATE INDEX "TBLSTOCKLEDGER_locationId_idx" ON "TBLSTOCKLEDGER"("locationId");

-- CreateIndex
CREATE INDEX "TBLSTOCKLEDGER_refType_refId_idx" ON "TBLSTOCKLEDGER"("refType", "refId");

-- CreateIndex
CREATE INDEX "TBLPRODUCT_productGroupId_idx" ON "TBLPRODUCT"("productGroupId");

-- AddForeignKey
ALTER TABLE "TBLPRODUCT" ADD CONSTRAINT "TBLPRODUCT_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "TBLPRODUCTGROUP"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLPRODUCTGROUP" ADD CONSTRAINT "TBLPRODUCTGROUP_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "TBLCOMPANY"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLPRODUCTGROUP" ADD CONSTRAINT "TBLPRODUCTGROUP_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TBLPRODUCTGROUP"("id") ON DELETE SET NULL ON UPDATE CASCADE;

