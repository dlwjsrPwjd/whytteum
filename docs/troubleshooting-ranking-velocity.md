# 트러블슈팅: 랭킹 로직 개편 (조회수 → 증가속도 + 키워드 집계)

## 배경

기존 메인 랭킹(`/`)은 YouTube 인기차트/Google Trends RSS에서 한 번 수집한 조회수·검색량 추정치를 그대로 정렬해 보여줬다. 이 방식은 두 가지 구조적 편향이 있었다.

1. **조회수 절대값 편향** — 업로드가 오래된 유명 가수 뮤비처럼 누적 조회수가 큰 콘텐츠가 항상 상위를 차지하고, 지금 막 튀어오르는 트렌드는 가려짐.
2. **영상 단위 편향** — 영상 하나가 전체 순위를 지배. 여러 영상·소스에 걸쳐 반복 언급되는 밈·음식 유행 패턴은 구조적으로 드러날 수 없음.

이 문서는 이를 해결하는 과정에서 만난 문제점과 해결 흐름을 정리한다.

---

## 1. 조회수 → 증가속도(velocity) 랭킹

**문제점**
`TrendItem`은 수집 시점에 한 번 스냅샷(조회수)을 찍고 끝나는 구조라, "지금 얼마나 빠르게 튀어오르는지"를 계산할 방법이 없었다.

**개선 결과**
같은 YouTube 영상을 추적 가능하게 스키마를 확장했다 (`TrendItem.youtubeVideoId` unique 필드 추가 + `VideoSnapshot` 테이블 신설). 매 수집 주기마다 추적 중인 영상의 조회수를 다시 가져와 `VideoSnapshot`으로 적재하고, 가장 오래된 스냅샷과 최신 스냅샷의 차이를 경과 시간으로 나눈 `velocityScore`(시간당 조회수 증가량)를 계산해 랭킹 정렬 기준으로 삼았다.

**흐름**
1. `videos.list chart=mostPopular`로 신규 영상 발견 + 최근 48시간 내 추적 중인 영상 ID를 배치로 재조회 (`videos.list?id=...`, 최대 50개씩).
2. 신규 영상이면 `TrendItem` 생성, 기존 영상이면 `VideoSnapshot`만 추가.
3. `recordSnapshotAndRecomputeVelocity()`가 최초/최신 스냅샷 간 경과 시간이 6분(`MIN_ELAPSED_HOURS`) 이상일 때만 `velocityScore`를 계산 — 너무 짧은 간격은 노이즈가 커서 제외.
4. **검증 중 발견한 함정**: 수동 테스트에서 두 번 연속 실행(약 3.75분 간격)했을 때 `velocityScore`가 계속 `null`로 나와서 처음엔 버그로 의심했다. 실제로는 `MIN_ELAPSED_HOURS` 가드가 의도대로 노이즈 구간을 걸러낸 것이었다 — 스냅샷 타임스탬프를 직접 조회해 경과 시간이 6분 미만임을 확인하고 정상 동작임을 확인함. 실제 1시간 주기 스케줄에서는 문제없이 계산됨.

---

## 2. Gemini 무료 티어 Rate Limit (429) — 실제로 터진 버그

**문제점**
영상 제목·설명에서 키워드를 추출하는 `extractKeywords()` 호출을 25개 신규 영상에 대해 루프 안에서 연달아 호출했는데, 기존 `summarize.ts`에 있던 "호출 사이 4.1초 대기" 패턴을 빠뜨렸다. 그 결과 1차 실행에서 다수 영상이 `429 RESOURCE_EXHAUSTED`로 실패:

```
Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests,
limit: 15, model: gemini-3.5-flash-lite
```

사전에 웹 검색으로 추정했던 "분당 30회"보다 실제 한도가 더 낮았다(실측 15 RPM) — 공개 문서/블로그 추정치와 실제 한도가 다를 수 있다는 교훈.

