import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getKeywordDetail } from "@/lib/trends";
import { formatDate, formatViews } from "@/lib/format";

export default async function KeywordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getKeywordDetail(id);
  if (!detail) notFound();

  const { keyword, videos, channelCount, shortsCount } = detail;
  const totalViews = videos.reduce((sum, v) => sum + (v.score ?? 0), 0);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <Link
          href="/"
          className="self-start text-sm text-stone-500 transition-colors hover:text-coral-600 dark:text-stone-400 dark:hover:text-coral-400"
        >
          ← 랭킹으로
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{keyword.text}</h1>
          {keyword.category && (
            <span className="rounded-full bg-coral-100 px-3 py-1 text-xs font-semibold text-coral-700 dark:bg-coral-950 dark:text-coral-300">
              {keyword.category}
            </span>
          )}
        </div>

        <dl className="grid grid-cols-3 gap-3">
          <Stat label="다룬 채널" value={`${channelCount}곳`} />
          <Stat label="영상 (쇼츠)" value={`${videos.length} (${shortsCount})`} />
          <Stat label="총 조회수" value={formatViews(totalViews)} />
        </dl>
      </header>

      <section className="rounded-2xl bg-linear-to-br from-violet-500 to-coral-500 p-px shadow-sm">
        <div className="flex flex-col gap-2 rounded-[15px] bg-white p-5 dark:bg-stone-900">
          <h2 className="flex items-center gap-2 text-sm font-bold text-violet-600 dark:text-violet-400">
            <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-xs dark:bg-violet-950">AI</span>
            왜 뜨고 있나요?
          </h2>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            {keyword.summary ?? "AI 요약을 준비하고 있어요. 다음 수집 때 만들어져요."}
          </p>
          <p className="text-xs text-stone-400">
            영상 제목들을 바탕으로 AI가 쓴 요약이라 사실과 다를 수 있어요.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">
          관련 영상 <span className="text-coral-500">{videos.length}</span>
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {videos.map((video) => (
            <li key={video.id}>
              <a
                href={video.sourceUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-3 rounded-2xl border border-stone-200 bg-white p-2.5 transition-all hover:-translate-y-0.5 hover:border-coral-200 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-coral-900"
              >
                <div className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
                  {video.youtubeVideoId && (
                    <Image
                      src={`https://i.ytimg.com/vi/${video.youtubeVideoId}/mqdefault.jpg`}
                      alt=""
                      fill
                      sizes="144px"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                  {video.isShort && (
                    <span className="absolute top-1 left-1 rounded-md bg-coral-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      Shorts
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-col justify-between gap-1 py-0.5">
                  <span className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-coral-600 dark:group-hover:text-coral-400">
                    {video.title}
                  </span>
                  <span className="flex flex-col text-xs text-stone-500 dark:text-stone-400">
                    <span className="truncate">{video.channelTitle}</span>
                    <span>
                      {video.score !== null && `조회수 ${formatViews(video.score)}`}
                      {video.publishedAt && ` · ${formatDate(video.publishedAt)}`}
                    </span>
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900">
      <dt className="text-xs text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="text-lg font-extrabold text-coral-600 dark:text-coral-400">{value}</dd>
    </div>
  );
}
