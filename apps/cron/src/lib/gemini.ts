interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

async function callGemini(prompt: string, model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash"): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

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


// 마크다운 코드블록(```json ... ```)으로 감싸서 응답하는 경우가 있어 벗겨냄
function parseJsonResponse(raw: string): unknown {
  const cleaned = raw.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned);
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
  // 웹 메인의 기본(전체) 랭킹에서는 빠지고, 정치 카테고리를 골랐을 때만 보임
  "정치",
] as const;

// 사회 뉴스·스포츠 경기처럼 유행이 아닌 주제. 주제로 저장하지 않고 버림
export const EXCLUDED_CATEGORY = "제외";

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
- category는 다음 중 하나: ${TOPIC_CATEGORIES.join(", ")}, ${EXCLUDED_CATEGORY}
  - 사람들이 따라 하고, 먹고, 사고, 보고, 듣는 "유행"이면 해당 카테고리로 분류한다.
  - 인물/이슈: 유튜버·연예인·인플루언서의 논란이나 화제. 정치인은 여기에 넣지 않는다.
  - 정치: 정치인, 정당, 선거, 정치 이슈.
  - ${EXCLUDED_CATEGORY}: 사회 뉴스(사건·사고), 스포츠 경기 결과, 해외 뉴스처럼 유행도 정치도 아닌 것.

기존 주제 목록: ${existing}

다른 설명 없이 아래 형식의 JSON 배열로만 응답해줘. videos에는 해당 영상의 번호를 넣는다.
[{"topic": "두바이 쫀득쿠키", "category": "음식/디저트", "videos": [0, 5, 12]}]`;
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
    // "제외"나 목록에 없는 카테고리는 유행 주제가 아니므로 버림
    if (!TOPIC_CATEGORIES.includes(entry.category)) continue;

    topics.push({ topic: entry.topic.trim(), category: entry.category, videoIndexes });
  }
  return topics;
}

export async function summarizeTopic({
  topic,
  category,
  videoTitles,
  newsTitles,
}: {
  topic: string;
  category: string | null;
  videoTitles: string[];
  newsTitles: string[];
}): Promise<string> {
  const videos = videoTitles.map((t) => `- ${t}`).join("\n");
  const news =
    newsTitles.length > 0 ? `\n\n[뉴스 기사 제목]\n${newsTitles.map((t) => `- ${t}`).join("\n")}` : "";

  const summary = await callGemini(
    `"${topic}"(${category ?? "기타"})이(가) 요즘 한국에서 화제다. 아래는 이 주제를 다룬 최근 영상과 기사 제목이다.

[유튜브 영상 제목]
${videos}${news}

이 자료를 근거로, 이 주제가 "왜" 요즘 화제인지 일반 독자가 이해하기 쉽게 한국어로 2~3문장으로 설명해줘.
- 제목들에서 공통으로 확인되는 내용 위주로 쓴다.
- 확인되지 않은 의혹이나 폭로는 사실처럼 단정하지 말고 "~라는 의혹", "~라는 주장"처럼 쓴다.
- 누가 누구에게 무엇을 했는지(가해자/피해자, 폭로한 사람/폭로 대상)를 뒤바꾸지 않는다. 제목의 따옴표 안 발언은 보통 폭로하거나 주장한 사람의 말이다. 예: '"폭행당했다" A의 전 연인 폭로' → 전 연인이 A에게 폭행당했다고 주장한 것.
- 제목만으로 알 수 없는 내용은 추측하지 않는다.
- 설명 본문만 출력한다. "제공된 자료에 따르면"처럼 자료 자체를 언급하는 말이나 마크다운 서식은 쓰지 않는다.`,
    // lite 모델은 폭로 기사 제목에서 가해/피해 주체를 자주 뒤바꿔서, 요약은 상위 모델을 따로 지정
    process.env.GEMINI_SUMMARY_MODEL || process.env.GEMINI_MODEL,
  );

  // 지시해도 가끔 **굵게** 서식을 섞어서 응답하므로 한 번 더 제거
  return summary.replace(/\*\*/g, "").trim();
}
