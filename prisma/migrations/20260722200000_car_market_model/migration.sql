-- AlterTable
ALTER TABLE "rental"."Car" ADD COLUMN "marketModelId" TEXT;

-- CreateIndex
CREATE INDEX "Car_marketModelId_idx" ON "rental"."Car"("marketModelId");

-- AddForeignKey
ALTER TABLE "rental"."Car" ADD CONSTRAINT "Car_marketModelId_fkey" FOREIGN KEY ("marketModelId") REFERENCES "rental"."MarketModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
