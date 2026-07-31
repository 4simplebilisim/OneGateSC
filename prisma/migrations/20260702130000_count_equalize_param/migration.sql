-- AlterTable: Sayım operasyon linki + eşitleme parametresi (TBLCOUNTPARAMETER davranışa bağlanır)
ALTER TABLE "TBLSTOCKCOUNT" ADD COLUMN     "operationTypeId" INTEGER,
ADD COLUMN     "equalize" BOOLEAN NOT NULL DEFAULT true;
