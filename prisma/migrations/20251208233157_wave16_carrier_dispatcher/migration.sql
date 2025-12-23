-- CreateTable CarrierDispatcher
CREATE TABLE "CarrierDispatcher" (
    "id" TEXT NOT NULL,
    "carrierId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarrierDispatcher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarrierDispatcher_carrierId_idx" ON "CarrierDispatcher"("carrierId");

-- AddForeignKey
ALTER TABLE "CarrierDispatcher" ADD CONSTRAINT "CarrierDispatcher_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