**개선 결과**
- `youtube.ts`에 `GEMINI_CALL_DELAY_MS = 4100`과 호출 카운터를 추가해 Gemini 호출 사이에 4.1초 간격을 강제.
- 더 중요한 문제: 키워드 추출에 실패한 영상은 `youtubeVideoId`가 이미 DB에 존재해서 다음 실행부터 "기존 영상"으로 분류되어 **영원히 재시도되지 않는** 구조였다. 이를 막기 위해 기존 영상도 `videoKeywords` 연결 개수가 0이면 키워드 추출을 다시 시도하도록 로직을 추가(`needsKeywords = !existing || existing._count.videoKeywords === 0`).

**흐름**
1. 1차 실행 → 다수 429 에러, 그래도 수집 자체는 에러 삼키기(try/catch)로 안 죽고 계속 진행됨 → 25건 모두 생성은 됐지만 키워드가 빠진 영상 다수.
2. 딜레이 추가 + 백필 로직 추가 후 재실행 → 로그에 429 없이 전부 처리, DB 확인 결과 영상당 키워드 2~5개씩 정상 연결(`total keywords: 92`).

---

## 3. 비대화형 환경에서 `prisma migrate dev` 실행 불가

**문제점**
스키마에 필드 5개 + 테이블 3개를 추가하고 `npx prisma migrate dev`를 실행하니, unique 제약(`youtubeVideoId`) 경고에 대한 대화형 확인(y/n)을 요구했다. 에이전트 환경은 TTY가 없는 비대화형 셸이라 `stdin`으로 "y"를 흘려줘도 Prisma가 아예 "non-interactive environment"로 감지해 즉시 에러를 냄.

**개선 결과**
`prisma migrate dev` 대신 아래 조합으로 비대화형에서도 안전하게 마이그레이션 파일을 만들고 적용했다:
```bash
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script > migration.sql
npx prisma migrate deploy
```
`migrate diff`는 순수하게 SQL 스크립트만 생성하므로 대화형 확인이 필요 없고, `migrate deploy`는 CI/배포용으로 설계되어 처음부터 비대화형을 전제로 한다.

**흐름**
1. `prisma/migrations/<timestamp>_add_velocity_tracking/` 폴더를 먼저 만들고
2. 그 안에 `migrate diff` 결과를 `migration.sql`로 저장
3. `prisma migrate deploy`로 적용 (정상적으로 "1 migration applied" 확인)

---

## 4. Windows 작업 스케줄러 등록 시 중첩 인용 문제

**문제점**
`schtasks /create /tr "..."`에 `cmd.exe /c "cd /d \"...\" && npm run collect"` 형태로 중첩 인용 문자열을 직접 넘기면, 경로에 한글/공백이 섞여 있어 인용 처리가 깨지기 쉬움.

**개선 결과**
중첩 인용을 피하기 위해 `apps/cron/run-collect.cmd` 래퍼 배치 파일을 만들어 `%~dp0`(배치 파일 자신의 경로)로 디렉터리를 이동한 뒤 `npm run collect`를 실행하도록 하고, 스케줄러에는 이 파일 경로 하나만 등록했다.
```bat
@echo off
cd /d "%~dp0"
npm run collect >> collect.log 2>&1
```
```powershell
schtasks /create /tn "WhyTteum-Collect" /tr "<경로>\run-collect.cmd" /sc hourly /mo 1 /f
```

**흐름**
1. 등록 후 `schtasks /query /tn "WhyTteum-Collect" /fo LIST /v`로 "Schedule Type: Hourly, Repeat Every: 1 Hour" 확인.
2. `schtasks /run /tn "WhyTteum-Collect"`로 즉시 1회 실행 → `collect.log`에 정상 수집 로그 확인.

---

## 참고: 카테고리 디레이팅 설계

Music 카테고리(YouTube categoryId `10` → 내부 slug `music`) 제외와 구독자 100만 이상 "공식 채널" 디레이팅은 **수집 시점이 아니라 랭킹 조회 시점**(`apps/web/src/lib/trends.ts`)에 적용했다. 수집 단계에서는 모든 데이터를 그대로 저장해두고, 랭킹 쿼리에서만 `category.slug !== "music"` 필터와 `isOfficialChannel ? 0.3 : 1` 가중치를 곱해 점수를 조정한다. 이렇게 하면 기준값(가중치, 제외 카테고리)을 나중에 바꿔도 재수집 없이 바로 반영되고, `/all` 전체 피드에서는 음악 카테고리 영상도 그대로 볼 수 있다.
