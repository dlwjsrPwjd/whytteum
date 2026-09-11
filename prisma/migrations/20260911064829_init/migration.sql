-- CreateEnum
CREATE TYPE "TrendSource" AS ENUM ('GOOGLE_TRENDS', 'YOUTUBE', 'NAVER_DATALAB');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" "TrendSource" NOT NULL,
    "sourceUrl" TEXT,
    "score" DOUBLE PRECISION,
    "rawData" JSONB,
    "categoryId" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSummary" (
    "id" TEXT NOT NULL,
    "trendItemId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gemini-flash',
    "promptVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionLog" (
    "id" TEXT NOT NULL,
    "source" "TrendSource" NOT NULL,
    "status" "CollectionStatus" NOT NULL,
    "itemsCollected" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "TrendItem_source_collectedAt_idx" ON "TrendItem"("source", "collectedAt");

-- CreateIndex
CREATE INDEX "TrendItem_categoryId_idx" ON "TrendItem"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "AiSummary_trendItemId_key" ON "AiSummary"("trendItemId");

-- CreateIndex
CREATE INDEX "CollectionLog_source_createdAt_idx" ON "CollectionLog"("source", "createdAt");

-- AddForeignKey
ALTER TABLE "TrendItem" ADD CONSTRAINT "TrendItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSummary" ADD CONSTRAINT "AiSummary_trendItemId_fkey" FOREIGN KEY ("trendItemId") REFERENCES "TrendItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
