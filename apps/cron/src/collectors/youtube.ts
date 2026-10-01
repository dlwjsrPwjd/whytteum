import { prisma } from "../prismaClient.js";
import { getOrCreateCategory } from "../lib/category.js";
import { fetchChannelInfo } from "../lib/channel.js";
import { extractKeywords } from "../lib/gemini.js";
import { linkKeywords } from "../lib/keywords.js";
import { recordSnapshotAndRecomputeVelocity } from "../lib/velocity.js";
import { VIDEO_TRACKING_WINDOW_HOURS } from "../lib/config.js";

// https://developers.google.com/youtube/v3/docs/videoCategories/list 기준 자주 등장하는 카테고리만 매핑
const CATEGORY_MAP: Record<string, { name: string; slug: string }> = {
  "1": { name: "영화/애니메이션", slug: "film-animation" },
  "2": { name: "자동차", slug: "autos" },
  "10": { name: "음악", slug: "music" },
  "15": { name: "동물", slug: "pets-animals" },
  "17": { name: "스포츠", slug: "sports" },
  "19": { name: "여행/이벤트", slug: "travel-events" },
  "20": { name: "게임", slug: "gaming" },
  "22": { name: "인물/블로그", slug: "people-blogs" },
  "23": { name: "코미디", slug: "comedy" },
  "24": { name: "엔터테인먼트", slug: "entertainment" },
  "25": { name: "뉴스/정치", slug: "news-politics" },
  "26": { name: "노하우/스타일", slug: "howto-style" },
  "27": { name: "교육", slug: "education" },
  "28": { name: "IT/과학", slug: "science-tech" },
  "29": { name: "비영리/사회운동", slug: "nonprofits-activism" },
  "30": { name: "영화", slug: "movies" },
  "43": { name: "방송", slug: "shows" },
};
const DEFAULT_CATEGORY = { name: "기타", slug: "etc" };

// Gemini 무료 티어 분당 요청 제한(실측 15 RPM)을 넘지 않도록 호출 사이에 여유를 둠
const GEMINI_CALL_DELAY_MS = 4100;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface YoutubeVideoItem {
  id: string;
  snippet: {
    title: string;
    description?: string;
    categoryId: string;
    channelId: string;
    channelTitle: string;
  };
  statistics?: { viewCount?: string };
}

async function fetchVideosByIds(apiKey: string, ids: string[]): Promise<YoutubeVideoItem[]> {
  if (ids.length === 0) return [];
  const items: YoutubeVideoItem[] = [];

  // videos.list도 id 파라미터에 최대 50개까지 배치 조회 가능
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,statistics");
    url.searchParams.set("id", batch.join(","));
    url.searchParams.set("key", apiKey);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`YouTube API 요청 실패 (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as { items?: YoutubeVideoItem[] };
    items.push(...(data.items ?? []));
  }

  return items;
}

async function fetchMostPopular(apiKey: string): Promise<YoutubeVideoItem[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("chart", "mostPopular");
  url.searchParams.set("regionCode", "KR");
  url.searchParams.set("maxResults", "25");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`YouTube API 요청 실패 (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { items?: YoutubeVideoItem[] };
  return data.items ?? [];
}

export async function collectYouTubeTrends() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY가 설정되지 않았습니다.");
  }

  const since = new Date(Date.now() - VIDEO_TRACKING_WINDOW_HOURS * 60 * 60 * 1000);
  const tracked = await prisma.trendItem.findMany({
    where: { source: "YOUTUBE", createdAt: { gte: since }, youtubeVideoId: { not: null } },
    select: { youtubeVideoId: true },
  });
  const trackedIds = tracked.map((t) => t.youtubeVideoId!);

  const mostPopular = await fetchMostPopular(apiKey);
  const retracked = await fetchVideosByIds(apiKey, trackedIds.filter((id) => !mostPopular.some((v) => v.id === id)));

  const allVideos = [...mostPopular, ...retracked];
  const uniqueChannelIds = [...new Set(allVideos.map((v) => v.snippet.channelId))];
  const channelInfoMap = await fetchChannelInfo(uniqueChannelIds);

  let itemsCollected = 0;
  let itemsRetracked = 0;
  let geminiCallCount = 0;

  for (const item of allVideos) {
    const existing = await prisma.trendItem.findUnique({
      where: { youtubeVideoId: item.id },
      include: { _count: { select: { videoKeywords: true } } },
    });
    const viewCount = item.statistics?.viewCount ? Number(item.statistics.viewCount) : null;
    const channelInfo = channelInfoMap.get(item.snippet.channelId);

    let trendItemId: string;

    if (!existing) {
      const categoryInfo = CATEGORY_MAP[item.snippet.categoryId] ?? DEFAULT_CATEGORY;
      const category = await getOrCreateCategory(categoryInfo.name, categoryInfo.slug);

      const created = await prisma.trendItem.create({
        data: {
          title: item.snippet.title,
          source: "YOUTUBE",
          sourceUrl: `https://www.youtube.com/watch?v=${item.id}`,
          score: viewCount,
          rawData: JSON.parse(JSON.stringify(item)),
          categoryId: category.id,
          youtubeVideoId: item.id,
          channelId: item.snippet.channelId,
          channelTitle: item.snippet.channelTitle,
          subscriberCount: channelInfo?.subscriberCount ?? null,
          isOfficialChannel: channelInfo?.isOfficialChannel ?? false,
        },
      });
      trendItemId = created.id;
      itemsCollected++;
    } else {
      trendItemId = existing.id;
      itemsRetracked++;
    }

    if (viewCount !== null) {
      await recordSnapshotAndRecomputeVelocity(trendItemId, viewCount);
    }

    // 신규 영상이거나, 이전 실행에서 할당량 초과 등으로 키워드 추출에 실패했던 영상은 다시 시도
    const needsKeywords = !existing || existing._count.videoKeywords === 0;
    if (needsKeywords) {
      try {
        if (geminiCallCount > 0) await sleep(GEMINI_CALL_DELAY_MS);
        geminiCallCount++;
        const keywords = await extractKeywords(item.snippet.title, item.snippet.description ?? "");
        if (keywords.length > 0) await linkKeywords(trendItemId, keywords);
      } catch (err) {
        console.error(`[YOUTUBE] 키워드 추출 실패 (${item.snippet.title}):`, err);
      }
    }
  }

  console.log(`[YOUTUBE] 신규 ${itemsCollected}건, 재추적 ${itemsRetracked}건`);
  return { itemsCollected };
}
