
-- CreateEnum
CREATE TYPE "IntegrationDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('PENDING', 'SUCCESS', 'ERROR');

-- CreateTable
CREATE TABLE "TBLINTEGRATIONLOG" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "direction" "IntegrationDirection" NOT NULL,
    "entityType" VARCHAR(40) NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'SUCCESS',
    "referenceKey" VARCHAR(100),
    "message" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TBLINTEGRATIONLOG_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TBLINTEGRATIONLOG_companyId_idx" ON "TBLINTEGRATIONLOG"("companyId");

-- CreateIndex
CREATE INDEX "TBLINTEGRATIONLOG_direction_idx" ON "TBLINTEGRATIONLOG"("direction");

