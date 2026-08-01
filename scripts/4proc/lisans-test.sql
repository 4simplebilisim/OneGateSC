-- Lisans kapısı davranış testi (sonunda ROLLBACK)
\set ON_ERROR_STOP on
BEGIN;
\echo '── Senaryo 1: her iki ürün lisanslı (mevcut durum)'
SELECT a.code, l."isActive" AS lisans FROM wms."TBLAPPLICATION" a
  LEFT JOIN wms."TBLCOMPANYLICENSE" l ON l."applicationId"=a.id ORDER BY a."sortOrder";

\echo '── Kullanıcının gördüğü ürünler (admin) — kısıt yok:'
SELECT a.code FROM wms."TBLAPPLICATION" a
JOIN wms."TBLCOMPANYLICENSE" l ON l."applicationId"=a.id AND l."isActive"
JOIN wms."TBLUSER" u ON u."companyId"=l."companyId"
WHERE u.username='admin' AND NOT EXISTS (SELECT 1 FROM wms."TBLUSERAPPACCESS" ua WHERE ua."userId"=u.id)
ORDER BY a."sortOrder";

\echo '── Senaryo 2: kullanıcıya YALNIZ WMS erişimi verilirse'
INSERT INTO wms."TBLUSERAPPACCESS" ("userId","applicationId")
SELECT u.id, a.id FROM wms."TBLUSER" u, wms."TBLAPPLICATION" a WHERE u.username='admin' AND a.code='WMS';
SELECT a.code AS "erişebildiği" FROM wms."TBLAPPLICATION" a
JOIN wms."TBLCOMPANYLICENSE" l ON l."applicationId"=a.id AND l."isActive"
JOIN wms."TBLUSER" u ON u."companyId"=l."companyId"
JOIN wms."TBLUSERAPPACCESS" ua ON ua."userId"=u.id AND ua."applicationId"=a.id
WHERE u.username='admin' ORDER BY a."sortOrder";
DELETE FROM wms."TBLUSERAPPACCESS" WHERE "userId"=(SELECT id FROM wms."TBLUSER" WHERE username='admin');

\echo '── Senaryo 3: PROC lisansı süresi dolmuşsa (dün bitti)'
UPDATE wms."TBLCOMPANYLICENSE" SET "validUntil"=CURRENT_DATE-1
  WHERE "applicationId"=(SELECT id FROM wms."TBLAPPLICATION" WHERE code='PROC');
SELECT a.code AS "geçerli_lisans" FROM wms."TBLAPPLICATION" a
JOIN wms."TBLCOMPANYLICENSE" l ON l."applicationId"=a.id AND l."isActive"
WHERE (l."validFrom" IS NULL OR l."validFrom"<=CURRENT_DATE)
  AND (l."validUntil" IS NULL OR l."validUntil">=CURRENT_DATE) ORDER BY a."sortOrder";

ROLLBACK;
\echo '══ TEST BİTTİ (değişiklikler geri alındı)'
