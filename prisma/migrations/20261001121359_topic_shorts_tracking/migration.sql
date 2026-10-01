-- AlterTable
ALTER TABLE "Keyword" ADD COLUMN     "category" TEXT,
ADD COLUMN     "lastExpandedAt" TIMESTAMP(3),
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "summaryAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TrendItem" ADD COLUMN     "durationSec" INTEGER,
ADD COLUMN     "isShort" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TrendItem_publishedAt_idx" ON "TrendItem"("publishedAt");
