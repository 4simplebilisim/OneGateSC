-- Firma (TBLCOMPANY) vergi no kaldırıldı (müşteri/TBLBUSINESSPARTNER.taxNumber korunur).
ALTER TABLE wms."TBLCOMPANY" DROP COLUMN IF EXISTS "taxNumber";
