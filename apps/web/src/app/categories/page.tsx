import { getCategoryOverview, getRanking, isTrendCategory, parsePeriod } from "@/lib/trends";
import { DEFAULT_CATEGORY_PERIOD, RANKING_PERIODS, TREND_CATEGORIES, type RankingPeriodDays } from "@/lib/ranking-config";
import { categoriesHref } from "@/lib/categories-url";
import { RankingSection } from "@/components/RankingSection";
import { CategoryChips } from "@/components/CategoryChips";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; period?: string }>;
}) {
  const params = await searchParams;
  const category = isTrendCategory(params.category) ? params.category : undefined;
  const period = parsePeriod(params.period) ?? DEFAULT_CATEGORY_PERIOD;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">
          카테고리별{" "}
          <span className="bg-linear-to-r from-coral-500 to-violet-500 bg-clip-text text-transparent">유행</span>
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          먹고, 입고, 사고, 따라 하는 것들을 카테고리별로 모아봤어요.
        </p>
      </header>

      <CategoryChips active={category} period={period} />

      {category ? <CategoryDetail category={category} period={period} /> : <Overview period={period} />}
    </div>
  );
}

// 카테고리 하나를 골랐을 때: 선택한 기간의 순위를 한 번에 전부
async function CategoryDetail({ category, period }: { category: string; period: RankingPeriodDays }) {
  const items = await getRanking(period, category);
  const info = RANKING_PERIODS.find((p) => p.days === period)!;
  const emoji = TREND_CATEGORIES.find((c) => c.name === category)?.emoji ?? info.emoji;

  return (
    <div className="max-w-2xl">
      <RankingSection
        title={category}
        period={info.label}
        emoji={emoji}
        items={items}
        highlight
        showAll
        from={categoriesHref(category, period)}
      />
    </div>
  );
}

// 카테고리를 안 골랐을 때: 카테고리마다 선택한 기간의 랭킹을 카드로
async function Overview({ period }: { period: RankingPeriodDays }) {
  const overview = await getCategoryOverview(period);
  const info = RANKING_PERIODS.find((p) => p.days === period)!;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {overview.map((category) => (
        <RankingSection
          key={category.name}
          title={category.name}
          period={info.label}
          emoji={category.emoji}
          items={category.items}
          from={categoriesHref(undefined, period)}
        />
      ))}
    </div>
  );
}
