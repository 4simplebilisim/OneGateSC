-- 4Proc → OneGate ortak çekirdek veri taşıması. Kaynak: p4src şeması (Supabase dökümünden).
-- psql -v dry=1 → ROLLBACK (dry-run) · -v dry=0 → COMMIT. Idempotent: WHERE NOT EXISTS / ON CONFLICT.
\set ON_ERROR_STOP on
BEGIN;

-- ── 0) bağlam: tek firma ONEGATE ─────────────────────────────────────────────
CREATE TEMP TABLE t_ctx AS SELECT id AS cid FROM wms."TBLCOMPANY" WHERE code = 'ONEGATE';
DO $$ BEGIN IF (SELECT count(*) FROM t_ctx) <> 1 THEN RAISE EXCEPTION 'ONEGATE firması tek değil'; END IF; END $$;

-- ── 1) map tabloları ─────────────────────────────────────────────────────────
CREATE TEMP TABLE m_company AS SELECT "Id" old_id, (SELECT cid FROM t_ctx) new_id FROM p4src."TBL4S_Companies";

-- Organization → TBLFACILITY (code eşle, yoksa aç)
INSERT INTO wms."TBLFACILITY" ("companyId", code, name, "isActive", "updatedAt")
SELECT (SELECT cid FROM t_ctx), left(o."Code", 20), left(o."Name", 100), o."IsActive", now()
FROM p4src."TBL4S_Organizations" o
WHERE NOT EXISTS (SELECT 1 FROM wms."TBLFACILITY" f WHERE f."companyId" = (SELECT cid FROM t_ctx) AND lower(f.code) = lower(left(o."Code", 20)));
CREATE TEMP TABLE m_org AS
SELECT o."Id" old_id, f.id new_id FROM p4src."TBL4S_Organizations" o
JOIN wms."TBLFACILITY" f ON f."companyId" = (SELECT cid FROM t_ctx) AND lower(f.code) = lower(left(o."Code", 20));

-- Unit (lower(code) birleştirme)
INSERT INTO wms."TBLUNIT" ("companyId", code, name, "isActive", "updatedAt")
SELECT (SELECT cid FROM t_ctx), left(u."Code", 20), left(u."Name", 50), u."IsActive", now()
FROM p4src."TBL4S_Units" u
WHERE NOT EXISTS (SELECT 1 FROM wms."TBLUNIT" t WHERE t."companyId" = (SELECT cid FROM t_ctx) AND lower(t.code) = lower(left(u."Code", 20)));
CREATE TEMP TABLE m_unit AS
SELECT u."Id" old_id, t.id new_id FROM p4src."TBL4S_Units" u
JOIN wms."TBLUNIT" t ON t."companyId" = (SELECT cid FROM t_ctx) AND lower(t.code) = lower(left(u."Code", 20));

-- Currency / PaymentTerm / Incoterm (yeni ortak masterlar)
INSERT INTO wms."TBLCURRENCY" ("companyId", code, name, symbol, "isActive", "updatedAt")
SELECT (SELECT cid FROM t_ctx), left(c."Code", 10), left(c."Name", 50), left(c."Symbol", 10), c."IsActive", now()
FROM p4src."TBL4S_Currencies" c
WHERE NOT EXISTS (SELECT 1 FROM wms."TBLCURRENCY" t WHERE t."companyId" = (SELECT cid FROM t_ctx) AND t.code = left(c."Code", 10));
CREATE TEMP TABLE m_cur AS
SELECT c."Id" old_id, t.id new_id FROM p4src."TBL4S_Currencies" c
JOIN wms."TBLCURRENCY" t ON t."companyId" = (SELECT cid FROM t_ctx) AND t.code = left(c."Code", 10);

INSERT INTO wms."TBLPAYMENTTERM" ("companyId", code, name, days, "isActive", "updatedAt")
SELECT (SELECT cid FROM t_ctx), left(p."Code", 20), left(p."Name", 100), p."DaysNet", p."IsActive", now()
FROM p4src."TBL4S_PaymentTerms" p
WHERE NOT EXISTS (SELECT 1 FROM wms."TBLPAYMENTTERM" t WHERE t."companyId" = (SELECT cid FROM t_ctx) AND t.code = left(p."Code", 20));
CREATE TEMP TABLE m_pt AS
SELECT p."Id" old_id, t.id new_id FROM p4src."TBL4S_PaymentTerms" p
JOIN wms."TBLPAYMENTTERM" t ON t."companyId" = (SELECT cid FROM t_ctx) AND t.code = left(p."Code", 20);

INSERT INTO wms."TBLINCOTERM" ("companyId", code, name, description, "isActive", "updatedAt")
SELECT (SELECT cid FROM t_ctx), left(i."Code", 20), left(i."Name", 100), left(i."Description", 255), i."IsActive", now()
FROM p4src."TBL4S_Incoterms" i
WHERE NOT EXISTS (SELECT 1 FROM wms."TBLINCOTERM" t WHERE t."companyId" = (SELECT cid FROM t_ctx) AND t.code = left(i."Code", 20));
CREATE TEMP TABLE m_inco AS
SELECT i."Id" old_id, t.id new_id FROM p4src."TBL4S_Incoterms" i
JOIN wms."TBLINCOTERM" t ON t."companyId" = (SELECT cid FROM t_ctx) AND t.code = left(i."Code", 20);

