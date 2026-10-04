import type { Keyword, Prisma } from "@prisma/client";
import { prisma } from "../prismaClient.js";

// "두바이 쫀득쿠키", "두바이쫀득쿠키"처럼 띄어쓰기/대소문자만 다른 표기를 같은 주제로 보기 위한 정규화
export function normalizeTopic(text: string): string {
  return text.toLowerCase().replace(/[\s·\-_'"#]/g, "");
}

// 영상 제목/설명에 주제 이름이 실제로 들어 있는지 (확장 검색 결과의 엉뚱한 영상 걸러내기용)
export function mentionsTopic(text: string, topic: string): boolean {
  const normalizedTopic = normalizeTopic(topic);
  if (normalizedTopic.length < 2) return false;
  return normalizeTopic(text).includes(normalizedTopic);
}

// 한 번의 수집 실행 안에서 주제 조회/생성을 정규화된 이름 기준으로 캐싱
export class TopicRegistry {
  private byNormalized = new Map<string, Keyword>();

  static async load() {
    const registry = new TopicRegistry();
    const keywords = await prisma.keyword.findMany();
    for (const keyword of keywords) {
      registry.byNormalized.set(normalizeTopic(keyword.text), keyword);
    }
    return registry;
  }

  find(text: string): Keyword | undefined {
    return this.byNormalized.get(normalizeTopic(text));
  }

  // category는 이번 탐색에서 Gemini가 낸 분류(확장 단계처럼 분류가 없으면 null).
  // 회차마다 덮어쓰면 영상 맥락에 따라 흔들려서("가수 + 햄버거 영상" → 음식) 득표를 쌓고 최다 득표를 씀
  async findOrCreate(text: string, category: string | null): Promise<Keyword> {
    const existing = this.find(text);
    if (existing) {
      if (!category) return existing;
      const votes = addVote(existing.categoryVotes, category);
      const updated = await prisma.keyword.update({
        where: { id: existing.id },
        data: { categoryVotes: votes, category: topVote(votes, existing.category) },
      });
      this.byNormalized.set(normalizeTopic(text), updated);
      return updated;
    }

    const created = await prisma.keyword.create({
      data: { text, category, categoryVotes: category ? { [category]: 1 } : {} },
    });
    this.byNormalized.set(normalizeTopic(text), created);
    return created;
  }

  async markExpanded(keywordId: string) {
    const updated = await prisma.keyword.update({
      where: { id: keywordId },
      data: { lastExpandedAt: new Date() },
    });
    this.byNormalized.set(normalizeTopic(updated.text), updated);
  }
}

export type CategoryVotes = Record<string, number>;

function addVote(raw: Prisma.JsonValue, category: string): CategoryVotes {
  const votes: CategoryVotes = raw && typeof raw === "object" && !Array.isArray(raw) ? { ...(raw as CategoryVotes) } : {};
  votes[category] = (votes[category] ?? 0) + 1;
  return votes;
}

// 최다 득표 카테고리. 동점이면 지금 카테고리를 유지
export function topVote(votes: CategoryVotes, current: string | null): string | null {
  let best = current;
  let bestCount = current ? (votes[current] ?? 0) : 0;
  for (const [category, count] of Object.entries(votes)) {
    if (count > bestCount) {
      best = category;
      bestCount = count;
    }
  }
  return best;
}

export async function linkVideosToTopic(keywordId: string, trendItemIds: string[]) {
  if (trendItemIds.length === 0) return;
  await prisma.videoKeyword.createMany({
    data: trendItemIds.map((trendItemId) => ({ trendItemId, keywordId })),
    skipDuplicates: true,
  });
}
