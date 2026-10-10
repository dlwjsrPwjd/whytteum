import Link from "next/link";
import type { RankedTopic } from "@/lib/trends";
import { RisingBadge } from "./RisingBadge";
import { formatViews } from "@/lib/format";

// 랭킹 1위를 AI 요약과 함께 크게 보여주는 카드 (메인: 3일 1위, 카테고리별 유행: 고른 카테고리 1위)
export function Spotlight({
  topic,
  label = "지금 1위",
  showCategory = true,
  from,
}: {
  topic: RankedTopic;
  label?: string;
  showCategory?: boolean;
  // 상세 페이지의 "뒤로" 링크가 돌아올 경로 (없으면 메인)
  from?: string;
}) {
  return (
    <Link
      href={from ? `/keyword/${topic.id}?from=${encodeURIComponent(from)}` : `/keyword/${topic.id}`}
      className="group relative overflow-hidden rounded-3xl bg-linear-to-br from-coral-500 via-coral-500 to-violet-500 p-6 text-white shadow-lg shadow-coral-500/20 transition-transform hover:-translate-y-0.5 sm:p-8"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-white/20 px-2.5 py-1">👑 {label}</span>
          {showCategory && topic.category && (
            <span className="rounded-full bg-white/20 px-2.5 py-1">{topic.category}</span>
          )}
          <RisingBadge count={topic.risingChannelCount} onDark />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{topic.title}</h2>
        {topic.summary && (
          <p className="line-clamp-3 max-w-3xl text-sm leading-relaxed text-white/90 sm:text-base">
            {topic.summary}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90">
          <span>
            <b className="text-white">{topic.channelCount}</b>개 채널이 다룸
          </span>
          <span>
            쇼츠 채널 <b className="text-white">{topic.shortsChannelCount}</b>곳
          </span>
          <span>총 조회수 {formatViews(topic.totalViews)}</span>
          <span className="ml-auto font-semibold group-hover:underline">자세히 보기 →</span>
        </div>
      </div>
    </Link>
  );
}
