import Link from "next/link";
import { connection } from "next/server";
import { getRankedSections, type RankedTopic } from "@/lib/trends";
import { RankingSection } from "@/components/RankingSection";
import { RisingBadge } from "@/components/RisingBadge";
import { formatViews } from "@/lib/format";

export default async function Home() {
  // 요청 시점 API를 안 써서 빌드 때 정적 페이지로 굳어버림 → 매 요청마다 최신 랭킹을 읽도록
  await connection();
  const sections = await getRankedSections();
  const spotlight = sections.recent[0];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
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
          카테고리마다 가장 많은 채널이 다룬 주제부터 골고루 모았어요. 기간은 영상이 올라온 날 기준이에요.
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

// 3일 랭킹 1위를 AI 요약과 함께 크게 보여주는 카드
function Spotlight({ topic }: { topic: RankedTopic }) {
  return (
    <Link
      href={`/keyword/${topic.id}`}
      className="group relative overflow-hidden rounded-3xl bg-linear-to-br from-coral-500 via-coral-500 to-violet-500 p-6 text-white shadow-lg shadow-coral-500/20 transition-transform hover:-translate-y-0.5 sm:p-8"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-white/20 px-2.5 py-1">👑 지금 1위</span>
          {topic.category && <span className="rounded-full bg-white/20 px-2.5 py-1">{topic.category}</span>}
          <RisingBadge count={topic.risingChannelCount} onDark />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{topic.title}</h2>
        {topic.summary && (
          <p className="line-clamp-3 max-w-3xl text-sm leading-relaxed text-white/90 sm:text-base">
            {topic.summary}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90">
          <span>
            <b className="text-white">{topic.channelCount}</b>개 채널이 다룸
          </span>
          <span>
            쇼츠 채널 <b className="text-white">{topic.shortsChannelCount}</b>곳
          </span>
          <span>총 조회수 {formatViews(topic.totalViews)}</span>
          <span className="ml-auto font-semibold group-hover:underline">자세히 보기 →</span>
        </div>
      </div>
    </Link>
  );
}
