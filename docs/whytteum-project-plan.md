# 왜뜸 (WhyTteum) 프로젝트 플랜

> 요즘 이게 왜 유행인지, AI가 대신 알려드려요
> 알고리즘 필터버블 때문에 놓치는 트렌드를 수집·AI 요약해주는 개인 사이드 프로젝트

---

## 1. 프로젝트 개요

- **목적**: 포트폴리오용 풀스택 사이드 프로젝트 (1인 개발)
- **핵심 기능**: 공개 API(Google Trends, YouTube Data API, 네이버 데이터랩)로 트렌드 데이터 수집 → Gemini API로 "왜 유행하는지" AI 요약 → 웹에서 카테고리별 피드로 제공
- **비용 원칙**: 무료 티어만 사용 (AWS 프리티어 미사용, 개인 PC를 서버로 활용)
- **배포 형태**: 개인 PC에 Docker 컨테이너로 서비스 구동 + 외부 접속 가능하도록 터널링

## 2. 기술 스택 (확정)

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js (App Router, SSR) |
| 언어 | TypeScript (풀스택 통일) |
| ORM | Prisma |
| DB | PostgreSQL (Docker 컨테이너) |
| AI | Gemini API (Flash 모델, 무료 티어) |
| 컨테이너 | Docker, Docker Compose |
| 외부 노출 | Cloudflare Tunnel (권장, 무료·무포트포워딩) |
| CI/CD | GitHub Actions |
| 스케줄링 | node-cron 또는 Docker 내 별도 워커 컨테이너 |

> **가정 사항**: 외부 접속 방식은 별도 언급이 없어 **Cloudflare Tunnel**로 가정했습니다. 공유기 포트포워딩 대비 보안이 낫고 설정이 간단하며 무료입니다. ngrok 등 다른 방식을 원하면 Phase 4에서 교체 가능합니다.

## 3. 아키텍처

```
[사용자 브라우저]
       │ HTTPS
       ▼
[Cloudflare Tunnel] ── 외부 접속 진입점, 무료 서브도메인 제공
       │
       ▼
[개인 PC]
  ├─ Docker Compose
  │    ├─ Container: nextjs-app (Next.js SSR, Node 서버)
  │    ├─ Container: postgres-db (PostgreSQL + Prisma 연결)
  │    └─ Container: cron-worker (트렌드 수집 + Gemini 요약 배치, 하루 1회)
  │
  └─ GitHub Actions (push 시 자동 빌드 → Docker 이미지 재빌드 → 재배포 트리거)
```

## 4. Next.js SSR 구현 방향

- App Router 기반, 트렌드 피드 페이지는 **Server Component**로 구현하여 DB 조회 결과를 서버에서 직접 렌더링 (클라이언트 fetch 최소화)
- 카테고리 필터는 URL 쿼리 파라미터 기반으로 서버에서 재조회 (`searchParams` 활용), SEO 및 초기 로딩 속도 확보
- 상세 페이지도 SSR로 구현: 트렌드 아이템 + AI 요약 텍스트를 서버에서 조합해 렌더링
- 클라이언트 컴포넌트는 인터랙션이 필요한 부분(필터 토글, 좋아요 등)에만 최소 사용
- `output: 'standalone'` 설정으로 Docker 이미지 경량화 (Next.js 공식 Docker 배포 방식)

## 5. Docker 구성

**디렉토리 구조 (예상)**
```
whytteum/
├─ apps/
│   └─ web/                # Next.js 앱
├─ docker/
│   ├─ Dockerfile.web       # Next.js 프로덕션 빌드용
│   └─ Dockerfile.cron      # 수집/요약 배치 워커용
├─ docker-compose.yml
├─ docker-compose.dev.yml   # 로컬 개발용 (선택)
├─ prisma/
│   └─ schema.prisma
├─ .github/
│   └─ workflows/
│       └─ deploy.yml
└─ .env.example
```

**docker-compose.yml에 포함할 서비스**
1. `web` — Next.js standalone 빌드, 3000번 포트 내부 노출
2. `db` — postgres:16-alpine, 볼륨 마운트로 데이터 영속화
3. `cron` — 트렌드 수집 + Gemini 요약 스크립트, 컨테이너 내 크론 스케줄 (예: 매일 09:00)

