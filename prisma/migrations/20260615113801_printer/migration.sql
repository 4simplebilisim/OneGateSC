-- CreateEnum
CREATE TYPE "PrinterType" AS ENUM ('IPP', 'ZPL', 'SYSTEM');

-- CreateTable
CREATE TABLE "TBLPRINTER" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120),
    "type" "PrinterType" NOT NULL DEFAULT 'IPP',
    "host" VARCHAR(120),
    "port" INTEGER,
    "path" VARCHAR(200),
    "location" VARCHAR(120),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "discovered" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLPRINTER_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TBLPRINTER_companyId_idx" ON "TBLPRINTER"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLPRINTER_companyId_code_key" ON "TBLPRINTER"("companyId", "code");

-- AddForeignKey
ALTER TABLE "TBLPRINTER" ADD CONSTRAINT "TBLPRINTER_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "TBLCOMPANY"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

