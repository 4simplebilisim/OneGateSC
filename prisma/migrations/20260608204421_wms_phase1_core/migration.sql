-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'FULL', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('COUNT', 'WEIGHT', 'VOLUME', 'LENGTH', 'AREA');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('STANDARD', 'RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED', 'SERVICE');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'PASSIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PalletKind" AS ENUM ('EURO', 'INDUSTRIAL', 'BOX', 'CUSTOM');

-- DropIndex
DROP INDEX "TBLLOCATION_warehouseId_code_key";

-- DropIndex
DROP INDEX "TBLPRODUCT_code_key";

-- DropIndex
DROP INDEX "TBLUNIT_code_key";

-- DropIndex
DROP INDEX "TBLWAREHOUSE_code_key";

-- AlterTable
ALTER TABLE "TBLLOCATION" ADD COLUMN     "areaId" INTEGER,
ADD COLUMN     "barcode" VARCHAR(60),
ADD COLUMN     "companyId" INTEGER NOT NULL,
ADD COLUMN     "isRamp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentId" INTEGER,
ADD COLUMN     "priority" INTEGER,
ADD COLUMN     "status" "LocationStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "TBLPRODUCT" ADD COLUMN     "companyId" INTEGER NOT NULL,
ADD COLUMN     "gtin" VARCHAR(20),
ADD COLUMN     "manufacturerCode" VARCHAR(60),
ADD COLUMN     "productGroupCode" VARCHAR(20),
ADD COLUMN     "shortName" VARCHAR(50),
ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "type" "ProductType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "vatRate" DECIMAL(5,2),
ADD COLUMN     "volume" DECIMAL(18,4),
ADD COLUMN     "weight" DECIMAL(18,4),
ALTER COLUMN "name" SET DATA TYPE VARCHAR(240);

-- AlterTable
ALTER TABLE "TBLUNIT" ADD COLUMN     "companyId" INTEGER NOT NULL,
ADD COLUMN     "referenceCode" VARCHAR(50),
ADD COLUMN     "type" "UnitType";

-- AlterTable
ALTER TABLE "TBLWAREHOUSE" ADD COLUMN     "companyId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "TBLCOMPANY" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "taxNumber" VARCHAR(20),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLCOMPANY_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLAREA" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLAREA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLPRODUCTUNIT" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,
    "isBaseUnit" BOOLEAN NOT NULL DEFAULT false,
    "multiplier" DECIMAL(28,8) NOT NULL DEFAULT 1,
    "divisor" DECIMAL(28,8) NOT NULL DEFAULT 1,
    "barcode" VARCHAR(50),
    "length" DECIMAL(18,4),
    "width" DECIMAL(18,4),
    "height" DECIMAL(18,4),
    "area" DECIMAL(18,4),
    "volume" DECIMAL(18,4),
    "netWeight" DECIMAL(18,4),
    "grossWeight" DECIMAL(18,4),
    "weightUnitId" INTEGER,
    "batchTracking" BOOLEAN NOT NULL DEFAULT false,
    "serialTracking" BOOLEAN NOT NULL DEFAULT false,
    "minPalletQty" DECIMAL(28,8),
    "maxPalletQty" DECIMAL(28,8),
    "isSalesUnit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLPRODUCTUNIT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLSTATUS" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLSTATUS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLPALLETTYPE" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "kind" "PalletKind",
    "isDivisible" BOOLEAN NOT NULL DEFAULT true,
    "batchControl" BOOLEAN NOT NULL DEFAULT false,
    "singleProductControl" BOOLEAN NOT NULL DEFAULT false,
    "palletNoLength" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLPALLETTYPE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLPALLET" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "palletNo" VARCHAR(40) NOT NULL,
    "palletTypeId" INTEGER NOT NULL,
    "parentPalletId" INTEGER,
    "baseUnitId" INTEGER,
    "originalQty" DECIMAL(28,8),
    "productionDate" DATE,
    "expiryDate" DATE,
    "beaconId" VARCHAR(200),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLPALLET_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLSTOCK" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "statusId" INTEGER NOT NULL,
    "palletId" INTEGER,
    "batchNo" VARCHAR(100),
    "serialNo" VARCHAR(100),
    "customerId" INTEGER,
    "poNo" VARCHAR(100),
    "poLine" VARCHAR(100),
    "mainQty" DECIMAL(28,8) NOT NULL DEFAULT 0,
    "reservedQty" DECIMAL(28,8) NOT NULL DEFAULT 0,
    "unitId" INTEGER NOT NULL,
    "netWeight" DECIMAL(28,8),
    "grossWeight" DECIMAL(28,8),
    "productionDate" DATE,
    "expiryDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLSTOCK_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TBLCOMPANY_code_key" ON "TBLCOMPANY"("code");

