-- AlterTable
ALTER TABLE "TrendItem" ADD COLUMN     "channelId" TEXT,
ADD COLUMN     "channelTitle" TEXT,
ADD COLUMN     "isOfficialChannel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subscriberCount" INTEGER,
ADD COLUMN     "velocityScore" DOUBLE PRECISION,
ADD COLUMN     "youtubeVideoId" TEXT;

-- CreateTable
CREATE TABLE "VideoSnapshot" (
    "id" TEXT NOT NULL,
    "trendItemId" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoKeyword" (
    "id" TEXT NOT NULL,
    "trendItemId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoSnapshot_trendItemId_capturedAt_idx" ON "VideoSnapshot"("trendItemId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Keyword_text_key" ON "Keyword"("text");

-- CreateIndex
CREATE UNIQUE INDEX "VideoKeyword_trendItemId_keywordId_key" ON "VideoKeyword"("trendItemId", "keywordId");

-- CreateIndex
CREATE UNIQUE INDEX "TrendItem_youtubeVideoId_key" ON "TrendItem"("youtubeVideoId");

-- AddForeignKey
ALTER TABLE "VideoSnapshot" ADD CONSTRAINT "VideoSnapshot_trendItemId_fkey" FOREIGN KEY ("trendItemId") REFERENCES "TrendItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoKeyword" ADD CONSTRAINT "VideoKeyword_trendItemId_fkey" FOREIGN KEY ("trendItemId") REFERENCES "TrendItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoKeyword" ADD CONSTRAINT "VideoKeyword_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