-- SupplierType → TBLPARTNERGROUP · MaterialType/Group → TBLPRODUCTTYPE/GROUP
INSERT INTO wms."TBLPARTNERGROUP" ("companyId", code, name, "isActive", "updatedAt")
SELECT (SELECT cid FROM t_ctx), left(s."Code", 20), left(s."Name", 60), s."IsActive", now()
FROM p4src."TBL4S_SupplierTypes" s
WHERE NOT EXISTS (SELECT 1 FROM wms."TBLPARTNERGROUP" t WHERE t."companyId" = (SELECT cid FROM t_ctx) AND lower(t.code) = lower(left(s."Code", 20)));
CREATE TEMP TABLE m_suptype AS
SELECT s."Id" old_id, t.id new_id FROM p4src."TBL4S_SupplierTypes" s
JOIN wms."TBLPARTNERGROUP" t ON t."companyId" = (SELECT cid FROM t_ctx) AND lower(t.code) = lower(left(s."Code", 20));

INSERT INTO wms."TBLPRODUCTTYPE" ("companyId", code, name, "isActive", "updatedAt")
SELECT (SELECT cid FROM t_ctx), left(s."Code", 40), left(s."Name", 100), s."IsActive", now()
FROM p4src."TBL4S_MaterialTypes" s
WHERE NOT EXISTS (SELECT 1 FROM wms."TBLPRODUCTTYPE" t WHERE t."companyId" = (SELECT cid FROM t_ctx) AND lower(t.code) = lower(left(s."Code", 40)));
CREATE TEMP TABLE m_mattype AS
SELECT s."Id" old_id, t.id new_id FROM p4src."TBL4S_MaterialTypes" s
JOIN wms."TBLPRODUCTTYPE" t ON t."companyId" = (SELECT cid FROM t_ctx) AND lower(t.code) = lower(left(s."Code", 40));

INSERT INTO wms."TBLPRODUCTGROUP" ("companyId", code, name, "isActive", "updatedAt")
SELECT (SELECT cid FROM t_ctx), left(s."Code", 20), left(s."Name", 100), s."IsActive", now()
FROM p4src."TBL4S_MaterialGroups" s
WHERE NOT EXISTS (SELECT 1 FROM wms."TBLPRODUCTGROUP" t WHERE t."companyId" = (SELECT cid FROM t_ctx) AND lower(t.code) = lower(left(s."Code", 20)));
CREATE TEMP TABLE m_matgrp AS
SELECT s."Id" old_id, t.id new_id FROM p4src."TBL4S_MaterialGroups" s
JOIN wms."TBLPRODUCTGROUP" t ON t."companyId" = (SELECT cid FROM t_ctx) AND lower(t.code) = lower(left(s."Code", 20));

-- WareHouse → TBLWAREHOUSE · GRLocation → TBLLOCATION (tek depoya bağlanır)
INSERT INTO wms."TBLWAREHOUSE" ("companyId", code, name, "isActive", "updatedAt")
SELECT (SELECT cid FROM t_ctx), left(w."Code", 20), left(w."Name", 100), w."IsActive", now()
FROM p4src."TBL4S_WareHouses" w
WHERE NOT EXISTS (SELECT 1 FROM wms."TBLWAREHOUSE" t WHERE t."companyId" = (SELECT cid FROM t_ctx) AND lower(t.code) = lower(left(w."Code", 20)));
CREATE TEMP TABLE m_wh AS
SELECT w."Id" old_id, t.id new_id FROM p4src."TBL4S_WareHouses" w
JOIN wms."TBLWAREHOUSE" t ON t."companyId" = (SELECT cid FROM t_ctx) AND lower(t.code) = lower(left(w."Code", 20));

CREATE TEMP TABLE t_wh1 AS SELECT id AS wid FROM wms."TBLWAREHOUSE" WHERE "companyId" = (SELECT cid FROM t_ctx) ORDER BY id LIMIT 1;
INSERT INTO wms."TBLLOCATION" ("companyId", "warehouseId", code, name, "isActive", "updatedAt")
SELECT (SELECT cid FROM t_ctx), (SELECT wid FROM t_wh1), left(g."Code", 40), left(g."Name", 100), g."IsActive", now()
FROM p4src."TBL4S_GRLocations" g
WHERE NOT EXISTS (SELECT 1 FROM wms."TBLLOCATION" t WHERE t."companyId" = (SELECT cid FROM t_ctx) AND t."warehouseId" = (SELECT wid FROM t_wh1) AND lower(t.code) = lower(left(g."Code", 40)));
CREATE TEMP TABLE m_grl AS
SELECT g."Id" old_id, t.id new_id FROM p4src."TBL4S_GRLocations" g
JOIN wms."TBLLOCATION" t ON t."companyId" = (SELECT cid FROM t_ctx) AND t."warehouseId" = (SELECT wid FROM t_wh1) AND lower(t.code) = lower(left(g."Code", 40));

-- Role → TBLROLE (global code)
INSERT INTO wms."TBLROLE" (code, name, "isActive", "updatedAt")
SELECT left(r."Code", 40), left(r."Name", 100), true, now()
FROM p4src."TBL4S_Roles" r
WHERE NOT EXISTS (SELECT 1 FROM wms."TBLROLE" t WHERE lower(t.code) = lower(left(r."Code", 40)) OR lower(t.name) = lower(r."Name"));
CREATE TEMP TABLE m_role AS
SELECT r."Id" old_id, t.id new_id FROM p4src."TBL4S_Roles" r
JOIN wms."TBLROLE" t ON lower(t.code) = lower(left(r."Code", 40)) OR lower(t.name) = lower(r."Name");

