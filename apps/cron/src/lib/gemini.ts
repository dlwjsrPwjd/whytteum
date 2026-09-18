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

export async function summarizeTrend(input: SummarizeInput): Promise<string> {
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
      contents: [{ parts: [{ text: buildPrompt(input) }] }],
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
