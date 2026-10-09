import { SkeletonBlock } from "@/components/Skeleton";

// 주제 상세(요약 + 관련 영상)를 읽는 동안 보여주는 화면
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-4 w-20" />
        <SkeletonBlock className="h-10 w-56" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <SkeletonBlock key={i} className="h-[74px] rounded-2xl" />
          ))}
        </div>
      </div>
      <SkeletonBlock className="h-36 rounded-2xl" />
      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-6 w-28" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonBlock key={i} className="h-[103px] rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