-- User → TBLUSER (username/email eşleşen mevcut kullanıcıya bağlanır; düz metin Password OKUNMAZ)
CREATE TEMP TABLE t_p4u AS
SELECT u.*,
  (SELECT t.id FROM wms."TBLUSER" t
    WHERE lower(t.username) = lower(u."Code")
       OR (NULLIF(u."Email", '') IS NOT NULL AND lower(t.email) = lower(u."Email"))
    LIMIT 1) AS match_id,
  count(*) FILTER (WHERE NULLIF(u."Email", '') IS NOT NULL) OVER (PARTITION BY lower(u."Email")) AS email_dup
FROM p4src."TBL4S_Users" u;
INSERT INTO wms."TBLUSER" ("companyId", username, email, "passwordHash", "fullName", "isActive", "isSuperAdmin", "profilePictureUrl", "updatedAt")
SELECT (SELECT cid FROM t_ctx), left(u."Code", 50),
  CASE WHEN NULLIF(u."Email", '') IS NOT NULL AND u.email_dup <= 1
         AND NOT EXISTS (SELECT 1 FROM wms."TBLUSER" x WHERE lower(x.email) = lower(u."Email"))
       THEN lower(left(u."Email", 150)) ELSE lower(left(u."Code", 130)) || '@4proc.local' END,
  left(COALESCE(NULLIF(u."PasswordHash", ''), '!4proc-disabled'), 255),
  left(COALESCE(NULLIF(trim(concat_ws(' ', u."FirstName", u."LastName")), ''), u."Code"), 150),
  u."IsActive", false, left(u."ProfilePictureUrl", 255), now()
FROM t_p4u u WHERE u.match_id IS NULL;
CREATE TEMP TABLE m_user AS
SELECT u."Id" old_id, COALESCE(u.match_id, t.id) new_id
FROM t_p4u u
LEFT JOIN wms."TBLUSER" t ON t.username = left(u."Code", 50) AND t."companyId" = (SELECT cid FROM t_ctx);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM m_user WHERE new_id IS NULL) THEN RAISE EXCEPTION 'm_user eşleşmeyen kullanıcı var'; END IF; END $$;

INSERT INTO wms."TBLUSERROLE" ("userId", "roleId", "companyId")
SELECT mu.new_id, mr.new_id, (SELECT cid FROM t_ctx)
FROM p4src."TBL4S_UserRoles" ur
JOIN m_user mu ON mu.old_id = ur."UserId"
JOIN m_role mr ON mr.old_id = ur."RoleId"
ON CONFLICT ("userId", "roleId") DO NOTHING;

-- Region (tedarikçi metin bölgesi) → TBLREGION
CREATE TEMP TABLE t_reg AS
SELECT DISTINCT trim("Region") AS rname FROM p4src."TBL4S_Suppliers" WHERE NULLIF(trim("Region"), '') IS NOT NULL;
INSERT INTO wms."TBLREGION" ("companyId", code, name, "isActive", "updatedAt")
SELECT (SELECT cid FROM t_ctx), left('4P' || upper(replace(rname, ' ', '')), 20), left(rname, 60), true, now()
FROM t_reg r
WHERE NOT EXISTS (SELECT 1 FROM wms."TBLREGION" t WHERE t."companyId" = (SELECT cid FROM t_ctx) AND lower(t.name) = lower(left(r.rname, 60)));
CREATE TEMP TABLE m_region AS
SELECT r.rname, t.id new_id FROM t_reg r
JOIN wms."TBLREGION" t ON t."companyId" = (SELECT cid FROM t_ctx) AND lower(t.name) = lower(left(r.rname, 60));

-- Supplier → TBLBUSINESSPARTNER + profil
INSERT INTO wms."TBLBUSINESSPARTNER" ("companyId", code, name, type, "partnerGroupId", "regionId",
  "taxNumber", "taxOffice", "nationalId", "contactPerson", email, phone, "mobilePhone", fax,
  address, city, country, "postalCode", "licenseNo", "isActive", "updatedAt")
SELECT (SELECT cid FROM t_ctx), left(s."Code", 40), left(s."Name", 200), 'SUPPLIER',
  st.new_id, rg.new_id,
  left(s."TaxNo", 20), left(s."TaxOffice", 100), left(s."NationalId", 20), left(s."ContactPerson", 100),
  left(s."Email", 150), left(s."Phone", 20), left(s."Mobile", 20), left(s."Fax", 20),
  left(s."Address", 255), left(s."City", 60), left(s."Country", 60), left(s."PostalCode", 20),
  left(s."LicenseNumber", 40), s."IsActive", now()
FROM p4src."TBL4S_Suppliers" s
LEFT JOIN m_suptype st ON st.old_id = s."SupplierTypeId"
LEFT JOIN m_region rg ON rg.rname = trim(s."Region")
WHERE NOT EXISTS (SELECT 1 FROM wms."TBLBUSINESSPARTNER" t WHERE t."companyId" = (SELECT cid FROM t_ctx) AND t.code = left(s."Code", 40));
CREATE TEMP TABLE m_sup AS
SELECT s."Id" old_id, t.id new_id FROM p4src."TBL4S_Suppliers" s
JOIN wms."TBLBUSINESSPARTNER" t ON t."companyId" = (SELECT cid FROM t_ctx) AND t.code = left(s."Code", 40);

