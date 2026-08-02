-- 4Proc uyumluluk katmanı (OTOMATİK ÜRETİLDİ — gen-compat-views.mjs)
-- 4proc kodu TBL4S_* adlarını kullanmaya devam eder; veri wms tablolarında yaşar.
SET search_path = procurement, wms, public;

-- Oturumdaki kiracı. Uygulama bağlantıyı açarken "app.company_id" ayarını taşır
-- (her firma kendi bağlantı havuzunu kullanır → kiracılar arası sızıntı olmaz).
-- Ayar yoksa: tek firmalı kurulumda o firma; birden çok firma varsa NULL (boş liste),
-- çünkü yanlış kiracının verisini göstermektense hiç göstermemek doğrudur.
CREATE OR REPLACE FUNCTION procurement.p4_company() RETURNS int LANGUAGE sql STABLE AS $fn$
  SELECT COALESCE(
    NULLIF(current_setting('app.company_id', true), '')::int,
    (SELECT id FROM wms."TBLCOMPANY" WHERE (SELECT count(*) FROM wms."TBLCOMPANY") = 1 LIMIT 1)
  );
$fn$;

-- Varsayılan yedekler: 4Proc bu alanları ZORUNLU ister, OneGate kayıtlarında boş olabilir.
CREATE OR REPLACE FUNCTION procurement.p4_def_currency() RETURNS int LANGUAGE sql STABLE AS $fn$
  SELECT id FROM wms."TBLCURRENCY" WHERE "companyId" = procurement.p4_company()
  ORDER BY (code = 'TRY') DESC, id LIMIT 1;
$fn$;
CREATE OR REPLACE FUNCTION procurement.p4_def_paymentterm() RETURNS int LANGUAGE sql STABLE AS $fn$
  SELECT id FROM wms."TBLPAYMENTTERM" WHERE "companyId" = procurement.p4_company() ORDER BY id LIMIT 1;
$fn$;
CREATE OR REPLACE FUNCTION procurement.p4_def_partnergroup() RETURNS int LANGUAGE sql STABLE AS $fn$
  SELECT id FROM wms."TBLPARTNERGROUP" WHERE "companyId" = procurement.p4_company() ORDER BY id LIMIT 1;
$fn$;
CREATE OR REPLACE FUNCTION procurement.p4_def_producttype() RETURNS int LANGUAGE sql STABLE AS $fn$
  SELECT id FROM wms."TBLPRODUCTTYPE" WHERE "companyId" = procurement.p4_company() ORDER BY id LIMIT 1;
$fn$;
CREATE OR REPLACE FUNCTION procurement.p4_def_productgroup() RETURNS int LANGUAGE sql STABLE AS $fn$
  SELECT id FROM wms."TBLPRODUCTGROUP" WHERE "companyId" = procurement.p4_company() ORDER BY id LIMIT 1;
$fn$;
CREATE OR REPLACE FUNCTION procurement.p4_def_unit() RETURNS int LANGUAGE sql STABLE AS $fn$
  SELECT id FROM wms."TBLUNIT" WHERE "companyId" = procurement.p4_company()
  ORDER BY (lower(code) IN ('adet','ad','pcs')) DESC, id LIMIT 1;
$fn$;
CREATE OR REPLACE FUNCTION procurement.p4_def_proctype() RETURNS int LANGUAGE sql STABLE AS $fn$
  SELECT "Id" FROM procurement."TBL4S_ProcurementTypes" ORDER BY "Id" LIMIT 1;
$fn$;


-- ═══ TBL4S_Companies ← wms."TBLCOMPANY"
DROP VIEW IF EXISTS procurement."TBL4S_Companies" CASCADE;
CREATE VIEW procurement."TBL4S_Companies" AS
SELECT
  b."id" AS "Id",
  COALESCE(b."code", '') AS "Code",
  COALESCE(b."name", '') AS "Name",
  COALESCE(b."isActive", true) AS "IsActive"
FROM wms."TBLCOMPANY" b
WHERE b.id = procurement.p4_company();

CREATE OR REPLACE FUNCTION procurement.p4_w_companies() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_id int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wms."TBLCOMPANY" ("code", "name", "isActive", "updatedAt")
    VALUES (NEW."Code", NEW."Name", NEW."IsActive", now()) RETURNING id INTO v_id;
    NEW."Id" := v_id;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := OLD."Id";
    UPDATE wms."TBLCOMPANY" SET "code" = NEW."Code", "name" = NEW."Name", "isActive" = NEW."IsActive", "updatedAt" = now() WHERE id = v_id;

    RETURN NEW;
  ELSE
    DELETE FROM wms."TBLCOMPANY" WHERE id = OLD."Id";
    RETURN OLD;
  END IF;
END;
$fn$;
CREATE TRIGGER p4_w_tbl4s_companies INSTEAD OF INSERT OR UPDATE OR DELETE ON procurement."TBL4S_Companies"
  FOR EACH ROW EXECUTE FUNCTION procurement.p4_w_companies();

-- ═══ TBL4S_Organizations ← wms."TBLFACILITY"
DROP VIEW IF EXISTS procurement."TBL4S_Organizations" CASCADE;
CREATE VIEW procurement."TBL4S_Organizations" AS
SELECT
  b."id" AS "Id",
  COALESCE(b."code", '') AS "Code",
  COALESCE(b."name", '') AS "Name",
  COALESCE(b."companyId", 0) AS "CompanyId",
  COALESCE(b."isActive", true) AS "IsActive"
FROM wms."TBLFACILITY" b
WHERE b."companyId" = procurement.p4_company();

CREATE OR REPLACE FUNCTION procurement.p4_w_organizations() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_id int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wms."TBLFACILITY" ("code", "name", "companyId", "isActive", "companyId", "updatedAt")
    VALUES (NEW."Code", NEW."Name", NEW."CompanyId", NEW."IsActive", procurement.p4_company(), now()) RETURNING id INTO v_id;
    NEW."Id" := v_id;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := OLD."Id";
    UPDATE wms."TBLFACILITY" SET "code" = NEW."Code", "name" = NEW."Name", "companyId" = NEW."CompanyId", "isActive" = NEW."IsActive", "updatedAt" = now() WHERE id = v_id;

    RETURN NEW;
  ELSE
    DELETE FROM wms."TBLFACILITY" WHERE id = OLD."Id";
    RETURN OLD;
  END IF;
END;
$fn$;
CREATE TRIGGER p4_w_tbl4s_organizations INSTEAD OF INSERT OR UPDATE OR DELETE ON procurement."TBL4S_Organizations"
  FOR EACH ROW EXECUTE FUNCTION procurement.p4_w_organizations();

-- ═══ TBL4S_Roles ← wms."TBLROLE"
DROP VIEW IF EXISTS procurement."TBL4S_Roles" CASCADE;
CREATE VIEW procurement."TBL4S_Roles" AS
SELECT
  b."id" AS "Id",
  COALESCE(b."code", '') AS "Code",
  COALESCE(b."name", '') AS "Name"
FROM wms."TBLROLE" b;

CREATE OR REPLACE FUNCTION procurement.p4_w_roles() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_id int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wms."TBLROLE" ("code", "name", "updatedAt")
    VALUES (NEW."Code", NEW."Name", now()) RETURNING id INTO v_id;
    NEW."Id" := v_id;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := OLD."Id";
    UPDATE wms."TBLROLE" SET "code" = NEW."Code", "name" = NEW."Name", "updatedAt" = now() WHERE id = v_id;

    RETURN NEW;
  ELSE
    DELETE FROM wms."TBLROLE" WHERE id = OLD."Id";
    RETURN OLD;
  END IF;
