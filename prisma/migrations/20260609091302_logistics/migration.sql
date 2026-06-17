-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "logistics";

-- CreateEnum
CREATE TYPE "logistics"."VehicleType" AS ENUM ('TRUCK', 'VAN', 'CAR', 'MOTORCYCLE');

-- CreateEnum
CREATE TYPE "logistics"."ShipmentStatus" AS ENUM ('PLANNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "logistics"."StopStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "logistics"."TBLVEHICLE" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "plateNo" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100),
    "type" "logistics"."VehicleType" NOT NULL DEFAULT 'TRUCK',
    "capacityKg" DECIMAL(18,3),
    "capacityM3" DECIMAL(18,3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLVEHICLE_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics"."TBLSHIPMENT" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "shipmentNo" VARCHAR(40) NOT NULL,
    "vehicleId" INTEGER,
    "driverName" VARCHAR(100),
    "status" "logistics"."ShipmentStatus" NOT NULL DEFAULT 'PLANNED',
    "plannedDate" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "note" VARCHAR(500),
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLSHIPMENT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics"."TBLSHIPMENTSTOP" (
    "id" SERIAL NOT NULL,
    "shipmentId" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "salesOrderId" INTEGER,
    "address" VARCHAR(255),
    "status" "logistics"."StopStatus" NOT NULL DEFAULT 'PENDING',
    "arrivedAt" TIMESTAMP(3),
    "note" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TBLSHIPMENTSTOP_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TBLVEHICLE_companyId_idx" ON "logistics"."TBLVEHICLE"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLVEHICLE_companyId_plateNo_key" ON "logistics"."TBLVEHICLE"("companyId", "plateNo");

-- CreateIndex
CREATE INDEX "TBLSHIPMENT_companyId_idx" ON "logistics"."TBLSHIPMENT"("companyId");

-- CreateIndex
CREATE INDEX "TBLSHIPMENT_vehicleId_idx" ON "logistics"."TBLSHIPMENT"("vehicleId");

-- CreateIndex
CREATE INDEX "TBLSHIPMENT_status_idx" ON "logistics"."TBLSHIPMENT"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TBLSHIPMENT_companyId_shipmentNo_key" ON "logistics"."TBLSHIPMENT"("companyId", "shipmentNo");

-- CreateIndex
CREATE INDEX "TBLSHIPMENTSTOP_shipmentId_idx" ON "logistics"."TBLSHIPMENTSTOP"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TBLSHIPMENTSTOP_shipmentId_sequence_key" ON "logistics"."TBLSHIPMENTSTOP"("shipmentId", "sequence");

-- AddForeignKey
ALTER TABLE "logistics"."TBLSHIPMENT" ADD CONSTRAINT "TBLSHIPMENT_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "logistics"."TBLVEHICLE"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics"."TBLSHIPMENTSTOP" ADD CONSTRAINT "TBLSHIPMENTSTOP_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "logistics"."TBLSHIPMENT"("id") ON DELETE CASCADE ON UPDATE CASCADE;