INSERT INTO procurement."TBLPARTNERPROCPROFILE" ("partnerId", "currencyId", "paymentTermId", "leadTimeDays",
  "advancePaymentPercent", "advancePaymentNote", iban, "bankName", "accountHolder", "accountNumber", "swiftCode",
  "bankAddress", "correspondentBank", "bankBranch", "shebaNumber", "isInternational", "vatId", "economicCode",
  "tradeRegNo", "deliveryPoint", "otherTerms", "riskFlag", "riskScore", "isForbidden", "blacklistReason",
  "blacklistedAt", "blacklistedById", "onboardingStatus", "onboardingNote", "approvedAt", "approvedById",
  "sendInfoEmail", "sendInfoPrint", "commodityFamilyId", "commodityClassId", "commodityTypeId", "entCode", heading, "updatedAt")
SELECT m.new_id, mc.new_id, mp.new_id, s."LeadTimeDays",
  s."AdvancePaymentPercent", left(s."AdvancePaymentNote", 255), left(s."IBAN", 40), left(s."BankName", 100),
  left(s."AccountHolder", 100), left(s."AccountNumber", 40), left(s."SwiftCode", 20), left(s."BankAddress", 255),
  left(s."CorrespondentBank", 100), left(s."BankBranch", 100), left(s."ShebaNumber", 40), s."IsInternational",
  left(s."VatId", 40), left(s."EconomicCode", 40), left(s."TradeRegNo", 40), left(s."DeliveryPoint", 100),
  left(s."OtherTerms", 255), s."RiskFlag", s."RiskScore", s."IsForbidden", left(s."BlacklistReason", 255),
  s."BlacklistedAt", mbu.new_id, left(s."OnboardingStatus", 20), left(s."OnboardingNote", 255), s."ApprovedAt", mau.new_id,
  s."SendInfoEmail", s."SendInfoPrint", s."CommodityFamilyId", s."CommodityClassId", s."CommodityTypeId",
  left(s."EntCode", 40), left(s."Heading", 150), now()
FROM p4src."TBL4S_Suppliers" s
JOIN m_sup m ON m.old_id = s."Id"
LEFT JOIN m_cur mc ON mc.old_id = s."CurrencyId"
LEFT JOIN m_pt mp ON mp.old_id = s."PaymentTermId"
LEFT JOIN m_user mbu ON mbu.old_id = s."BlacklistedById"
LEFT JOIN m_user mau ON mau.old_id = s."ApprovedById"
ON CONFLICT ("partnerId") DO NOTHING;

-- Material → TBLPRODUCT + profil
INSERT INTO wms."TBLPRODUCT" ("companyId", code, name, description, "productTypeId", "productGroupId", "unitId", "isActive", "updatedAt")
SELECT (SELECT cid FROM t_ctx), left(m."Code", 40),
  left(COALESCE(NULLIF(m."Name", ''), NULLIF(m."Heading", ''), m."Code"), 240), left(m."Description", 255),
  mt.new_id, mg.new_id, mu.new_id, m."IsActive", now()
FROM p4src."TBL4S_Materials" m
LEFT JOIN m_mattype mt ON mt.old_id = m."MaterialTypeId"
LEFT JOIN m_matgrp mg ON mg.old_id = m."MaterialGroupId"
LEFT JOIN m_unit mu ON mu.old_id = m."UnitId"
WHERE NOT EXISTS (SELECT 1 FROM wms."TBLPRODUCT" t WHERE t."companyId" = (SELECT cid FROM t_ctx) AND t.code = left(m."Code", 40));
CREATE TEMP TABLE m_mat AS
SELECT m."Id" old_id, t.id new_id FROM p4src."TBL4S_Materials" m
JOIN wms."TBLPRODUCT" t ON t."companyId" = (SELECT cid FROM t_ctx) AND t.code = left(m."Code", 40);

INSERT INTO procurement."TBLPRODUCTPROCPROFILE" ("productId", "procurementTypeId", "categoryId",
  "commodityFamilyId", "commodityClassId", "commodityId", "minOrderQuantity", "orderIncrement", "leadTime",
  "supplierPartNo", "unspscCode", "manufacturerName", "manufacturerPartNo", "technicalSpecs", "imageUrl",
  "msdsUrl", "glAccountId", "isCatalog", "entCode", "updatedAt")
SELECT mm.new_id, m."ProcurementTypeId", m."CategoryId", m."CommodityFamilyId", m."CommodityClassId", m."CommodityId",
  m."MinOrderQuantity", m."OrderIncrement", m."LeadTime", left(m."SupplierPartNo", 60), left(m."UNSPSCCode", 20),
  left(m."ManufacturerName", 100), left(m."ManufacturerPartNo", 60), left(m."TechnicalSpecs", 255),
  left(m."ImageUrl", 255), left(m."MSDSUrl", 255), m."GLAccountId", m."IsCatalog", left(m."EntCode", 40), now()
FROM p4src."TBL4S_Materials" m
JOIN m_mat mm ON mm.old_id = m."Id"
ON CONFLICT ("productId") DO NOTHING;

-- User profilleri
INSERT INTO procurement."TBLUSERPROCPROFILE" ("userId", "departmentId", "subDepartmentId", "userJobGroupId",
  position, "jobLocation", gender, "lineManagerId", "isManager", "isBackup", "defaultBackupId", "approvalLimit",
  "isApprover", "workLevel", "hasCompletedOnboarding", "updatedAt")
