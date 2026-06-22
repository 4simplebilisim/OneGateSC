-- CreateEnum
CREATE TYPE "ExtraFieldKind" AS ENUM ('DYNAMIC', 'STATIC');

-- CreateEnum
CREATE TYPE "ExtraFieldEntity" AS ENUM ('MATERIAL', 'PARTNER', 'DOC_HEADER', 'DOC_DETAIL', 'DOC_SCOPE', 'PALLET', 'STOCK', 'PALLET_NOTIFY_HEADER', 'OPERATION_DOC_DETAIL');

-- CreateEnum
CREATE TYPE "ExtraFieldDataType" AS ENUM ('MULTI_SELECT_FIXED', 'TEXT', 'NUMERIC', 'DATE', 'LOOKUP');

-- CreateTable
CREATE TABLE "TBLEXTRAFIELD" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "fieldKind" "ExtraFieldKind" NOT NULL DEFAULT 'DYNAMIC',
    "entityType" "ExtraFieldEntity" NOT NULL,
    "trackingCode" VARCHAR(40),
    "description" VARCHAR(200) NOT NULL,
    "fieldDataType" "ExtraFieldDataType" NOT NULL,
    "defaultValue" VARCHAR(200),
    "maxAnswerCount" INTEGER,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "minLength" INTEGER,
    "maxLength" INTEGER,
    "useAsIncrementing" BOOLEAN NOT NULL DEFAULT false,
    "transferOnDocSplit" BOOLEAN NOT NULL DEFAULT false,
    "reference" VARCHAR(200),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLEXTRAFIELD_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLEXTRAFIELDOPTION" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "extraFieldId" INTEGER NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "description" VARCHAR(200),
    "sortOrder" INTEGER,
    "reference" VARCHAR(200),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLEXTRAFIELDOPTION_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TBLOPERATIONTYPEEXTRAFIELD" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "operationTypeId" INTEGER NOT NULL,
    "extraFieldId" INTEGER NOT NULL,
    "isStatic" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER,
    "useInTerminal" BOOLEAN NOT NULL DEFAULT false,
    "useInApproval" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLOPERATIONTYPEEXTRAFIELD_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TBLEXTRAFIELD_companyId_idx" ON "TBLEXTRAFIELD"("companyId");

-- CreateIndex
CREATE INDEX "TBLEXTRAFIELDOPTION_companyId_idx" ON "TBLEXTRAFIELDOPTION"("companyId");

-- CreateIndex
CREATE INDEX "TBLEXTRAFIELDOPTION_extraFieldId_idx" ON "TBLEXTRAFIELDOPTION"("extraFieldId");

-- CreateIndex
CREATE INDEX "TBLOPERATIONTYPEEXTRAFIELD_companyId_idx" ON "TBLOPERATIONTYPEEXTRAFIELD"("companyId");

-- CreateIndex
CREATE INDEX "TBLOPERATIONTYPEEXTRAFIELD_operationTypeId_idx" ON "TBLOPERATIONTYPEEXTRAFIELD"("operationTypeId");

-- AddForeignKey
ALTER TABLE "TBLEXTRAFIELDOPTION" ADD CONSTRAINT "TBLEXTRAFIELDOPTION_extraFieldId_fkey" FOREIGN KEY ("extraFieldId") REFERENCES "TBLEXTRAFIELD"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

