-- Uyumluluk katmanı yazma yolu testi — sonunda ROLLBACK
\set ON_ERROR_STOP on
BEGIN;
\echo '── OKUMA (view satır sayıları)'
SELECT 'Users' t, count(*) FROM procurement."TBL4S_Users"
UNION ALL SELECT 'Suppliers', count(*) FROM procurement."TBL4S_Suppliers"
UNION ALL SELECT 'Materials', count(*) FROM procurement."TBL4S_Materials"
UNION ALL SELECT 'Units', count(*) FROM procurement."TBL4S_Units"
UNION ALL SELECT 'Currencies', count(*) FROM procurement."TBL4S_Currencies"
UNION ALL SELECT 'UserRoles', count(*) FROM procurement."TBL4S_UserRoles"
UNION ALL SELECT 'Organizations', count(*) FROM procurement."TBL4S_Organizations" ORDER BY 1;

\echo '── ÖRNEK SATIR (Users: ad ayrıştırma + profil birleşimi)'
SELECT "Id", "Code", "FirstName", "LastName", "Email", "Position", "ApprovalLimit", "IsApprover", "Password" IS NULL AS "PasswordGizli"
FROM procurement."TBL4S_Users" WHERE "Position" IS NOT NULL ORDER BY "Id" LIMIT 3;

\echo '── ÖRNEK SATIR (Suppliers: çekirdek + profil + Region metni)'
SELECT "Id", "Code", "Name", "CurrencyId", "PaymentTermId", "LeadTimeDays", "IBAN" IS NOT NULL AS iban_var, "Region", "OnboardingStatus"
FROM procurement."TBL4S_Suppliers" ORDER BY "Id" LIMIT 3;

\echo '── YAZMA 1: basit view (Units) INSERT→UPDATE→DELETE'
INSERT INTO procurement."TBL4S_Units" ("Code", "Name", "IsActive") VALUES ('ZZTEST', 'Test Birimi', true);
SELECT "Id", "Code", "Name" FROM procurement."TBL4S_Units" WHERE "Code" = 'ZZTEST';
UPDATE procurement."TBL4S_Units" SET "Name" = 'Test Birimi 2' WHERE "Code" = 'ZZTEST';
SELECT "Name" FROM procurement."TBL4S_Units" WHERE "Code" = 'ZZTEST';
SELECT 'wms tarafı', code, name FROM wms."TBLUNIT" WHERE code = 'ZZTEST';
DELETE FROM procurement."TBL4S_Units" WHERE "Code" = 'ZZTEST';
SELECT count(*) AS "silindi_mi_0_olmali" FROM wms."TBLUNIT" WHERE code = 'ZZTEST';

\echo '── YAZMA 2: zengin view (Suppliers) — çekirdek+profil birlikte yazılıyor mu'
INSERT INTO procurement."TBL4S_Suppliers" ("Code", "Name", "TaxNo", "CurrencyId", "PaymentTermId", "LeadTimeDays", "IBAN", "OnboardingStatus", "IsActive", "IsInternational", "RiskFlag", "IsForbidden", "SendInfoEmail", "SendInfoPrint", "AdvancePaymentPercent")
VALUES ('ZZSUP', 'Test Tedarikçi', '1234567890', (SELECT "Id" FROM procurement."TBL4S_Currencies" LIMIT 1), (SELECT "Id" FROM procurement."TBL4S_PaymentTerms" LIMIT 1), 7, 'TR000', 'PENDING', true, false, false, false, false, false, 0);
SELECT "Code", "Name", "LeadTimeDays", "IBAN", "OnboardingStatus" FROM procurement."TBL4S_Suppliers" WHERE "Code" = 'ZZSUP';
SELECT 'wms cari' src, code, name, type::text FROM wms."TBLBUSINESSPARTNER" WHERE code = 'ZZSUP'
UNION ALL SELECT 'procurement profil', p."iban", p."onboardingStatus", p."leadTimeDays"::text
  FROM procurement."TBLPARTNERPROCPROFILE" p JOIN wms."TBLBUSINESSPARTNER" b ON b.id = p."partnerId" WHERE b.code = 'ZZSUP';