END;
$fn$;
CREATE TRIGGER p4_w_tbl4s_roles INSTEAD OF INSERT OR UPDATE OR DELETE ON procurement."TBL4S_Roles"
  FOR EACH ROW EXECUTE FUNCTION procurement.p4_w_roles();

-- ═══ TBL4S_Units ← wms."TBLUNIT"
DROP VIEW IF EXISTS procurement."TBL4S_Units" CASCADE;
CREATE VIEW procurement."TBL4S_Units" AS
SELECT
  b."id" AS "Id",
  COALESCE(b."code", '') AS "Code",
  COALESCE(b."name", '') AS "Name",
  COALESCE(b."isActive", true) AS "IsActive"
FROM wms."TBLUNIT" b
WHERE b."companyId" = procurement.p4_company();

CREATE OR REPLACE FUNCTION procurement.p4_w_units() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_id int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wms."TBLUNIT" ("code", "name", "isActive", "companyId", "updatedAt")
    VALUES (NEW."Code", NEW."Name", NEW."IsActive", procurement.p4_company(), now()) RETURNING id INTO v_id;
    NEW."Id" := v_id;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := OLD."Id";
    UPDATE wms."TBLUNIT" SET "code" = NEW."Code", "name" = NEW."Name", "isActive" = NEW."IsActive", "updatedAt" = now() WHERE id = v_id;

    RETURN NEW;
  ELSE
    DELETE FROM wms."TBLUNIT" WHERE id = OLD."Id";
    RETURN OLD;
  END IF;
END;
$fn$;
CREATE TRIGGER p4_w_tbl4s_units INSTEAD OF INSERT OR UPDATE OR DELETE ON procurement."TBL4S_Units"
  FOR EACH ROW EXECUTE FUNCTION procurement.p4_w_units();

-- ═══ TBL4S_Currencies ← wms."TBLCURRENCY"
DROP VIEW IF EXISTS procurement."TBL4S_Currencies" CASCADE;
CREATE VIEW procurement."TBL4S_Currencies" AS
SELECT
  b."id" AS "Id",
  COALESCE(b."code", '') AS "Code",
  COALESCE(b."name", '') AS "Name",
  b."symbol" AS "Symbol",
  COALESCE(b."isActive", true) AS "IsActive"
FROM wms."TBLCURRENCY" b
WHERE b."companyId" = procurement.p4_company();

CREATE OR REPLACE FUNCTION procurement.p4_w_currencies() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_id int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wms."TBLCURRENCY" ("code", "name", "symbol", "isActive", "companyId", "updatedAt")
    VALUES (NEW."Code", NEW."Name", NEW."Symbol", NEW."IsActive", procurement.p4_company(), now()) RETURNING id INTO v_id;
    NEW."Id" := v_id;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := OLD."Id";
    UPDATE wms."TBLCURRENCY" SET "code" = NEW."Code", "name" = NEW."Name", "symbol" = NEW."Symbol", "isActive" = NEW."IsActive", "updatedAt" = now() WHERE id = v_id;

    RETURN NEW;
  ELSE
    DELETE FROM wms."TBLCURRENCY" WHERE id = OLD."Id";
    RETURN OLD;
  END IF;
END;
$fn$;
CREATE TRIGGER p4_w_tbl4s_currencies INSTEAD OF INSERT OR UPDATE OR DELETE ON procurement."TBL4S_Currencies"
  FOR EACH ROW EXECUTE FUNCTION procurement.p4_w_currencies();

-- ═══ TBL4S_PaymentTerms ← wms."TBLPAYMENTTERM"
DROP VIEW IF EXISTS procurement."TBL4S_PaymentTerms" CASCADE;
CREATE VIEW procurement."TBL4S_PaymentTerms" AS
SELECT
  b."id" AS "Id",
  COALESCE(b."code", '') AS "Code",
  COALESCE(b."name", '') AS "Name",
  COALESCE(b."days", 0) AS "DaysNet",
  COALESCE(b."isActive", true) AS "IsActive"
FROM wms."TBLPAYMENTTERM" b
WHERE b."companyId" = procurement.p4_company();

CREATE OR REPLACE FUNCTION procurement.p4_w_paymentterms() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_id int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wms."TBLPAYMENTTERM" ("code", "name", "days", "isActive", "companyId", "updatedAt")
    VALUES (NEW."Code", NEW."Name", NEW."DaysNet", NEW."IsActive", procurement.p4_company(), now()) RETURNING id INTO v_id;
    NEW."Id" := v_id;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := OLD."Id";
    UPDATE wms."TBLPAYMENTTERM" SET "code" = NEW."Code", "name" = NEW."Name", "days" = NEW."DaysNet", "isActive" = NEW."IsActive", "updatedAt" = now() WHERE id = v_id;

    RETURN NEW;
  ELSE
    DELETE FROM wms."TBLPAYMENTTERM" WHERE id = OLD."Id";
    RETURN OLD;
  END IF;
END;
$fn$;
CREATE TRIGGER p4_w_tbl4s_paymentterms INSTEAD OF INSERT OR UPDATE OR DELETE ON procurement."TBL4S_PaymentTerms"
  FOR EACH ROW EXECUTE FUNCTION procurement.p4_w_paymentterms();

-- ═══ TBL4S_Incoterms ← wms."TBLINCOTERM"
DROP VIEW IF EXISTS procurement."TBL4S_Incoterms" CASCADE;
CREATE VIEW procurement."TBL4S_Incoterms" AS
SELECT
  b."id" AS "Id",
  COALESCE(b."code", '') AS "Code",
  COALESCE(b."name", '') AS "Name",
  b."description" AS "Description",
  COALESCE(b."isActive", true) AS "IsActive"
FROM wms."TBLINCOTERM" b
WHERE b."companyId" = procurement.p4_company();

CREATE OR REPLACE FUNCTION procurement.p4_w_incoterms() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_id int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wms."TBLINCOTERM" ("code", "name", "description", "isActive", "companyId", "updatedAt")
    VALUES (NEW."Code", NEW."Name", NEW."Description", NEW."IsActive", procurement.p4_company(), now()) RETURNING id INTO v_id;
    NEW."Id" := v_id;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := OLD."Id";
    UPDATE wms."TBLINCOTERM" SET "code" = NEW."Code", "name" = NEW."Name", "description" = NEW."Description", "isActive" = NEW."IsActive", "updatedAt" = now() WHERE id = v_id;

    RETURN NEW;
  ELSE
    DELETE FROM wms."TBLINCOTERM" WHERE id = OLD."Id";
    RETURN OLD;
  END IF;
END;
$fn$;
CREATE TRIGGER p4_w_tbl4s_incoterms INSTEAD OF INSERT OR UPDATE OR DELETE ON procurement."TBL4S_Incoterms"
  FOR EACH ROW EXECUTE FUNCTION procurement.p4_w_incoterms();

-- ═══ TBL4S_SupplierTypes ← wms."TBLPARTNERGROUP"
DROP VIEW IF EXISTS procurement."TBL4S_SupplierTypes" CASCADE;
CREATE VIEW procurement."TBL4S_SupplierTypes" AS
SELECT
  b."id" AS "Id",
  COALESCE(b."code", '') AS "Code",
  COALESCE(b."name", '') AS "Name",
  COALESCE(b."isActive", true) AS "IsActive"
FROM wms."TBLPARTNERGROUP" b
WHERE b."companyId" = procurement.p4_company();

CREATE OR REPLACE FUNCTION procurement.p4_w_suppliertypes() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_id int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wms."TBLPARTNERGROUP" ("code", "name", "isActive", "companyId", "updatedAt")
    VALUES (NEW."Code", NEW."Name", NEW."IsActive", procurement.p4_company(), now()) RETURNING id INTO v_id;
    NEW."Id" := v_id;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := OLD."Id";
    UPDATE wms."TBLPARTNERGROUP" SET "code" = NEW."Code", "name" = NEW."Name", "isActive" = NEW."IsActive", "updatedAt" = now() WHERE id = v_id;

    RETURN NEW;
  ELSE
    DELETE FROM wms."TBLPARTNERGROUP" WHERE id = OLD."Id";
    RETURN OLD;
  END IF;
