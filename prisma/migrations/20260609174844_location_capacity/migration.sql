-- CreateEnum
CREATE TYPE "CapacityMessageType" AS ENUM ('ERROR', 'WARNING');

-- CreateTable
CREATE TABLE "TBLLOCATIONCAPACITY" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "locationLinkType" "LocationLinkType" NOT NULL,
    "locationLinkCode" INTEGER NOT NULL,
    "materialLinkType" "MaterialLinkType",
    "materialLinkCode" INTEGER,
    "quantity" DECIMAL(28,8),
    "unitId" INTEGER,
    "palletQty" DECIMAL(28,8),
    "toleranceQty" DECIMAL(28,8),
    "toleranceUnitId" INTEGER,
    "width" DECIMAL(18,4),
    "length" DECIMAL(18,4),
    "height" DECIMAL(18,4),
    "placementHeight" DECIMAL(18,4),
    "dimensionUnitId" INTEGER,
    "weight" DECIMAL(18,4),
    "weightUnitId" INTEGER,
    "messageType" "CapacityMessageType" NOT NULL DEFAULT 'ERROR',
    "distributeToCells" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLLOCATIONCAPACITY_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TBLLOCATIONCAPACITY_companyId_idx" ON "TBLLOCATIONCAPACITY"("companyId");

-- CreateIndex
CREATE INDEX "TBLLOCATIONCAPACITY_locationLinkCode_idx" ON "TBLLOCATIONCAPACITY"("locationLinkCode");

-- AddForeignKey
ALTER TABLE "TBLLOCATIONCAPACITY" ADD CONSTRAINT "TBLLOCATIONCAPACITY_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "TBLCOMPANY"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

