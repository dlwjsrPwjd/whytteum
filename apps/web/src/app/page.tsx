import { connection } from "next/server";
import { getRankedSections } from "@/lib/trends";
import { RankingSection } from "@/components/RankingSection";
import { Spotlight } from "@/components/Spotlight";

export default async function Home() {
  // 요청 시점 API를 안 써서 빌드 때 정적 페이지로 굳어버림 → 매 요청마다 최신 랭킹을 읽도록
  await connection();
  const sections = await getRankedSections();
  const spotlight = sections.recent[0];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <section className="flex flex-col gap-2">
        <span className="self-start rounded-full bg-coral-100 px-3 py-1 text-xs font-semibold text-coral-700 dark:bg-coral-950 dark:text-coral-300">
          유튜브 쇼츠 기반 트렌드 랭킹
        </span>
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          요즘 이게{" "}
          <span className="bg-linear-to-r from-coral-500 to-violet-500 bg-clip-text text-transparent">
            왜 뜨는지
          </span>
          ,<br className="sm:hidden" /> AI가 대신 알려드려요
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          같은 주제를 다룬 채널이 많을수록 순위가 높아요. 기간은 영상이 올라온 날 기준이에요.
        </p>
      </section>

      {spotlight && <Spotlight topic={spotlight} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <RankingSection title="요즘 뜨는" period="3일" emoji="🔥" items={sections.recent} highlight />
        <RankingSection title="이번 주" period="7일" emoji="🗓️" items={sections.weekly} />
        <RankingSection title="이번 달" period="30일" emoji="📆" items={sections.monthly} />
      </div>
    </div>
  );
}
