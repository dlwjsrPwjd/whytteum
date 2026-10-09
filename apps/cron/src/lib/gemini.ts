import { GEMINI_RETRY_DELAYS_MS } from "./config.js";

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

async function callGemini(prompt: string, model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash"): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // 429(분당 한도)·503(서버 혼잡)은 잠시 뒤 다시 하면 대부분 성공해서 기다렸다가 재시도
  let res: Response;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
    if (res.ok || ![429, 503].includes(res.status) || attempt >= GEMINI_RETRY_DELAYS_MS.length) break;
    console.warn(`[GEMINI] ${res.status} → ${GEMINI_RETRY_DELAYS_MS[attempt] / 1000}초 뒤 재시도`);
    await new Promise((resolve) => setTimeout(resolve, GEMINI_RETRY_DELAYS_MS[attempt]));
  }

  if (!res.ok) {
    throw new Error(`Gemini API 요청 실패 (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini 응답에 텍스트가 없습니다.");
  }

  return text.trim();
}


// 마크다운 코드블록(```json ... ```)으로 감싸거나 앞뒤에 설명을 붙여 응답하는 경우가 있어
// 처음 나오는 [ 또는 {부터 마지막 ] 또는 }까지만 잘라서 파싱
function parseJsonResponse(raw: string): unknown {
  const start = raw.search(/[[{]/);
  const end = Math.max(raw.lastIndexOf("]"), raw.lastIndexOf("}"));
  return JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw);
}

// 서비스가 다루는 "유행" 카테고리. apps/web/src/lib/ranking-config.ts의 TREND_CATEGORIES와 맞춰서 유지
export const TOPIC_CATEGORIES = [
  "음식/디저트",
  "패션/뷰티",
  "아이템/쇼핑",
  "밈/챌린지",
  "음악/댄스",
  "드라마/예능",
  "게임",
  "인물/이슈",
] as const;

// 정치·사회 뉴스·스포츠 경기처럼 유행이 아닌 주제. 주제로 저장하지 않고 버림
export const EXCLUDED_CATEGORY = "제외";

// 화제 대상의 "종류" → 카테고리. Gemini에는 카테고리를 직접 고르게 하지 않고 종류만 고르게 한 뒤 코드에서 매핑
// (카테고리를 직접 고르게 하면 영상 맥락에 끌려가서 배우가 음식/디저트, 열애설 난 배우가 음악/댄스로 들어감.
//  "이 대상이 사람인지, 사람이면 직업이 뭔지"는 훨씬 안정적으로 답해서, 사람이 음식 카테고리에 들어갈 수 없게 됨)
const TOPIC_TYPES: Record<string, string> = {
  가수: "음악/댄스", // 아이돌 그룹과 멤버, 솔로 가수, 밴드, 래퍼
  댄서: "음악/댄스",
  "노래/안무": "음악/댄스",
  배우: "인물/이슈",
  방송인: "인물/이슈", // 개그맨, MC, 예능인
  유튜버: "인물/이슈", // 인플루언서, 스트리머 포함
  운동선수: "인물/이슈",
  "그 밖의 인물": "인물/이슈",
  프로게이머: "게임",
  정치인: EXCLUDED_CATEGORY,
  "음식/음료": "음식/디저트", // 메뉴, 디저트, 과자, 음료
  "식품·외식 브랜드": "음식/디저트", // 프랜차이즈, 식당, 카페
  "옷/화장품": "패션/뷰티",
  "패션·뷰티 브랜드": "패션/뷰티",
  물건: "아이템/쇼핑", // 장난감, 완구, 캐릭터 굿즈, 생활용품
  "쇼핑 매장": "아이템/쇼핑", // 다이소, 올리브영 같은 매장·플랫폼
  // 음식·패션·쇼핑과 관계없는 회사. 이 칸이 없으면 "브랜드"라는 이유로 식품·외식 브랜드에 들어감 (키움증권 → 음식/디저트)
  "그 밖의 기업": EXCLUDED_CATEGORY, // 증권사, 은행, 통신사, 자동차, IT·전자 회사
  "밈/챌린지": "밈/챌린지", // 밈, 유행어, 챌린지 이름
  작품: "드라마/예능", // 드라마, 예능 프로그램, 영화, 웹툰
  게임: "게임",
  "정치 이슈": EXCLUDED_CATEGORY, // 정당, 선거, 북한
  "사건·사고": EXCLUDED_CATEGORY,
  스포츠경기: EXCLUDED_CATEGORY,
  스포츠팀: EXCLUDED_CATEGORY, // 키움 히어로즈 같은 구단
  해외뉴스: EXCLUDED_CATEGORY,
  기타: EXCLUDED_CATEGORY,
};

// Gemini가 낸 종류를 카테고리로. 목록에 없는 종류면 undefined
function categoryOfType(type: unknown): string | undefined {
  return typeof type === "string" ? TOPIC_TYPES[type.trim()] : undefined;
}

// 주제 추출과 재분류가 같은 기준을 쓰도록 공통 규칙으로 둠
const TYPE_RULES = `- type은 "화제 대상 자체가 무엇인지"이고 다음 중 하나다: ${Object.keys(TOPIC_TYPES).join(", ")}
- 영상 내용이 아니라 대상 자체로 정한다. 배우가 디저트를 먹는 영상이어도 대상이 배우면 "배우", 가수의 열애설 영상이어도 대상이 가수면 "가수"다.
- 사람이면 반드시 사람 종류(가수, 댄서, 배우, 방송인, 유튜버, 운동선수, 프로게이머, 정치인, 그 밖의 인물) 중 하나다. 사람을 음식/음료나 물건으로 고르지 않는다.
  - 가수와 배우를 겸하면 주로 알려진 쪽으로 고른다. 아이돌 그룹의 멤버는 가수다.
- "노래/안무"는 곡 이름이나 안무 이름, "작품"은 드라마·예능·영화·웹툰 제목이다.
- 회사나 브랜드는 무엇을 파는지로 고른다. 음식·음료를 파는 회사만 "식품·외식 브랜드"이고, 증권사·은행·통신사·자동차·전자 회사처럼 음식·옷·화장품·물건을 파는 곳이 아니면 "그 밖의 기업"이다.`;

export interface ExtractedTopic {
  topic: string;
  category: string;
  videoIndexes: number[];
}

function buildTopicPrompt(titles: string[], existingTopics: string[]): string {
  const numbered = titles.map((title, i) => `${i}. ${title}`).join("\n");
  const existing = existingTopics.length > 0 ? existingTopics.join(", ") : "(없음)";

  return `다음은 최근 48시간 안에 한국 유튜브(주로 쇼츠)에 올라온 인기 영상 제목들이다.

${numbered}

이 영상들이 다루는 "구체적인 화제 대상"을 뽑아서 같은 대상을 다루는 영상끼리 묶어줘.

규칙:
- 화제 대상은 인물, 유튜버, 작품, 상품, 음식, 장소, 밈/챌린지 이름, 사건 이름 같은 구체적인 고유명사여야 한다.
- "논란", "근황", "폭로" 같은 수식어는 붙이지 말고 대상 이름만 쓴다. 예: "인물명 논란" → "인물명"
- "아이돌", "먹방", "학교", "요즘 아이들"처럼 일반적인 단어나 장르는 화제 대상이 아니다. 제외한다.
- 한국 시청자와 관계없는 해외 영상(영어 밈, 해외 로블록스 등)은 제외한다.
- 같은 대상을 다르게 쓴 경우 하나로 합친다. 아래 "기존 주제 목록"에 같은 대상이 있으면 그 표기를 그대로 쓴다.
${TYPE_RULES}

기존 주제 목록: ${existing}

다른 설명 없이 아래 형식의 JSON 배열로만 응답해줘. videos에는 해당 영상의 번호를 넣는다.
[{"topic": "두바이 쫀득쿠키", "type": "음식/음료", "videos": [0, 5, 12]}]`;
}

export async function extractTopics(titles: string[], existingTopics: string[]): Promise<ExtractedTopic[]> {
  const raw = await callGemini(buildTopicPrompt(titles, existingTopics));

  let parsed: unknown;
  try {
    parsed = parseJsonResponse(raw);
  } catch {
    console.error("[GEMINI] 주제 추출 응답 JSON 파싱 실패:", raw.slice(0, 300));
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const topics: ExtractedTopic[] = [];
  for (const entry of parsed) {
    if (typeof entry?.topic !== "string" || !entry.topic.trim()) continue;
    const videoIndexes = Array.isArray(entry.videos)
      ? entry.videos.filter((v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < titles.length)
      : [];
    if (videoIndexes.length === 0) continue;
    // "제외"로 매핑되거나 목록에 없는 종류는 유행 주제가 아니므로 버림
    const category = categoryOfType(entry.type);
    if (!category || category === EXCLUDED_CATEGORY) continue;

    topics.push({ topic: entry.topic.trim(), category, videoIndexes });
  }
  return topics;
}

// 이미 있는 주제들을 공통 기준으로 다시 분류 (기존 데이터 정리용, npm run reclassify)
export async function classifyTopics(
  topics: { topic: string; videoTitles: string[] }[],
): Promise<Map<number, string>> {
  const list = topics
    .map((t, i) => `${i}. ${t.topic}\n${t.videoTitles.map((title) => `   - ${title}`).join("\n")}`)
    .join("\n");

  const raw = await callGemini(`다음은 한국 유튜브에서 화제가 된 주제들과, 각 주제를 다룬 영상 제목 일부다.
각 주제가 무엇인지(type) 분류해줘.

${list}

규칙:
${TYPE_RULES}

다른 설명 없이 아래 형식의 JSON 배열로만 응답해줘. index는 주제 번호다.
[{"index": 0, "type": "가수"}]`,
    // 한 번만 돌리는 정리 작업이라 정확도가 나은 요약 모델 사용
    process.env.GEMINI_SUMMARY_MODEL || process.env.GEMINI_MODEL,
  );

  const result = new Map<number, string>();
  let parsed: unknown;
  try {
    parsed = parseJsonResponse(raw);
  } catch {
    console.error("[GEMINI] 재분류 응답 JSON 파싱 실패:", raw.slice(0, 300));
    return result;
  }
  if (!Array.isArray(parsed)) return result;
  for (const entry of parsed) {
    const category = categoryOfType(entry?.type);
    if (Number.isInteger(entry?.index) && category) result.set(entry.index, category);
  }
  return result;
}

// 요약과 함께 카테고리도 확정. 주제 하나의 영상 제목을 상위 모델이 읽고 "왜 뜨는지"를 쓴 다음에 종류를 고르게 해서,
// 제목 100여 개를 한꺼번에 보는 탐색 단계(lite)의 분류보다 정확함. 종류를 못 받으면 category는 undefined
// (예전엔 기존 카테고리를 프롬프트에 넣었는데, 틀린 카테고리가 판단을 끌고 갈 수 있어서 뺌)
export async function summarizeTopic({
  topic,
  videoTitles,
}: {
  topic: string;
  videoTitles: string[];
}): Promise<{ summary: string; category: string | undefined }> {
  const videos = videoTitles.map((t) => `- ${t}`).join("\n");

  const raw = await callGemini(
    `"${topic}"이(가) 요즘 한국에서 화제다. 아래는 이 주제를 다룬 최근 유튜브 영상 제목이다.

[유튜브 영상 제목]
${videos}

이 자료를 근거로, 이 주제가 "왜" 요즘 화제인지 일반 독자가 이해하기 쉽게 한국어로 2~3문장으로 설명해줘.
- 제목들에서 공통으로 확인되는 내용 위주로 쓴다.
- 확인되지 않은 의혹이나 폭로는 사실처럼 단정하지 말고 "~라는 의혹", "~라는 주장"처럼 쓴다.
- 누가 누구에게 무엇을 했는지(가해자/피해자, 폭로한 사람/폭로 대상)를 뒤바꾸지 않는다. 제목의 따옴표 안 발언은 보통 폭로하거나 주장한 사람의 말이다. 예: '"폭행당했다" A의 전 연인 폭로' → 전 연인이 A에게 폭행당했다고 주장한 것.
- 제목만으로 알 수 없는 내용은 추측하지 않는다.
- "제공된 자료에 따르면"처럼 자료 자체를 언급하는 말이나 마크다운 서식은 쓰지 않는다.

설명을 쓴 다음, 그 내용을 바탕으로 "${topic}" 자체가 무엇인지(type)도 골라줘.
${TYPE_RULES}

다른 설명 없이 아래 형식의 JSON으로만 응답해줘. summary를 먼저 쓰고 type을 쓴다.
{"summary": "설명 본문", "type": "배우"}`,
    // lite 모델은 폭로 기사 제목에서 가해/피해 주체를 자주 뒤바꿔서, 요약은 상위 모델을 따로 지정
    process.env.GEMINI_SUMMARY_MODEL || process.env.GEMINI_MODEL,
  );

  const parsed = parseJsonResponse(raw) as { summary?: unknown; type?: unknown };
  if (typeof parsed?.summary !== "string" || !parsed.summary.trim()) {
    throw new Error(`요약 응답에 summary가 없음: ${raw.slice(0, 200)}`);
  }
  return {
    // 지시해도 가끔 **굵게** 서식을 섞어서 응답하므로 한 번 더 제거
    summary: parsed.summary.replace(/\*\*/g, "").trim(),
    category: categoryOfType(parsed.type),
  };
}
