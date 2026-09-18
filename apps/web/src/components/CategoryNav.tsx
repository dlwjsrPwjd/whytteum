import Link from "next/link";
import type { Category } from "@prisma/client";

type CategoryWithCount = Category & { _count: { trendItems: number } };

export function CategoryNav({
  categories,
  activeSlug,
}: {
  categories: CategoryWithCount[];
  activeSlug?: string;
}) {
  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      <CategoryPill href="/" label="전체" active={!activeSlug} />
      {categories.map((c) => (
        <CategoryPill
          key={c.id}
          href={`/?category=${c.slug}`}
          label={`${c.name} (${c._count.trendItems})`}
          active={activeSlug === c.slug}
        />
      ))}
    </nav>
  );
}

function CategoryPill({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 transition-colors ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700"
      }`}
    >
      {label}
    </Link>
  );
}
