import type { TrendSource } from "@prisma/client";

const SOURCE_LABEL: Record<TrendSource, string> = {
  GOOGLE_TRENDS: "구글 실시간 검색어",
  YOUTUBE: "유튜브 인기 동영상",
  NAVER_DATALAB: "네이버 데이터랩",
};

interface SummarizeInput {
  title: string;
  categoryName: string;
  source: TrendSource;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

function buildPrompt({ title, categoryName, source }: SummarizeInput): string {
  return `다음은 지금 한국에서 화제가 되고 있는 트렌드 항목입니다.

- 제목: "${title}"
- 카테고리: ${categoryName}
- 출처: ${SOURCE_LABEL[source]}

이 항목이 "왜" 요즘 화제인지, 알고 있는 배경지식과 맥락을 바탕으로 일반 독자가 이해하기 쉽게 한국어로 2~3문장으로 설명해줘. 확실하지 않은 내용은 추측하지 말고, 제목에서 유추 가능한 맥락 위주로 간결하게 작성해줘.`;
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

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

export async function summarizeTrend(input: SummarizeInput): Promise<string> {
  return callGemini(buildPrompt(input));
}

function buildKeywordPrompt(title: string, description: string): string {
  const trimmedDescription = description.slice(0, 500);
  return `다음은 유튜브 영상의 제목과 설명이다.

- 제목: "${title}"
- 설명: "${trimmedDescription}"

이 영상 내용을 대표하는 명사형 키워드(음식명, 밈 표현, 인물/장소/제품 고유명사 등)를 1~5개 뽑아줘. 조사나 수식어는 빼고 핵심 단어만. 다른 설명 없이 JSON 문자열 배열로만 응답해줘. 예: ["불닭볶음면", "엔믹스"]`;
}

export async function extractKeywords(title: string, description: string): Promise<string[]> {
  const raw = await callGemini(buildKeywordPrompt(title, description));
  const cleaned = raw.replace(/^```(json)?/i, "").replace(/```$/, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  } catch {
    return [];
  }
}
