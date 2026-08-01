// 4Proc uyumluluk katmanı: procurement şemasında TBL4S_* VIEW'ları + INSTEAD OF trigger'ları üretir.
// 4proc kodu eski tablo/kolon adlarını kullanmaya devam eder; veri fiziksel olarak wms'te yaşar.
import { writeFileSync } from 'node:fs'

const OUT = 'C:/Users/a_tek/AppData/Local/Temp/claude/E--onegate/5f429b0b-6f07-46b9-9365-cc5411b247a7/scratchpad/compat-views.sql'
const C = 'procurement.p4_company()'

// c(viewCol, baseCol)            — taban tablo kolonu (okuma+yazma)
// p(viewCol, profileCol)         — profil tablosu kolonu (okuma+yazma)
// ro(viewCol, expr)              — salt okunur ifade (b/p takma adlarıyla)
// w(viewCol, expr, baseCol, wexpr) — okuma ifadesi + özel yazma hedefi
const c = (v, b) => ({ v, b })
const p = (v, pc) => ({ v, p: pc })
const ro = (v, expr) => ({ v, expr, ro: true })
const w = (v, expr, base, wexpr) => ({ v, expr, base, wexpr })

const SPECS = [
  { view: 'TBL4S_Companies', base: 'wms."TBLCOMPANY"', tenantPk: true, cols: [
    c('Id', 'id'), c('Code', 'code'), c('Name', 'name'), c('IsActive', 'isActive') ] },

  { view: 'TBL4S_Organizations', base: 'wms."TBLFACILITY"', tenant: true, cols: [
    c('Id', 'id'), c('Code', 'code'), c('Name', 'name'), c('CompanyId', 'companyId'), c('IsActive', 'isActive') ] },

  { view: 'TBL4S_Roles', base: 'wms."TBLROLE"', cols: [
    c('Id', 'id'), c('Code', 'code'), c('Name', 'name') ] },

  { view: 'TBL4S_Units', base: 'wms."TBLUNIT"', tenant: true, cols: [
    c('Id', 'id'), c('Code', 'code'), c('Name', 'name'), c('IsActive', 'isActive') ] },

  { view: 'TBL4S_Currencies', base: 'wms."TBLCURRENCY"', tenant: true, cols: [
    c('Id', 'id'), c('Code', 'code'), c('Name', 'name'), c('Symbol', 'symbol'), c('IsActive', 'isActive') ] },

  { view: 'TBL4S_PaymentTerms', base: 'wms."TBLPAYMENTTERM"', tenant: true, cols: [
    c('Id', 'id'), c('Code', 'code'), c('Name', 'name'), c('DaysNet', 'days'), c('IsActive', 'isActive') ] },

  { view: 'TBL4S_Incoterms', base: 'wms."TBLINCOTERM"', tenant: true, cols: [
    c('Id', 'id'), c('Code', 'code'), c('Name', 'name'), c('Description', 'description'), c('IsActive', 'isActive') ] },

  { view: 'TBL4S_SupplierTypes', base: 'wms."TBLPARTNERGROUP"', tenant: true, cols: [
    c('Id', 'id'), c('Code', 'code'), c('Name', 'name'), c('IsActive', 'isActive') ] },

  { view: 'TBL4S_MaterialTypes', base: 'wms."TBLPRODUCTTYPE"', tenant: true, cols: [
    c('Id', 'id'), c('Code', 'code'), c('Name', 'name'), c('IsActive', 'isActive') ] },

  { view: 'TBL4S_MaterialGroups', base: 'wms."TBLPRODUCTGROUP"', tenant: true, cols: [
    c('Id', 'id'), c('Code', 'code'), c('Name', 'name'), c('IsActive', 'isActive') ] },

  { view: 'TBL4S_WareHouses', base: 'wms."TBLWAREHOUSE"', tenant: true, cols: [
    c('Id', 'id'), c('Code', 'code'), c('Name', 'name'), c('IsActive', 'isActive') ] },

  { view: 'TBL4S_GRLocations', base: 'wms."TBLLOCATION"', tenant: true,
    extraInsert: [['warehouseId', `(SELECT id FROM wms."TBLWAREHOUSE" WHERE "companyId" = ${C} ORDER BY id LIMIT 1)`]],
    cols: [ c('Id', 'id'), c('Code', 'code'), ro('Name', `COALESCE(b.name, b.code)`), c('IsActive', 'isActive') ] },

  { view: 'TBL4S_NumberSequences', base: 'wms."TBLSEQUENCE"', tenant: true,
    extraInsert: [['name', `NEW."Code"`]],
    cols: [ c('Id', 'id'), c('Code', 'code'), w('Prefix', `COALESCE(b.prefix, '')`, 'prefix', `NEW."Prefix"`),
      c('CurrentNumber', 'currentValue'), c('PaddingLength', 'padLength'), c('CreatedDate', 'createdAt') ] },

  // ── Kullanıcı: çekirdek + satınalma profili ───────────────────────────────
  { view: 'TBL4S_Users', base: 'wms."TBLUSER"', tenant: true,
    profile: { table: 'procurement."TBLUSERPROCPROFILE"', fk: 'userId' },
    cols: [
      c('Id', 'id'), c('Code', 'username'),
      w('Email', 'b.email', 'email', `COALESCE(NULLIF(NEW."Email", ''), lower(NEW."Code") || '@4proc.local')`),
      w('PasswordHash', 'b."passwordHash"', 'passwordHash', `COALESCE(NULLIF(NEW."PasswordHash", ''), '!4proc-disabled')`),
      ro('Password', 'NULL::text'), // düz metin şifre BİLİNÇLİ olarak yok (güvenlik)
      w('FirstName', `NULLIF(split_part(b."fullName", ' ', 1), '')`, 'fullName',
        `COALESCE(NULLIF(trim(concat_ws(' ', NEW."FirstName", NEW."LastName")), ''), NEW."Code")`),
      ro('LastName', `NULLIF(substr(b."fullName", length(split_part(b."fullName", ' ', 1)) + 2), '')`),
      p('DepartmentId', 'departmentId'), p('SubDepartmentId', 'subDepartmentId'), p('UserJobGroupId', 'userJobGroupId'),
      p('Position', 'position'), p('JobLocation', 'jobLocation'), p('Gender', 'gender'),
      p('LineManagerId', 'lineManagerId'), p('IsManager', 'isManager'), p('IsBackup', 'isBackup'),
      p('ApprovalLimit', 'approvalLimit'), p('IsApprover', 'isApprover'),
      c('IsAdmin', 'isSuperAdmin'), p('WorkLevel', 'workLevel'), c('IsActive', 'isActive'),
      p('HasCompletedOnboarding', 'hasCompletedOnboarding'), c('ProfilePictureUrl', 'profilePictureUrl'),
      p('DefaultBackupId', 'defaultBackupId'), p('CreatedBy', 'createdById'), c('CreatedDate', 'createdAt'),
      p('UpdatedBy', 'updatedById'), c('UpdatedDate', 'updatedAt') ] },

  // ── Tedarikçi: cari kartı + satınalma profili ─────────────────────────────
  { view: 'TBL4S_Suppliers', base: 'wms."TBLBUSINESSPARTNER"', tenant: true,
    baseFilter: `b.type = 'SUPPLIER'`,
    extraInsert: [['type', `'SUPPLIER'`]],
    profile: { table: 'procurement."TBLPARTNERPROCPROFILE"', fk: 'partnerId' },
    cols: [
      c('Id', 'id'), c('Code', 'code'), c('Name', 'name'), p('Heading', 'heading'),
      c('SupplierTypeId', 'partnerGroupId'), p('SupplierGroupId', 'supplierGroupId'),
      p('EntCode', 'entCode'), p('CompanyCode', 'companyCode'),
      p('CurrencyId', 'currencyId'), p('PaymentTermId', 'paymentTermId'), p('LeadTimeDays', 'leadTimeDays'),
      p('AdvancePaymentPercent', 'advancePaymentPercent'), p('AdvancePaymentNote', 'advancePaymentNote'),
      c('TaxNo', 'taxNumber'), c('TaxOffice', 'taxOffice'),
      p('AccountHolder', 'accountHolder'), p('AccountNumber', 'accountNumber'), p('BankName', 'bankName'),
      c('LicenseNumber', 'licenseNo'), p('EconomicCode', 'economicCode'), p('DeliveryPoint', 'deliveryPoint'),
      p('ShebaNumber', 'shebaNumber'), p('OtherTerms', 'otherTerms'), c('NationalId', 'nationalId'),
      p('BranchAddress', 'branchAddress'), p('BranchCode', 'branchCode'), c('PostalCode', 'postalCode'),
      p('IBAN', 'iban'), p('IsInternational', 'isInternational'), p('SwiftCode', 'swiftCode'),
      p('BankAddress', 'bankAddress'), p('CorrespondentBank', 'correspondentBank'), p('VatId', 'vatId'),
      p('RiskFlag', 'riskFlag'), p('RiskScore', 'riskScore'), p('BlacklistReason', 'blacklistReason'),
      p('BlacklistedAt', 'blacklistedAt'), p('BlacklistedById', 'blacklistedById'),
      c('ContactPerson', 'contactPerson'), c('Email', 'email'), c('Phone', 'phone'), c('Mobile', 'mobilePhone'),
      c('Fax', 'fax'), c('Address', 'address'), c('City', 'city'),
      w('Region', `(SELECT r.name FROM wms."TBLREGION" r WHERE r.id = b."regionId")`, 'regionId',
        `(SELECT r.id FROM wms."TBLREGION" r WHERE r."companyId" = ${C} AND lower(r.name) = lower(NEW."Region"))`),
      c('Country', 'country'), p('SendInfoEmail', 'sendInfoEmail'), p('SendInfoPrint', 'sendInfoPrint'),
      p('CommodityFamilyId', 'commodityFamilyId'), p('CommodityClassId', 'commodityClassId'),
      p('CommodityTypeId', 'commodityTypeId'), c('IsActive', 'isActive'), p('IsForbidden', 'isForbidden'),
      p('OnboardingStatus', 'onboardingStatus'), p('OnboardingNote', 'onboardingNote'),
      p('ApprovedAt', 'approvedAt'), p('ApprovedById', 'approvedById'), p('TradeRegNo', 'tradeRegNo'),
      p('BankBranch', 'bankBranch'), p('CreatedBy', 'createdById'), c('CreatedDate', 'createdAt'),
      p('UpdatedBy', 'updatedById'), c('UpdatedDate', 'updatedAt') ] },

  // ── Malzeme: ürün kartı + satınalma profili ───────────────────────────────
  { view: 'TBL4S_Materials', base: 'wms."TBLPRODUCT"', tenant: true,
    profile: { table: 'procurement."TBLPRODUCTPROCPROFILE"', fk: 'productId' },
    cols: [
      c('Id', 'id'), c('Code', 'code'), p('Heading', 'heading'),
      w('Name', 'b.name', 'name', `COALESCE(NULLIF(NEW."Name", ''), NULLIF(NEW."Heading", ''), NEW."Code")`),
      c('Description', 'description'),
      p('ProcurementTypeId', 'procurementTypeId'), c('MaterialTypeId', 'productTypeId'),
      c('MaterialGroupId', 'productGroupId'), p('CategoryId', 'categoryId'),
      p('CommodityFamilyId', 'commodityFamilyId'), p('CommodityClassId', 'commodityClassId'),
      p('CommodityId', 'commodityId'), c('UnitId', 'unitId'),
      p('MinOrderQuantity', 'minOrderQuantity'), p('OrderIncrement', 'orderIncrement'), p('LeadTime', 'leadTime'),
      p('EntCode', 'entCode'), p('SupplierPartNo', 'supplierPartNo'), p('UNSPSCCode', 'unspscCode'),
      p('ManufacturerName', 'manufacturerName'), p('ManufacturerPartNo', 'manufacturerPartNo'),
      p('TechnicalSpecs', 'technicalSpecs'), p('ImageUrl', 'imageUrl'), p('MSDSUrl', 'msdsUrl'),
      p('GLAccountId', 'glAccountId'), p('IsCatalog', 'isCatalog'), c('IsActive', 'isActive'),
      p('CreatedBy', 'createdById'), c('CreatedDate', 'createdAt'), c('UpdatedDate', 'updatedAt') ] },
]

