-- CreateTable
CREATE TABLE "rental"."OdometerReading" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "odometerKm" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OdometerReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OdometerReading_carId_recordedAt_idx" ON "rental"."OdometerReading"("carId", "recordedAt");

-- AddForeignKey
ALTER TABLE "rental"."OdometerReading" ADD CONSTRAINT "OdometerReading_carId_fkey" FOREIGN KEY ("carId") REFERENCES "rental"."Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
