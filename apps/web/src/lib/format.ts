const formatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(date: Date) {
  return formatter.format(date);
}

// 시간당 조회수 증가속도를 "+3.2만 회/시간" 형태로 표시
export function formatVelocity(viewsPerHour: number) {
  const rounded = Math.round(viewsPerHour);
  const abs = Math.abs(rounded);
  const sign = rounded >= 0 ? "+" : "-";

  if (abs >= 10000) {
    return `${sign}${(abs / 10000).toFixed(1)}만 회/시간`;
  }
  return `${sign}${abs.toLocaleString("ko-KR")}회/시간`;
}
