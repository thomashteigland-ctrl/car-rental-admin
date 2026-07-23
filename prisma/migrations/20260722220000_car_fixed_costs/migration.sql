-- CreateTable
CREATE TABLE "rental"."CarFixedCost" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountOre" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarFixedCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarFixedCost_carId_idx" ON "rental"."CarFixedCost"("carId");

-- AddForeignKey
ALTER TABLE "rental"."CarFixedCost" ADD CONSTRAINT "CarFixedCost_carId_fkey" FOREIGN KEY ("carId") REFERENCES "rental"."Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