UPDATE procurement."TBL4S_Suppliers" SET "LeadTimeDays" = 21, "Name" = 'Test Tedarikçi 2' WHERE "Code" = 'ZZSUP';
SELECT "Name", "LeadTimeDays" FROM procurement."TBL4S_Suppliers" WHERE "Code" = 'ZZSUP';
DELETE FROM procurement."TBL4S_Suppliers" WHERE "Code" = 'ZZSUP';
SELECT count(*) AS "cari_silindi_0", (SELECT count(*) FROM procurement."TBLPARTNERPROCPROFILE" p JOIN wms."TBLBUSINESSPARTNER" b ON b.id=p."partnerId" WHERE b.code='ZZSUP') AS "profil_cascade_0"
FROM wms."TBLBUSINESSPARTNER" WHERE code = 'ZZSUP';

\echo '── YAZMA 3: Users (ad birleştirme + e-posta üretimi + profil)'
INSERT INTO procurement."TBL4S_Users" ("Code", "FirstName", "LastName", "Position", "ApprovalLimit", "IsApprover", "IsAdmin", "IsActive", "IsManager", "IsBackup", "WorkLevel", "HasCompletedOnboarding")
VALUES ('zztest', 'Ali', 'Veli Kaya', 'Satınalma Uzmanı', 5000, true, false, true, false, false, 2, false);
SELECT "Code", "FirstName", "LastName", "Email", "Position", "ApprovalLimit" FROM procurement."TBL4S_Users" WHERE "Code" = 'zztest';
SELECT 'wms kullanıcı' k, username, "fullName", email FROM wms."TBLUSER" WHERE username = 'zztest';
DELETE FROM procurement."TBL4S_Users" WHERE "Code" = 'zztest';

\echo '── YAZMA 4: UserPermissions (JSON ↔ ekran hakkı satırları, K3)'
INSERT INTO procurement."TBL4S_UserPermissions" ("UserId", "Screens")
VALUES ((SELECT id FROM wms."TBLUSER" WHERE username = 'admin' LIMIT 1), '{"suppliers":true,"orders":true,"budgets":false}');
SELECT "UserId", "Screens" FROM procurement."TBL4S_UserPermissions" WHERE "Screens" IS NOT NULL;
SELECT 'ekran hakkı satırı' k, resource, "canView", "canEdit" FROM wms."TBLUSERSCREENRIGHT" ORDER BY resource;
DELETE FROM procurement."TBL4S_UserPermissions" WHERE "UserId" = (SELECT id FROM wms."TBLUSER" WHERE username = 'admin' LIMIT 1);
SELECT count(*) AS "haklar_silindi_0" FROM wms."TBLUSERSCREENRIGHT";

\echo '── YAZMA 5: Materials'
INSERT INTO procurement."TBL4S_Materials" ("Code", "Heading", "Name", "UnitId", "MaterialTypeId", "MaterialGroupId", "MinOrderQuantity", "LeadTime", "IsCatalog", "IsActive", "OrderIncrement")
VALUES ('ZZMAT', 'Test Başlık', NULL, (SELECT "Id" FROM procurement."TBL4S_Units" LIMIT 1), (SELECT "Id" FROM procurement."TBL4S_MaterialTypes" LIMIT 1), (SELECT "Id" FROM procurement."TBL4S_MaterialGroups" LIMIT 1), 5, 3, true, true, 1);
SELECT "Code", "Heading", "Name", "MinOrderQuantity", "IsCatalog" FROM procurement."TBL4S_Materials" WHERE "Code" = 'ZZMAT';
SELECT 'wms ürün' k, code, name FROM wms."TBLPRODUCT" WHERE code = 'ZZMAT';
DELETE FROM procurement."TBL4S_Materials" WHERE "Code" = 'ZZMAT';

ROLLBACK;
\echo '══ TEST BİTTİ — tüm değişiklikler geri alındı'