END;
$fn$;
CREATE TRIGGER p4_w_tbl4s_suppliertypes INSTEAD OF INSERT OR UPDATE OR DELETE ON procurement."TBL4S_SupplierTypes"
  FOR EACH ROW EXECUTE FUNCTION procurement.p4_w_suppliertypes();

-- ═══ TBL4S_MaterialTypes ← wms."TBLPRODUCTTYPE"
DROP VIEW IF EXISTS procurement."TBL4S_MaterialTypes" CASCADE;
CREATE VIEW procurement."TBL4S_MaterialTypes" AS
SELECT
  b."id" AS "Id",
  COALESCE(b."code", '') AS "Code",
  COALESCE(b."name", '') AS "Name",
  COALESCE(b."isActive", true) AS "IsActive"
FROM wms."TBLPRODUCTTYPE" b
WHERE b."companyId" = procurement.p4_company();

CREATE OR REPLACE FUNCTION procurement.p4_w_materialtypes() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_id int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wms."TBLPRODUCTTYPE" ("code", "name", "isActive", "companyId", "updatedAt")
    VALUES (NEW."Code", NEW."Name", NEW."IsActive", procurement.p4_company(), now()) RETURNING id INTO v_id;
    NEW."Id" := v_id;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := OLD."Id";
    UPDATE wms."TBLPRODUCTTYPE" SET "code" = NEW."Code", "name" = NEW."Name", "isActive" = NEW."IsActive", "updatedAt" = now() WHERE id = v_id;

    RETURN NEW;
  ELSE
    DELETE FROM wms."TBLPRODUCTTYPE" WHERE id = OLD."Id";
    RETURN OLD;
  END IF;
END;
$fn$;
CREATE TRIGGER p4_w_tbl4s_materialtypes INSTEAD OF INSERT OR UPDATE OR DELETE ON procurement."TBL4S_MaterialTypes"
  FOR EACH ROW EXECUTE FUNCTION procurement.p4_w_materialtypes();

-- ═══ TBL4S_MaterialGroups ← wms."TBLPRODUCTGROUP"
DROP VIEW IF EXISTS procurement."TBL4S_MaterialGroups" CASCADE;
CREATE VIEW procurement."TBL4S_MaterialGroups" AS
SELECT
  b."id" AS "Id",
  COALESCE(b."code", '') AS "Code",
  COALESCE(b."name", '') AS "Name",
  COALESCE(b."isActive", true) AS "IsActive"
FROM wms."TBLPRODUCTGROUP" b
WHERE b."companyId" = procurement.p4_company();

CREATE OR REPLACE FUNCTION procurement.p4_w_materialgroups() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_id int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wms."TBLPRODUCTGROUP" ("code", "name", "isActive", "companyId", "updatedAt")
    VALUES (NEW."Code", NEW."Name", NEW."IsActive", procurement.p4_company(), now()) RETURNING id INTO v_id;
    NEW."Id" := v_id;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := OLD."Id";
    UPDATE wms."TBLPRODUCTGROUP" SET "code" = NEW."Code", "name" = NEW."Name", "isActive" = NEW."IsActive", "updatedAt" = now() WHERE id = v_id;

    RETURN NEW;
  ELSE
    DELETE FROM wms."TBLPRODUCTGROUP" WHERE id = OLD."Id";
    RETURN OLD;
  END IF;
END;
$fn$;
CREATE TRIGGER p4_w_tbl4s_materialgroups INSTEAD OF INSERT OR UPDATE OR DELETE ON procurement."TBL4S_MaterialGroups"
  FOR EACH ROW EXECUTE FUNCTION procurement.p4_w_materialgroups();

-- ═══ TBL4S_WareHouses ← wms."TBLWAREHOUSE"
DROP VIEW IF EXISTS procurement."TBL4S_WareHouses" CASCADE;
CREATE VIEW procurement."TBL4S_WareHouses" AS
SELECT
  b."id" AS "Id",
  COALESCE(b."code", '') AS "Code",
  COALESCE(b."name", '') AS "Name",
  COALESCE(b."isActive", true) AS "IsActive"
FROM wms."TBLWAREHOUSE" b
WHERE b."companyId" = procurement.p4_company();

CREATE OR REPLACE FUNCTION procurement.p4_w_warehouses() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_id int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wms."TBLWAREHOUSE" ("code", "name", "isActive", "companyId", "updatedAt")
    VALUES (NEW."Code", NEW."Name", NEW."IsActive", procurement.p4_company(), now()) RETURNING id INTO v_id;
    NEW."Id" := v_id;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := OLD."Id";
    UPDATE wms."TBLWAREHOUSE" SET "code" = NEW."Code", "name" = NEW."Name", "isActive" = NEW."IsActive", "updatedAt" = now() WHERE id = v_id;

    RETURN NEW;
  ELSE
    DELETE FROM wms."TBLWAREHOUSE" WHERE id = OLD."Id";
    RETURN OLD;
  END IF;
END;
$fn$;
CREATE TRIGGER p4_w_tbl4s_warehouses INSTEAD OF INSERT OR UPDATE OR DELETE ON procurement."TBL4S_WareHouses"
  FOR EACH ROW EXECUTE FUNCTION procurement.p4_w_warehouses();

-- ═══ TBL4S_GRLocations ← wms."TBLLOCATION"
DROP VIEW IF EXISTS procurement."TBL4S_GRLocations" CASCADE;
CREATE VIEW procurement."TBL4S_GRLocations" AS
SELECT
  b."id" AS "Id",
  COALESCE(b."code", '') AS "Code",
  COALESCE(COALESCE(b.name, b.code), '') AS "Name",
  COALESCE(b."isActive", true) AS "IsActive"
FROM wms."TBLLOCATION" b
WHERE b."companyId" = procurement.p4_company();

CREATE OR REPLACE FUNCTION procurement.p4_w_grlocations() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_id int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wms."TBLLOCATION" ("code", "isActive", "companyId", "warehouseId", "updatedAt")
    VALUES (NEW."Code", NEW."IsActive", procurement.p4_company(), (SELECT id FROM wms."TBLWAREHOUSE" WHERE "companyId" = procurement.p4_company() ORDER BY id LIMIT 1), now()) RETURNING id INTO v_id;
    NEW."Id" := v_id;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := OLD."Id";
    UPDATE wms."TBLLOCATION" SET "code" = NEW."Code", "isActive" = NEW."IsActive", "updatedAt" = now() WHERE id = v_id;

    RETURN NEW;
  ELSE
    DELETE FROM wms."TBLLOCATION" WHERE id = OLD."Id";
    RETURN OLD;
  END IF;
END;
$fn$;
CREATE TRIGGER p4_w_tbl4s_grlocations INSTEAD OF INSERT OR UPDATE OR DELETE ON procurement."TBL4S_GRLocations"
  FOR EACH ROW EXECUTE FUNCTION procurement.p4_w_grlocations();

-- ═══ TBL4S_NumberSequences ← wms."TBLSEQUENCE"
DROP VIEW IF EXISTS procurement."TBL4S_NumberSequences" CASCADE;
CREATE VIEW procurement."TBL4S_NumberSequences" AS
SELECT
  b."id" AS "Id",
  COALESCE(b."code", '') AS "Code",
  COALESCE(COALESCE(b.prefix, ''), '') AS "Prefix",
  COALESCE(b."currentValue", 0) AS "CurrentNumber",
  COALESCE(b."padLength", 6) AS "PaddingLength",
  COALESCE(b."createdAt", now()) AS "CreatedDate"
