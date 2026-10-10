import { SkeletonBlock, SkeletonRankingCard } from "@/components/Skeleton";

// 카테고리별 유행 첫 진입 시 보여주는 화면 (한눈에 보기 4×2 배치)
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <SkeletonBlock className="h-9 w-48" />
        <SkeletonBlock className="h-4 w-full max-w-sm" />
      </div>
      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-9 w-44 rounded-full" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 9 }, (_, i) => (
            <SkeletonBlock key={i} className="h-8 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <SkeletonRankingCard key={i} />
        ))}
      </div>
    </div>
  );
}
