-- AlterEnum
BEGIN;
CREATE TYPE "TrendSource_new" AS ENUM ('GOOGLE_TRENDS', 'YOUTUBE');
ALTER TABLE "TrendItem" ALTER COLUMN "source" TYPE "TrendSource_new" USING ("source"::text::"TrendSource_new");
ALTER TABLE "CollectionLog" ALTER COLUMN "source" TYPE "TrendSource_new" USING ("source"::text::"TrendSource_new");
ALTER TYPE "TrendSource" RENAME TO "TrendSource_old";
ALTER TYPE "TrendSource_new" RENAME TO "TrendSource";
DROP TYPE "public"."TrendSource_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "AiSummary" DROP CONSTRAINT "AiSummary_trendItemId_fkey";

-- DropForeignKey
ALTER TABLE "VideoSnapshot" DROP CONSTRAINT "VideoSnapshot_trendItemId_fkey";

-- AlterTable
ALTER TABLE "TrendItem" DROP COLUMN "isOfficialChannel",
DROP COLUMN "subscriberCount",
DROP COLUMN "velocityScore";

-- DropTable
DROP TABLE "AiSummary";

-- DropTable
DROP TABLE "VideoSnapshot";

