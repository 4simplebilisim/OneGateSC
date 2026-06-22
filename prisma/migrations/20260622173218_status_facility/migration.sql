-- CreateTable
CREATE TABLE "TBLSTATUSFACILITY" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "statusId" INTEGER NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TBLSTATUSFACILITY_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TBLSTATUSFACILITY_companyId_idx" ON "TBLSTATUSFACILITY"("companyId");

-- CreateIndex
CREATE INDEX "TBLSTATUSFACILITY_statusId_idx" ON "TBLSTATUSFACILITY"("statusId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLSTATUSFACILITY_statusId_facilityId_key" ON "TBLSTATUSFACILITY"("statusId", "facilityId");

-- AddForeignKey
ALTER TABLE "TBLSTATUSFACILITY" ADD CONSTRAINT "TBLSTATUSFACILITY_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "TBLSTATUS"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: tesis artık zorunlu — mevcut statüleri tenant'larının TÜM tesislerine bağla
-- (geriye uyumluluk; aynı statüyü tenant'ın tüm tesisleri paylaşır)
INSERT INTO "TBLSTATUSFACILITY" ("companyId", "statusId", "facilityId", "createdAt")
SELECT s."companyId", s."id", f."id", CURRENT_TIMESTAMP
FROM "TBLSTATUS" s
JOIN "TBLFACILITY" f ON f."companyId" = s."companyId";