FROM wms."TBLSEQUENCE" b
WHERE b."companyId" = procurement.p4_company();

CREATE OR REPLACE FUNCTION procurement.p4_w_numbersequences() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_id int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wms."TBLSEQUENCE" ("code", "currentValue", "padLength", "prefix", "companyId", "name", "updatedAt")
    VALUES (NEW."Code", NEW."CurrentNumber", NEW."PaddingLength", NEW."Prefix", procurement.p4_company(), NEW."Code", now()) RETURNING id INTO v_id;
    NEW."Id" := v_id;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := OLD."Id";
    UPDATE wms."TBLSEQUENCE" SET "code" = NEW."Code", "currentValue" = NEW."CurrentNumber", "padLength" = NEW."PaddingLength", "prefix" = NEW."Prefix", "updatedAt" = now() WHERE id = v_id;

    RETURN NEW;
  ELSE
    DELETE FROM wms."TBLSEQUENCE" WHERE id = OLD."Id";
    RETURN OLD;
  END IF;
END;
$fn$;
CREATE TRIGGER p4_w_tbl4s_numbersequences INSTEAD OF INSERT OR UPDATE OR DELETE ON procurement."TBL4S_NumberSequences"
  FOR EACH ROW EXECUTE FUNCTION procurement.p4_w_numbersequences();

-- ═══ TBL4S_Users ← wms."TBLUSER" ⋈ procurement."TBLUSERPROCPROFILE"
DROP VIEW IF EXISTS procurement."TBL4S_Users" CASCADE;
CREATE VIEW procurement."TBL4S_Users" AS
SELECT
  b."id" AS "Id",
  COALESCE(b."username", '') AS "Code",
  b.email AS "Email",
  b."passwordHash" AS "PasswordHash",
  NULL::text AS "Password",
  NULLIF(split_part(b."fullName", ' ', 1), '') AS "FirstName",
  NULLIF(substr(b."fullName", length(split_part(b."fullName", ' ', 1)) + 2), '') AS "LastName",
  p."departmentId" AS "DepartmentId",
  p."subDepartmentId" AS "SubDepartmentId",
  p."userJobGroupId" AS "UserJobGroupId",
  p."position" AS "Position",
  p."jobLocation" AS "JobLocation",
  p."gender" AS "Gender",
  p."lineManagerId" AS "LineManagerId",
  COALESCE(p."isManager", false) AS "IsManager",
  COALESCE(p."isBackup", false) AS "IsBackup",
  COALESCE(p."approvalLimit", 0) AS "ApprovalLimit",
  COALESCE(p."isApprover", false) AS "IsApprover",
  COALESCE(b."isSuperAdmin", false) AS "IsAdmin",
  COALESCE(p."workLevel", 1) AS "WorkLevel",
  COALESCE(b."isActive", true) AS "IsActive",
  COALESCE(p."hasCompletedOnboarding", false) AS "HasCompletedOnboarding",
  b."profilePictureUrl" AS "ProfilePictureUrl",
  p."defaultBackupId" AS "DefaultBackupId",
  p."createdById" AS "CreatedBy",
  COALESCE(b."createdAt", now()) AS "CreatedDate",
  p."updatedById" AS "UpdatedBy",
  b."updatedAt" AS "UpdatedDate"
FROM wms."TBLUSER" b
LEFT JOIN procurement."TBLUSERPROCPROFILE" p ON p."userId" = b.id
WHERE b."companyId" = procurement.p4_company();

CREATE OR REPLACE FUNCTION procurement.p4_w_users() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_id int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wms."TBLUSER" ("username", "isSuperAdmin", "isActive", "profilePictureUrl", "email", "passwordHash", "fullName", "companyId", "updatedAt")
    VALUES (NEW."Code", NEW."IsAdmin", NEW."IsActive", NEW."ProfilePictureUrl", COALESCE(NULLIF(NEW."Email", ''), lower(NEW."Code") || '@4proc.local'), COALESCE(NULLIF(NEW."PasswordHash", ''), '!4proc-disabled'), COALESCE(NULLIF(trim(concat_ws(' ', NEW."FirstName", NEW."LastName")), ''), NEW."Code"), procurement.p4_company(), now()) RETURNING id INTO v_id;
    NEW."Id" := v_id;
    INSERT INTO procurement."TBLUSERPROCPROFILE" ("userId", "departmentId", "subDepartmentId", "userJobGroupId", "position", "jobLocation", "gender", "lineManagerId", "isManager", "isBackup", "approvalLimit", "isApprover", "workLevel", "hasCompletedOnboarding", "defaultBackupId", "createdById", "updatedById", "updatedAt")
    VALUES (v_id, NEW."DepartmentId", NEW."SubDepartmentId", NEW."UserJobGroupId", NEW."Position", NEW."JobLocation", NEW."Gender", NEW."LineManagerId", NEW."IsManager", NEW."IsBackup", NEW."ApprovalLimit", NEW."IsApprover", NEW."WorkLevel", NEW."HasCompletedOnboarding", NEW."DefaultBackupId", NEW."CreatedBy", NEW."UpdatedBy", now())
    ON CONFLICT ("userId") DO UPDATE SET "departmentId" = EXCLUDED."departmentId", "subDepartmentId" = EXCLUDED."subDepartmentId", "userJobGroupId" = EXCLUDED."userJobGroupId", "position" = EXCLUDED."position", "jobLocation" = EXCLUDED."jobLocation", "gender" = EXCLUDED."gender", "lineManagerId" = EXCLUDED."lineManagerId", "isManager" = EXCLUDED."isManager", "isBackup" = EXCLUDED."isBackup", "approvalLimit" = EXCLUDED."approvalLimit", "isApprover" = EXCLUDED."isApprover", "workLevel" = EXCLUDED."workLevel", "hasCompletedOnboarding" = EXCLUDED."hasCompletedOnboarding", "defaultBackupId" = EXCLUDED."defaultBackupId", "createdById" = EXCLUDED."createdById", "updatedById" = EXCLUDED."updatedById", "updatedAt" = now();
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := OLD."Id";
    UPDATE wms."TBLUSER" SET "username" = NEW."Code", "isSuperAdmin" = NEW."IsAdmin", "isActive" = NEW."IsActive", "profilePictureUrl" = NEW."ProfilePictureUrl", "email" = COALESCE(NULLIF(NEW."Email", ''), lower(NEW."Code") || '@4proc.local'), "passwordHash" = COALESCE(NULLIF(NEW."PasswordHash", ''), '!4proc-disabled'), "fullName" = COALESCE(NULLIF(trim(concat_ws(' ', NEW."FirstName", NEW."LastName")), ''), NEW."Code"), "updatedAt" = now() WHERE id = v_id;
    INSERT INTO procurement."TBLUSERPROCPROFILE" ("userId", "departmentId", "subDepartmentId", "userJobGroupId", "position", "jobLocation", "gender", "lineManagerId", "isManager", "isBackup", "approvalLimit", "isApprover", "workLevel", "hasCompletedOnboarding", "defaultBackupId", "createdById", "updatedById", "updatedAt")
    VALUES (v_id, NEW."DepartmentId", NEW."SubDepartmentId", NEW."UserJobGroupId", NEW."Position", NEW."JobLocation", NEW."Gender", NEW."LineManagerId", NEW."IsManager", NEW."IsBackup", NEW."ApprovalLimit", NEW."IsApprover", NEW."WorkLevel", NEW."HasCompletedOnboarding", NEW."DefaultBackupId", NEW."CreatedBy", NEW."UpdatedBy", now())
    ON CONFLICT ("userId") DO UPDATE SET "departmentId" = EXCLUDED."departmentId", "subDepartmentId" = EXCLUDED."subDepartmentId", "userJobGroupId" = EXCLUDED."userJobGroupId", "position" = EXCLUDED."position", "jobLocation" = EXCLUDED."jobLocation", "gender" = EXCLUDED."gender", "lineManagerId" = EXCLUDED."lineManagerId", "isManager" = EXCLUDED."isManager", "isBackup" = EXCLUDED."isBackup", "approvalLimit" = EXCLUDED."approvalLimit", "isApprover" = EXCLUDED."isApprover", "workLevel" = EXCLUDED."workLevel", "hasCompletedOnboarding" = EXCLUDED."hasCompletedOnboarding", "defaultBackupId" = EXCLUDED."defaultBackupId", "createdById" = EXCLUDED."createdById", "updatedById" = EXCLUDED."updatedById", "updatedAt" = now();
    RETURN NEW;
  ELSE
    DELETE FROM wms."TBLUSER" WHERE id = OLD."Id";
    RETURN OLD;
  END IF;
