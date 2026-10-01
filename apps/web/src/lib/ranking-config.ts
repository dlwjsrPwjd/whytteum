// 주제 랭킹 점수 = (다룬 채널 수 + 쇼츠 채널 가중치) × log10(10 + 총 조회수)
// 조회수보다 "얼마나 많은 서로 다른 채널이 다뤘는가"를 우선으로 보고, 조회수는 보정용으로만 씀
export const SHORTS_CHANNEL_BONUS = 0.5;
// 채널 1곳만 다룬 주제는 유행이라기보다 영상 하나의 화제라서 랭킹에서 제외
export const MIN_CHANNEL_COUNT = 2;
export const RANKING_SIZE = 10;

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
  { name: "정치", emoji: "🏛️" },
] as const;

// 기본(전체) 랭킹에서는 빼고, 해당 카테고리를 직접 골랐을 때만 보여줌
// (정치 주제는 채널 수가 많아서 섞으면 전체 랭킹을 거의 다 차지함)
export const HIDDEN_FROM_ALL_CATEGORIES: string[] = ["정치"];
