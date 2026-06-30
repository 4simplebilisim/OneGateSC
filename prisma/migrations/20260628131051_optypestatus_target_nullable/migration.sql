-- TBLOPERATIONTYPESTATUS.targetStatusId nullable — Cikis operasyonunda hedef statu yok (stok disari cikar).
ALTER TABLE "wms"."TBLOPERATIONTYPESTATUS" ALTER COLUMN "targetStatusId" DROP NOT NULL;
