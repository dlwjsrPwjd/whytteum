import { getCategoryOverview, getRankedSections, isTrendCategory } from "@/lib/trends";
import { RankingSection } from "@/components/RankingSection";
import { CategoryChips } from "@/components/CategoryChips";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const category = isTrendCategory(params.category) ? params.category : undefined;

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

      <CategoryChips active={category} />

      {category ? <CategoryDetail category={category} /> : <Overview />}
    </div>
  );
}

// 카테고리 하나를 골랐을 때: 메인과 같은 3일/7일/30일 랭킹
async function CategoryDetail({ category }: { category: string }) {
  const sections = await getRankedSections(category);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <RankingSection title="요즘 뜨는" period="3일" emoji="🔥" items={sections.recent} highlight />
      <RankingSection title="이번 주" period="7일" emoji="🗓️" items={sections.weekly} />
      <RankingSection title="이번 달" period="30일" emoji="📆" items={sections.monthly} />
    </div>
  );
}

// 카테고리를 안 골랐을 때: 카테고리마다 이번 주 랭킹을 카드로
async function Overview() {
  const overview = await getCategoryOverview();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {overview.map((category) => (
        <RankingSection
          key={category.name}
          title={category.name}
          period="7일"
          emoji={category.emoji}
          items={category.items}
        />
      ))}
    </div>
  );
}
