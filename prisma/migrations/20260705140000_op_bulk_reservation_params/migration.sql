-- Operasyon parametreleri: Toplu Islem (legacy BYTTOPLUISLEM) + Rezervasyon — ayri baglanti tablosu yerine dogrudan operasyonda.
ALTER TABLE wms."TBLOPERATIONTYPE" ADD COLUMN "bulkAction" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE wms."TBLOPERATIONTYPE" ADD COLUMN "reservation" BOOLEAN NOT NULL DEFAULT false;

-- Mevcut Toplu Islem Baglanti kayitlarini parametrelere tasi (veri kaybi yok; eski tablo durur)
UPDATE wms."TBLOPERATIONTYPE" o SET "bulkAction" = true
WHERE EXISTS (SELECT 1 FROM wms."TBLOPERATIONTYPEBULKACTION" b
              WHERE b."operationTypeId" = o.id AND b."isActive" = true
                AND (b."bulkActionType" IS NULL OR b."bulkActionType" <> 'RESERVATION'));

UPDATE wms."TBLOPERATIONTYPE" o SET "reservation" = true
WHERE EXISTS (SELECT 1 FROM wms."TBLOPERATIONTYPEBULKACTION" b
              WHERE b."operationTypeId" = o.id AND b."isActive" = true
                AND b."bulkActionType" = 'RESERVATION');
