import Link from "next/link";
import { TREND_CATEGORIES } from "@/lib/ranking-config";

export function CategoryChips({ active }: { active?: string }) {
  const chips: { name?: string; label: string }[] = [
    { label: "✨ 한눈에 보기" },
    ...TREND_CATEGORIES.map((c) => ({ name: c.name, label: `${c.emoji} ${c.name}` })),
  ];

  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {chips.map((chip) => {
        const isActive = chip.name === active;
        return (
          <Link
            key={chip.label}
            href={chip.name ? `/categories?category=${encodeURIComponent(chip.name)}` : "/categories"}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
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
  );
}
