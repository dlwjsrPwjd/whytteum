import { XMLParser } from "fast-xml-parser";
import { prisma } from "../prismaClient.js";
import { getOrCreateCategory } from "../lib/category.js";
import { alreadyCollectedRecently } from "../lib/dedupe.js";

// 예전 unofficial dailytrends JSON API(trends.google.com/trends/api/dailytrends)는
// Google이 없애서 404가 남. 지금은 공식 RSS 피드(trending/rss)로 대체.
const RSS_URL = "https://trends.google.com/trending/rss?geo=KR";

const CATEGORY = { name: "실시간 검색어", slug: "realtime-search" };

interface NewsItem {
  news_item_title?: string;
  news_item_url?: string;
  news_item_source?: string;
}

interface TrendingItem {
  title: string;
  approx_traffic?: string;
  news_item?: NewsItem | NewsItem[];
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

// "500+", "2,000+" 같은 형식을 숫자로 변환
function parseTraffic(formatted?: string): number | null {
  if (!formatted) return null;
  const digits = formatted.replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

export async function collectGoogleTrends() {
  const res = await fetch(RSS_URL);
  if (!res.ok) {
    throw new Error(`Google Trends RSS 요청 실패: ${res.status} ${await res.text()}`);
  }

  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
  const parsed = parser.parse(xml);
  const items: TrendingItem[] = asArray(parsed?.rss?.channel?.item);

  const category = await getOrCreateCategory(CATEGORY.name, CATEGORY.slug);

  let itemsCollected = 0;
  for (const item of items) {
    const title = item.title;
    if (!title) continue;
    if (await alreadyCollectedRecently("GOOGLE_TRENDS", title)) continue;

    const newsItems = asArray(item.news_item);
    const firstNews = newsItems[0];

    await prisma.trendItem.create({
      data: {
        title,
        source: "GOOGLE_TRENDS",
        sourceUrl: firstNews?.news_item_url ?? null,
        score: parseTraffic(item.approx_traffic),
        rawData: JSON.parse(JSON.stringify(item)),
        categoryId: category.id,
      },
    });
    itemsCollected++;
  }

  return { itemsCollected };
}
