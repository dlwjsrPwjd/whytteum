const API_BASE = "https://www.googleapis.com/youtube/v3";

export interface YoutubeVideo {
  id: string;
  snippet: {
    title: string;
    description?: string;
    categoryId: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
  };
  statistics?: { viewCount?: string };
  contentDetails?: { duration?: string };
}

interface SearchItem {
  id: { videoId?: string };
}

function getApiKey() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY가 설정되지 않았습니다.");
  }
  return apiKey;
}

async function getJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("key", getApiKey());

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`YouTube API 요청 실패 (${path}, ${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

// search.list (100 units/회): 영상 ID만 받아오고, 길이/조회수 등은 fetchVideosByIds로 따로 조회
export async function searchVideoIds({
  q,
  publishedAfter,
  duration,
  order = "viewCount",
}: {
  q: string;
  publishedAfter: Date;
  duration?: "short" | "medium" | "long";
  order?: "viewCount" | "relevance" | "date";
}): Promise<string[]> {
  const params: Record<string, string> = {
    part: "id",
    type: "video",
    q,
    maxResults: "50",
    regionCode: "KR",
    relevanceLanguage: "ko",
    order,
    publishedAfter: publishedAfter.toISOString(),
  };
  if (duration) params.videoDuration = duration;

  const data = await getJson<{ items?: SearchItem[] }>("search", params);
  return (data.items ?? []).map((item) => item.id.videoId).filter((id): id is string => !!id);
}

// videos.list (1 unit/회): id 파라미터에 최대 50개까지 배치 조회 가능
export async function fetchVideosByIds(ids: string[]): Promise<YoutubeVideo[]> {
  const unique = [...new Set(ids)];
  const videos: YoutubeVideo[] = [];

  for (let i = 0; i < unique.length; i += 50) {
    const data = await getJson<{ items?: YoutubeVideo[] }>("videos", {
      part: "snippet,statistics,contentDetails",
      id: unique.slice(i, i + 50).join(","),
    });
    videos.push(...(data.items ?? []));
  }

  return videos;
}

// ISO 8601 기간("PT1M5S")을 초 단위로 변환
export function parseDurationSec(iso?: string): number | null {
  if (!iso) return null;
  const match = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  const [, d, h, m, s] = match.map((v) => Number(v ?? 0));
  return d * 86400 + h * 3600 + m * 60 + s;
}

// search/videos API는 제목에 &quot; 같은 HTML 엔티티가 섞여서 옴
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
