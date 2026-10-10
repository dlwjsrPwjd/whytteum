const formatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(date: Date) {
  return formatter.format(date);
}

// 조회수를 "3.2만회", "1.1억회" 형태로 표시
export function formatViews(views: number) {
  if (views >= 100_000_000) return `${(views / 100_000_000).toFixed(1)}억회`;
  if (views >= 10_000) return `${(views / 10_000).toFixed(1)}만회`;
  return `${views.toLocaleString("ko-KR")}회`;
}
