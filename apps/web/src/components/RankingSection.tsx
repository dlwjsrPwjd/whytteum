"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RankedTopic } from "@/lib/trends";

const ROTATE_INTERVAL_MS = 3000;

const RANK_BADGE = [
  "bg-coral-500 text-white",
  "bg-coral-400 text-white",
  "bg-coral-300 text-white",
];

export function RankingSection({
  title,
  period,
  emoji,
  items,
  highlight = false,
  from,
}: {
  title: string;
  period: string;
  emoji: string;
  items: RankedTopic[];
  highlight?: boolean;
  // 상세 페이지의 "뒤로" 링크가 돌아올 경로 (없으면 메인 랭킹)
  from?: string;
}) {
  const [showSecondHalf, setShowSecondHalf] = useState(false);
  const hasSecondHalf = items.length > 5;

  useEffect(() => {
    if (!hasSecondHalf) return;
    const timer = setInterval(() => {
      setShowSecondHalf((prev) => !prev);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasSecondHalf]);

  const rankOffset = showSecondHalf ? 5 : 0;
  const visible = items.slice(rankOffset, rankOffset + 5);
  // 채널 수 막대 길이는 해당 기간 최대 채널 수 대비 비율 (순위는 조회수도 반영하므로 1위가 최대가 아닐 수 있음)
  const maxChannels = Math.max(1, ...items.map((item) => item.channelCount));

  return (
    <section
      className={`flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm dark:bg-stone-900 ${
        highlight ? "border-coral-200 dark:border-coral-900" : "border-stone-200 dark:border-stone-800"
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-bold">
          <span>{emoji}</span>
          {title}
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            {period}
          </span>
        </h2>
        {hasSecondHalf && (
          <span className="flex items-center gap-1 text-xs text-stone-400">
            <span className={`h-1.5 w-1.5 rounded-full ${showSecondHalf ? "bg-stone-300" : "bg-coral-500"}`} />
            <span className={`h-1.5 w-1.5 rounded-full ${showSecondHalf ? "bg-coral-500" : "bg-stone-300"}`} />
          </span>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-500 dark:text-stone-400">
          아직 데이터가 없어요
        </p>
      ) : (
        <ol className="flex flex-col gap-1">
          {visible.map((item, i) => {
            const rank = rankOffset + i + 1;
            return (
              <li key={item.id}>
                <Link
                  href={from ? `/keyword/${item.id}?from=${encodeURIComponent(from)}` : `/keyword/${item.id}`}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-coral-50 dark:hover:bg-coral-950/40"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      RANK_BADGE[rank - 1] ?? "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                    }`}
                  >
                    {rank}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-sm font-semibold group-hover:text-coral-600 dark:group-hover:text-coral-400">
                      {item.title}
                    </span>
                    <span className="h-1 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                      <span
                        className="block h-full rounded-full bg-linear-to-r from-coral-400 to-violet-400"
                        style={{ width: `${Math.max(8, (item.channelCount / maxChannels) * 100)}%` }}
                      />
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-medium text-stone-400">
                    {item.channelCount}채널
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