const q = (s) => `"${s}"`
const lines = []
lines.push(`-- 4Proc uyumluluk katmanı (OTOMATİK ÜRETİLDİ — gen-compat-views.mjs)
-- 4proc kodu TBL4S_* adlarını kullanmaya devam eder; veri wms tablolarında yaşar.
SET search_path = procurement, wms, public;

CREATE OR REPLACE FUNCTION procurement.p4_company() RETURNS int LANGUAGE sql STABLE AS $fn$
  SELECT id FROM wms."TBLCOMPANY" WHERE code = 'ONEGATE' LIMIT 1;
$fn$;
`)

for (const s of SPECS) {
  const hasProfile = !!s.profile
  const sel = s.cols.map((col) => {
    if (col.expr) return `  ${col.expr} AS ${q(col.v)}`
    if (col.p) return `  p.${q(col.p)} AS ${q(col.v)}`
    return `  b.${q(col.b)} AS ${q(col.v)}`
  })
  const where = [s.tenant ? `b."companyId" = ${C}` : null, s.tenantPk ? `b.id = ${C}` : null, s.baseFilter ?? null].filter(Boolean)
  lines.push(`
-- ═══ ${s.view} ← ${s.base}${hasProfile ? ' ⋈ ' + s.profile.table : ''}
DROP VIEW IF EXISTS procurement.${q(s.view)} CASCADE;
CREATE VIEW procurement.${q(s.view)} AS
SELECT
${sel.join(',\n')}
FROM ${s.base} b${hasProfile ? `\nLEFT JOIN ${s.profile.table} p ON p.${q(s.profile.fk)} = b.id` : ''}${where.length ? `\nWHERE ${where.join(' AND ')}` : ''};`)

  // ── yazma yolu: INSTEAD OF trigger ──
  // createdAt/updatedAt DB'nin işi — eşlenmiş olsalar da yazma listesine girmezler (çift kolon hatası)
  const baseCols = s.cols.filter((col) => col.b && !['id', 'createdAt', 'updatedAt'].includes(col.b))
  const specialBase = s.cols.filter((col) => col.base)
  const profCols = hasProfile ? s.cols.filter((col) => col.p) : []
  const fname = `procurement.p4_w_${s.view.replace('TBL4S_', '').toLowerCase()}`

  const insCols = [...baseCols.map((col) => q(col.b)), ...specialBase.map((col) => q(col.base)),
    ...(s.tenant ? ['"companyId"'] : []), ...(s.extraInsert ?? []).map(([cc]) => q(cc)), '"updatedAt"']
  const insVals = [...baseCols.map((col) => `NEW.${q(col.v)}`), ...specialBase.map((col) => col.wexpr),
    ...(s.tenant ? [C] : []), ...(s.extraInsert ?? []).map(([, v]) => v), 'now()']
  const setBase = [...baseCols.map((col) => `${q(col.b)} = NEW.${q(col.v)}`),
    ...specialBase.map((col) => `${q(col.base)} = ${col.wexpr}`), `"updatedAt" = now()`]

  const profIns = hasProfile
    ? `    INSERT INTO ${s.profile.table} (${q(s.profile.fk)}, ${profCols.map((col) => q(col.p)).join(', ')}, "updatedAt")
    VALUES (v_id, ${profCols.map((col) => `NEW.${q(col.v)}`).join(', ')}, now())
    ON CONFLICT (${q(s.profile.fk)}) DO UPDATE SET ${profCols.map((col) => `${q(col.p)} = EXCLUDED.${q(col.p)}`).join(', ')}, "updatedAt" = now();`
    : ''

  lines.push(`
CREATE OR REPLACE FUNCTION ${fname}() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_id int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ${s.base} (${insCols.join(', ')})
    VALUES (${insVals.join(', ')}) RETURNING id INTO v_id;
    NEW.${q('Id')} := v_id;
${profIns}
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := OLD.${q('Id')};
    UPDATE ${s.base} SET ${setBase.join(', ')} WHERE id = v_id;
${profIns}
    RETURN NEW;
  ELSE
    DELETE FROM ${s.base} WHERE id = OLD.${q('Id')};
    RETURN OLD;
  END IF;
END;
$fn$;
CREATE TRIGGER p4_w_${s.view.toLowerCase()} INSTEAD OF INSERT OR UPDATE OR DELETE ON procurement.${q(s.view)}
  FOR EACH ROW EXECUTE FUNCTION ${fname}();`)
}

