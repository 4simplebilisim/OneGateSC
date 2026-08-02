-- Platform ürün kataloğu + firma lisansı + kullanıcı erişimi (WMS · Satınalma)
CREATE TABLE wms."TBLAPPLICATION" (
  "id" SERIAL PRIMARY KEY,
  "code" VARCHAR(20) NOT NULL UNIQUE,
  "name" VARCHAR(60) NOT NULL,
  "description" VARCHAR(255),
  "path" VARCHAR(60) NOT NULL,
  "icon" VARCHAR(40),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE wms."TBLCOMPANYLICENSE" (
  "id" SERIAL PRIMARY KEY,
  "companyId" INTEGER NOT NULL,
  "applicationId" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "validFrom" DATE,
  "validUntil" DATE,
  "userLimit" INTEGER,
  "note" VARCHAR(255),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TBLCOMPANYLICENSE_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES wms."TBLCOMPANY"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TBLCOMPANYLICENSE_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES wms."TBLAPPLICATION"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TBLCOMPANYLICENSE_companyId_applicationId_key" ON wms."TBLCOMPANYLICENSE"("companyId", "applicationId");
CREATE INDEX "TBLCOMPANYLICENSE_companyId_idx" ON wms."TBLCOMPANYLICENSE"("companyId");

CREATE TABLE wms."TBLUSERAPPACCESS" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "applicationId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TBLUSERAPPACCESS_userId_fkey" FOREIGN KEY ("userId") REFERENCES wms."TBLUSER"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TBLUSERAPPACCESS_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES wms."TBLAPPLICATION"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TBLUSERAPPACCESS_userId_applicationId_key" ON wms."TBLUSERAPPACCESS"("userId", "applicationId");
CREATE INDEX "TBLUSERAPPACCESS_userId_idx" ON wms."TBLUSERAPPACCESS"("userId");

-- Ürün kataloğu
INSERT INTO wms."TBLAPPLICATION" ("code","name","description","path","icon","sortOrder","updatedAt") VALUES
  ('WMS','OneGate WMS','Mal kabul, yerleştirme, toplama, sayım, sevkiyat','/','AppstoreOutlined',1,now()),
  ('PROC','OneGate Procurement','Talep, teklif, sipariş, sözleşme, fatura','/satinalma','ShoppingCartOutlined',2,now());

-- Mevcut firmalara her iki ürünü de lisansla (tek firma kurulumu; sonradan ekranından yönetilir)
INSERT INTO wms."TBLCOMPANYLICENSE" ("companyId","applicationId","isActive","updatedAt")
SELECT c.id, a.id, true, now() FROM wms."TBLCOMPANY" c CROSS JOIN wms."TBLAPPLICATION" a
ON CONFLICT ("companyId","applicationId") DO NOTHING;
