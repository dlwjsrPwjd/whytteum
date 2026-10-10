import { prisma } from "../prismaClient.js";
import { getOrCreateCategory } from "../lib/category.js";
import { TOPIC_CATEGORIES, extractTopics, summarizeTopic } from "../lib/gemini.js";
import { TopicRegistry, linkVideosToTopic, mentionsTopic } from "../lib/topics.js";
import {
  decodeHtmlEntities,
  fetchVideosByIds,
  parseDurationSec,
  searchVideoIds,
  type YoutubeVideo,
} from "../lib/youtubeApi.js";
import {
  CONFIRMED_CATEGORY_WEIGHT,
  CORE_CATEGORIES,
  DISCOVERY_INTERVAL_HOURS,
  DISCOVERY_LOOKBACK_HOURS,
  DISCOVERY_QUERIES,
  EXPAND_COOLDOWN_HOURS,
  EXPAND_LOOKBACK_DAYS,
  EXPAND_PER_RUN,
  EXPAND_TOP_SLOTS,
  GEMINI_SUMMARY_DELAY_MS,
  REFRESH_LOOKBACK_DAYS,
  SHORTS_MAX_SECONDS,
  SUMMARIZE_PER_RUN,
  SUMMARY_REFRESH_HOURS,
} from "../lib/config.js";

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

const HOUR_MS = 60 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * HOUR_MS);
}

// 영상을 TrendItem으로 저장(이미 있으면 조회수 등 갱신)하고 youtubeVideoId → TrendItem.id 맵을 돌려줌
async function upsertVideos(videos: YoutubeVideo[]): Promise<Map<string, string>> {
  const idMap = new Map<string, string>();
  const categoryIds = new Map<string, string>();

  for (const video of videos) {
    const categoryInfo = CATEGORY_MAP[video.snippet.categoryId] ?? DEFAULT_CATEGORY;
    let categoryId = categoryIds.get(categoryInfo.slug);
    if (!categoryId) {
      categoryId = (await getOrCreateCategory(categoryInfo.name, categoryInfo.slug)).id;
      categoryIds.set(categoryInfo.slug, categoryId);
    }

    const title = decodeHtmlEntities(video.snippet.title);
    const viewCount = video.statistics?.viewCount ? Number(video.statistics.viewCount) : null;
    const durationSec = parseDurationSec(video.contentDetails?.duration);
    const fields = {
      title,
      score: viewCount,
      publishedAt: new Date(video.snippet.publishedAt),
      durationSec,
      isShort: durationSec !== null && durationSec <= SHORTS_MAX_SECONDS,
    };

    const item = await prisma.trendItem.upsert({
      where: { youtubeVideoId: video.id },
      update: fields,
      create: {
        ...fields,
        source: "YOUTUBE",
        sourceUrl: `https://www.youtube.com/watch?v=${video.id}`,
        rawData: JSON.parse(JSON.stringify(video)),
        categoryId,
        youtubeVideoId: video.id,
        channelId: video.snippet.channelId,
        channelTitle: video.snippet.channelTitle,
      },
    });
    idMap.set(video.id, item.id);
  }

  return idMap;
}

// 1단계: 이슈성 쿼리로 최근 인기 쇼츠를 모으고, Gemini로 "무엇에 대한 영상인지" 주제별로 묶음
async function discover(registry: TopicRegistry) {
  const publishedAfter = hoursAgo(DISCOVERY_LOOKBACK_HOURS);
  const ids: string[] = [];
  for (const { q, duration } of DISCOVERY_QUERIES) {
    ids.push(...(await searchVideoIds({ q, duration, publishedAfter })));
  }

  const videos = await fetchVideosByIds(ids);
  const idMap = await upsertVideos(videos);

  const recentTopics = await prisma.keyword.findMany({
    where: { lastExpandedAt: { gte: hoursAgo(24 * EXPAND_LOOKBACK_DAYS) } },
    select: { text: true },
    take: 100,
  });
  const titles = videos.map((v) => decodeHtmlEntities(v.snippet.title).slice(0, 100));
  const extracted = await extractTopics(titles, recentTopics.map((t) => t.text));

  // 주제별로 탐색 결과에서 몇 개 채널이 다뤘는지 (확장 검색 우선순위로 사용)
  const discovered: { keywordId: string; channelCount: number }[] = [];
  for (const { topic, category, videoIndexes } of extracted) {
    const keyword = await registry.findOrCreate(topic, category);
    const matched = videoIndexes.map((i) => videos[i]);
    await linkVideosToTopic(keyword.id, matched.map((v) => idMap.get(v.id)!));

    const channelCount = new Set(matched.map((v) => v.snippet.channelId)).size;
    const existing = discovered.find((d) => d.keywordId === keyword.id);
    if (existing) existing.channelCount += channelCount;
    else discovered.push({ keywordId: keyword.id, channelCount });
  }

  console.log(`[YOUTUBE] 탐색: 영상 ${videos.length}개, 주제 ${discovered.length}개`);
  return { discovered, fetchedIds: new Set(videos.map((v) => v.id)) };
}

