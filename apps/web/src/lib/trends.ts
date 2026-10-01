import type { TrendSource } from "@prisma/client";
import { prisma } from "./prisma";
import { MUSIC_CATEGORY_SLUG, OFFICIAL_CHANNEL_WEIGHT, KEYWORD_RANKING_TAKE } from "./ranking-config";

const PAGE_SIZE = 20;

export type RankedItem =
  | {
      kind: "keyword";
      id: string;
      title: string;
      score: number;
      videoCount: number;
    }
  | {
      kind: "item";
      id: string;
      title: string;
      score: number;
      source: TrendSource;
      categoryName: string;
    };

async function getTopKeywordsByPeriod(hours: number, take: number): Promise<RankedItem[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const trendItems = await prisma.trendItem.findMany({
    where: {
      source: "YOUTUBE",
      velocityScore: { not: null },
      collectedAt: { gte: since },
      category: { slug: { not: MUSIC_CATEGORY_SLUG } },
    },
    select: {
      velocityScore: true,
      isOfficialChannel: true,
      videoKeywords: { select: { keyword: { select: { id: true, text: true } } } },
    },
  });

  const byKeyword = new Map<string, { text: string; score: number; videoCount: number }>();
  for (const item of trendItems) {
    const adjusted = (item.velocityScore ?? 0) * (item.isOfficialChannel ? OFFICIAL_CHANNEL_WEIGHT : 1);
    for (const { keyword } of item.videoKeywords) {
      const entry = byKeyword.get(keyword.id) ?? { text: keyword.text, score: 0, videoCount: 0 };
      entry.score += adjusted;
      entry.videoCount += 1;
      byKeyword.set(keyword.id, entry);
    }
  }

  return [...byKeyword.entries()]
    .map(([id, { text, score, videoCount }]) => ({
      kind: "keyword" as const,
      id,
      title: text,
      score,
      videoCount,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, take);
}

async function getTopGoogleTrendsByPeriod(hours: number, take: number): Promise<RankedItem[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const items = await prisma.trendItem.findMany({
    where: { source: "GOOGLE_TRENDS", collectedAt: { gte: since }, score: { not: null } },
    include: { category: true },
    orderBy: { score: "desc" },
    take,
  });

  return items.map((item) => ({
    kind: "item" as const,
    id: item.id,
    title: item.title,
    score: item.score!,
    source: item.source,
    categoryName: item.category.name,
  }));
}

async function getTopByPeriod(hours: number): Promise<RankedItem[]> {
  const [keywords, googleTrends] = await Promise.all([
    getTopKeywordsByPeriod(hours, KEYWORD_RANKING_TAKE),
    getTopGoogleTrendsByPeriod(hours, KEYWORD_RANKING_TAKE),
  ]);

  return [...keywords, ...googleTrends].sort((a, b) => b.score - a.score).slice(0, 10);
}

export async function getRankedSections() {
  const [realtime, daily, weekly, monthly] = await Promise.all([
    getTopByPeriod(3),
    getTopByPeriod(24),
    getTopByPeriod(24 * 7),
    getTopByPeriod(24 * 30),
  ]);

  return { realtime, daily, weekly, monthly };
}

export async function getKeywordDetail(keywordId: string) {
  const keyword = await prisma.keyword.findUnique({ where: { id: keywordId } });
  if (!keyword) return null;

  const videoKeywords = await prisma.videoKeyword.findMany({
    where: { keywordId },
    include: {
      trendItem: { include: { category: true, aiSummary: true } },
    },
  });

  const trendItems = videoKeywords
    .map((vk) => vk.trendItem)
    .sort((a, b) => (b.velocityScore ?? 0) - (a.velocityScore ?? 0));

  return { keyword, trendItems };
}

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { trendItems: true } } },
  });
}

export async function getTrendFeed({
  categorySlug,
  page = 1,
}: {
  categorySlug?: string;
  page?: number;
}) {
  const where = categorySlug ? { category: { slug: categorySlug } } : {};

  const [items, total] = await Promise.all([
    prisma.trendItem.findMany({
      where,
      include: { category: true, aiSummary: true },
      orderBy: { collectedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.trendItem.count({ where }),
  ]);

  return {
    items,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getTrendItem(id: string) {
  return prisma.trendItem.findUnique({
    where: { id },
    include: { category: true, aiSummary: true },
  });
}
