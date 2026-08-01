-- 4Proc uyumluluk katmanı için profil tablolarına eksik alanlar (audit + tedarikçi/malzeme ek kolonları)
ALTER TABLE procurement."TBLUSERPROCPROFILE" ADD COLUMN "createdById" INTEGER, ADD COLUMN "updatedById" INTEGER;
ALTER TABLE procurement."TBLPRODUCTPROCPROFILE" ADD COLUMN "heading" VARCHAR(150), ADD COLUMN "createdById" INTEGER, ADD COLUMN "updatedById" INTEGER;
ALTER TABLE procurement."TBLPARTNERPROCPROFILE"
  ADD COLUMN "supplierGroupId" INTEGER,
  ADD COLUMN "companyCode" VARCHAR(40),
  ADD COLUMN "branchAddress" VARCHAR(255),
  ADD COLUMN "branchCode" VARCHAR(40),
  ADD COLUMN "createdById" INTEGER,
  ADD COLUMN "updatedById" INTEGER;
