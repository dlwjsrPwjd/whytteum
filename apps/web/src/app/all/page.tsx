import Link from "next/link";
import { getCategories, getTrendFeed } from "@/lib/trends";
import { TrendCard } from "@/components/TrendCard";
import { CategoryNav } from "@/components/CategoryNav";
import { Pagination } from "@/components/Pagination";

export default async function AllTrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const categorySlug = params.category;
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const [categories, feed] = await Promise.all([
    getCategories(),
    getTrendFeed({ categorySlug, page }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          ← 메인으로
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">전체 트렌드</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          카테고리별로 모든 트렌드를 최신순으로 볼 수 있어요
        </p>
      </header>

      <CategoryNav categories={categories} activeSlug={categorySlug} />

      {feed.items.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
          아직 수집된 트렌드가 없습니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {feed.items.map((item) => (
            <li key={item.id}>
              <TrendCard item={item} />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        categorySlug={categorySlug}
        page={feed.page}
        totalPages={feed.totalPages}
      />
    </div>
  );
}