SELECT mu.new_id, u."DepartmentId", u."SubDepartmentId", u."UserJobGroupId",
  left(u."Position", 100), left(u."JobLocation", 100), left(u."Gender", 20), mlm.new_id, u."IsManager", u."IsBackup",
  mdb.new_id, u."ApprovalLimit", u."IsApprover", u."WorkLevel", u."HasCompletedOnboarding", now()
FROM p4src."TBL4S_Users" u
JOIN m_user mu ON mu.old_id = u."Id"
LEFT JOIN m_user mlm ON mlm.old_id = u."LineManagerId"
LEFT JOIN m_user mdb ON mdb.old_id = u."DefaultBackupId"
ON CONFLICT ("userId") DO NOTHING;

-- NumberSequence → TBLSEQUENCE
INSERT INTO wms."TBLSEQUENCE" ("companyId", code, name, prefix, "padLength", "currentValue", "isActive", "updatedAt")
SELECT (SELECT cid FROM t_ctx), left(n."Code", 20), n."Code", left(n."Prefix", 20), n."PaddingLength", n."CurrentNumber", true, now()
FROM p4src."TBL4S_NumberSequences" n
WHERE NOT EXISTS (SELECT 1 FROM wms."TBLSEQUENCE" t WHERE t."companyId" = (SELECT cid FROM t_ctx) AND t.code = left(n."Code", 20));

