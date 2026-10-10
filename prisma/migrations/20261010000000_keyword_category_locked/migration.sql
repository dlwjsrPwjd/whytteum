-- 사람이 직접 고친 카테고리를 탐색 득표·요약 확정·재분류가 덮어쓰지 않게 하는 표시
ALTER TABLE "Keyword" ADD COLUMN "categoryLocked" BOOLEAN NOT NULL DEFAULT false;