// 2단계: 주제 이름으로 최근 7일 영상을 다시 검색해서 "이 주제를 다룬 채널"을 최대한 모음
async function expand(registry: TopicRegistry, discovered: { keywordId: string; channelCount: number }[], fetchedIds: Set<string>) {
  const cooldownSince = hoursAgo(EXPAND_COOLDOWN_HOURS);
  const discoveredTopics = await prisma.keyword.findMany({
    where: { id: { in: discovered.map((d) => d.keywordId) } },
  });
  const channelCountById = new Map(discovered.map((d) => [d.keywordId, d.channelCount]));
  const candidates = discoveredTopics
    .filter((k) => !k.lastExpandedAt || k.lastExpandedAt < cooldownSince)
    .sort((a, b) => channelCountById.get(b.id)! - channelCountById.get(a.id)!);
  const topicCandidates = (await pickBalancedByCategory(candidates)).map((k) => k.text);

  const publishedAfter = hoursAgo(24 * EXPAND_LOOKBACK_DAYS);
  for (const topic of topicCandidates) {
    const keyword = await registry.findOrCreate(topic, null);
    const ids = await searchVideoIds({ q: topic, publishedAfter, order: "relevance" });
    const videos = (await fetchVideosByIds(ids)).filter((v) =>
      mentionsTopic(`${v.snippet.title} ${v.snippet.description ?? ""}`, topic),
    );
    const idMap = await upsertVideos(videos);
    await linkVideosToTopic(keyword.id, [...idMap.values()]);
    await registry.markExpanded(keyword.id);
    videos.forEach((v) => fetchedIds.add(v.id));

    const channelCount = new Set(videos.map((v) => v.snippet.channelId)).size;
    console.log(`[YOUTUBE] 확장: "${topic}" 영상 ${videos.length}개 / 채널 ${channelCount}곳`);
  }
}

// 확장 대상 고르기. 채널 수 순으로만 뽑으면 원래 많이 잡히는 인물/이슈·음악이 자리를 다 가져가서
// 게임·음식 주제는 확장을 못 받고 채널 1~2곳에 머묾 → 상위 EXPAND_TOP_SLOTS개만 채널 수 순,
// 나머지는 핵심 카테고리(CORE_CATEGORIES) 먼저, 그 안에서 최근 확장을 적게 받은 카테고리부터 한 개씩 돌아가며 배정
async function pickBalancedByCategory<T extends { id: string; category: string | null }>(sortedCandidates: T[]): Promise<T[]> {
  const picked = sortedCandidates.slice(0, EXPAND_TOP_SLOTS);
  const rest = sortedCandidates.slice(EXPAND_TOP_SLOTS);

  const recentExpanded = await prisma.keyword.groupBy({
    by: ["category"],
    where: { lastExpandedAt: { gte: hoursAgo(24 * EXPAND_LOOKBACK_DAYS) } },
    _count: { _all: true },
  });
  const expandedCount = new Map(recentExpanded.map((r) => [r.category, r._count._all]));

  // 카테고리별 대기열 (각 대기열 안은 채널 수 순서 유지), 이번 회차에 이미 뽑힌 것도 반영
  const queues = new Map<string | null, T[]>();
  for (const k of rest) queues.set(k.category, [...(queues.get(k.category) ?? []), k]);
  for (const k of picked) expandedCount.set(k.category, (expandedCount.get(k.category) ?? 0) + 1);

  while (picked.length < EXPAND_PER_RUN && queues.size > 0) {
    const isCore = (c: string | null) => (c && CORE_CATEGORIES.includes(c) ? 0 : 1);
    const order = [...queues.keys()].sort(
      (a, b) => isCore(a) - isCore(b) || (expandedCount.get(a) ?? 0) - (expandedCount.get(b) ?? 0),
    );
    for (const category of order) {
      if (picked.length >= EXPAND_PER_RUN) break;
      const queue = queues.get(category)!;
      picked.push(queue.shift()!);
      expandedCount.set(category, (expandedCount.get(category) ?? 0) + 1);
      if (queue.length === 0) queues.delete(category);
    }
  }
  return picked;
}