-- CreateIndex
CREATE INDEX "TBLAREA_companyId_idx" ON "TBLAREA"("companyId");

-- CreateIndex
CREATE INDEX "TBLAREA_warehouseId_idx" ON "TBLAREA"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLAREA_companyId_code_key" ON "TBLAREA"("companyId", "code");

-- CreateIndex
CREATE INDEX "TBLPRODUCTUNIT_productId_idx" ON "TBLPRODUCTUNIT"("productId");

-- CreateIndex
CREATE INDEX "TBLPRODUCTUNIT_unitId_idx" ON "TBLPRODUCTUNIT"("unitId");

-- CreateIndex
CREATE INDEX "TBLPRODUCTUNIT_barcode_idx" ON "TBLPRODUCTUNIT"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "TBLPRODUCTUNIT_productId_unitId_key" ON "TBLPRODUCTUNIT"("productId", "unitId");

-- CreateIndex
CREATE INDEX "TBLSTATUS_companyId_idx" ON "TBLSTATUS"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLSTATUS_companyId_code_key" ON "TBLSTATUS"("companyId", "code");

-- CreateIndex
CREATE INDEX "TBLPALLETTYPE_companyId_idx" ON "TBLPALLETTYPE"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLPALLETTYPE_companyId_code_key" ON "TBLPALLETTYPE"("companyId", "code");

-- CreateIndex
CREATE INDEX "TBLPALLET_companyId_idx" ON "TBLPALLET"("companyId");

-- CreateIndex
CREATE INDEX "TBLPALLET_palletTypeId_idx" ON "TBLPALLET"("palletTypeId");

