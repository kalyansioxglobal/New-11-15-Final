-- CreateTable HotelPnlMonthly
CREATE TABLE "HotelPnlMonthly" (
    "id" SERIAL NOT NULL,
    "hotelId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "baseRevenue" DECIMAL(19,2),
    "payroll" DECIMAL(19,2) DEFAULT 0,
    "utilities" DECIMAL(19,2) DEFAULT 0,
    "repairsMaintenance" DECIMAL(19,2) DEFAULT 0,
    "marketing" DECIMAL(19,2) DEFAULT 0,
    "otaCommissions" DECIMAL(19,2) DEFAULT 0,
    "insurance" DECIMAL(19,2) DEFAULT 0,
    "propertyTax" DECIMAL(19,2) DEFAULT 0,
    "adminGeneral" DECIMAL(19,2) DEFAULT 0,
    "other1Label" TEXT,
    "other1Amount" DECIMAL(19,2) DEFAULT 0,
    "other2Label" TEXT,
    "other2Amount" DECIMAL(19,2) DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelPnlMonthly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HotelPnlMonthly_hotelId_year_month_key" ON "HotelPnlMonthly"("hotelId", "year", "month");

-- CreateIndex
CREATE INDEX "HotelPnlMonthly_hotelId_year_idx" ON "HotelPnlMonthly"("hotelId", "year");

-- AddForeignKey
ALTER TABLE "HotelPnlMonthly" ADD CONSTRAINT "HotelPnlMonthly_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "HotelProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
