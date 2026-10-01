import Link from "next/link";
import { notFound } from "next/navigation";
import { getKeywordDetail } from "@/lib/trends";
import { TrendCard } from "@/components/TrendCard";
import { formatVelocity } from "@/lib/format";

export default async function KeywordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getKeywordDetail(id);
  if (!detail) notFound();

  const { keyword, trendItems } = detail;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          ← 메인으로
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">#{keyword.text}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          이 키워드가 언급된 영상 {trendItems.length}개
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {trendItems.map((item) => (
          <li key={item.id} className="flex flex-col gap-1">
            {item.velocityScore !== null && (
              <span className="self-start rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {formatVelocity(item.velocityScore)}
              </span>
            )}
            <TrendCard item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}
