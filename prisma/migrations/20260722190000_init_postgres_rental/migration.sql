-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "rental";

-- CreateTable
CREATE TABLE "rental"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental"."Car" (
    "id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "registrationPlate" TEXT NOT NULL,
    "vin" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "category" TEXT,
    "fuelType" TEXT,
    "purchasePriceOre" INTEGER,
    "purchaseDate" TIMESTAMP(3),
    "purchaseOdometer" INTEGER NOT NULL DEFAULT 0,
    "currentOdometer" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "insuranceNote" TEXT,
    "nextInspectionDue" TIMESTAMP(3),
    "depPerKmOre" INTEGER NOT NULL DEFAULT 0,
    "depPerDayOre" INTEGER NOT NULL DEFAULT 0,
    "serviceIntervalKm" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental"."Booking" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "channel" TEXT NOT NULL DEFAULT 'private',
    "plannedStartAt" TIMESTAMP(3) NOT NULL,
    "plannedEndAt" TIMESTAMP(3) NOT NULL,
    "pickupTime" TEXT,
    "deliveryTime" TEXT,
    "drivenKm" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental"."BookingLineItem" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountOre" INTEGER NOT NULL,
    "vatPercent" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "occurredOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental"."ServiceEvent" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "bookingId" TEXT,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "odometer" INTEGER,
    "type" TEXT NOT NULL,
    "vendor" TEXT,
    "amountOre" INTEGER NOT NULL,
    "vatPercent" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental"."LineItemCategory" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountCode" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineItemCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental"."AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "rental"."MarketModel" (
    "id" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental"."MarketListing" (
    "id" TEXT NOT NULL,
    "year" INTEGER,
    "km" INTEGER,
    "priceNok" INTEGER,
    "fuel" TEXT,
    "transmission" TEXT,
    "location" TEXT,
    "sellerType" TEXT,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "scrapedDate" DATE NOT NULL,
    "wltpKm" INTEGER,
    "variant" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental"."MarketPriceObservation" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "observedDate" DATE NOT NULL,
    "priceNok" INTEGER,
    "previousPriceNok" INTEGER,
    "deltaNok" INTEGER,
    "km" INTEGER,
    "status" TEXT,
    "variant" TEXT,
    "title" TEXT,

    CONSTRAINT "MarketPriceObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental"."ScrapeJob" (
    "id" TEXT NOT NULL DEFAULT 'current',
    "status" TEXT NOT NULL DEFAULT 'idle',
    "message" TEXT NOT NULL DEFAULT '',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrapeJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "rental"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Car_registrationPlate_key" ON "rental"."Car"("registrationPlate");

-- CreateIndex
CREATE INDEX "Booking_carId_plannedStartAt_plannedEndAt_idx" ON "rental"."Booking"("carId", "plannedStartAt", "plannedEndAt");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "rental"."Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_plannedStartAt_idx" ON "rental"."Booking"("plannedStartAt");

-- CreateIndex
CREATE INDEX "BookingLineItem_bookingId_idx" ON "rental"."BookingLineItem"("bookingId");

-- CreateIndex
CREATE INDEX "BookingLineItem_kind_category_idx" ON "rental"."BookingLineItem"("kind", "category");

-- CreateIndex
CREATE INDEX "ServiceEvent_carId_occurredOn_idx" ON "rental"."ServiceEvent"("carId", "occurredOn");

-- CreateIndex
CREATE INDEX "ServiceEvent_bookingId_idx" ON "rental"."ServiceEvent"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "LineItemCategory_kind_name_key" ON "rental"."LineItemCategory"("kind", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MarketModel_variant_key" ON "rental"."MarketModel"("variant");

-- CreateIndex
CREATE INDEX "MarketListing_variant_idx" ON "rental"."MarketListing"("variant");

-- CreateIndex
CREATE INDEX "MarketListing_status_idx" ON "rental"."MarketListing"("status");

-- CreateIndex
CREATE INDEX "MarketPriceObservation_listingId_observedDate_idx" ON "rental"."MarketPriceObservation"("listingId", "observedDate");

-- AddForeignKey
ALTER TABLE "rental"."Booking" ADD CONSTRAINT "Booking_carId_fkey" FOREIGN KEY ("carId") REFERENCES "rental"."Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental"."BookingLineItem" ADD CONSTRAINT "BookingLineItem_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "rental"."Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental"."ServiceEvent" ADD CONSTRAINT "ServiceEvent_carId_fkey" FOREIGN KEY ("carId") REFERENCES "rental"."Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental"."ServiceEvent" ADD CONSTRAINT "ServiceEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "rental"."Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental"."MarketPriceObservation" ADD CONSTRAINT "MarketPriceObservation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "rental"."MarketListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

