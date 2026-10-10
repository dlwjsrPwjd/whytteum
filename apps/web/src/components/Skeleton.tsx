// 로딩 화면(loading.tsx)용 회색 블록. 실제 화면과 같은 자리·크기로 깜빡여서 레이아웃이 튀지 않게 함
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-stone-200/70 dark:bg-stone-800/70 ${className}`} />;
}

// RankingSection과 같은 모양의 빈 순위 카드
export function SkeletonRankingCard({ rows = 5, twoColumns = false }: { rows?: number; twoColumns?: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <SkeletonBlock className="h-6 w-28" />
      <div
        className={
          twoColumns
            ? "grid grid-cols-1 gap-y-1 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-5 sm:gap-x-6"
            : "flex flex-col gap-1"
        }
      >
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2">
            <SkeletonBlock className="h-6 w-6 shrink-0" />
            <div className="flex flex-1 flex-col gap-1">
              <SkeletonBlock className="h-5 w-3/4" />
              <SkeletonBlock className="h-1 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Spotlight(1위 카드) 자리
export function SkeletonSpotlight() {
  return <div className="h-56 animate-pulse rounded-3xl bg-linear-to-br from-coral-200 to-violet-200 opacity-60 dark:from-coral-900 dark:to-violet-900" />;
}
