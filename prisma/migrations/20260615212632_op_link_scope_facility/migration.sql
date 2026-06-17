-- CreateEnum
CREATE TYPE "LinkScope" AS ENUM ('ALL', 'GROUP', 'SPECIFIC');

-- CreateEnum
CREATE TYPE "BulkActionType" AS ENUM ('CONTROLLED_BULK', 'BULK', 'RESERVATION', 'SELECTED_DOCUMENT', 'BATCH_CHANGE');

-- AlterTable
ALTER TABLE "TBLOPERATIONGROUPLINK" ADD COLUMN     "facilityId" INTEGER;

-- AlterTable
ALTER TABLE "TBLOPERATIONTYPEBULKACTION" ADD COLUMN     "facilityId" INTEGER,
DROP COLUMN "bulkActionType",
ADD COLUMN     "bulkActionType" "BulkActionType";

-- AlterTable
ALTER TABLE "TBLOPERATIONTYPECONVERSION" ADD COLUMN     "facilityId" INTEGER,
DROP COLUMN "sourceLocLinkType",
ADD COLUMN     "sourceLocLinkType" "LinkScope",
DROP COLUMN "targetLocLinkType",
ADD COLUMN     "targetLocLinkType" "LinkScope";

-- AlterTable
ALTER TABLE "TBLOPERATIONTYPEFORBIDDENPRODUCT" ADD COLUMN     "facilityId" INTEGER,
DROP COLUMN "cariLinkType",
ADD COLUMN     "cariLinkType" "LinkScope",
DROP COLUMN "materialLinkType",
ADD COLUMN     "materialLinkType" "LinkScope";

-- AlterTable
ALTER TABLE "TBLOPERATIONTYPELOCATION" ADD COLUMN     "cariLinkId" INTEGER,
ADD COLUMN     "cariLinkType" "LinkScope",
ADD COLUMN     "facilityId" INTEGER,
ADD COLUMN     "materialLinkId" INTEGER,
ADD COLUMN     "materialLinkType" "LinkScope",
ADD COLUMN     "sourceLinkType" "LinkScope",
ADD COLUMN     "targetLinkType" "LinkScope",
ADD COLUMN     "terminalFixSource" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "terminalFixTarget" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TBLOPERATIONTYPEPALLETTYPE" ADD COLUMN     "facilityId" INTEGER;

-- AlterTable
ALTER TABLE "TBLOPERATIONTYPEREASON" ADD COLUMN     "facilityId" INTEGER,
ADD COLUMN     "reasonCategoryId" INTEGER;

-- AlterTable
ALTER TABLE "TBLOPERATIONTYPESTATUS" ADD COLUMN     "cariLinkId" INTEGER,
ADD COLUMN     "cariLinkType" "LinkScope",
ADD COLUMN     "facilityId" INTEGER,
ADD COLUMN     "materialLinkId" INTEGER,
ADD COLUMN     "materialLinkType" "LinkScope";

-- AlterTable
ALTER TABLE "TBLOPERATIONTYPETOLERANCE" ADD COLUMN     "facilityId" INTEGER,
DROP COLUMN "cariLinkType",
ADD COLUMN     "cariLinkType" "LinkScope",
DROP COLUMN "materialLinkType",
ADD COLUMN     "materialLinkType" "LinkScope";

-- AlterTable
ALTER TABLE "TBLSEQUENTIALOPERATION" ADD COLUMN     "facilityId" INTEGER,
DROP COLUMN "cariLinkType",
ADD COLUMN     "cariLinkType" "LinkScope",
DROP COLUMN "materialLinkType",
ADD COLUMN     "materialLinkType" "LinkScope",
DROP COLUMN "locationLinkType",
ADD COLUMN     "locationLinkType" "LinkScope";

