import "./env.js";
import { prisma } from "./prismaClient.js";
import { TOPIC_CATEGORIES, classifyTopics } from "./lib/gemini.js";
import { GEMINI_SUMMARY_DELAY_MS } from "./lib/config.js";

// 기존 주제 전체를 공통 분류 기준으로 다시 분류 (npm run reclassify, DRY_RUN=1이면 바꿀 내용만 출력)
// 새 분류는 득표 RECLASSIFY_WEIGHT로 넣어서, 이후 탐색에서 한두 번 엉뚱하게 분류돼도 뒤집히지 않게 함
const BATCH_SIZE = 40;
const TITLES_PER_TOPIC = 5;
const RECLASSIFY_WEIGHT = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const dryRun = process.env.DRY_RUN === "1";
  const keywords = await prisma.keyword.findMany({
    // "제외"는 1차 개편(영상별 키워드) 시절의 "Dance Practice", 기획사명 같은 잡키워드라 되살리지 않음
    where: { videoKeywords: { some: {} }, category: { in: [...TOPIC_CATEGORIES] } },
    select: {
      id: true,
      text: true,
      category: true,
      videoKeywords: {
        select: { trendItem: { select: { title: true } } },
        orderBy: { trendItem: { score: "desc" } },
        take: TITLES_PER_TOPIC,
      },
    },
  });
  console.log(`[RECLASSIFY] 대상 주제 ${keywords.length}개${dryRun ? " (DRY_RUN)" : ""}`);

  const changes: string[] = [];
  for (let start = 0; start < keywords.length; start += BATCH_SIZE) {
    if (start > 0) await sleep(GEMINI_SUMMARY_DELAY_MS);
    const batch = keywords.slice(start, start + BATCH_SIZE);
    const result = await classifyTopics(
      batch.map((k) => ({ topic: k.text, videoTitles: k.videoKeywords.map((vk) => vk.trendItem.title.slice(0, 80)) })),
    );

    for (const [index, keyword] of batch.entries()) {
      const category = result.get(index);
      if (!category) {
        console.warn(`[RECLASSIFY] 분류 누락: "${keyword.text}" (기존 ${keyword.category} 유지)`);
        continue;
      }
      if (category !== keyword.category) changes.push(`${keyword.text}: ${keyword.category} → ${category}`);
      if (!dryRun) {
        await prisma.keyword.update({
          where: { id: keyword.id },
          data: { category, categoryVotes: { [category]: RECLASSIFY_WEIGHT } },
        });
      }
    }
    console.log(`[RECLASSIFY] ${Math.min(start + BATCH_SIZE, keywords.length)}/${keywords.length}`);
  }

  console.log(`[RECLASSIFY] 바뀐 주제 ${changes.length}개`);
  for (const line of changes) console.log(`  ${line}`);
  await prisma.$disconnect();
}

main();
