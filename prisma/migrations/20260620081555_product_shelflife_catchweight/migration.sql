-- AlterTable
ALTER TABLE "TBLPRODUCT" ADD COLUMN     "catchWeight" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxWeight" DECIMAL(18,4),
ADD COLUMN     "minWeight" DECIMAL(18,4),
ADD COLUMN     "shelfLifeControl" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shelfLifeDays" INTEGER;