-- Depo rezervasyonu (legacy LNGREZERVEBELGEKOD birebir): rezervin sahibi belge.
-- Rezerve stok YALNIZ o belgede okutulur/cekilir; null+reservedQty>0 = bagsiz blokaj (elle/satis tahsisi).
ALTER TABLE wms."TBLSTOCK" ADD COLUMN "reservedDocumentId" INTEGER;
CREATE INDEX "TBLSTOCK_reservedDocumentId_idx" ON wms."TBLSTOCK"("reservedDocumentId");
