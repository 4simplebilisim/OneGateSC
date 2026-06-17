-- CreateEnum
CREATE TYPE "PalletMixing" AS ENUM ('SINGLE_PRODUCT', 'MIXED');

-- AlterTable
ALTER TABLE "TBLPALLETTYPE" ADD COLUMN     "breakPalletOnTransfer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "breakParentPallet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "breakPartialPallet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "facilityId" INTEGER,
ADD COLUMN     "keepFullPalletOnTransfer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logControl" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logControlWarningType" INTEGER,
ADD COLUMN     "logging" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mixingType" "PalletMixing",
ADD COLUMN     "newNoOnEdit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "partialUse" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "removeFromPalletOnTransfer" BOOLEAN NOT NULL DEFAULT false;

