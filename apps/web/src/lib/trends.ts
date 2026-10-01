import { prisma } from "./prisma";
import {
  HIDDEN_FROM_ALL_CATEGORIES,
  MIN_CHANNEL_COUNT,
  RANKING_SIZE,
  SHORTS_CHANNEL_BONUS,
  TREND_CATEGORIES,
} from "./ranking-config";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RankedTopic {
  id: string;
  title: string;
  category: string | null;
  summary: string | null;
  channelCount: number;
  shortsChannelCount: number;
  totalViews: number;
  score: number;
}

export function isTrendCategory(name: string | undefined): name is string {
  return TREND_CATEGORIES.some((c) => c.name === name);
}

// category가 없으면 "전체" = 유행 카테고리 중 HIDDEN_FROM_ALL_CATEGORIES를 뺀 것
function categoryFilter(category?: string): string[] {
  if (category) return [category];
  return TREND_CATEGORIES.map((c) => c.name).filter((name) => !HIDDEN_FROM_ALL_CATEGORIES.includes(name));
}

// 기간 안에 "올라온" 영상 기준으로 주제별 확산 정도를 집계
async function getTopTopics(days: number, category?: string): Promise<RankedTopic[]> {
  const since = new Date(Date.now() - days * DAY_MS);
  const links = await prisma.videoKeyword.findMany({
    where: {
      trendItem: { source: "YOUTUBE", publishedAt: { gte: since } },
      keyword: { category: { in: categoryFilter(category) } },
    },
    select: {
      keyword: { select: { id: true, text: true, category: true, summary: true } },
      trendItem: { select: { channelId: true, isShort: true, score: true } },
    },
  });

  const byTopic = new Map<
    string,
    { text: string; category: string | null; summary: string | null; channels: Set<string>; shortsChannels: Set<string>; views: number }
  >();
  for (const { keyword, trendItem } of links) {
    const entry = byTopic.get(keyword.id) ?? {
      text: keyword.text,
      category: keyword.category,
      summary: keyword.summary,
      channels: new Set<string>(),
      shortsChannels: new Set<string>(),
      views: 0,
    };
    if (trendItem.channelId) {
      entry.channels.add(trendItem.channelId);
      if (trendItem.isShort) entry.shortsChannels.add(trendItem.channelId);
    }
    entry.views += trendItem.score ?? 0;
    byTopic.set(keyword.id, entry);
  }

  return [...byTopic.entries()]
    .filter(([, t]) => t.channels.size >= MIN_CHANNEL_COUNT)
    .map(([id, t]) => ({
      id,
      title: t.text,
      category: t.category,
      summary: t.summary,
      channelCount: t.channels.size,
      shortsChannelCount: t.shortsChannels.size,
      totalViews: t.views,
      score: (t.channels.size + SHORTS_CHANNEL_BONUS * t.shortsChannels.size) * Math.log10(10 + t.views),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, RANKING_SIZE);
}

export async function getRankedSections(category?: string) {
  const [recent, weekly, monthly] = await Promise.all([
    getTopTopics(3, category),
    getTopTopics(7, category),
    getTopTopics(30, category),
  ]);
  return { recent, weekly, monthly };
}

// 카테고리별 유행 페이지의 "한눈에 보기": 카테고리마다 이번 주(7일) 랭킹
export async function getCategoryOverview() {
  return Promise.all(
    TREND_CATEGORIES.map(async (category) => ({
      ...category,
      items: await getTopTopics(7, category.name),
    })),
  );
}

export async function getKeywordDetail(keywordId: string) {
  const keyword = await prisma.keyword.findUnique({ where: { id: keywordId } });
  if (!keyword) return null;

  const videos = await prisma.trendItem.findMany({
    where: { videoKeywords: { some: { keywordId } } },
    orderBy: [{ publishedAt: "desc" }],
  });

  return {
    keyword,
    videos,
    channelCount: new Set(videos.map((v) => v.channelId)).size,
    shortsCount: videos.filter((v) => v.isShort).length,
  };
}
