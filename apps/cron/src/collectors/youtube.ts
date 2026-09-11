import { prisma } from "../prismaClient.js";
import { getOrCreateCategory } from "../lib/category.js";
import { alreadyCollectedRecently } from "../lib/dedupe.js";

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

interface YoutubeVideoItem {
  id: string;
  snippet: { title: string; categoryId: string };
  statistics?: { viewCount?: string };
}

export async function collectYouTubeTrends() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY가 설정되지 않았습니다.");
  }

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

  let itemsCollected = 0;
  for (const item of data.items ?? []) {
    const title = item.snippet.title;
    if (await alreadyCollectedRecently("YOUTUBE", title)) continue;

    const categoryInfo = CATEGORY_MAP[item.snippet.categoryId] ?? DEFAULT_CATEGORY;
    const category = await getOrCreateCategory(categoryInfo.name, categoryInfo.slug);

    await prisma.trendItem.create({
      data: {
        title,
        source: "YOUTUBE",
        sourceUrl: `https://www.youtube.com/watch?v=${item.id}`,
        score: item.statistics?.viewCount ? Number(item.statistics.viewCount) : null,
        rawData: JSON.parse(JSON.stringify(item)),
        categoryId: category.id,
      },
    });
    itemsCollected++;
  }

  return { itemsCollected };
}