**Dockerfile.web 핵심 포인트**
- 멀티스테이지 빌드 (deps → builder → runner)
- `next.config.js`에 `output: 'standalone'` 설정 필수
- 프로덕션 실행은 `node server.js` (standalone 산출물)

## 6. GitHub Actions CI/CD 플랜

**트리거**: `main` 브랜치 push

**파이프라인 단계**
1. **Lint & Type Check**: `eslint`, `tsc --noEmit`
2. **Test** (선택, 있다면): 단위 테스트 실행
3. **Docker Build**: `Dockerfile.web` 빌드하여 이미지 태깅
4. **Docker 이미지 저장/전송**:
   - 옵션 A: GitHub Container Registry(GHCR)에 push (무료)
   - 옵션 B: self-hosted runner를 본인 PC에 등록하여 로컬에서 직접 빌드·재기동
5. **배포**: 본인 PC에서 `docker compose pull && docker compose up -d` 실행
   - self-hosted runner 방식이면 GitHub Actions가 직접 위 명령 실행 가능
   - GHCR 방식이면 PC에 webhook 리스너 또는 watchtower 컨테이너로 자동 pull 감지

> **권장**: 개인 PC를 **self-hosted runner**로 등록하는 방식이 가장 단순합니다. GitHub Actions가 PC에서 직접 `docker compose build && up -d`를 실행하므로 레지스트리 push/pull 단계 없이 바로 배포됩니다.

**deploy.yml 예상 흐름**
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: self-hosted   # 본인 PC에 등록한 러너
    steps:
      - uses: actions/checkout@v4
      - name: Docker Compose Build & Up
        run: docker compose -f docker-compose.yml up -d --build
