import { prisma } from "../prismaClient.js";

export async function linkKeywords(trendItemId: string, keywordTexts: string[]) {
  for (const text of keywordTexts) {
    const keyword = await prisma.keyword.upsert({
      where: { text },
      update: {},
      create: { text },
    });

    await prisma.videoKeyword.upsert({
      where: { trendItemId_keywordId: { trendItemId, keywordId: keyword.id } },
      update: {},
      create: { trendItemId, keywordId: keyword.id },
    });
  }
}