// 3단계: 이번 실행에서 다시 조회하지 않은, 주제에 연결된 최근 영상들의 조회수 갱신 (videos.list라 저렴함)
async function refreshLinkedVideos(fetchedIds: Set<string>) {
  const items = await prisma.trendItem.findMany({
    where: {
      source: "YOUTUBE",
      publishedAt: { gte: hoursAgo(24 * REFRESH_LOOKBACK_DAYS) },
      videoKeywords: { some: {} },
    },
    select: { youtubeVideoId: true },
  });
  const ids = items.map((i) => i.youtubeVideoId!).filter((id) => !fetchedIds.has(id));
  const videos = await fetchVideosByIds(ids);
  await upsertVideos(videos);
  console.log(`[YOUTUBE] 조회수 갱신: ${videos.length}개`);
}

// 4단계: 최근 7일 기준 많은 채널이 다룬 주제부터 "왜 뜨는지" 요약 생성/갱신
export async function summarizeTopTopics() {
  const links = await prisma.videoKeyword.findMany({
    where: { trendItem: { publishedAt: { gte: hoursAgo(24 * EXPAND_LOOKBACK_DAYS) } } },
    select: { keywordId: true, trendItem: { select: { channelId: true } } },
  });
  const channelsByTopic = new Map<string, Set<string>>();
  for (const { keywordId, trendItem } of links) {
    const set = channelsByTopic.get(keywordId) ?? new Set<string>();
    if (trendItem.channelId) set.add(trendItem.channelId);
    channelsByTopic.set(keywordId, set);
  }
  const topIds = [...channelsByTopic.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, SUMMARIZE_PER_RUN * 2)
    .map(([id]) => id);

  const staleBefore = hoursAgo(SUMMARY_REFRESH_HOURS);
  const targets = (
    await prisma.keyword.findMany({ where: { id: { in: topIds }, category: { in: [...TOPIC_CATEGORIES] } } })
  )
    // findMany는 in 목록 순서를 보장하지 않으므로 채널 수 순위대로 다시 정렬
    .sort((a, b) => topIds.indexOf(a.id) - topIds.indexOf(b.id))
    .filter((k) => !k.summaryAt || k.summaryAt < staleBefore)
    .slice(0, SUMMARIZE_PER_RUN);

  for (const [index, keyword] of targets.entries()) {
    if (index > 0) await sleep(GEMINI_SUMMARY_DELAY_MS);

    const videos = await prisma.trendItem.findMany({
      where: { videoKeywords: { some: { keywordId: keyword.id } } },
      orderBy: { score: "desc" },
      take: 20,
      select: { title: true },
    });

    try {
      const { summary, category } = await summarizeTopic({
        topic: keyword.text,
        videoTitles: videos.map((v) => v.title),
      });
      // 요약하면서 고른 카테고리로 확정 ("제외"면 웹에서 빠짐). 종류를 못 받았거나 사람이 고친 카테고리면 기존 분류 유지
      const confirmed =
        category && !keyword.categoryLocked
          ? { category, categoryVotes: { [category]: CONFIRMED_CATEGORY_WEIGHT } }
          : {};
      await prisma.keyword.update({
        where: { id: keyword.id },
        data: { summary, summaryAt: new Date(), ...confirmed },
      });
      const moved = "category" in confirmed && category !== keyword.category ? ` (카테고리 ${keyword.category} → ${category})` : "";
      console.log(`[YOUTUBE] 요약: "${keyword.text}"${moved}`);
    } catch (err) {
      console.error(`[YOUTUBE] 요약 실패 ("${keyword.text}"):`, err instanceof Error ? err.message : err);
    }
  }
}

export async function collectYouTubeTrends() {
  // 작업 스케줄러는 1시간마다 돌지만 search.list 할당량 때문에 탐색은 DISCOVERY_INTERVAL_HOURS 간격으로만
  const lastRun = await prisma.collectionLog.findFirst({
    where: { source: "YOUTUBE", status: "SUCCESS" },
    orderBy: { startedAt: "desc" },
  });
  const force = process.env.FORCE_DISCOVERY === "1";
  if (!force && lastRun && lastRun.startedAt > hoursAgo(DISCOVERY_INTERVAL_HOURS)) {
    console.log(`[YOUTUBE] 마지막 탐색 후 ${DISCOVERY_INTERVAL_HOURS}시간이 안 지나서 건너뜀`);
    return { itemsCollected: 0, skipped: true };
  }

  const registry = await TopicRegistry.load();
  const beforeCount = await prisma.trendItem.count({ where: { source: "YOUTUBE" } });

  const { discovered, fetchedIds } = await discover(registry);
  await expand(registry, discovered, fetchedIds);
  await refreshLinkedVideos(fetchedIds);
  await summarizeTopTopics();

  const afterCount = await prisma.trendItem.count({ where: { source: "YOUTUBE" } });
  return { itemsCollected: afterCount - beforeCount };
}
