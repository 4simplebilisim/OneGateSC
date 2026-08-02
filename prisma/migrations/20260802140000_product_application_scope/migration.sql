-- Ürün kartında "kullanım alanı": ürün hangi platformlarda kullanılabilir (WMS / Procurement / ikisi).
-- KISITLAMA listesi deseni: satır YOKSA ürün her platformda görünür → mevcut 209 ürün etkilenmez.
CREATE TABLE wms."TBLPRODUCTAPPLICATION" (
  "id" SERIAL PRIMARY KEY,
  "companyId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "applicationId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TBLPRODUCTAPPLICATION_productId_fkey" FOREIGN KEY ("productId")
    REFERENCES wms."TBLPRODUCT"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TBLPRODUCTAPPLICATION_applicationId_fkey" FOREIGN KEY ("applicationId")
    REFERENCES wms."TBLAPPLICATION"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TBLPRODUCTAPPLICATION_productId_applicationId_key" ON wms."TBLPRODUCTAPPLICATION"("productId", "applicationId");
CREATE INDEX "TBLPRODUCTAPPLICATION_companyId_idx" ON wms."TBLPRODUCTAPPLICATION"("companyId");
CREATE INDEX "TBLPRODUCTAPPLICATION_productId_idx" ON wms."TBLPRODUCTAPPLICATION"("productId");