-- ── 2) platform tabloları: p4src → procurement (ortak kolon kesişimi, Id'ler AYNEN) ──
DO $$
DECLARE tbl text; cols text; cnt bigint;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'procurement' AND table_name LIKE 'TBL4S\_%' ESCAPE '\'
    ORDER BY table_name
  LOOP
    IF to_regclass('p4src."' || tbl || '"') IS NULL THEN
      RAISE NOTICE 'ATLA (p4src''de yok): %', tbl; CONTINUE;
    END IF;
    SELECT string_agg(format('%I', c1.column_name), ', ' ORDER BY c1.ordinal_position) INTO cols
    FROM information_schema.columns c1
    JOIN information_schema.columns c2
      ON c2.table_schema = 'p4src' AND c2.table_name = c1.table_name AND c2.column_name = c1.column_name
    WHERE c1.table_schema = 'procurement' AND c1.table_name = tbl;
    EXECUTE format('INSERT INTO procurement.%I (%s) SELECT %s FROM p4src.%I', tbl, cols, cols, tbl);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    IF cnt > 0 THEN RAISE NOTICE 'KOPYA %: % satır', tbl, cnt; END IF;
  END LOOP;
END $$;

-- ── 3) FK remap (üretilmiş 79 UPDATE aşağıya eklenir) ─────────────────────────
UPDATE procurement."TBL4S_ApprovalMatrices" t SET "CreatedBy" = m.new_id FROM m_user m WHERE t."CreatedBy" = m.old_id;
UPDATE procurement."TBL4S_ApprovalStates" t SET "ApproverId" = m.new_id FROM m_user m WHERE t."ApproverId" = m.old_id;
UPDATE procurement."TBL4S_ApprovalStates" t SET "CreatedBy" = m.new_id FROM m_user m WHERE t."CreatedBy" = m.old_id;
UPDATE procurement."TBL4S_AuditLogs" t SET "UserId" = m.new_id FROM m_user m WHERE t."UserId" = m.old_id;
UPDATE procurement."TBL4S_Budgets" t SET "CreatedBy" = m.new_id FROM m_user m WHERE t."CreatedBy" = m.old_id;
UPDATE procurement."TBL4S_Budgets" t SET "CurrencyId" = m.new_id FROM m_cur m WHERE t."CurrencyId" = m.old_id;
UPDATE procurement."TBL4S_Budgets" t SET "UpdatedBy" = m.new_id FROM m_user m WHERE t."UpdatedBy" = m.old_id;
UPDATE procurement."TBL4S_CatalogItems" t SET "MaterialId" = m.new_id FROM m_mat m WHERE t."MaterialId" = m.old_id;
UPDATE procurement."TBL4S_CatalogItems" t SET "UnitId" = m.new_id FROM m_unit m WHERE t."UnitId" = m.old_id;
UPDATE procurement."TBL4S_Catalogs" t SET "CreatedBy" = m.new_id FROM m_user m WHERE t."CreatedBy" = m.old_id;
UPDATE procurement."TBL4S_Catalogs" t SET "CurrencyId" = m.new_id FROM m_cur m WHERE t."CurrencyId" = m.old_id;
UPDATE procurement."TBL4S_Catalogs" t SET "SupplierId" = m.new_id FROM m_sup m WHERE t."SupplierId" = m.old_id;
UPDATE procurement."TBL4S_Catalogs" t SET "UpdatedBy" = m.new_id FROM m_user m WHERE t."UpdatedBy" = m.old_id;
UPDATE procurement."TBL4S_ConsentRecords" t SET "UserId" = m.new_id FROM m_user m WHERE t."UserId" = m.old_id;
UPDATE procurement."TBL4S_ContractChangeOrders" t SET "ApprovedById" = m.new_id FROM m_user m WHERE t."ApprovedById" = m.old_id;
UPDATE procurement."TBL4S_ContractChangeOrders" t SET "CreatedBy" = m.new_id FROM m_user m WHERE t."CreatedBy" = m.old_id;
UPDATE procurement."TBL4S_ContractChangeOrders" t SET "UpdatedBy" = m.new_id FROM m_user m WHERE t."UpdatedBy" = m.old_id;
UPDATE procurement."TBL4S_ContractDetails" t SET "MaterialId" = m.new_id FROM m_mat m WHERE t."MaterialId" = m.old_id;
UPDATE procurement."TBL4S_ContractDetails" t SET "UnitId" = m.new_id FROM m_unit m WHERE t."UnitId" = m.old_id;
UPDATE procurement."TBL4S_ContractTemplates" t SET "CreatedBy" = m.new_id FROM m_user m WHERE t."CreatedBy" = m.old_id;
UPDATE procurement."TBL4S_ContractTemplates" t SET "UpdatedBy" = m.new_id FROM m_user m WHERE t."UpdatedBy" = m.old_id;
UPDATE procurement."TBL4S_Contracts" t SET "CompanyId" = m.new_id FROM m_company m WHERE t."CompanyId" = m.old_id;
UPDATE procurement."TBL4S_Contracts" t SET "CreatedBy" = m.new_id FROM m_user m WHERE t."CreatedBy" = m.old_id;
UPDATE procurement."TBL4S_Contracts" t SET "CurrencyId" = m.new_id FROM m_cur m WHERE t."CurrencyId" = m.old_id;
UPDATE procurement."TBL4S_Contracts" t SET "OrganizationId" = m.new_id FROM m_org m WHERE t."OrganizationId" = m.old_id;
UPDATE procurement."TBL4S_Contracts" t SET "PaymentTermId" = m.new_id FROM m_pt m WHERE t."PaymentTermId" = m.old_id;
UPDATE procurement."TBL4S_Contracts" t SET "SupplierId" = m.new_id FROM m_sup m WHERE t."SupplierId" = m.old_id;
UPDATE procurement."TBL4S_Contracts" t SET "UpdatedBy" = m.new_id FROM m_user m WHERE t."UpdatedBy" = m.old_id;
UPDATE procurement."TBL4S_CreditNotes" t SET "ApprovedById" = m.new_id FROM m_user m WHERE t."ApprovedById" = m.old_id;
UPDATE procurement."TBL4S_CreditNotes" t SET "CreatedBy" = m.new_id FROM m_user m WHERE t."CreatedBy" = m.old_id;
UPDATE procurement."TBL4S_Delegations" t SET "CreatedBy" = m.new_id FROM m_user m WHERE t."CreatedBy" = m.old_id;
UPDATE procurement."TBL4S_Delegations" t SET "DelegateId" = m.new_id FROM m_user m WHERE t."DelegateId" = m.old_id;
UPDATE procurement."TBL4S_Delegations" t SET "DelegatorId" = m.new_id FROM m_user m WHERE t."DelegatorId" = m.old_id;
UPDATE procurement."TBL4S_EInvoices" t SET "CreatedBy" = m.new_id FROM m_user m WHERE t."CreatedBy" = m.old_id;
UPDATE procurement."TBL4S_IntegrationConfigs" t SET "CreatedBy" = m.new_id FROM m_user m WHERE t."CreatedBy" = m.old_id;
UPDATE procurement."TBL4S_Invoices" t SET "CreatedBy" = m.new_id FROM m_user m WHERE t."CreatedBy" = m.old_id;
UPDATE procurement."TBL4S_Invoices" t SET "CurrencyId" = m.new_id FROM m_cur m WHERE t."CurrencyId" = m.old_id;
UPDATE procurement."TBL4S_Invoices" t SET "SupplierId" = m.new_id FROM m_sup m WHERE t."SupplierId" = m.old_id;
UPDATE procurement."TBL4S_Invoices" t SET "UpdatedBy" = m.new_id FROM m_user m WHERE t."UpdatedBy" = m.old_id;
UPDATE procurement."TBL4S_NotificationLogs" t SET "UserId" = m.new_id FROM m_user m WHERE t."UserId" = m.old_id;
UPDATE procurement."TBL4S_OrderDetails" t SET "GRLocationId" = m.new_id FROM m_grl m WHERE t."GRLocationId" = m.old_id;
UPDATE procurement."TBL4S_OrderDetails" t SET "MaterialId" = m.new_id FROM m_mat m WHERE t."MaterialId" = m.old_id;
UPDATE procurement."TBL4S_OrderDetails" t SET "SupplierId" = m.new_id FROM m_sup m WHERE t."SupplierId" = m.old_id;
UPDATE procurement."TBL4S_OrderDetails" t SET "UnitId" = m.new_id FROM m_unit m WHERE t."UnitId" = m.old_id;
UPDATE procurement."TBL4S_Orders" t SET "CompanyId" = m.new_id FROM m_company m WHERE t."CompanyId" = m.old_id;
UPDATE procurement."TBL4S_Orders" t SET "CreatedBy" = m.new_id FROM m_user m WHERE t."CreatedBy" = m.old_id;
UPDATE procurement."TBL4S_Orders" t SET "CurrencyId" = m.new_id FROM m_cur m WHERE t."CurrencyId" = m.old_id;
UPDATE procurement."TBL4S_Orders" t SET "GRLocationId" = m.new_id FROM m_grl m WHERE t."GRLocationId" = m.old_id;
UPDATE procurement."TBL4S_Orders" t SET "IncotermId" = m.new_id FROM m_inco m WHERE t."IncotermId" = m.old_id;
UPDATE procurement."TBL4S_Orders" t SET "OrganizationId" = m.new_id FROM m_org m WHERE t."OrganizationId" = m.old_id;
UPDATE procurement."TBL4S_Orders" t SET "PaymentTermId" = m.new_id FROM m_pt m WHERE t."PaymentTermId" = m.old_id;
UPDATE procurement."TBL4S_Orders" t SET "SupplierId" = m.new_id FROM m_sup m WHERE t."SupplierId" = m.old_id;
UPDATE procurement."TBL4S_Orders" t SET "UpdatedBy" = m.new_id FROM m_user m WHERE t."UpdatedBy" = m.old_id;
UPDATE procurement."TBL4S_OutOfOffice" t SET "BackupUserId" = m.new_id FROM m_user m WHERE t."BackupUserId" = m.old_id;
UPDATE procurement."TBL4S_OutOfOffice" t SET "UserId" = m.new_id FROM m_user m WHERE t."UserId" = m.old_id;
UPDATE procurement."TBL4S_RFQInvitations" t SET "SupplierId" = m.new_id FROM m_sup m WHERE t."SupplierId" = m.old_id;
UPDATE procurement."TBL4S_RFQLines" t SET "MaterialId" = m.new_id FROM m_mat m WHERE t."MaterialId" = m.old_id;
UPDATE procurement."TBL4S_RFQs" t SET "CreatedBy" = m.new_id FROM m_user m WHERE t."CreatedBy" = m.old_id;
UPDATE procurement."TBL4S_RFQs" t SET "UpdatedBy" = m.new_id FROM m_user m WHERE t."UpdatedBy" = m.old_id;
UPDATE procurement."TBL4S_RateCardDetails" t SET "MaterialId" = m.new_id FROM m_mat m WHERE t."MaterialId" = m.old_id;
UPDATE procurement."TBL4S_RateCardDetails" t SET "UnitId" = m.new_id FROM m_unit m WHERE t."UnitId" = m.old_id;
UPDATE procurement."TBL4S_RateCards" t SET "CompanyId" = m.new_id FROM m_company m WHERE t."CompanyId" = m.old_id;
UPDATE procurement."TBL4S_RateCards" t SET "CreatedBy" = m.new_id FROM m_user m WHERE t."CreatedBy" = m.old_id;
UPDATE procurement."TBL4S_RateCards" t SET "CurrencyId" = m.new_id FROM m_cur m WHERE t."CurrencyId" = m.old_id;
UPDATE procurement."TBL4S_RateCards" t SET "IncotermId" = m.new_id FROM m_inco m WHERE t."IncotermId" = m.old_id;
UPDATE procurement."TBL4S_RateCards" t SET "OrganizationId" = m.new_id FROM m_org m WHERE t."OrganizationId" = m.old_id;
UPDATE procurement."TBL4S_RateCards" t SET "PaymentTermId" = m.new_id FROM m_pt m WHERE t."PaymentTermId" = m.old_id;
UPDATE procurement."TBL4S_RateCards" t SET "SupplierId" = m.new_id FROM m_sup m WHERE t."SupplierId" = m.old_id;
UPDATE procurement."TBL4S_ReceiptDetails" t SET "MaterialId" = m.new_id FROM m_mat m WHERE t."MaterialId" = m.old_id;
UPDATE procurement."TBL4S_Receipts" t SET "CreatedBy" = m.new_id FROM m_user m WHERE t."CreatedBy" = m.old_id;
UPDATE procurement."TBL4S_Receipts" t SET "WareHouseId" = m.new_id FROM m_wh m WHERE t."WareHouseId" = m.old_id;
UPDATE procurement."TBL4S_RejectionReasons" t SET "CreatedBy" = m.new_id FROM m_user m WHERE t."CreatedBy" = m.old_id;
UPDATE procurement."TBL4S_SupplierCertificates" t SET "CreatedBy" = m.new_id FROM m_user m WHERE t."CreatedBy" = m.old_id;
UPDATE procurement."TBL4S_SupplierCertificates" t SET "SupplierId" = m.new_id FROM m_sup m WHERE t."SupplierId" = m.old_id;
UPDATE procurement."TBL4S_SupplierCommodities" t SET "SupplierId" = m.new_id FROM m_sup m WHERE t."SupplierId" = m.old_id;
UPDATE procurement."TBL4S_SupplierPortalTokens" t SET "SupplierId" = m.new_id FROM m_sup m WHERE t."SupplierId" = m.old_id;
UPDATE procurement."TBL4S_SupplierProcurementTypes" t SET "SupplierId" = m.new_id FROM m_sup m WHERE t."SupplierId" = m.old_id;
UPDATE procurement."TBL4S_WebhookConfigs" t SET "CreatedBy" = m.new_id FROM m_user m WHERE t."CreatedBy" = m.old_id;
UPDATE procurement."TBL4S_WebhookConfigs" t SET "UpdatedBy" = m.new_id FROM m_user m WHERE t."UpdatedBy" = m.old_id;

