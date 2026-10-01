import "./env.js";
import type { TrendSource } from "@prisma/client";
import { prisma } from "./prismaClient.js";
import { collectYouTubeTrends } from "./collectors/youtube.js";
import { collectGoogleTrends } from "./collectors/googleTrends.js";

interface Collector {
  source: TrendSource;
  run: () => Promise<{ itemsCollected: number; skipped?: boolean }>;
}

const collectors: Collector[] = [
  // 구글 트렌드 검색어를 YouTube 확장 검색 후보로 쓰기 때문에 먼저 수집
  { source: "GOOGLE_TRENDS", run: collectGoogleTrends },
  { source: "YOUTUBE", run: collectYouTubeTrends },
];

async function main() {
  for (const { source, run } of collectors) {
    const startedAt = new Date();
    try {
      const { itemsCollected, skipped } = await run();
      // 실행 간격 제한으로 건너뛴 경우는 로그를 남기지 않음 (마지막 성공 시각 계산이 꼬이지 않도록)
      if (skipped) continue;
      await prisma.collectionLog.create({
        data: {
          source,
          status: "SUCCESS",
          itemsCollected,
          startedAt,
          finishedAt: new Date(),
        },
      });
      console.log(`[${source}] ${itemsCollected}건 수집 완료`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await prisma.collectionLog.create({
        data: {
          source,
          status: "FAILED",
          itemsCollected: 0,
          errorMessage,
          startedAt,
          finishedAt: new Date(),
        },
      });
      console.error(`[${source}] 수집 실패:`, errorMessage);
    }
  }

  await prisma.$disconnect();
}

main();
