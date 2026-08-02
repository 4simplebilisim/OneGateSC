-- Platformlar arası entegrasyon ayarı: WMS ↔ Procurement bağlantısı ve hangi operasyona senkronlanacağı.
-- Satır YOKSA entegrasyon KAPALI → yalnız WMS, yalnız Procurement veya ikisi bağımsız kurulumlar bozulmaz.
CREATE TABLE wms."TBLPLATFORMINTEGRATION" (
  "id" SERIAL PRIMARY KEY,
  "companyId" INTEGER NOT NULL,
  "facilityId" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "receiptOperationTypeId" INTEGER,
  "autoCreateReceipt" BOOLEAN NOT NULL DEFAULT true,
  "updateOrderOnComplete" BOOLEAN NOT NULL DEFAULT true,
  "note" VARCHAR(255),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TBLPLATFORMINTEGRATION_companyId_fkey" FOREIGN KEY ("companyId")
    REFERENCES wms."TBLCOMPANY"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TBLPLATFORMINTEGRATION_facilityId_fkey" FOREIGN KEY ("facilityId")
    REFERENCES wms."TBLFACILITY"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TBLPLATFORMINTEGRATION_receiptOperationTypeId_fkey" FOREIGN KEY ("receiptOperationTypeId")
    REFERENCES wms."TBLOPERATIONTYPE"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TBLPLATFORMINTEGRATION_companyId_facilityId_key" ON wms."TBLPLATFORMINTEGRATION"("companyId", "facilityId");
CREATE INDEX "TBLPLATFORMINTEGRATION_companyId_idx" ON wms."TBLPLATFORMINTEGRATION"("companyId");
