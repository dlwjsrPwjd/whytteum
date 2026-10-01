import { OFFICIAL_CHANNEL_SUBSCRIBER_THRESHOLD } from "./config.js";

interface YoutubeChannelItem {
  id: string;
  statistics?: { subscriberCount?: string };
}

export interface ChannelInfo {
  subscriberCount: number | null;
  isOfficialChannel: boolean;
}

// 한 번의 수집 실행 안에서 같은 채널을 중복 조회하지 않기 위한 캐시
const cache = new Map<string, ChannelInfo>();

export async function fetchChannelInfo(channelIds: string[]): Promise<Map<string, ChannelInfo>> {
  const result = new Map<string, ChannelInfo>();
  const uncached = [...new Set(channelIds)].filter((id) => !cache.has(id));

  for (const id of cache.keys()) {
    if (channelIds.includes(id)) result.set(id, cache.get(id)!);
  }

  if (uncached.length === 0) return result;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY가 설정되지 않았습니다.");
  }

  // channels.list는 id 파라미터에 최대 50개까지 배치 조회 가능
  for (let i = 0; i < uncached.length; i += 50) {
    const batch = uncached.slice(i, i + 50);

    const url = new URL("https://www.googleapis.com/youtube/v3/channels");
    url.searchParams.set("part", "statistics");
    url.searchParams.set("id", batch.join(","));
    url.searchParams.set("key", apiKey);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`YouTube channels API 요청 실패 (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as { items?: YoutubeChannelItem[] };
    for (const item of data.items ?? []) {
      const subscriberCount = item.statistics?.subscriberCount
        ? Number(item.statistics.subscriberCount)
        : null;
      const info: ChannelInfo = {
        subscriberCount,
        isOfficialChannel: subscriberCount !== null && subscriberCount >= OFFICIAL_CHANNEL_SUBSCRIBER_THRESHOLD,
      };
      cache.set(item.id, info);
      result.set(item.id, info);
    }
  }

  return result;
}
