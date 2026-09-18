import Link from "next/link";
import type { AiSummary, Category, TrendItem } from "@prisma/client";
import { sourceLabel } from "@/lib/source-label";
import { formatDate } from "@/lib/format";

type TrendItemWithRelations = TrendItem & {
  category: Category;
  aiSummary: AiSummary | null;
};

export function TrendCard({ item }: { item: TrendItemWithRelations }) {
  return (
    <Link
      href={`/trend/${item.id}`}
      className="flex flex-col gap-1.5 rounded-xl border border-zinc-200 p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
          {item.category.name}
        </span>
        <span>{sourceLabel(item.source)}</span>
        <span>{formatDate(item.collectedAt)}</span>
      </div>
      <h2 className="font-semibold leading-snug">{item.title}</h2>
      <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
        {item.aiSummary?.summary ?? "AI 요약 준비 중..."}
      </p>
    </Link>
  );
}
