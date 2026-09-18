import Link from "next/link";

export function Pagination({
  categorySlug,
  page,
  totalPages,
}: {
  categorySlug?: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (targetPage: number) => {
    const params = new URLSearchParams();
    if (categorySlug) params.set("category", categorySlug);
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return query ? `/all?${query}` : "/all";
  };

  return (
    <div className="flex items-center justify-center gap-4 pt-4 text-sm">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="hover:underline">
          ← 이전
        </Link>
      ) : (
        <span className="text-zinc-300 dark:text-zinc-700">← 이전</span>
      )}
      <span className="text-zinc-500">
        {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className="hover:underline">
          다음 →
        </Link>
      ) : (
        <span className="text-zinc-300 dark:text-zinc-700">다음 →</span>
      )}
    </div>
  );
}
