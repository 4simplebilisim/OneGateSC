
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ConditionControlType" ADD VALUE 'CONTROL_FIELD_REQUIRED';
ALTER TYPE "ConditionControlType" ADD VALUE 'MIN_SHELF_LIFE';

-- AlterTable
ALTER TABLE "TBLDOCUMENTLINE" ADD COLUMN     "referenceQty" DECIMAL(28,8);

-- AlterTable
ALTER TABLE "TBLOPERATIONTYPETOLERANCE" ADD COLUMN     "tolerancePercent" DECIMAL(9,4),
ADD COLUMN     "toleranceQty" DECIMAL(28,8);

