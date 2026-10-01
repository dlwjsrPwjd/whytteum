// 구독자 수가 이 값 이상이면 "공식 아티스트/레이블 채널"로 분류 (랭킹 디레이팅은 apps/web에서 처리)
export const OFFICIAL_CHANNEL_SUBSCRIBER_THRESHOLD = 1_000_000;

// 이 시간(시간 단위) 이내에 처음 발견된 영상만 재조회 대상으로 추적
export const VIDEO_TRACKING_WINDOW_HOURS = 48;
