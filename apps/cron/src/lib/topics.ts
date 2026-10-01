import type { Keyword } from "@prisma/client";
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

  async findOrCreate(text: string, category: string | null): Promise<Keyword> {
    const existing = this.find(text);
    if (existing) {
      // 카테고리 체계가 바뀌었거나 이전 분류가 틀렸을 수 있으므로 가장 최근 분류를 따름
      if (category && existing.category !== category) {
        const updated = await prisma.keyword.update({ where: { id: existing.id }, data: { category } });
        this.byNormalized.set(normalizeTopic(text), updated);
        return updated;
      }
      return existing;
    }

    const created = await prisma.keyword.create({ data: { text, category } });
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

export async function linkVideosToTopic(keywordId: string, trendItemIds: string[]) {
  if (trendItemIds.length === 0) return;
  await prisma.videoKeyword.createMany({
    data: trendItemIds.map((trendItemId) => ({ trendItemId, keywordId })),
    skipDuplicates: true,
  });
}