END;
$fn$;
CREATE TRIGGER p4_w_tbl4s_users INSTEAD OF INSERT OR UPDATE OR DELETE ON procurement."TBL4S_Users"
  FOR EACH ROW EXECUTE FUNCTION procurement.p4_w_users();

-- ═══ TBL4S_Suppliers ← wms."TBLBUSINESSPARTNER" ⋈ procurement."TBLPARTNERPROCPROFILE"
DROP VIEW IF EXISTS procurement."TBL4S_Suppliers" CASCADE;
CREATE VIEW procurement."TBL4S_Suppliers" AS
SELECT
  b."id" AS "Id",
  COALESCE(b."code", '') AS "Code",
  COALESCE(b."name", '') AS "Name",
  p."heading" AS "Heading",
  COALESCE(b."partnerGroupId", procurement.p4_def_partnergroup()) AS "SupplierTypeId",
  p."supplierGroupId" AS "SupplierGroupId",
  p."entCode" AS "EntCode",
  p."companyCode" AS "CompanyCode",
  COALESCE(p."currencyId", procurement.p4_def_currency()) AS "CurrencyId",
  COALESCE(p."paymentTermId", procurement.p4_def_paymentterm()) AS "PaymentTermId",
  COALESCE(p."leadTimeDays", 0) AS "LeadTimeDays",
  COALESCE(p."advancePaymentPercent", 0) AS "AdvancePaymentPercent",
  p."advancePaymentNote" AS "AdvancePaymentNote",
  b."taxNumber" AS "TaxNo",
  b."taxOffice" AS "TaxOffice",
  p."accountHolder" AS "AccountHolder",
  p."accountNumber" AS "AccountNumber",
  p."bankName" AS "BankName",
  b."licenseNo" AS "LicenseNumber",
  p."economicCode" AS "EconomicCode",
  p."deliveryPoint" AS "DeliveryPoint",
  p."shebaNumber" AS "ShebaNumber",
  p."otherTerms" AS "OtherTerms",
  b."nationalId" AS "NationalId",
  p."branchAddress" AS "BranchAddress",
  p."branchCode" AS "BranchCode",
  b."postalCode" AS "PostalCode",
  p."iban" AS "IBAN",
  COALESCE(p."isInternational", false) AS "IsInternational",
  p."swiftCode" AS "SwiftCode",
  p."bankAddress" AS "BankAddress",
  p."correspondentBank" AS "CorrespondentBank",
  p."vatId" AS "VatId",
  COALESCE(p."riskFlag", false) AS "RiskFlag",
  p."riskScore" AS "RiskScore",
  p."blacklistReason" AS "BlacklistReason",
  p."blacklistedAt" AS "BlacklistedAt",
  p."blacklistedById" AS "BlacklistedById",
  b."contactPerson" AS "ContactPerson",
  b."email" AS "Email",
  b."phone" AS "Phone",
  b."mobilePhone" AS "Mobile",
  b."fax" AS "Fax",
  b."address" AS "Address",
  b."city" AS "City",
  (SELECT r.name FROM wms."TBLREGION" r WHERE r.id = b."regionId") AS "Region",
  b."country" AS "Country",
  COALESCE(p."sendInfoEmail", false) AS "SendInfoEmail",
  COALESCE(p."sendInfoPrint", false) AS "SendInfoPrint",
  p."commodityFamilyId" AS "CommodityFamilyId",
  p."commodityClassId" AS "CommodityClassId",
  p."commodityTypeId" AS "CommodityTypeId",
  COALESCE(b."isActive", true) AS "IsActive",
  COALESCE(p."isForbidden", false) AS "IsForbidden",
  COALESCE(p."onboardingStatus", 'APPROVED') AS "OnboardingStatus",
  p."onboardingNote" AS "OnboardingNote",
  p."approvedAt" AS "ApprovedAt",
  p."approvedById" AS "ApprovedById",
  p."tradeRegNo" AS "TradeRegNo",
  p."bankBranch" AS "BankBranch",
  p."createdById" AS "CreatedBy",
  COALESCE(b."createdAt", now()) AS "CreatedDate",
  p."updatedById" AS "UpdatedBy",
  b."updatedAt" AS "UpdatedDate"
FROM wms."TBLBUSINESSPARTNER" b
LEFT JOIN procurement."TBLPARTNERPROCPROFILE" p ON p."partnerId" = b.id
WHERE b."companyId" = procurement.p4_company() AND b.type IN ('SUPPLIER', 'BOTH');

