import Link from "next/link";
import { notFound } from "next/navigation";
import { getTrendItem } from "@/lib/trends";
import { sourceLabel } from "@/lib/source-label";
import { formatDate } from "@/lib/format";

export default async function TrendDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getTrendItem(id);
  if (!item) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
      >
        ← 전체 트렌드로 돌아가기
      </Link>

      <article className="flex flex-col gap-4">
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
              {item.category.name}
            </span>
            <span>{sourceLabel(item.source)}</span>
            <span>{formatDate(item.collectedAt)}</span>
          </div>
          <h1 className="text-xl font-bold leading-snug sm:text-2xl">
            {item.title}
          </h1>
        </header>

        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            AI 요약: 왜 화제일까요?
          </h2>
          {item.aiSummary ? (
            <p className="whitespace-pre-line leading-relaxed">
              {item.aiSummary.summary}
            </p>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              아직 AI 요약이 생성되지 않았습니다.
            </p>
          )}
        </section>

        {item.sourceUrl && (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            원본 보기 →
          </a>
        )}
      </article>
    </div>
  );
}