```

## 7. 단계별 개발 플랜

### Phase 0. 환경 준비 (2~3일)
- [x] GitHub 저장소 생성 (이름: `whytteum`, **public** — 포트폴리오 공개 목적. 단, self-hosted runner 보안 설정(Fork PR 승인 필수)을 함께 적용) — `dlwjsrPwjd/whytteum`, public 확인됨. Fork PR 승인 설정은 아래 runner 등록 시 함께 적용
- [x] `.gitignore` 설정 (Next.js 기본값 + `.env`, `node_modules`, `.next` 포함)
- [x] 로컬 프로젝트 초기화 후 원격 저장소 연결 (`git init` → `remote add` → 초기 커밋 push)
- [ ] self-hosted runner 등록: 저장소 Settings → Actions → Runners에서 안내 스크립트를 PC에서 실행, 상시 실행되도록 서비스 등록 (진행 중 — 절차는 README 또는 아래 안내 참고)
- [x] Docker, Docker Compose 설치 확인 (Docker 29.5.3 / Compose v5.1.4)
- [ ] Cloudflare Tunnel 설정 (`cloudflared` 설치, 터널 생성) — **Quick Tunnel 방식 채택** (무료, 도메인 불필요, 재시작마다 주소 변경)
- [x] Gemini API 키 발급 (Google AI Studio) — `.env`에 설정 및 테스트 호출 확인
- [x] Next.js 프로젝트 초기화 (App Router, TypeScript, Tailwind)

### Phase 1. Docker 기반 개발 환경 구축 (3~4일)
- [ ] `docker-compose.dev.yml`로 로컬 개발용 Postgres 컨테이너 구성
- [ ] Prisma 스키마 설계 (트렌드 아이템, 카테고리, AI 요약, 수집 로그)
- [ ] Prisma migrate 및 DB 연결 확인

### Phase 2. 데이터 수집 로직 (1주)
- [ ] Google Trends / YouTube Data API 연동 스크립트 작성
- [ ] 수집 스크립트를 `cron` 컨테이너용 스크립트로 분리
- [ ] 수집 결과 DB 저장 로직 검증

### Phase 3. AI 요약 파이프라인 (3~4일)
- [ ] Gemini API 연동 함수 작성
- [ ] 배치 요약 로직 (신규 아이템만 처리, 쿼터 절약)
- [ ] 카테고리별 프롬프트 튜닝

### Phase 4. Next.js SSR 프론트엔드 (1.5~2주)
- [ ] 트렌드 피드 페이지 (Server Component, 카테고리 필터)
- [ ] 트렌드 상세 페이지 (SSR)
- [ ] 반응형 UI (모바일 우선)

### Phase 5. Docker 프로덕션 빌드 & 배포 (3~4일)
- [ ] `Dockerfile.web` 멀티스테이지 빌드 작성 (standalone 모드)
- [ ] `docker-compose.yml` 프로덕션 구성 완료
- [ ] Cloudflare Tunnel 연결하여 외부 접속 테스트

### Phase 6. GitHub Actions CI/CD 구축 (2~3일)
- [ ] self-hosted runner 정상 동작 확인
- [ ] `deploy.yml` 작성 및 push 트리거 테스트
- [ ] lint/type-check 단계 추가
- [ ] 배포 실패 시 롤백 전략 간단히 문서화 (예: 이전 이미지 태그 유지)

### Phase 7. 마무리
- [ ] README 작성 (아키텍처 다이어그램 포함)
- [ ] 트러블슈팅 로그 정리 (포트폴리오 어필 포인트)

## 8. 환경 변수 (.env.example 초안)
```
DATABASE_URL=postgresql://user:password@db:5432/whytteum
GEMINI_API_KEY=
NEXT_PUBLIC_APP_URL=
CRON_SCHEDULE="0 9 * * *"
```

## 9. 주의사항 및 리스크 (로컬 PC 배포 확정에 따른 체크리스트)

- **PC 상시 가동 필요**: 로컬 PC + Cloudflare Tunnel 방식이므로 PC가 꺼지면 서비스 전체(웹사이트, DB, 크론)가 중단됨. 포트폴리오 시연/면접 대비를 위해 절전모드·화면보호기로 인한 슬립 방지 설정 필요. README에 "라이브 데모가 안 열릴 경우 스크린샷/영상 참고" 안내 문구 추가 권장.
- **Cloudflare Tunnel 주소**: 도메인 없이 시작하면 Quick Tunnel(임시 랜덤 주소, 재시작마다 변경됨)로 진행. 고정 주소가 필요하면 저가 도메인(연 몇천 원대) 구매 후 Cloudflare에 연결.
- **self-hosted GitHub Actions runner 보안**: 포트폴리오 목적상 저장소는 **public**으로 운영. public + self-hosted runner 조합은 fork PR을 통한 임의 코드 실행 위험이 있으므로 반드시 아래 중 하나 이상 적용:
  1. 저장소 Settings → Actions → General → "Fork pull request workflows"를 "Require approval for all outside collaborators"로 설정 (낯선 PR은 수동 승인 전까지 실행 안 됨)
  2. 배포 워크플로우(self-hosted runner)는 `main` push에만 트리거되도록 하고, PR용 워크플로우(lint/test)는 GitHub 제공 러너로 분리
- **Docker Compose 볼륨 영속성**: Postgres 데이터가 `docker-compose down`이나 이미지 재빌드 시 초기화되지 않도록 named volume 필수 적용.
- **next/image 최적화**: Vercel 없이 self-hosted 환경에서는 기본 이미지 최적화가 무겁게 동작할 수 있음. 썸네일 사용 시 `next.config.js`에서 `images.unoptimized: true` 검토.
- **Gemini API 키 관리**: `.env`는 `.gitignore` 처리. self-hosted runner 환경이므로 GitHub Secrets와 로컬 `.env` 중 어느 쪽을 진실 소스로 할지 미리 정할 것 (로컬 `.env` 직접 참조 방식 권장).

## 10. 참고 — 클로드 코드 작업 시 우선순위 제안
1. Phase 0~1 (Docker 개발 환경, Prisma 스키마)부터 착수
2. SSR 페이지 구조는 초기에 뼈대만 잡고, 수집/요약 로직이 완성된 뒤 실제 데이터 연동
3. CI/CD(Phase 6)는 앱이 로컬 Docker에서 정상 동작한 이후 마지막에 붙이는 것을 권장 (배포 파이프라인 디버깅과 앱 로직 디버깅을 분리하기 위함)
