# 왜뜸 (WhyTteum)

> 요즘 이게 왜 유행인지, AI가 대신 알려드려요
> 알고리즘 필터버블 때문에 놓치는 트렌드를 수집·AI 요약해주는 개인 사이드 프로젝트

## 개요

유튜브(쇼츠 위주)에서 **같은 주제를 다룬 서로 다른 채널이 얼마나 많은지**로 유행을 측정하고, Gemini API로 "왜 유행하는지" AI 요약을 만들어 보여주는 풀스택 사이드 프로젝트입니다.

- **메인 (`/`)**: 3일 / 7일 / 30일 유행 랭킹과 지금 1위 스포트라이트
- **카테고리별 유행 (`/categories`)**: 음식/디저트, 패션/뷰티, 아이템/쇼핑, 밈/챌린지, 음악/댄스, 드라마/예능, 게임, 인물/이슈, 정치
- **주제 상세 (`/keyword/[id]`)**: AI 요약, 다룬 채널 수, 관련 영상 목록

### 수집 흐름

1. **탐색**: YouTube 검색 API로 최근 48시간 인기 쇼츠를 이슈·유행성 키워드로 모음
2. **주제 묶기**: Gemini가 영상 제목 묶음을 보고 같은 대상(인물, 상품, 음식, 밈 등)끼리 묶고 카테고리를 분류
3. **확장**: 상위 주제를 다시 검색해서 최근 7일 동안 그 주제를 다룬 채널을 모음
4. **요약**: 많이 퍼진 주제부터 관련 영상 제목을 근거로 "왜 뜨는지" 요약

자세한 설계 배경과 시행착오는 [`docs/troubleshooting-ranking.md`](docs/troubleshooting-ranking.md)에 정리했습니다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js (App Router, SSR) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS |
| ORM | Prisma |
| DB | PostgreSQL (Docker) |
| 데이터 | YouTube Data API v3 (쇼츠 검색) |
| AI | Gemini API (주제 추출: Flash-Lite, 요약: Flash) |
| 컨테이너 | Docker, Docker Compose |
| 외부 노출 | Cloudflare Tunnel (예정) |
| CI/CD | GitHub Actions self-hosted runner (예정) |

## 아키텍처

```
[사용자 브라우저]
       │ HTTPS
       ▼
[Cloudflare Tunnel]            ← 예정
       │
       ▼
[개인 PC]
  ├─ apps/web   (Next.js SSR)
  ├─ PostgreSQL (Docker)
  └─ apps/cron  (수집 + Gemini 요약)
       └─ Windows 작업 스케줄러가 1시간마다 실행
          (YouTube 검색은 API 할당량 때문에 4시간 간격으로만 수행)
```

## 디렉토리 구조

```
whytteum/
├─ apps/
│   ├─ web/                    # Next.js 앱 (화면)
│   └─ cron/                   # 수집·요약 배치 워커
├─ prisma/
│   ├─ schema.prisma           # web과 cron이 함께 쓰는 DB 스키마
│   └─ migrations/
├─ docs/                       # 기획서, 셋업 노트, 트러블슈팅
├─ docker/
│   ├─ Dockerfile.web          # Next.js standalone 멀티스테이지 빌드
│   ├─ Dockerfile.cron         # 수집 워커 (시작 시 migrate deploy 후 주기 실행)
│   └─ cron-loop.sh
├─ docker-compose.yml          # 프로덕션: db + web + cron
├─ docker-compose.dev.yml      # 로컬 개발용 PostgreSQL
└─ package.json                # npm workspaces 루트 + Prisma (web·cron 공용)
```

npm workspaces 구조라 루트에서 `npm install` 한 번이면 web·cron 의존성이 루트 `node_modules` 하나에 설치되고, 같은 Prisma Client를 함께 씁니다.

## 로컬 개발

```bash
# 1. 개발용 DB 실행 (Docker Desktop이 켜져 있어야 함)
docker compose -f docker-compose.dev.yml up -d

# 2. 환경 변수 설정
cp .env.example .env                  # 루트: cron과 Prisma가 사용
#    apps/web/.env.local 에도 DATABASE_URL 필요 (Next.js는 앱 폴더의 .env만 읽음)

# 3. 의존성 설치 + DB 스키마 반영 (전부 루트에서)
npm install
npx prisma migrate dev

# 4. 웹 앱 실행 → http://localhost:3000
npm run dev

# 5. 데이터 수집 (다른 터미널, 루트에서)
FORCE_DISCOVERY=1 npm run collect     # 4시간 간격 제한을 무시하고 바로 수집
npm run summarize                     # 요약만 다시 만들 때
```

> 스키마를 바꿀 때는 개발 서버를 먼저 끄세요. Windows에서는 실행 중인 서버가 Prisma 엔진 파일을 잡고 있어서 `prisma generate`가 실패합니다.

## 프로덕션 실행 (Docker)

```bash
# 루트 .env의 API 키를 읽어 db + web + cron을 띄움 → http://localhost:3000
docker compose up -d --build

docker compose logs -f cron           # 수집 로그
docker compose stop                   # 중지 (DB 데이터는 whytteum-db 볼륨에 유지)
```

- 개발용 DB(`docker-compose.dev.yml`)와는 프로젝트명(`whytteum-prod`)·볼륨이 분리돼 있어 동시에 띄워도 겹치지 않습니다. 개발 서버가 3000을 쓰고 있으면 `WEB_PORT=3001 docker compose up -d`.
- cron 컨테이너는 시작할 때 `prisma migrate deploy`를 적용하고 `COLLECT_INTERVAL_SECONDS`(기본 1시간)마다 수집합니다.

## 참고

- 라이브 데모가 열리지 않는 경우, 개인 PC 기반 배포 환경(전원/네트워크 상태)의 영향일 수 있습니다. 스크린샷/영상 자료를 참고해 주세요.
- 상세 개발 계획은 [`docs/whytteum-project-plan.md`](docs/whytteum-project-plan.md)를 참고하세요.
- AI 요약은 영상 제목을 근거로 생성되므로 사실과 다를 수 있습니다.
