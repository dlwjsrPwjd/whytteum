# 왜뜸 (WhyTteum)

> 요즘 이게 왜 유행인지, AI가 대신 알려드려요
> 알고리즘 필터버블 때문에 놓치는 트렌드를 수집·AI 요약해주는 개인 사이드 프로젝트

## 개요

공개 API(Google Trends, YouTube Data API, 네이버 데이터랩)로 트렌드 데이터를 수집하고, Gemini API로 "왜 유행하는지" AI 요약을 생성해 카테고리별 피드로 제공하는 풀스택 사이드 프로젝트입니다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js (App Router, SSR) |
| 언어 | TypeScript |
| ORM | Prisma |
| DB | PostgreSQL (Docker) |
| AI | Gemini API (Flash 모델) |
| 컨테이너 | Docker, Docker Compose |
| 외부 노출 | Cloudflare Tunnel |
| CI/CD | GitHub Actions (self-hosted runner) |

## 아키텍처

```
[사용자 브라우저]
       │ HTTPS
       ▼
[Cloudflare Tunnel]
       │
       ▼
[개인 PC]
  ├─ Docker Compose
  │    ├─ nextjs-app   (Next.js SSR)
  │    ├─ postgres-db  (PostgreSQL + Prisma)
  │    └─ cron-worker  (트렌드 수집 + Gemini 요약, 1일 1회)
  │
  └─ GitHub Actions (self-hosted runner, push 시 자동 재배포)
```

## 디렉토리 구조

```
whytteum/
├─ apps/
│   ├─ web/       # Next.js 앱
│   └─ cron/      # 트렌드 수집·요약 배치 워커
├─ docker/        # Dockerfile.web, Dockerfile.cron
├─ docker-compose.yml
├─ docker-compose.dev.yml   # 로컬 개발용 (Postgres)
├─ prisma/
│   └─ schema.prisma
└─ .github/workflows/       # CI/CD
```

## 로컬 개발

```bash
# 1. 개발용 DB 실행
docker compose -f docker-compose.dev.yml up -d

# 2. 환경 변수 설정
cp .env.example .env

# 3. 웹 앱 실행
cd apps/web
npm install
npm run dev
```

## 참고

- 라이브 데모가 열리지 않는 경우, 개인 PC 기반 배포 환경(전원/네트워크 상태)의 영향일 수 있습니다. 스크린샷/영상 자료를 참고해 주세요.
- 상세 개발 계획은 `whytteum-project-plan (1).md` 문서를 참고하세요.
