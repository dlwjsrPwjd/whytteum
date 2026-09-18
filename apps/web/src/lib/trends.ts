import type { TrendSource } from "@prisma/client";
import { prisma } from "./prisma";

const PAGE_SIZE = 20;

export interface RankedItem {
  id: string;
  title: string;
  score: number | null;
  source: TrendSource;
  categoryName: string;
}

async function getTopByPeriod(hours: number): Promise<RankedItem[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const items = await prisma.trendItem.findMany({
    where: { collectedAt: { gte: since }, score: { not: null } },
    include: { category: true },
    orderBy: { score: "desc" },
    take: 10,
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    score: item.score,
    source: item.source,
    categoryName: item.category.name,
  }));
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