-- ── 4) serial sequence'ları taşınan max(Id)'ye çek ───────────────────────────
DO $$
DECLARE tbl text; seq text;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'procurement' AND table_name LIKE 'TBL4S\_%' ESCAPE '\'
  LOOP
    seq := pg_get_serial_sequence(format('procurement.%I', tbl), 'Id');
    IF seq IS NOT NULL THEN
      EXECUTE format('SELECT setval(%L, GREATEST(COALESCE((SELECT max("Id") FROM procurement.%I), 0), 1))', seq, tbl);
    END IF;
  END LOOP;
END $$;

-- ── 5) doğrulama raporu ──────────────────────────────────────────────────────
\echo '── MAP SAYILARI'
SELECT 'company' k, count(*) FROM m_company UNION ALL SELECT 'org', count(*) FROM m_org
UNION ALL SELECT 'unit', count(*) FROM m_unit UNION ALL SELECT 'currency', count(*) FROM m_cur
UNION ALL SELECT 'paymentterm', count(*) FROM m_pt UNION ALL SELECT 'incoterm', count(*) FROM m_inco
UNION ALL SELECT 'suptype', count(*) FROM m_suptype UNION ALL SELECT 'mattype', count(*) FROM m_mattype
UNION ALL SELECT 'matgrp', count(*) FROM m_matgrp UNION ALL SELECT 'warehouse', count(*) FROM m_wh
UNION ALL SELECT 'grlocation', count(*) FROM m_grl UNION ALL SELECT 'role', count(*) FROM m_role
UNION ALL SELECT 'user', count(*) FROM m_user UNION ALL SELECT 'supplier', count(*) FROM m_sup
UNION ALL SELECT 'material', count(*) FROM m_mat ORDER BY 1;

