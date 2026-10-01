import { prisma } from "../prismaClient.js";

const MIN_ELAPSED_HOURS = 0.1; // 6분 미만 간격은 노이즈가 커서 속도 계산 제외

export async function recordSnapshotAndRecomputeVelocity(trendItemId: string, viewCount: number) {
  const capturedAt = new Date();
  await prisma.videoSnapshot.create({
    data: { trendItemId, viewCount, capturedAt },
  });

  const earliest = await prisma.videoSnapshot.findFirst({
    where: { trendItemId },
    orderBy: { capturedAt: "asc" },
  });

  let velocityScore: number | null = null;
  if (earliest && earliest.capturedAt.getTime() !== capturedAt.getTime()) {
    const elapsedHours = (capturedAt.getTime() - earliest.capturedAt.getTime()) / (1000 * 60 * 60);
    if (elapsedHours >= MIN_ELAPSED_HOURS) {
      velocityScore = (viewCount - earliest.viewCount) / elapsedHours;
    }
  }

  await prisma.trendItem.update({
    where: { id: trendItemId },
    data: { score: viewCount, velocityScore },
  });

  return velocityScore;
}