-- CreateIndex
CREATE INDEX "TBLPALLET_parentPalletId_idx" ON "TBLPALLET"("parentPalletId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLPALLET_companyId_palletNo_key" ON "TBLPALLET"("companyId", "palletNo");

-- CreateIndex
CREATE INDEX "TBLSTOCK_companyId_idx" ON "TBLSTOCK"("companyId");

-- CreateIndex
CREATE INDEX "TBLSTOCK_locationId_idx" ON "TBLSTOCK"("locationId");

-- CreateIndex
CREATE INDEX "TBLSTOCK_productId_idx" ON "TBLSTOCK"("productId");

-- CreateIndex
CREATE INDEX "TBLSTOCK_statusId_idx" ON "TBLSTOCK"("statusId");

-- CreateIndex
CREATE INDEX "TBLSTOCK_palletId_idx" ON "TBLSTOCK"("palletId");

-- CreateIndex
CREATE INDEX "TBLSTOCK_expiryDate_idx" ON "TBLSTOCK"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "TBLSTOCK_companyId_locationId_productId_statusId_batchNo_se_key" ON "TBLSTOCK"("companyId", "locationId", "productId", "statusId", "batchNo", "serialNo", "palletId");

-- CreateIndex
CREATE INDEX "TBLLOCATION_companyId_idx" ON "TBLLOCATION"("companyId");

-- CreateIndex
CREATE INDEX "TBLLOCATION_areaId_idx" ON "TBLLOCATION"("areaId");

-- CreateIndex
CREATE INDEX "TBLLOCATION_parentId_idx" ON "TBLLOCATION"("parentId");

-- CreateIndex
CREATE INDEX "TBLLOCATION_barcode_idx" ON "TBLLOCATION"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "TBLLOCATION_companyId_warehouseId_code_key" ON "TBLLOCATION"("companyId", "warehouseId", "code");

-- CreateIndex
CREATE INDEX "TBLPRODUCT_companyId_idx" ON "TBLPRODUCT"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLPRODUCT_companyId_code_key" ON "TBLPRODUCT"("companyId", "code");

-- CreateIndex
CREATE INDEX "TBLUNIT_companyId_idx" ON "TBLUNIT"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLUNIT_companyId_code_key" ON "TBLUNIT"("companyId", "code");

-- CreateIndex
CREATE INDEX "TBLWAREHOUSE_companyId_idx" ON "TBLWAREHOUSE"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLWAREHOUSE_companyId_code_key" ON "TBLWAREHOUSE"("companyId", "code");

-- AddForeignKey
ALTER TABLE "TBLWAREHOUSE" ADD CONSTRAINT "TBLWAREHOUSE_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "TBLCOMPANY"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLAREA" ADD CONSTRAINT "TBLAREA_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "TBLCOMPANY"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLAREA" ADD CONSTRAINT "TBLAREA_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "TBLWAREHOUSE"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLLOCATION" ADD CONSTRAINT "TBLLOCATION_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "TBLCOMPANY"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLLOCATION" ADD CONSTRAINT "TBLLOCATION_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "TBLAREA"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLLOCATION" ADD CONSTRAINT "TBLLOCATION_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TBLLOCATION"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLUNIT" ADD CONSTRAINT "TBLUNIT_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "TBLCOMPANY"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLPRODUCT" ADD CONSTRAINT "TBLPRODUCT_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "TBLCOMPANY"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLPRODUCTUNIT" ADD CONSTRAINT "TBLPRODUCTUNIT_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TBLPRODUCT"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLPRODUCTUNIT" ADD CONSTRAINT "TBLPRODUCTUNIT_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "TBLUNIT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLPRODUCTUNIT" ADD CONSTRAINT "TBLPRODUCTUNIT_weightUnitId_fkey" FOREIGN KEY ("weightUnitId") REFERENCES "TBLUNIT"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLSTATUS" ADD CONSTRAINT "TBLSTATUS_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "TBLCOMPANY"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLPALLETTYPE" ADD CONSTRAINT "TBLPALLETTYPE_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "TBLCOMPANY"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLPALLET" ADD CONSTRAINT "TBLPALLET_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "TBLCOMPANY"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLPALLET" ADD CONSTRAINT "TBLPALLET_palletTypeId_fkey" FOREIGN KEY ("palletTypeId") REFERENCES "TBLPALLETTYPE"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLPALLET" ADD CONSTRAINT "TBLPALLET_parentPalletId_fkey" FOREIGN KEY ("parentPalletId") REFERENCES "TBLPALLET"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLPALLET" ADD CONSTRAINT "TBLPALLET_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "TBLUNIT"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLSTOCK" ADD CONSTRAINT "TBLSTOCK_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "TBLCOMPANY"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLSTOCK" ADD CONSTRAINT "TBLSTOCK_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "TBLLOCATION"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLSTOCK" ADD CONSTRAINT "TBLSTOCK_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TBLPRODUCT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLSTOCK" ADD CONSTRAINT "TBLSTOCK_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "TBLSTATUS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLSTOCK" ADD CONSTRAINT "TBLSTOCK_palletId_fkey" FOREIGN KEY ("palletId") REFERENCES "TBLPALLET"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TBLSTOCK" ADD CONSTRAINT "TBLSTOCK_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "TBLUNIT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

