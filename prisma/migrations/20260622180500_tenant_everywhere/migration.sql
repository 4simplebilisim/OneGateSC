-- Tüm alt-kayıtlara tenant (companyId) ekle — parent kaydın companyId'siyle aynı.
-- Idempotent (IF NOT EXISTS) + şema-qualified (çoklu-şema: wms/procurement/sales/logistics/finance).
-- 11 satır-tablosu NOT NULL; 2 kullanıcı junction'ı nullable (super-admin null olabilir).

-- ===== wms: tek-hop NOT NULL =====
ALTER TABLE wms."TBLDOCUMENTLINE" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;
UPDATE wms."TBLDOCUMENTLINE" t SET "companyId" = p."companyId" FROM wms."TBLDOCUMENT" p WHERE t."documentId" = p."id" AND t."companyId" IS NULL;
ALTER TABLE wms."TBLDOCUMENTLINE" ALTER COLUMN "companyId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "TBLDOCUMENTLINE_companyId_idx" ON wms."TBLDOCUMENTLINE"("companyId");

ALTER TABLE wms."TBLPRODUCTUNIT" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;
UPDATE wms."TBLPRODUCTUNIT" t SET "companyId" = p."companyId" FROM wms."TBLPRODUCT" p WHERE t."productId" = p."id" AND t."companyId" IS NULL;
ALTER TABLE wms."TBLPRODUCTUNIT" ALTER COLUMN "companyId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "TBLPRODUCTUNIT_companyId_idx" ON wms."TBLPRODUCTUNIT"("companyId");

ALTER TABLE wms."TBLPRODUCTSUBSTITUTE" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;
UPDATE wms."TBLPRODUCTSUBSTITUTE" t SET "companyId" = p."companyId" FROM wms."TBLPRODUCT" p WHERE t."productId" = p."id" AND t."companyId" IS NULL;
ALTER TABLE wms."TBLPRODUCTSUBSTITUTE" ALTER COLUMN "companyId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "TBLPRODUCTSUBSTITUTE_companyId_idx" ON wms."TBLPRODUCTSUBSTITUTE"("companyId");

ALTER TABLE wms."TBLSTOCKCOUNTLINE" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;
UPDATE wms."TBLSTOCKCOUNTLINE" t SET "companyId" = p."companyId" FROM wms."TBLSTOCKCOUNT" p WHERE t."countId" = p."id" AND t."companyId" IS NULL;
ALTER TABLE wms."TBLSTOCKCOUNTLINE" ALTER COLUMN "companyId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "TBLSTOCKCOUNTLINE_companyId_idx" ON wms."TBLSTOCKCOUNTLINE"("companyId");

ALTER TABLE wms."TBLWORKORDERLINE" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;
UPDATE wms."TBLWORKORDERLINE" t SET "companyId" = p."companyId" FROM wms."TBLWORKORDER" p WHERE t."workOrderId" = p."id" AND t."companyId" IS NULL;
ALTER TABLE wms."TBLWORKORDERLINE" ALTER COLUMN "companyId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "TBLWORKORDERLINE_companyId_idx" ON wms."TBLWORKORDERLINE"("companyId");

-- ===== wms: iki-hop NOT NULL =====
ALTER TABLE wms."TBLDOCUMENTLINESCOPE" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;
UPDATE wms."TBLDOCUMENTLINESCOPE" t SET "companyId" = d."companyId"
  FROM wms."TBLDOCUMENTLINE" dl JOIN wms."TBLDOCUMENT" d ON dl."documentId" = d."id"
  WHERE t."documentLineId" = dl."id" AND t."companyId" IS NULL;
ALTER TABLE wms."TBLDOCUMENTLINESCOPE" ALTER COLUMN "companyId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "TBLDOCUMENTLINESCOPE_companyId_idx" ON wms."TBLDOCUMENTLINESCOPE"("companyId");

-- ===== procurement =====
ALTER TABLE procurement."TBLPURCHASEORDERLINE" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;
UPDATE procurement."TBLPURCHASEORDERLINE" t SET "companyId" = p."companyId" FROM procurement."TBLPURCHASEORDER" p WHERE t."orderId" = p."id" AND t."companyId" IS NULL;
ALTER TABLE procurement."TBLPURCHASEORDERLINE" ALTER COLUMN "companyId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "TBLPURCHASEORDERLINE_companyId_idx" ON procurement."TBLPURCHASEORDERLINE"("companyId");

-- ===== sales =====
ALTER TABLE sales."TBLSALESORDERLINE" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;
UPDATE sales."TBLSALESORDERLINE" t SET "companyId" = p."companyId" FROM sales."TBLSALESORDER" p WHERE t."orderId" = p."id" AND t."companyId" IS NULL;
ALTER TABLE sales."TBLSALESORDERLINE" ALTER COLUMN "companyId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "TBLSALESORDERLINE_companyId_idx" ON sales."TBLSALESORDERLINE"("companyId");

ALTER TABLE sales."TBLSALESALLOCATION" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;
UPDATE sales."TBLSALESALLOCATION" t SET "companyId" = o."companyId"
  FROM sales."TBLSALESORDERLINE" ol JOIN sales."TBLSALESORDER" o ON ol."orderId" = o."id"
  WHERE t."orderLineId" = ol."id" AND t."companyId" IS NULL;
ALTER TABLE sales."TBLSALESALLOCATION" ALTER COLUMN "companyId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "TBLSALESALLOCATION_companyId_idx" ON sales."TBLSALESALLOCATION"("companyId");

-- ===== logistics =====
ALTER TABLE logistics."TBLSHIPMENTSTOP" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;
UPDATE logistics."TBLSHIPMENTSTOP" t SET "companyId" = p."companyId" FROM logistics."TBLSHIPMENT" p WHERE t."shipmentId" = p."id" AND t."companyId" IS NULL;
ALTER TABLE logistics."TBLSHIPMENTSTOP" ALTER COLUMN "companyId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "TBLSHIPMENTSTOP_companyId_idx" ON logistics."TBLSHIPMENTSTOP"("companyId");

-- ===== finance =====
ALTER TABLE finance."TBLINVOICELINE" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;
UPDATE finance."TBLINVOICELINE" t SET "companyId" = p."companyId" FROM finance."TBLINVOICE" p WHERE t."invoiceId" = p."id" AND t."companyId" IS NULL;
ALTER TABLE finance."TBLINVOICELINE" ALTER COLUMN "companyId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "TBLINVOICELINE_companyId_idx" ON finance."TBLINVOICELINE"("companyId");

-- ===== wms: kullanıcı junction'ları NULLABLE =====
ALTER TABLE wms."TBLUSERROLE" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;
UPDATE wms."TBLUSERROLE" t SET "companyId" = u."companyId" FROM wms."TBLUSER" u WHERE t."userId" = u."id" AND t."companyId" IS NULL;
CREATE INDEX IF NOT EXISTS "TBLUSERROLE_companyId_idx" ON wms."TBLUSERROLE"("companyId");

ALTER TABLE wms."TBLUSERGROUPMEMBER" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;
UPDATE wms."TBLUSERGROUPMEMBER" t SET "companyId" = u."companyId" FROM wms."TBLUSER" u WHERE t."userId" = u."id" AND t."companyId" IS NULL;
CREATE INDEX IF NOT EXISTS "TBLUSERGROUPMEMBER_companyId_idx" ON wms."TBLUSERGROUPMEMBER"("companyId");
