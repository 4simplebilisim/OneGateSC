-- AlterEnum
ALTER TYPE "UserScopeType" ADD VALUE 'SCREEN';

-- AlterTable
ALTER TABLE "TBLUSERAUTHORIZATION" ADD COLUMN     "referenceCode" VARCHAR(60),
ALTER COLUMN "referenceId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TBLUSERAUTHORIZATION_userId_scopeType_referenceCode_key" ON "TBLUSERAUTHORIZATION"("userId", "scopeType", "referenceCode");

