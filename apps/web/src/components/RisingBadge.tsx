import { RISING_WINDOW_HOURS, SURGE_MIN_CHANNELS } from "@/lib/ranking-config";

// 최근 24시간 안에 이 주제로 영상을 올린 채널 수. 지금도 퍼지는 중인지 보여줌
export function RisingBadge({ count, onDark = false }: { count: number; onDark?: boolean }) {
  if (count <= 0) return null;
  const surge = count >= SURGE_MIN_CHANNELS;

  const tone = onDark
    ? "bg-white/20 text-white"
    : surge
      ? "bg-coral-500 text-white"
      : "bg-coral-50 text-coral-600 dark:bg-coral-950 dark:text-coral-300";

  return (
    <span
      title={`최근 ${RISING_WINDOW_HOURS}시간 안에 영상을 올린 채널 ${count}곳`}
      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${tone}`}
    >
      {surge ? "⚡" : ""}+{count}
    </span>
  );
}