CREATE OR REPLACE FUNCTION procurement.p4_w_suppliers() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_id int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wms."TBLBUSINESSPARTNER" ("code", "name", "partnerGroupId", "taxNumber", "taxOffice", "licenseNo", "nationalId", "postalCode", "contactPerson", "email", "phone", "mobilePhone", "fax", "address", "city", "country", "isActive", "regionId", "companyId", "type", "updatedAt")
    VALUES (NEW."Code", NEW."Name", NEW."SupplierTypeId", NEW."TaxNo", NEW."TaxOffice", NEW."LicenseNumber", NEW."NationalId", NEW."PostalCode", NEW."ContactPerson", NEW."Email", NEW."Phone", NEW."Mobile", NEW."Fax", NEW."Address", NEW."City", NEW."Country", NEW."IsActive", (SELECT r.id FROM wms."TBLREGION" r WHERE r."companyId" = procurement.p4_company() AND lower(r.name) = lower(NEW."Region")), procurement.p4_company(), 'SUPPLIER', now()) RETURNING id INTO v_id;
    NEW."Id" := v_id;
    INSERT INTO procurement."TBLPARTNERPROCPROFILE" ("partnerId", "heading", "supplierGroupId", "entCode", "companyCode", "currencyId", "paymentTermId", "leadTimeDays", "advancePaymentPercent", "advancePaymentNote", "accountHolder", "accountNumber", "bankName", "economicCode", "deliveryPoint", "shebaNumber", "otherTerms", "branchAddress", "branchCode", "iban", "isInternational", "swiftCode", "bankAddress", "correspondentBank", "vatId", "riskFlag", "riskScore", "blacklistReason", "blacklistedAt", "blacklistedById", "sendInfoEmail", "sendInfoPrint", "commodityFamilyId", "commodityClassId", "commodityTypeId", "isForbidden", "onboardingStatus", "onboardingNote", "approvedAt", "approvedById", "tradeRegNo", "bankBranch", "createdById", "updatedById", "updatedAt")
    VALUES (v_id, NEW."Heading", NEW."SupplierGroupId", NEW."EntCode", NEW."CompanyCode", NEW."CurrencyId", NEW."PaymentTermId", NEW."LeadTimeDays", NEW."AdvancePaymentPercent", NEW."AdvancePaymentNote", NEW."AccountHolder", NEW."AccountNumber", NEW."BankName", NEW."EconomicCode", NEW."DeliveryPoint", NEW."ShebaNumber", NEW."OtherTerms", NEW."BranchAddress", NEW."BranchCode", NEW."IBAN", NEW."IsInternational", NEW."SwiftCode", NEW."BankAddress", NEW."CorrespondentBank", NEW."VatId", NEW."RiskFlag", NEW."RiskScore", NEW."BlacklistReason", NEW."BlacklistedAt", NEW."BlacklistedById", NEW."SendInfoEmail", NEW."SendInfoPrint", NEW."CommodityFamilyId", NEW."CommodityClassId", NEW."CommodityTypeId", NEW."IsForbidden", NEW."OnboardingStatus", NEW."OnboardingNote", NEW."ApprovedAt", NEW."ApprovedById", NEW."TradeRegNo", NEW."BankBranch", NEW."CreatedBy", NEW."UpdatedBy", now())
    ON CONFLICT ("partnerId") DO UPDATE SET "heading" = EXCLUDED."heading", "supplierGroupId" = EXCLUDED."supplierGroupId", "entCode" = EXCLUDED."entCode", "companyCode" = EXCLUDED."companyCode", "currencyId" = EXCLUDED."currencyId", "paymentTermId" = EXCLUDED."paymentTermId", "leadTimeDays" = EXCLUDED."leadTimeDays", "advancePaymentPercent" = EXCLUDED."advancePaymentPercent", "advancePaymentNote" = EXCLUDED."advancePaymentNote", "accountHolder" = EXCLUDED."accountHolder", "accountNumber" = EXCLUDED."accountNumber", "bankName" = EXCLUDED."bankName", "economicCode" = EXCLUDED."economicCode", "deliveryPoint" = EXCLUDED."deliveryPoint", "shebaNumber" = EXCLUDED."shebaNumber", "otherTerms" = EXCLUDED."otherTerms", "branchAddress" = EXCLUDED."branchAddress", "branchCode" = EXCLUDED."branchCode", "iban" = EXCLUDED."iban", "isInternational" = EXCLUDED."isInternational", "swiftCode" = EXCLUDED."swiftCode", "bankAddress" = EXCLUDED."bankAddress", "correspondentBank" = EXCLUDED."correspondentBank", "vatId" = EXCLUDED."vatId", "riskFlag" = EXCLUDED."riskFlag", "riskScore" = EXCLUDED."riskScore", "blacklistReason" = EXCLUDED."blacklistReason", "blacklistedAt" = EXCLUDED."blacklistedAt", "blacklistedById" = EXCLUDED."blacklistedById", "sendInfoEmail" = EXCLUDED."sendInfoEmail", "sendInfoPrint" = EXCLUDED."sendInfoPrint", "commodityFamilyId" = EXCLUDED."commodityFamilyId", "commodityClassId" = EXCLUDED."commodityClassId", "commodityTypeId" = EXCLUDED."commodityTypeId", "isForbidden" = EXCLUDED."isForbidden", "onboardingStatus" = EXCLUDED."onboardingStatus", "onboardingNote" = EXCLUDED."onboardingNote", "approvedAt" = EXCLUDED."approvedAt", "approvedById" = EXCLUDED."approvedById", "tradeRegNo" = EXCLUDED."tradeRegNo", "bankBranch" = EXCLUDED."bankBranch", "createdById" = EXCLUDED."createdById", "updatedById" = EXCLUDED."updatedById", "updatedAt" = now();
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := OLD."Id";
    UPDATE wms."TBLBUSINESSPARTNER" SET "code" = NEW."Code", "name" = NEW."Name", "partnerGroupId" = NEW."SupplierTypeId", "taxNumber" = NEW."TaxNo", "taxOffice" = NEW."TaxOffice", "licenseNo" = NEW."LicenseNumber", "nationalId" = NEW."NationalId", "postalCode" = NEW."PostalCode", "contactPerson" = NEW."ContactPerson", "email" = NEW."Email", "phone" = NEW."Phone", "mobilePhone" = NEW."Mobile", "fax" = NEW."Fax", "address" = NEW."Address", "city" = NEW."City", "country" = NEW."Country", "isActive" = NEW."IsActive", "regionId" = (SELECT r.id FROM wms."TBLREGION" r WHERE r."companyId" = procurement.p4_company() AND lower(r.name) = lower(NEW."Region")), "updatedAt" = now() WHERE id = v_id;
    INSERT INTO procurement."TBLPARTNERPROCPROFILE" ("partnerId", "heading", "supplierGroupId", "entCode", "companyCode", "currencyId", "paymentTermId", "leadTimeDays", "advancePaymentPercent", "advancePaymentNote", "accountHolder", "accountNumber", "bankName", "economicCode", "deliveryPoint", "shebaNumber", "otherTerms", "branchAddress", "branchCode", "iban", "isInternational", "swiftCode", "bankAddress", "correspondentBank", "vatId", "riskFlag", "riskScore", "blacklistReason", "blacklistedAt", "blacklistedById", "sendInfoEmail", "sendInfoPrint", "commodityFamilyId", "commodityClassId", "commodityTypeId", "isForbidden", "onboardingStatus", "onboardingNote", "approvedAt", "approvedById", "tradeRegNo", "bankBranch", "createdById", "updatedById", "updatedAt")
    VALUES (v_id, NEW."Heading", NEW."SupplierGroupId", NEW."EntCode", NEW."CompanyCode", NEW."CurrencyId", NEW."PaymentTermId", NEW."LeadTimeDays", NEW."AdvancePaymentPercent", NEW."AdvancePaymentNote", NEW."AccountHolder", NEW."AccountNumber", NEW."BankName", NEW."EconomicCode", NEW."DeliveryPoint", NEW."ShebaNumber", NEW."OtherTerms", NEW."BranchAddress", NEW."BranchCode", NEW."IBAN", NEW."IsInternational", NEW."SwiftCode", NEW."BankAddress", NEW."CorrespondentBank", NEW."VatId", NEW."RiskFlag", NEW."RiskScore", NEW."BlacklistReason", NEW."BlacklistedAt", NEW."BlacklistedById", NEW."SendInfoEmail", NEW."SendInfoPrint", NEW."CommodityFamilyId", NEW."CommodityClassId", NEW."CommodityTypeId", NEW."IsForbidden", NEW."OnboardingStatus", NEW."OnboardingNote", NEW."ApprovedAt", NEW."ApprovedById", NEW."TradeRegNo", NEW."BankBranch", NEW."CreatedBy", NEW."UpdatedBy", now())
    ON CONFLICT ("partnerId") DO UPDATE SET "heading" = EXCLUDED."heading", "supplierGroupId" = EXCLUDED."supplierGroupId", "entCode" = EXCLUDED."entCode", "companyCode" = EXCLUDED."companyCode", "currencyId" = EXCLUDED."currencyId", "paymentTermId" = EXCLUDED."paymentTermId", "leadTimeDays" = EXCLUDED."leadTimeDays", "advancePaymentPercent" = EXCLUDED."advancePaymentPercent", "advancePaymentNote" = EXCLUDED."advancePaymentNote", "accountHolder" = EXCLUDED."accountHolder", "accountNumber" = EXCLUDED."accountNumber", "bankName" = EXCLUDED."bankName", "economicCode" = EXCLUDED."economicCode", "deliveryPoint" = EXCLUDED."deliveryPoint", "shebaNumber" = EXCLUDED."shebaNumber", "otherTerms" = EXCLUDED."otherTerms", "branchAddress" = EXCLUDED."branchAddress", "branchCode" = EXCLUDED."branchCode", "iban" = EXCLUDED."iban", "isInternational" = EXCLUDED."isInternational", "swiftCode" = EXCLUDED."swiftCode", "bankAddress" = EXCLUDED."bankAddress", "correspondentBank" = EXCLUDED."correspondentBank", "vatId" = EXCLUDED."vatId", "riskFlag" = EXCLUDED."riskFlag", "riskScore" = EXCLUDED."riskScore", "blacklistReason" = EXCLUDED."blacklistReason", "blacklistedAt" = EXCLUDED."blacklistedAt", "blacklistedById" = EXCLUDED."blacklistedById", "sendInfoEmail" = EXCLUDED."sendInfoEmail", "sendInfoPrint" = EXCLUDED."sendInfoPrint", "commodityFamilyId" = EXCLUDED."commodityFamilyId", "commodityClassId" = EXCLUDED."commodityClassId", "commodityTypeId" = EXCLUDED."commodityTypeId", "isForbidden" = EXCLUDED."isForbidden", "onboardingStatus" = EXCLUDED."onboardingStatus", "onboardingNote" = EXCLUDED."onboardingNote", "approvedAt" = EXCLUDED."approvedAt", "approvedById" = EXCLUDED."approvedById", "tradeRegNo" = EXCLUDED."tradeRegNo", "bankBranch" = EXCLUDED."bankBranch", "createdById" = EXCLUDED."createdById", "updatedById" = EXCLUDED."updatedById", "updatedAt" = now();
    RETURN NEW;
  ELSE
    DELETE FROM wms."TBLBUSINESSPARTNER" WHERE id = OLD."Id";
    RETURN OLD;
  END IF;
