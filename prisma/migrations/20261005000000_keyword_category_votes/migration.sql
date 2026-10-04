-- 탐색 회차마다 Gemini 분류를 덮어쓰지 않고 횟수를 쌓아 최다 득표를 카테고리로 쓰기 위한 칸
ALTER TABLE "Keyword" ADD COLUMN "categoryVotes" JSONB NOT NULL DEFAULT '{}';
