import Link from "next/link";
import { RANKING_PERIODS, TREND_CATEGORIES, type RankingPeriodDays } from "@/lib/ranking-config";
import { categoriesHref } from "@/lib/categories-url";

// 위: 기간(3일/7일/30일) 탭, 아래: 카테고리 칩(한 줄, 넘치면 가로 스크롤). 한쪽을 바꿔도 다른 쪽 선택은 유지
export function CategoryChips({ active, period }: { active?: string; period: RankingPeriodDays }) {
  const chips: { name?: string; label: string }[] = [
    { label: "✨ 한눈에 보기" },
    ...TREND_CATEGORIES.map((c) => ({ name: c.name, label: `${c.emoji} ${c.name}` })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <nav className="inline-flex self-start rounded-full bg-stone-100 p-1 dark:bg-stone-800/60">
        {RANKING_PERIODS.map((p) => {
          const isActive = p.days === period;
          return (
            <Link
              key={p.days}
              href={categoriesHref(active, p.days)}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                isActive
                  ? "bg-white font-semibold text-coral-600 shadow-sm dark:bg-stone-900 dark:text-coral-400"
                  : "text-stone-500 hover:text-coral-600 dark:text-stone-400 dark:hover:text-coral-400"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </nav>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {chips.map((chip) => {
          const isActive = chip.name === active;
          return (
            <Link
              key={chip.label}
              href={categoriesHref(chip.name, period)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                isActive
                  ? "border-coral-500 bg-coral-500 font-semibold text-white shadow-sm shadow-coral-500/30"
                  : "border-stone-200 bg-white text-stone-600 hover:border-coral-300 hover:text-coral-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
              }`}
            >
              {chip.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
