-- CreateTable
CREATE TABLE "TBLROUTINGPARAMETER" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "routingTypeId" INTEGER NOT NULL,
    "cariLinkType" "LinkScope",
    "cariLinkId" INTEGER,
    "materialLinkType" "LinkScope",
    "materialLinkId" INTEGER,
    "sortOrder" INTEGER,
    "controlFieldId" INTEGER,
    "messageType" "CapacityMessageType" NOT NULL DEFAULT 'WARNING',
    "conditionBreak" BOOLEAN NOT NULL DEFAULT false,
    "controlMode" VARCHAR(40),
    "spName" VARCHAR(120),
    "controlTypeDescription" VARCHAR(200),
    "incrementalSort" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLROUTINGPARAMETER_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TBLROUTINGPARAMETER_companyId_idx" ON "TBLROUTINGPARAMETER"("companyId");

-- CreateIndex
CREATE INDEX "TBLROUTINGPARAMETER_routingTypeId_idx" ON "TBLROUTINGPARAMETER"("routingTypeId");