END;
$fn$;
CREATE TRIGGER p4_w_tbl4s_suppliers INSTEAD OF INSERT OR UPDATE OR DELETE ON procurement."TBL4S_Suppliers"
  FOR EACH ROW EXECUTE FUNCTION procurement.p4_w_suppliers();

-- ═══ TBL4S_Materials ← wms."TBLPRODUCT" ⋈ procurement."TBLPRODUCTPROCPROFILE"
DROP VIEW IF EXISTS procurement."TBL4S_Materials" CASCADE;
CREATE VIEW procurement."TBL4S_Materials" AS
SELECT
  b."id" AS "Id",
  COALESCE(b."code", '') AS "Code",
  p."heading" AS "Heading",
  b.name AS "Name",
  b."description" AS "Description",
  COALESCE(p."procurementTypeId", procurement.p4_def_proctype()) AS "ProcurementTypeId",
  COALESCE(b."productTypeId", procurement.p4_def_producttype()) AS "MaterialTypeId",
  COALESCE(b."productGroupId", procurement.p4_def_productgroup()) AS "MaterialGroupId",
  p."categoryId" AS "CategoryId",
  p."commodityFamilyId" AS "CommodityFamilyId",
  p."commodityClassId" AS "CommodityClassId",
  p."commodityId" AS "CommodityId",
  COALESCE(b."unitId", procurement.p4_def_unit()) AS "UnitId",
  COALESCE(p."minOrderQuantity", 0) AS "MinOrderQuantity",
  COALESCE(p."orderIncrement", 0) AS "OrderIncrement",
  COALESCE(p."leadTime", 0) AS "LeadTime",
  p."entCode" AS "EntCode",
  p."supplierPartNo" AS "SupplierPartNo",
  p."unspscCode" AS "UNSPSCCode",
  p."manufacturerName" AS "ManufacturerName",
  p."manufacturerPartNo" AS "ManufacturerPartNo",
  p."technicalSpecs" AS "TechnicalSpecs",
  p."imageUrl" AS "ImageUrl",
  p."msdsUrl" AS "MSDSUrl",
  p."glAccountId" AS "GLAccountId",
  COALESCE(p."isCatalog", false) AS "IsCatalog",
  COALESCE(b."isActive", true) AS "IsActive",
  p."createdById" AS "CreatedBy",
  COALESCE(b."createdAt", now()) AS "CreatedDate",
  b."updatedAt" AS "UpdatedDate"
FROM wms."TBLPRODUCT" b
LEFT JOIN procurement."TBLPRODUCTPROCPROFILE" p ON p."productId" = b.id
WHERE b."companyId" = procurement.p4_company() AND (NOT EXISTS (SELECT 1 FROM wms."TBLPRODUCTAPPLICATION" pa WHERE pa."productId" = b.id)
       OR EXISTS (SELECT 1 FROM wms."TBLPRODUCTAPPLICATION" pa JOIN wms."TBLAPPLICATION" ap ON ap.id = pa."applicationId"
                  WHERE pa."productId" = b.id AND ap.code = 'PROC'));

CREATE OR REPLACE FUNCTION procurement.p4_w_materials() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_id int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wms."TBLPRODUCT" ("code", "description", "productTypeId", "productGroupId", "unitId", "isActive", "name", "companyId", "updatedAt")
    VALUES (NEW."Code", NEW."Description", NEW."MaterialTypeId", NEW."MaterialGroupId", NEW."UnitId", NEW."IsActive", COALESCE(NULLIF(NEW."Name", ''), NULLIF(NEW."Heading", ''), NEW."Code"), procurement.p4_company(), now()) RETURNING id INTO v_id;
    NEW."Id" := v_id;
    INSERT INTO procurement."TBLPRODUCTPROCPROFILE" ("productId", "heading", "procurementTypeId", "categoryId", "commodityFamilyId", "commodityClassId", "commodityId", "minOrderQuantity", "orderIncrement", "leadTime", "entCode", "supplierPartNo", "unspscCode", "manufacturerName", "manufacturerPartNo", "technicalSpecs", "imageUrl", "msdsUrl", "glAccountId", "isCatalog", "createdById", "updatedAt")
    VALUES (v_id, NEW."Heading", NEW."ProcurementTypeId", NEW."CategoryId", NEW."CommodityFamilyId", NEW."CommodityClassId", NEW."CommodityId", NEW."MinOrderQuantity", NEW."OrderIncrement", NEW."LeadTime", NEW."EntCode", NEW."SupplierPartNo", NEW."UNSPSCCode", NEW."ManufacturerName", NEW."ManufacturerPartNo", NEW."TechnicalSpecs", NEW."ImageUrl", NEW."MSDSUrl", NEW."GLAccountId", NEW."IsCatalog", NEW."CreatedBy", now())
    ON CONFLICT ("productId") DO UPDATE SET "heading" = EXCLUDED."heading", "procurementTypeId" = EXCLUDED."procurementTypeId", "categoryId" = EXCLUDED."categoryId", "commodityFamilyId" = EXCLUDED."commodityFamilyId", "commodityClassId" = EXCLUDED."commodityClassId", "commodityId" = EXCLUDED."commodityId", "minOrderQuantity" = EXCLUDED."minOrderQuantity", "orderIncrement" = EXCLUDED."orderIncrement", "leadTime" = EXCLUDED."leadTime", "entCode" = EXCLUDED."entCode", "supplierPartNo" = EXCLUDED."supplierPartNo", "unspscCode" = EXCLUDED."unspscCode", "manufacturerName" = EXCLUDED."manufacturerName", "manufacturerPartNo" = EXCLUDED."manufacturerPartNo", "technicalSpecs" = EXCLUDED."technicalSpecs", "imageUrl" = EXCLUDED."imageUrl", "msdsUrl" = EXCLUDED."msdsUrl", "glAccountId" = EXCLUDED."glAccountId", "isCatalog" = EXCLUDED."isCatalog", "createdById" = EXCLUDED."createdById", "updatedAt" = now();
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := OLD."Id";
    UPDATE wms."TBLPRODUCT" SET "code" = NEW."Code", "description" = NEW."Description", "productTypeId" = NEW."MaterialTypeId", "productGroupId" = NEW."MaterialGroupId", "unitId" = NEW."UnitId", "isActive" = NEW."IsActive", "name" = COALESCE(NULLIF(NEW."Name", ''), NULLIF(NEW."Heading", ''), NEW."Code"), "updatedAt" = now() WHERE id = v_id;
    INSERT INTO procurement."TBLPRODUCTPROCPROFILE" ("productId", "heading", "procurementTypeId", "categoryId", "commodityFamilyId", "commodityClassId", "commodityId", "minOrderQuantity", "orderIncrement", "leadTime", "entCode", "supplierPartNo", "unspscCode", "manufacturerName", "manufacturerPartNo", "technicalSpecs", "imageUrl", "msdsUrl", "glAccountId", "isCatalog", "createdById", "updatedAt")
    VALUES (v_id, NEW."Heading", NEW."ProcurementTypeId", NEW."CategoryId", NEW."CommodityFamilyId", NEW."CommodityClassId", NEW."CommodityId", NEW."MinOrderQuantity", NEW."OrderIncrement", NEW."LeadTime", NEW."EntCode", NEW."SupplierPartNo", NEW."UNSPSCCode", NEW."ManufacturerName", NEW."ManufacturerPartNo", NEW."TechnicalSpecs", NEW."ImageUrl", NEW."MSDSUrl", NEW."GLAccountId", NEW."IsCatalog", NEW."CreatedBy", now())
    ON CONFLICT ("productId") DO UPDATE SET "heading" = EXCLUDED."heading", "procurementTypeId" = EXCLUDED."procurementTypeId", "categoryId" = EXCLUDED."categoryId", "commodityFamilyId" = EXCLUDED."commodityFamilyId", "commodityClassId" = EXCLUDED."commodityClassId", "commodityId" = EXCLUDED."commodityId", "minOrderQuantity" = EXCLUDED."minOrderQuantity", "orderIncrement" = EXCLUDED."orderIncrement", "leadTime" = EXCLUDED."leadTime", "entCode" = EXCLUDED."entCode", "supplierPartNo" = EXCLUDED."supplierPartNo", "unspscCode" = EXCLUDED."unspscCode", "manufacturerName" = EXCLUDED."manufacturerName", "manufacturerPartNo" = EXCLUDED."manufacturerPartNo", "technicalSpecs" = EXCLUDED."technicalSpecs", "imageUrl" = EXCLUDED."imageUrl", "msdsUrl" = EXCLUDED."msdsUrl", "glAccountId" = EXCLUDED."glAccountId", "isCatalog" = EXCLUDED."isCatalog", "createdById" = EXCLUDED."createdById", "updatedAt" = now();
    RETURN NEW;
  ELSE
    DELETE FROM wms."TBLPRODUCT" WHERE id = OLD."Id";
    RETURN OLD;
  END IF;
