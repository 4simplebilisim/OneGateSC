-- CreateTable
CREATE TABLE "TBLSTOCKLEDGER" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "documentId" INTEGER,
    "operationTypeId" INTEGER,
    "direction" "MovementDirection" NOT NULL,
    "productId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "statusId" INTEGER NOT NULL,
    "qtyDelta" DECIMAL(28,8) NOT NULL,
    "batchNo" VARCHAR(50),
    "unitId" INTEGER NOT NULL,
    "documentLineId" INTEGER,
    "serialNo" VARCHAR(50),
    "palletId" INTEGER,
    "poNo" VARCHAR(50),
    "poLine" VARCHAR(50),
    "barcode" VARCHAR(150),
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TBLSTOCKLEDGER_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TBLSTOCKLEDGER_companyId_idx" ON "TBLSTOCKLEDGER"("companyId");

-- CreateIndex
CREATE INDEX "TBLSTOCKLEDGER_companyId_productId_idx" ON "TBLSTOCKLEDGER"("companyId", "productId");

-- CreateIndex
CREATE INDEX "TBLSTOCKLEDGER_companyId_locationId_idx" ON "TBLSTOCKLEDGER"("companyId", "locationId");

-- CreateIndex
CREATE INDEX "TBLSTOCKLEDGER_documentId_idx" ON "TBLSTOCKLEDGER"("documentId");

-- CreateIndex
CREATE INDEX "TBLSTOCKLEDGER_createdAt_idx" ON "TBLSTOCKLEDGER"("createdAt");