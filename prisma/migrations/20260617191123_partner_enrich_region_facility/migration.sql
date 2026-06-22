
-- AlterTable
ALTER TABLE "TBLBUSINESSPARTNER" ADD COLUMN     "address2" VARCHAR(255),
ADD COLUMN     "contactPerson" VARCHAR(100),
ADD COLUMN     "contactPerson2" VARCHAR(100),
ADD COLUMN     "coordinateX" DECIMAL(18,8),
ADD COLUMN     "coordinateY" DECIMAL(18,8),
ADD COLUMN     "country" VARCHAR(60),
ADD COLUMN     "district" VARCHAR(60),
ADD COLUMN     "doorNo" VARCHAR(20),
ADD COLUMN     "fax" VARCHAR(20),
ADD COLUMN     "licenseNo" VARCHAR(40),
ADD COLUMN     "licenseOffice" VARCHAR(100),
ADD COLUMN     "mapCode" INTEGER,
ADD COLUMN     "maxDeliveryTime" VARCHAR(10),
ADD COLUMN     "minDeliveryTime" VARCHAR(10),
ADD COLUMN     "mobilePhone" VARCHAR(20),
ADD COLUMN     "nationalId" VARCHAR(20),
ADD COLUMN     "neighborhood" VARCHAR(100),
ADD COLUMN     "otherAddress" VARCHAR(255),
ADD COLUMN     "palletized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone2" VARCHAR(20),
ADD COLUMN     "postalCode" VARCHAR(20),
ADD COLUMN     "priorityOrder" INTEGER,
ADD COLUMN     "shortName" VARCHAR(50),
ADD COLUMN     "specialCode" VARCHAR(40),
ADD COLUMN     "street" VARCHAR(100),
ADD COLUMN     "streetName" VARCHAR(100),
ADD COLUMN     "taxOffice" VARCHAR(100),
ADD COLUMN     "vehicleRestriction" VARCHAR(255),
ADD COLUMN     "website" VARCHAR(150);

-- AlterTable
ALTER TABLE "TBLREGION" ADD COLUMN     "facilityId" INTEGER;

-- CreateIndex
CREATE INDEX "TBLREGION_facilityId_idx" ON "TBLREGION"("facilityId");

-- AddForeignKey
ALTER TABLE "TBLREGION" ADD CONSTRAINT "TBLREGION_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "TBLFACILITY"("id") ON DELETE SET NULL ON UPDATE CASCADE;

