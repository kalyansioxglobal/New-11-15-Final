-- Wave 16: Carrier dispatcher models and indexes

-- 1) CarrierDispatcher table
CREATE TABLE "CarrierDispatcher" (
  "id" SERIAL NOT NULL,
  "carrierId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CarrierDispatcher_pkey" PRIMARY KEY ("id")
);

-- 2) Foreign key to Carrier
ALTER TABLE "CarrierDispatcher"
ADD CONSTRAINT "CarrierDispatcher_carrierId_fkey"
FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3) Indexes per spec
CREATE INDEX "CarrierDispatcher_carrierId_idx" ON "CarrierDispatcher"("carrierId");

-- 4) Additional indexes on Carrier
CREATE INDEX IF NOT EXISTS "Carrier_name_idx" ON "Carrier"("name");
CREATE INDEX IF NOT EXISTS "Carrier_mcNumber_idx" ON "Carrier"("mcNumber");

-- 5) Index on CarrierContact.carrierId
CREATE INDEX IF NOT EXISTS "CarrierContact_carrierId_idx" ON "CarrierContact"("carrierId");
