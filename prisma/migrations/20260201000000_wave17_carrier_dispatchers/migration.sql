-- Wave 17: Carrier dispatcher user mapping + cached JSON

-- 1) Add dispatchersJson to Carrier
ALTER TABLE "Carrier" ADD COLUMN IF NOT EXISTS "dispatchersJson" TEXT;

-- 2) Internal user-to-carrier dispatcher mapping table
CREATE TABLE "CarrierDispatcherInternal" (
  "id" SERIAL NOT NULL,
  "carrierId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CarrierDispatcherInternal_pkey" PRIMARY KEY ("id")
);

-- 3) FKs with ON DELETE CASCADE
ALTER TABLE "CarrierDispatcherInternal"
ADD CONSTRAINT "CarrierDispatcherInternal_carrierId_fkey"
FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CarrierDispatcherInternal"
ADD CONSTRAINT "CarrierDispatcherInternal_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) Uniqueness: one mapping per (carrier,user)
CREATE UNIQUE INDEX "CarrierDispatcherInternal_carrierId_userId_key"
ON "CarrierDispatcherInternal"("carrierId", "userId");
