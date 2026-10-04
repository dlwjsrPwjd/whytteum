-- 구글 트렌드 수집 제거: 남아 있는 데이터를 지운 뒤 enum 값 삭제
-- (VideoKeyword는 TrendItem 삭제 시 Cascade)
DELETE FROM "TrendItem" WHERE "source" = 'GOOGLE_TRENDS';
DELETE FROM "CollectionLog" WHERE "source" = 'GOOGLE_TRENDS';
DELETE FROM "Category" c
WHERE c."slug" = 'realtime-search'
  AND NOT EXISTS (SELECT 1 FROM "TrendItem" t WHERE t."categoryId" = c."id");

-- AlterEnum
BEGIN;
CREATE TYPE "TrendSource_new" AS ENUM ('YOUTUBE');
ALTER TABLE "TrendItem" ALTER COLUMN "source" TYPE "TrendSource_new" USING ("source"::text::"TrendSource_new");
ALTER TABLE "CollectionLog" ALTER COLUMN "source" TYPE "TrendSource_new" USING ("source"::text::"TrendSource_new");
ALTER TYPE "TrendSource" RENAME TO "TrendSource_old";
ALTER TYPE "TrendSource_new" RENAME TO "TrendSource";
DROP TYPE "public"."TrendSource_old";
COMMIT;
