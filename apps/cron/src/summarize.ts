import "./env.js";
import { prisma } from "./prismaClient.js";
import { summarizeTrend } from "./lib/gemini.js";

const BATCH_SIZE = Number(process.env.SUMMARIZE_BATCH_SIZE ?? 20);
// Gemini 무료 티어 분당 요청 제한을 넘지 않도록 호출 사이에 여유를 둠
const DELAY_MS = 4100;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const items = await prisma.trendItem.findMany({
    where: { aiSummary: null },
    include: { category: true },
    orderBy: { collectedAt: "desc" },
    take: BATCH_SIZE,
  });

  console.log(`요약 대상: ${items.length}건`);

  let success = 0;
  let failed = 0;

  for (const [index, item] of items.entries()) {
    try {
      const summary = await summarizeTrend({
        title: item.title,
        categoryName: item.category.name,
        source: item.source,
      });

      await prisma.aiSummary.create({
        data: {
          trendItemId: item.id,
          summary,
          model: process.env.GEMINI_MODEL ?? "gemini-flash",
        },
      });

      success++;
      console.log(`[OK] ${item.title}`);
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[FAIL] ${item.title}: ${message}`);
    }

    if (index < items.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`완료: 성공 ${success}건, 실패 ${failed}건`);
  await prisma.$disconnect();
}

main();
