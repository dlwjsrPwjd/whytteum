import { SkeletonBlock, SkeletonRankingCard, SkeletonSpotlight } from "@/components/Skeleton";

// 메인 랭킹을 DB에서 읽는 동안 보여주는 화면 (page.tsx와 같은 배치)
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <SkeletonBlock className="h-6 w-40 rounded-full" />
        <SkeletonBlock className="h-10 w-full max-w-lg" />
        <SkeletonBlock className="h-4 w-full max-w-md" />
      </div>
      <SkeletonSpotlight />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SkeletonRankingCard />
        <SkeletonRankingCard />
        <SkeletonRankingCard />
      </div>
    </div>
  );
}
