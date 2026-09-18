import { prisma } from "./prisma";

const PAGE_SIZE = 20;

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
