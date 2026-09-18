"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RankedItem } from "@/lib/trends";
import { sourceLabel } from "@/lib/source-label";

const ROTATE_INTERVAL_MS = 3000;

export function RankingSection({
  title,
  items,
}: {
  title: string;
  items: RankedItem[];
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

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {hasSecondHalf && (
          <span className="text-xs text-zinc-400">
            {showSecondHalf ? "6-10위" : "1-5위"}
          </span>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          데이터가 없습니다.
        </p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {visible.map((item, i) => (
            <li key={item.id}>
              <Link
                href={`/trend/${item.id}`}
                className="flex items-baseline gap-2 hover:underline"
              >
                <span className="w-5 shrink-0 text-right text-sm font-bold text-zinc-400">
                  {rankOffset + i + 1}
                </span>
                <span className="truncate text-sm">{item.title}</span>
                <span className="ml-auto shrink-0 text-xs text-zinc-400">
                  {sourceLabel(item.source)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
