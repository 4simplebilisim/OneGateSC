-- Köprü bağı: WMS belgesi hangi Procurement siparişinden doğdu.
-- Belge tabloları AYRI yaşar (WMS palet/lot detayı, Procurement özet); bu kolon ikisini bağlar.
ALTER TABLE wms."TBLDOCUMENT" ADD COLUMN "sourceOrderId" INTEGER;
CREATE UNIQUE INDEX "TBLDOCUMENT_sourceOrderId_key" ON wms."TBLDOCUMENT"("sourceOrderId") WHERE "sourceOrderId" IS NOT NULL;
