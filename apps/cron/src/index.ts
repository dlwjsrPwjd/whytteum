import "./env.js";
import type { TrendSource } from "@prisma/client";
import { prisma } from "./prismaClient.js";
import { collectYouTubeTrends } from "./collectors/youtube.js";
import { collectGoogleTrends } from "./collectors/googleTrends.js";

interface Collector {
  source: TrendSource;
  run: () => Promise<{ itemsCollected: number }>;
}

const collectors: Collector[] = [
  { source: "YOUTUBE", run: collectYouTubeTrends },
  { source: "GOOGLE_TRENDS", run: collectGoogleTrends },
];

async function main() {
  for (const { source, run } of collectors) {
    const startedAt = new Date();
    try {
      const { itemsCollected } = await run();
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
