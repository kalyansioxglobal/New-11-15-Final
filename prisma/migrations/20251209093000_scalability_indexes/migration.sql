-- Add targeted indexes for freight loads
CREATE INDEX "Load_ventureId_pickupDate_idx" ON "Load"("ventureId", "pickupDate");
CREATE INDEX "Load_ventureId_createdAt_idx" ON "Load"("ventureId", "createdAt");
CREATE INDEX "Load_carrierId_idx" ON "Load"("carrierId");
CREATE INDEX "Load_shipperId_idx" ON "Load"("shipperId");
CREATE INDEX "Load_customerId_idx" ON "Load"("customerId");

-- Carrier FMCSA/active filters
CREATE INDEX "Carrier_active_blocked_idx" ON "Carrier"("active", "blocked");
CREATE INDEX "Carrier_fmcsaAuthorized_active_idx" ON "Carrier"("fmcsaAuthorized", "active");
CREATE INDEX "Carrier_operatingStatus_idx" ON "Carrier"("operatingStatus");
CREATE INDEX "Carrier_fmcsaStatus_idx" ON "Carrier"("fmcsaStatus");

-- Hotel KPI venture/date slicing
CREATE INDEX "HotelKpiDaily_ventureId_date_idx" ON "HotelKpiDaily"("ventureId", "date");

-- IncentiveDaily time slicing
CREATE INDEX "IncentiveDaily_ventureId_date_idx" ON "IncentiveDaily"("ventureId", "date");
CREATE INDEX "IncentiveDaily_userId_date_idx" ON "IncentiveDaily"("userId", "date");

-- 3PL load mapping table
CREATE TABLE "ThreePlLoadMapping" (
    "id" SERIAL NOT NULL,
    "threePlLoadId" TEXT NOT NULL,
    "loadId" INTEGER,
    "ventureId" INTEGER,
    "lastModifiedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreePlLoadMapping_pkey" PRIMARY KEY ("id")
);

-- Unique + lookup indexes for 3PL mapping
CREATE UNIQUE INDEX "ThreePlLoadMapping_threePlLoadId_key" ON "ThreePlLoadMapping"("threePlLoadId");
CREATE INDEX "ThreePlLoadMapping_loadId_idx" ON "ThreePlLoadMapping"("loadId");
CREATE INDEX "ThreePlLoadMapping_ventureId_idx" ON "ThreePlLoadMapping"("ventureId");
CREATE INDEX "ThreePlLoadMapping_lastModifiedAt_idx" ON "ThreePlLoadMapping"("lastModifiedAt");

-- Foreign keys
ALTER TABLE "ThreePlLoadMapping" ADD CONSTRAINT "ThreePlLoadMapping_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ThreePlLoadMapping" ADD CONSTRAINT "ThreePlLoadMapping_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE SET NULL ON UPDATE CASCADE;
