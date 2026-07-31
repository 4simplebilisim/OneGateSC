-- Referans Kontrollü: operasyona bağlı giriş operasyonu + belgede referans zinciri (legacy LNGREFBELGENO)
ALTER TABLE "TBLOPERATIONTYPE" ADD COLUMN     "linkedEntryOperationTypeId" INTEGER;

ALTER TABLE "TBLDOCUMENT" ADD COLUMN     "referenceDocumentId" INTEGER;

-- CreateIndex
CREATE INDEX "TBLDOCUMENT_referenceDocumentId_idx" ON "TBLDOCUMENT"("referenceDocumentId");
