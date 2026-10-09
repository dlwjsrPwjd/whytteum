// YouTube Data API 일일 할당량(10,000 units) 안에서 돌리기 위한 값들.
// search.list는 1회 100 units라 탐색/확장 검색 횟수가 비용의 대부분을 차지함.
// (탐색 8 + 확장 6) 검색 × 100 units × 하루 6회(4시간 간격) ≈ 8,400 units

// 작업 스케줄러는 1시간마다 돌지만, YouTube 탐색은 이 간격보다 자주 하지 않음
export const DISCOVERY_INTERVAL_HOURS = 4;

// 탐색 검색: 최근 이 시간 안에 올라온 영상만 조회
export const DISCOVERY_LOOKBACK_HOURS = 48;

// 탐색 검색 쿼리. 전부 short(4분 미만, 쇼츠 위주). 유행 카테고리별로 걸리도록 구성
export const DISCOVERY_QUERIES: { q: string; duration: "short" | "medium" }[] = [
  // 핵심 유행(CORE_CATEGORIES)용: 밈, 음식, 장난감/굿즈, 드라마/영화, 음악
  { q: "유행|챌린지|밈", duration: "short" },
  { q: "요즘|난리|화제", duration: "short" },
  { q: "신상|품절|핫한", duration: "short" },
  // "맛집"은 가게마다 제각각이라 한 주제로 안 묶여서 빼고 편의점 신상 쪽으로
  { q: "디저트|신메뉴|편의점", duration: "short" },
  { q: "장난감|완구|굿즈|키링", duration: "short" },
  { q: "드라마|영화|명장면", duration: "short" },
  { q: "신곡|안무|커버", duration: "short" },
  // 부가: 인물/이슈(유튜버·연예인 논란)용
  { q: "논란|근황|폭로", duration: "short" },
];

// 서비스의 원래 목적인 "핵심 유행" 카테고리. 확장 검색 배정에서 우선함
// (패션/뷰티·인물/이슈·게임은 부가 카테고리)
export const CORE_CATEGORIES = ["음식/디저트", "밈/챌린지", "아이템/쇼핑", "음악/댄스", "드라마/예능"];

// 확장 검색: 주제 하나를 키워드로 다시 검색해서 "몇 개 채널이 다루는지"를 모음
// (쿨다운 때문에 실제로는 회차당 3~8개만 돌아서, 탐색 쿼리 2개를 늘리면서 8 → 6으로 줄임)
export const EXPAND_PER_RUN = 6;
// 그중 채널 수 순으로 뽑는 자리 (크게 터진 주제용). 나머지는 카테고리별로 돌아가며 배정
export const EXPAND_TOP_SLOTS = 2;
export const EXPAND_LOOKBACK_DAYS = 7;
// 이미 확장 검색한 주제는 이 시간이 지나기 전엔 다시 검색하지 않음
export const EXPAND_COOLDOWN_HOURS = 12;

// 조회수 갱신 대상: 이 기간 안에 올라온 영상 중 주제에 연결된 것
export const REFRESH_LOOKBACK_DAYS = 30;

// 쇼츠 판정 기준(초). 유튜브 쇼츠는 최대 3분
export const SHORTS_MAX_SECONDS = 180;

// 한 번 실행에 새로 쓰는 주제 요약 수, 요약 재생성 주기
export const SUMMARIZE_PER_RUN = 10;
export const SUMMARY_REFRESH_HOURS = 24;
// 요약 시점(상위 모델)이나 재분류 스크립트로 확정한 카테고리의 득표. 득표를 이 값으로 초기화해서
// 이후 탐색(lite)에서 한두 번 엉뚱하게 분류돼도 뒤집히지 않게 함. 요약이 갱신될 때마다 다시 확정됨
export const CONFIRMED_CATEGORY_WEIGHT = 3;

// Gemini 무료 티어 분당 요청 제한(실측 15 RPM)을 넘지 않도록 호출 사이에 여유를 둠
export const GEMINI_CALL_DELAY_MS = 4100;
// 주제 요약은 GEMINI_SUMMARY_MODEL(lite보다 상위 모델)을 쓰는데, 무료 한도가 더 낮을 수 있어 간격을 넉넉히 둠
export const GEMINI_SUMMARY_DELAY_MS = 7000;

// Gemini 429·503 응답 시 재시도 대기 시간 (최대 이 개수만큼 재시도)
export const GEMINI_RETRY_DELAYS_MS = [15_000, 45_000];