END;
$fn$;
CREATE TRIGGER p4_w_tbl4s_materials INSTEAD OF INSERT OR UPDATE OR DELETE ON procurement."TBL4S_Materials"
  FOR EACH ROW EXECUTE FUNCTION procurement.p4_w_materials();

-- ═══ TBL4S_UserRoles ← wms."TBLUSERROLE" (Id sentetik: userId*100000+roleId)
DROP VIEW IF EXISTS procurement."TBL4S_UserRoles" CASCADE;
CREATE VIEW procurement."TBL4S_UserRoles" AS
SELECT (ur."userId" * 100000 + ur."roleId") AS "Id", ur."userId" AS "UserId", ur."roleId" AS "RoleId"
FROM wms."TBLUSERROLE" ur;

CREATE OR REPLACE FUNCTION procurement.p4_w_userroles() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wms."TBLUSERROLE" ("userId", "roleId", "companyId")
    VALUES (NEW."UserId", NEW."RoleId", procurement.p4_company())
    ON CONFLICT ("userId", "roleId") DO NOTHING;
    NEW."Id" := NEW."UserId" * 100000 + NEW."RoleId";
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    DELETE FROM wms."TBLUSERROLE" WHERE "userId" = OLD."UserId" AND "roleId" = OLD."RoleId";
    INSERT INTO wms."TBLUSERROLE" ("userId", "roleId", "companyId")
    VALUES (NEW."UserId", NEW."RoleId", procurement.p4_company()) ON CONFLICT ("userId", "roleId") DO NOTHING;
    RETURN NEW;
  ELSE
    DELETE FROM wms."TBLUSERROLE" WHERE "userId" = OLD."UserId" AND "roleId" = OLD."RoleId";
    RETURN OLD;
  END IF;
END;
$fn$;
CREATE TRIGGER p4_w_tbl4s_userroles INSTEAD OF INSERT OR UPDATE OR DELETE ON procurement."TBL4S_UserRoles"
  FOR EACH ROW EXECUTE FUNCTION procurement.p4_w_userroles();

-- ═══ TBL4S_UserPermissions ← wms."TBLUSERSCREENRIGHT" (K3: tek yetki matrisi)
-- Screens JSON'u ekran-hakkı satırlarından türetilir; yazarken JSON satırlara açılır.
-- 4Proc semantiği "ekranı gören butonlarını da kullanır" → dört bayrak aynı değeri alır.
DROP VIEW IF EXISTS procurement."TBL4S_UserPermissions" CASCADE;
CREATE VIEW procurement."TBL4S_UserPermissions" AS
SELECT u.id AS "Id", u.id AS "UserId",
  (SELECT json_object_agg(r.resource, r."canView")::text
     FROM wms."TBLUSERSCREENRIGHT" r WHERE r."userId" = u.id) AS "Screens",
  NULL::int AS "UpdatedBy",
  (SELECT max(r."updatedAt") FROM wms."TBLUSERSCREENRIGHT" r WHERE r."userId" = u.id) AS "UpdatedDate"
FROM wms."TBLUSER" u
WHERE u."companyId" = procurement.p4_company();

CREATE OR REPLACE FUNCTION procurement.p4_w_userpermissions() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM wms."TBLUSERSCREENRIGHT" WHERE "userId" = OLD."UserId";
    RETURN OLD;
  END IF;
  DELETE FROM wms."TBLUSERSCREENRIGHT" WHERE "userId" = NEW."UserId";
  IF NULLIF(NEW."Screens", '') IS NOT NULL THEN
    INSERT INTO wms."TBLUSERSCREENRIGHT" ("companyId", "userId", resource, "canView", "canAdd", "canEdit", "canDelete", "updatedAt")
    SELECT procurement.p4_company(), NEW."UserId", kv.key, (kv.value::text)::boolean, (kv.value::text)::boolean,
           (kv.value::text)::boolean, (kv.value::text)::boolean, now()
    FROM json_each(NEW."Screens"::json) kv
    ON CONFLICT ("userId", resource) DO UPDATE SET "canView" = EXCLUDED."canView", "canAdd" = EXCLUDED."canAdd",
      "canEdit" = EXCLUDED."canEdit", "canDelete" = EXCLUDED."canDelete", "updatedAt" = now();
  END IF;
  NEW."Id" := NEW."UserId";
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER p4_w_tbl4s_userpermissions INSTEAD OF INSERT OR UPDATE OR DELETE ON procurement."TBL4S_UserPermissions"
  FOR EACH ROW EXECUTE FUNCTION procurement.p4_w_userpermissions();

-- ═══ TBL4S_Screens: 4Proc'a özgü ekran kataloğu (gerçek tablo)
CREATE TABLE IF NOT EXISTS procurement."TBL4S_Screens" (
  "Id" SERIAL PRIMARY KEY,
  "Code" text NOT NULL,
  "Label" text NOT NULL,
  "Order" integer NOT NULL DEFAULT 0,
  "IsActive" boolean NOT NULL DEFAULT true
);

