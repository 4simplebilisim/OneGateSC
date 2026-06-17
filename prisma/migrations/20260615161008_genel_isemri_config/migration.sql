-- CreateTable
CREATE TABLE "TBLLANGUAGE" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLLANGUAGE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLSHIFT" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100),
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "businessPartnerId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLSHIFT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLSCREENREPORTLINK" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "screenButtonCode" VARCHAR(50),
    "reportCode" VARCHAR(50),
    "businessPartnerId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLSCREENREPORTLINK_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLSTOCKCONTROLPARAMETER" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "businessPartnerId" INTEGER,
    "distributionType" INTEGER,
    "customerPriority" INTEGER,
    "shipmentPriority" INTEGER,
    "askUser" BOOLEAN NOT NULL DEFAULT false,
    "dontUpdatePreparedQty" BOOLEAN NOT NULL DEFAULT false,
    "controlStatus" VARCHAR(50),
    "errorOnAllSplit" BOOLEAN NOT NULL DEFAULT false,
    "controlLocation" VARCHAR(200),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLSTOCKCONTROLPARAMETER_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLDOCUMENTPLANNINGPARAMETER" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "plannedDocStatusId" INTEGER,
    "planningOperationTypeId" INTEGER,
    "partCount" INTEGER,
    "businessPartnerId" INTEGER,
    "splitByProductGroup" BOOLEAN NOT NULL DEFAULT false,
    "fieldEntry" BOOLEAN NOT NULL DEFAULT false,
    "templateOperationTypeId" INTEGER,
    "updateMainQty" BOOLEAN NOT NULL DEFAULT false,
    "locationAssign" BOOLEAN NOT NULL DEFAULT false,
    "extraField11" INTEGER,
    "extraField12" INTEGER,
    "extraField21" INTEGER,
    "extraField22" INTEGER,
    "extraField31" INTEGER,
    "extraField32" INTEGER,
    "extraField41" INTEGER,
    "extraField42" INTEGER,
    "extraField51" INTEGER,
    "extraField52" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLDOCUMENTPLANNINGPARAMETER_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLPICKORDERPARAMETER" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "businessPartnerId" INTEGER,
    "fullPalletOpId" INTEGER,
    "fullCaseOpId" INTEGER,
    "partialProductOpId" INTEGER,
    "fullPalletUnitId" INTEGER,
    "fullCaseUnitId" INTEGER,
    "partialProductUnitId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLPICKORDERPARAMETER_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLDASHBOARDREPORT" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "type" INTEGER,
    "reportSp" VARCHAR(200),
    "defaultReport" BOOLEAN NOT NULL DEFAULT false,
    "reportName" VARCHAR(200),
    "userLinkType" INTEGER,
    "userLinkId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLDASHBOARDREPORT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLWAREHOUSEVEHICLE" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100),
    "status" INTEGER,
    "pallet" BOOLEAN NOT NULL DEFAULT false,
    "workType" INTEGER,
    "quantity" DECIMAL(28,8),
    "unitId" INTEGER,
    "businessPartnerId" INTEGER,
    "ipAddress" VARCHAR(50),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLWAREHOUSEVEHICLE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLWORKORDERGENERALPARAMETER" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "businessPartnerId" INTEGER,
    "alarmDuration" INTEGER,
    "alarmUnit" INTEGER,
    "pickCancelOpId" INTEGER,
    "rackFeedbackOpId" INTEGER,
    "askEntryLocation" BOOLEAN NOT NULL DEFAULT false,
    "locationPriority" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLWORKORDERGENERALPARAMETER_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLWORKORDERREASON" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" VARCHAR(200),
    "isCancel" BOOLEAN NOT NULL DEFAULT false,
    "autoCreateOrder" BOOLEAN NOT NULL DEFAULT false,
    "businessPartnerId" INTEGER,
    "createDocument" BOOLEAN NOT NULL DEFAULT false,
    "clearSystemFault" BOOLEAN NOT NULL DEFAULT false,
    "breakPassword" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLWORKORDERREASON_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLWORKORDERREFERENCEOPERATION" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "category" INTEGER,
    "operationTypeId" INTEGER NOT NULL,
    "businessPartnerId" INTEGER,
    "headerId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLWORKORDERREFERENCEOPERATION_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLRACKFEEDPARAMETER" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "businessPartnerId" INTEGER,
    "locationGroupId" INTEGER,
    "onStockEmpty" BOOLEAN NOT NULL DEFAULT false,
    "capacityPercent" DECIMAL(28,8),
    "palletBreaking" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLRACKFEEDPARAMETER_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLMENUGROUP" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" VARCHAR(200),
    "screenType" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLMENUGROUP_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TBLLANGUAGE_companyId_idx" ON "TBLLANGUAGE"("companyId");

-- CreateIndex
CREATE INDEX "TBLSHIFT_companyId_idx" ON "TBLSHIFT"("companyId");

-- CreateIndex
CREATE INDEX "TBLSCREENREPORTLINK_companyId_idx" ON "TBLSCREENREPORTLINK"("companyId");

-- CreateIndex
CREATE INDEX "TBLSTOCKCONTROLPARAMETER_companyId_idx" ON "TBLSTOCKCONTROLPARAMETER"("companyId");

-- CreateIndex
CREATE INDEX "TBLDOCUMENTPLANNINGPARAMETER_companyId_idx" ON "TBLDOCUMENTPLANNINGPARAMETER"("companyId");

-- CreateIndex
CREATE INDEX "TBLPICKORDERPARAMETER_companyId_idx" ON "TBLPICKORDERPARAMETER"("companyId");

-- CreateIndex
CREATE INDEX "TBLDASHBOARDREPORT_companyId_idx" ON "TBLDASHBOARDREPORT"("companyId");

-- CreateIndex
CREATE INDEX "TBLWAREHOUSEVEHICLE_companyId_idx" ON "TBLWAREHOUSEVEHICLE"("companyId");

-- CreateIndex
CREATE INDEX "TBLWORKORDERGENERALPARAMETER_companyId_idx" ON "TBLWORKORDERGENERALPARAMETER"("companyId");

-- CreateIndex
CREATE INDEX "TBLWORKORDERREASON_companyId_idx" ON "TBLWORKORDERREASON"("companyId");

-- CreateIndex
CREATE INDEX "TBLWORKORDERREFERENCEOPERATION_companyId_idx" ON "TBLWORKORDERREFERENCEOPERATION"("companyId");

-- CreateIndex
CREATE INDEX "TBLRACKFEEDPARAMETER_companyId_idx" ON "TBLRACKFEEDPARAMETER"("companyId");

-- CreateIndex
CREATE INDEX "TBLMENUGROUP_companyId_idx" ON "TBLMENUGROUP"("companyId");