// ── UserRoles: bileşik PK'lı wms tablosu, Id sentezlenir ────────────────────
lines.push(`
-- ═══ TBL4S_UserRoles ← wms."TBLUSERROLE" (Id sentetik: userId*100000+roleId)
DROP VIEW IF EXISTS procurement."TBL4S_UserRoles" CASCADE;
CREATE VIEW procurement."TBL4S_UserRoles" AS
SELECT (ur."userId" * 100000 + ur."roleId") AS "Id", ur."userId" AS "UserId", ur."roleId" AS "RoleId"
FROM wms."TBLUSERROLE" ur;

CREATE OR REPLACE FUNCTION procurement.p4_w_userroles() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO wms."TBLUSERROLE" ("userId", "roleId", "companyId")
    VALUES (NEW."UserId", NEW."RoleId", ${C})
    ON CONFLICT ("userId", "roleId") DO NOTHING;
    NEW."Id" := NEW."UserId" * 100000 + NEW."RoleId";
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    DELETE FROM wms."TBLUSERROLE" WHERE "userId" = OLD."UserId" AND "roleId" = OLD."RoleId";
    INSERT INTO wms."TBLUSERROLE" ("userId", "roleId", "companyId")
    VALUES (NEW."UserId", NEW."RoleId", ${C}) ON CONFLICT ("userId", "roleId") DO NOTHING;
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
WHERE u."companyId" = ${C};

CREATE OR REPLACE FUNCTION procurement.p4_w_userpermissions() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM wms."TBLUSERSCREENRIGHT" WHERE "userId" = OLD."UserId";
    RETURN OLD;
  END IF;
  DELETE FROM wms."TBLUSERSCREENRIGHT" WHERE "userId" = NEW."UserId";
  IF NULLIF(NEW."Screens", '') IS NOT NULL THEN
    INSERT INTO wms."TBLUSERSCREENRIGHT" ("companyId", "userId", resource, "canView", "canAdd", "canEdit", "canDelete", "updatedAt")
    SELECT ${C}, NEW."UserId", kv.key, (kv.value::text)::boolean, (kv.value::text)::boolean,
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
`)

writeFileSync(OUT, lines.join('\n') + '\n')
console.log(`views=${SPECS.length + 2} tables=1 -> ${OUT}`)
