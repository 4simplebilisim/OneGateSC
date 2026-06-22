-- AlterTable
ALTER TABLE "TBLDOCUMENTLINE" ADD COLUMN     "collectedQty" DECIMAL(28,8),
ADD COLUMN     "preparedQty" DECIMAL(28,8);

-- CreateTable
CREATE TABLE "TBLDOCUMENTLINESCOPE" (
    "id" SERIAL NOT NULL,
    "documentLineId" INTEGER NOT NULL,
    "scopeNo" INTEGER NOT NULL,
    "quantity" DECIMAL(28,8) NOT NULL,
    "unitId" INTEGER NOT NULL,
    "sourceLocationId" INTEGER,
    "sourceStatusId" INTEGER,
    "targetLocationId" INTEGER,
    "targetStatusId" INTEGER,
    "palletId" INTEGER,
    "batchNo" VARCHAR(100),
    "serialNo" VARCHAR(100),
    "customerId" INTEGER,
    "poNo" VARCHAR(50),
    "poLine" VARCHAR(50),
    "vehicleId" INTEGER,
    "netWeight" DECIMAL(28,8),
    "grossWeight" DECIMAL(28,8),
    "reasonId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLDOCUMENTLINESCOPE_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TBLDOCUMENTLINESCOPE_documentLineId_idx" ON "TBLDOCUMENTLINESCOPE"("documentLineId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLDOCUMENTLINESCOPE_documentLineId_scopeNo_key" ON "TBLDOCUMENTLINESCOPE"("documentLineId", "scopeNo");

-- AddForeignKey
ALTER TABLE "TBLDOCUMENTLINESCOPE" ADD CONSTRAINT "TBLDOCUMENTLINESCOPE_documentLineId_fkey" FOREIGN KEY ("documentLineId") REFERENCES "TBLDOCUMENTLINE"("id") ON DELETE CASCADE ON UPDATE CASCADE;