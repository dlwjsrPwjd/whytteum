import type { TrendSource } from "@prisma/client";

const LABELS: Record<TrendSource, string> = {
  GOOGLE_TRENDS: "구글 트렌드",
  YOUTUBE: "유튜브",
  NAVER_DATALAB: "네이버 데이터랩",
};

export function sourceLabel(source: TrendSource) {
  return LABELS[source];
}
