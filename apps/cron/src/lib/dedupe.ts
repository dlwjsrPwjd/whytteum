import type { TrendSource } from "@prisma/client";
import { prisma } from "../prismaClient.js";

const DEDUPE_WINDOW_HOURS = 20;

export async function alreadyCollectedRecently(source: TrendSource, title: string) {
  const since = new Date(Date.now() - DEDUPE_WINDOW_HOURS * 60 * 60 * 1000);
  const existing = await prisma.trendItem.findFirst({
    where: { source, title, collectedAt: { gte: since } },
    select: { id: true },
  });
  return existing !== null;
}