\echo '── ANA TAŞIMA (kaynak → hedef)'
SELECT 'users' k, (SELECT count(*) FROM p4src."TBL4S_Users") src,
  (SELECT count(*) FROM wms."TBLUSER" WHERE "companyId" = (SELECT cid FROM t_ctx)) hedef_firma_toplam,
  (SELECT count(*) FROM procurement."TBLUSERPROCPROFILE") profil
UNION ALL
SELECT 'suppliers', (SELECT count(*) FROM p4src."TBL4S_Suppliers"),
  (SELECT count(*) FROM wms."TBLBUSINESSPARTNER" WHERE type = 'SUPPLIER' AND "companyId" = (SELECT cid FROM t_ctx)),
  (SELECT count(*) FROM procurement."TBLPARTNERPROCPROFILE")
UNION ALL
SELECT 'materials', (SELECT count(*) FROM p4src."TBL4S_Materials"),
  (SELECT count(*) FROM wms."TBLPRODUCT" WHERE "companyId" = (SELECT cid FROM t_ctx)),
  (SELECT count(*) FROM procurement."TBLPRODUCTPROCPROFILE");

\echo '── PLATFORM SATIR FARKLARI (kaynak≠hedef olanlar; boş=tam kopya)'
DO $$
DECLARE tbl text; s bigint; d bigint;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'procurement' AND table_name LIKE 'TBL4S\_%' ESCAPE '\' ORDER BY table_name
  LOOP
    IF to_regclass('p4src."' || tbl || '"') IS NULL THEN CONTINUE; END IF;
    EXECUTE format('SELECT count(*) FROM p4src.%I', tbl) INTO s;
    EXECUTE format('SELECT count(*) FROM procurement.%I', tbl) INTO d;
    IF s <> d THEN RAISE NOTICE 'FARK %: kaynak=% hedef=%', tbl, s, d; END IF;
  END LOOP;
END $$;

\echo '── ORPHAN TARAMASI (0 olmalı)'
SELECT 'Orders.SupplierId' k, count(*) FROM procurement."TBL4S_Orders" o
  LEFT JOIN wms."TBLBUSINESSPARTNER" b ON b.id = o."SupplierId" WHERE o."SupplierId" IS NOT NULL AND b.id IS NULL
UNION ALL
SELECT 'Orders.CreatedBy', count(*) FROM procurement."TBL4S_Orders" o
  LEFT JOIN wms."TBLUSER" u ON u.id = o."CreatedBy" WHERE o."CreatedBy" IS NOT NULL AND u.id IS NULL
UNION ALL
SELECT 'OrderDetails.MaterialId', count(*) FROM procurement."TBL4S_OrderDetails" d
  LEFT JOIN wms."TBLPRODUCT" p ON p.id = d."MaterialId" WHERE d."MaterialId" IS NOT NULL AND p.id IS NULL
UNION ALL
SELECT 'OrderDetails.UnitId', count(*) FROM procurement."TBL4S_OrderDetails" d
  LEFT JOIN wms."TBLUNIT" un ON un.id = d."UnitId" WHERE d."UnitId" IS NOT NULL AND un.id IS NULL
UNION ALL
SELECT 'Contracts.SupplierId', count(*) FROM procurement."TBL4S_Contracts" c
  LEFT JOIN wms."TBLBUSINESSPARTNER" b ON b.id = c."SupplierId" WHERE c."SupplierId" IS NOT NULL AND b.id IS NULL
UNION ALL
SELECT 'CatalogItems.MaterialId', count(*) FROM procurement."TBL4S_CatalogItems" ci
  LEFT JOIN wms."TBLPRODUCT" p ON p.id = ci."MaterialId" WHERE ci."MaterialId" IS NOT NULL AND p.id IS NULL
UNION ALL
SELECT 'ApprovalStates.ApproverId', count(*) FROM procurement."TBL4S_ApprovalStates" a
  LEFT JOIN wms."TBLUSER" u ON u.id = a."ApproverId" WHERE a."ApproverId" IS NOT NULL AND u.id IS NULL;

\if :dry
ROLLBACK;
\echo '══ DRY-RUN: tüm değişiklikler GERİ ALINDI'
\else
COMMIT;
\echo '══ COMMIT: taşıma kalıcı'
\endif
