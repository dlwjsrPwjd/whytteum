// 주제 랭킹 점수 = (다룬 채널 수 + 쇼츠 채널 가중치) × log10(10 + 총 조회수)
// 조회수보다 "얼마나 많은 서로 다른 채널이 다뤘는가"를 우선으로 보고, 조회수는 보정용으로만 씀
export const SHORTS_CHANNEL_BONUS = 0.5;
// 채널 1곳만 다룬 주제는 유행이라기보다 영상 하나의 화제라서 랭킹에서 제외
export const MIN_CHANNEL_COUNT = 2;
export const RANKING_SIZE = 10;

// 랭킹 기간 (영상 업로드 시각 기준). 유행은 며칠에 걸쳐 여러 채널로 퍼지므로 가장 짧은 기간이 3일
export const RANKING_PERIODS = [
  { days: 3, label: "3일", title: "요즘 뜨는", emoji: "🔥" },
  { days: 7, label: "7일", title: "이번 주", emoji: "🗓️" },
  { days: 30, label: "30일", title: "이번 달", emoji: "📆" },
] as const;
export type RankingPeriodDays = (typeof RANKING_PERIODS)[number]["days"];
// 카테고리별 유행 페이지에서 기간을 안 골랐을 때
export const DEFAULT_CATEGORY_PERIOD: RankingPeriodDays = 7;

// "지금도 퍼지는 중" 배지: 최근 이 시간 안에 영상을 올린 채널 수를 따로 셈
export const RISING_WINDOW_HOURS = 24;
// 위 채널 수가 이 이상이면 급상승(⚡) 표시
export const SURGE_MIN_CHANNELS = 5;

// 유행 카테고리. apps/cron/src/lib/gemini.ts의 TOPIC_CATEGORIES와 맞춰서 유지
export const TREND_CATEGORIES = [
  { name: "음식/디저트", emoji: "🍰" },
  { name: "패션/뷰티", emoji: "💄" },
  { name: "아이템/쇼핑", emoji: "🛍️" },
  { name: "밈/챌린지", emoji: "🤳" },
  { name: "음악/댄스", emoji: "🎵" },
  { name: "드라마/예능", emoji: "📺" },
  { name: "게임", emoji: "🎮" },
  { name: "인물/이슈", emoji: "💬" },
] as const;
