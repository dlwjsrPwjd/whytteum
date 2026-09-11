import { prisma } from "../prismaClient.js";

export async function getOrCreateCategory(name: string, slug: string) {
  return prisma.category.upsert({
    where: { slug },
    update: {},
    create: { name, slug },
  });
}
