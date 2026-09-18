import Link from "next/link";
import { getRankedSections } from "@/lib/trends";
import { RankingSection } from "@/components/RankingSection";

export default async function Home() {
  const sections = await getRankedSections();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">왜뜸</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          요즘 이게 왜 유행인지, AI가 대신 알려드려요
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RankingSection title="🔴 실시간" items={sections.realtime} />
        <RankingSection title="📅 일간" items={sections.daily} />
        <RankingSection title="🗓️ 주간" items={sections.weekly} />
        <RankingSection title="📆 월간" items={sections.monthly} />
      </div>

      <Link
        href="/all"
        className="self-center text-sm text-zinc-500 hover:underline dark:text-zinc-400"
      >
        카테고리별 전체 트렌드 보기 →
      </Link>
    </div>
  );
}
