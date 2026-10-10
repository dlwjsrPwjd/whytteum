import { DEFAULT_CATEGORY_PERIOD, type RankingPeriodDays } from "./ranking-config";

// 카테고리별 유행 페이지 주소. 기본 기간(7일)이면 period는 생략
export function categoriesHref(category?: string, period: RankingPeriodDays = DEFAULT_CATEGORY_PERIOD) {
  const params = new URLSearchParams();
  if (period !== DEFAULT_CATEGORY_PERIOD) params.set("period", String(period));
  if (category) params.set("category", category);
  const query = params.toString();
  return query ? `/categories?${query}` : "/categories";
}
