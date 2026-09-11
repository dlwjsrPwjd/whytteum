# 왜뜸(WhyTteum) 프로젝트 전체 셋업 학습 노트

지금까지(2026-09-05 ~ 09-11) 실제로 진행한 순서대로 정리. **각 단계마다 "왜 이렇게 했는지" + "핵심 명령어"**에 집중했다.
계획 원본은 `whytteum-project-plan.md`, 진행 상태 요약은 프로젝트 메모리(`whytteum-progress.md`)를 참고. 러너 등록만 더 깊게 보고 싶으면 `github-actions-runner-guide.md`.

전체 흐름은 아래 순서(Phase 0 → 진행 중인 Phase 1)를 따른다:

```
[1] Git 저장소 초기화        → 프로젝트의 "진실 소스"를 GitHub에 둠
[2] Next.js 스캐폴드         → 웹 프레임워크 뼈대
[3] 환경 변수 설계 (.env)     → 비밀값과 설정을 코드에서 분리
[4] Docker 개발 환경         → 로컬 PC에 DB를 "설치"하지 않고 컨테이너로
[5] Prisma 스키마 설계       → DB 테이블 구조를 코드로 정의
[6] Gemini API 키 발급       → AI 요약 기능의 엔진
[7] self-hosted 러너 등록    → GitHub Actions가 내 PC에서 돌게
[8] Cloudflare Tunnel        → 외부에서 내 PC 앱에 접속 가능하게 (예정)
```

---

## 1. Git 저장소 초기화 — 왜 이 순서로 했나

**왜**: 포트폴리오용 프로젝트라 처음부터 커밋 히스토리가 남아야 하고, `.env` 같은 비밀 파일이 실수로 올라가면 안 됨. 그래서 "빈 저장소 + `.gitignore` 먼저" 순서로 진행.

```powershell
git init
git remote add origin https://github.com/dlwjsrPwjd/whytteum.git
git add <파일들>
git commit -m "..."
git push -u origin main
```

- `.gitignore`에 `node_modules/`, `.next/`, `.env`(로컬 실제 값), `prisma/dev.db` 등을 미리 등록 → 커밋 대상에서 원천 차단.
- 레포는 **public**으로 생성 (포트폴리오는 남에게 보여야 의미가 있으니까). 대신 public + 나중에 붙일 self-hosted runner 조합은 보안 리스크가 있어서 7번에서 별도 조치.

## 2. Next.js 스캐폴드 — 왜 이 옵션들인가

`apps/web/`에 `create-next-app`으로 생성 (App Router / TypeScript / Tailwind).

- **App Router**를 쓴 이유: 프로젝트 목표가 "트렌드 피드를 SSR로 보여주기"라서, 서버 컴포넌트로 DB 조회 결과를 직접 렌더링하기 좋은 최신 방식을 선택 (Pages Router 대비 데이터 페칭이 서버 쪽에 자연스럽게 붙음).
- **TypeScript**: Prisma가 스키마에서 타입을 자동 생성해주므로, 프론트까지 TS로 통일하면 DB 컬럼 하나 바꿔도 컴파일 타임에 프론트 코드까지 에러를 잡아줌.
- **Tailwind**: 개인 프로젝트 UI를 빠르게 만들기 위한 유틸리티 CSS.
- `apps/web`처럼 **모노레포 폴더 구조**로 뺀 이유: 나중에 `apps/cron`(수집 배치 워커)이 별도 Node 프로세스로 들어올 예정이라, 웹 서버와 배치 워커의 의존성을 처음부터 분리해두기 위함.

```powershell
cd apps/web
npm install
npm run dev   # http://localhost:3000
```

## 3. 환경 변수 설계 — `.env` vs `.env.example`

**왜 두 파일로 나누는가**: `.env`는 실제 비밀값(API 키, DB 비밀번호)이 들어가서 `.gitignore`로 커밋 차단. `.env.example`은 "어떤 변수가 필요한지"만 보여주는 템플릿이라 커밋해서 다른 사람(미래의 나 포함)이 뭘 채워야 하는지 알 수 있게 함.

```
DATABASE_URL=postgresql://user:password@db:5432/whytteum
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
YOUTUBE_API_KEY=
NEXT_PUBLIC_APP_URL=
CRON_SCHEDULE="0 9 * * *"
```

- `DATABASE_URL`의 호스트가 `db`인 이유: Docker Compose 네트워크 안에서는 서비스 이름(`db`)이 곧 DNS 호스트명이 됨. 로컬에서 컨테이너 안 거치고 직접 붙을 땐 `localhost`로 바꿔야 함.
- `GEMINI_MODEL`을 코드에 하드코딩 안 하고 env로 뺀 이유: 나중에 Flash-lite → 다른 모델로 바꿀 때 코드 수정 없이 배포 환경변수만 바꾸면 되게.
- `NEXT_PUBLIC_APP_URL`처럼 `NEXT_PUBLIC_` 접두사가 붙은 건 Next.js 규칙 — 브라우저(클라이언트)에서도 읽어야 하는 값만 이 접두사를 붙임. 접두사 없는 변수는 서버에서만 보임(비밀 유지).

## 4. Docker 개발 환경 (`docker-compose.dev.yml`) — 왜 DB만 먼저 컨테이너로

**왜**: 앱 코드(Next.js)는 로컬에서 `npm run dev`로 빠르게 반복 개발하고 싶지만, PostgreSQL은 로컬 OS에 직접 설치하면 버전 관리/삭제가 귀찮음. 그래서 "개발 중엔 DB만 Docker, 앱은 로컬 프로세스" 구조로 시작 → 나중에 Phase 5에서 앱까지 전부 컨테이너화(`docker-compose.yml`, 프로덕션용)로 확장 예정.

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: whytteum
    ports:
      - "5432:5432"
    volumes:
      - whytteum-db-dev:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d whytteum"]
```

- `volumes: whytteum-db-dev:...` (named volume) : 컨테이너를 지웠다 다시 띄워도 데이터가 남게 하는 핵심. 이게 없으면 `docker compose down` 할 때마다 DB가 초기화됨.
- `healthcheck` : 다른 서비스(나중에 `web`, `cron`)가 "DB가 완전히 뜬 다음에" 시작하도록 `depends_on: condition: service_healthy`로 연결할 수 있게 미리 넣어둠.
- `alpine` 이미지를 쓴 이유: 이미지 용량을 줄여서 빌드/다운로드 속도를 아낌 (개인 PC 자원 절약).

```powershell
docker compose -f docker-compose.dev.yml up -d   # 백그라운드 실행
docker compose -f docker-compose.dev.yml ps       # 상태 확인
docker compose -f docker-compose.dev.yml down     # 컨테이너만 정지 (볼륨은 남음)
```

## 5. Prisma 스키마 설계 — 모델 4개를 왜 이렇게 나눴나

`prisma/schema.prisma`에 정의한 모델과 각각의 역할:

| 모델 | 역할 | 설계 포인트 |
|---|---|---|
| `Category` | 트렌드 분류(예: IT, 연예) | `slug`를 `@unique`로 둬서 URL 라우팅(`/category/[slug]`)에 바로 사용 |
| `TrendItem` | 수집된 트렌드 원본 1건 | `source`(enum)로 어디서 수집됐는지 구분, `rawData Json?`으로 API 원본 응답을 그대로 백업(나중에 재처리 대비) |
| `AiSummary` | Gemini가 생성한 요약 | `TrendItem`과 1:1 관계(`@unique` FK) — 트렌드 하나당 요약은 하나. `model`/`promptVersion` 필드를 남긴 이유는 나중에 프롬프트를 바꿨을 때 "이 요약이 어떤 버전으로 만들어졌는지" 추적하려고 |
| `CollectionLog` | 수집 배치 실행 기록 | 성공/실패, 수집 개수, 에러 메시지를 남겨서 크론이 매일 잘 돌고 있는지 나중에 대시보드/디버깅에 씀 |

- `@@index([source, collectedAt])` 같은 인덱스를 미리 넣은 이유: 피드 페이지에서 "최근 수집된 트렌드를 소스별로" 조회하는 쿼리가 많을 걸 예상해서.
- `onDelete: Cascade`(AiSummary → TrendItem): 원본 트렌드 아이템이 지워지면 그에 딸린 요약도 자동으로 같이 지워지게 해서 고아 레코드를 안 남김.

```powershell
# 스키마 변경 후 마이그레이션 파일 생성 + DB 반영 (아직 미실행 — 다음 할 일)
npx prisma migrate dev --name init

# 현재 스키마 기준으로 Prisma Client 코드 생성만 다시
npx prisma generate

# DB 내용을 GUI로 확인
npx prisma studio
```

> 상태: 스키마 정의만 끝났고 `prisma migrate dev`는 아직 한 번도 안 돌림 (`prisma/migrations` 폴더 없음). 4번의 Docker DB가 떠 있는 상태에서 실행해야 함.

## 6. Gemini API 키 발급 — 왜 Flash-lite

Google AI Studio에서 발급. `GEMINI_MODEL=gemini-3.5-flash-lite`로 고정한 이유: 무료 티어 쿼터 안에서 "트렌드 제목 → 왜 유행하는지 짧은 요약" 같은 가벼운 태스크에는 최상위 모델이 필요 없고, 요청 단가/속도가 가장 싼 라인을 써야 개인 프로젝트 비용 원칙(무료 티어만 사용)에 맞음.

## 7. self-hosted GitHub Actions 러너 등록 — 요약

**왜**: 최종 배포가 "내 PC에서 `docker compose up`을 실행"하는 방식이라, GitHub-hosted runner(클라우드)로는 내 PC에 명령을 내릴 수 없음. 그래서 내 PC 자체를 러너로 등록해서, `main` 브랜치에 push하면 그 러너(=내 PC)가 직접 배포 명령을 실행하게 만드는 구조.

세부 절차(등록 토큰 발급 → `config.cmd` 옵션 → Windows 서비스 등록 → 보안 설정)는 전용 문서로 분리해뒀다: **`docs/github-actions-runner-guide.md`**

현재 상태: GitHub에는 등록 완료(`status: offline`), Windows 서비스로 상시 실행하는 마지막 단계(관리자 권한 필요)는 사용자가 직접 실행해야 함.

## 8. Cloudflare Tunnel — 왜 Quick Tunnel부터

**왜**: 공유기 포트포워딩은 보안(내 IP·포트 노출)도 약하고 설정도 번거로움. Cloudflare Tunnel은 내 PC에서 바깥으로 나가는 연결만 만들면 되니 방화벽/포트포워딩이 필요 없고 무료.

**왜 Quick Tunnel(도메인 없는 버전)부터**: 도메인을 사려면 돈이 들고(연 몇천 원이라도), 지금 단계에서는 "일단 외부에서 접속되는지"만 확인하면 충분해서 무료·즉시 사용 가능한 방식으로 시작. 나중에 실제 배포(Phase 5) 이후 고정 주소가 필요해지면 도메인을 사서 Named Tunnel로 전환할 계획.

```powershell
cloudflared tunnel --url http://localhost:3000
```

콘솔에 뜨는 `https://<랜덤>.trycloudflare.com`이 외부 접속 주소. **프로세스를 껐다 켜면 주소가 바뀐다**는 게 이 방식의 한계 — 그래서 임시 데모용으로만 적합하고, 진짜 배포 단계에선 Named Tunnel로 바꿔야 함. 아직 미실행 (다음에 진행).

## 다음 할 일 (우선순위)

1. `docs/github-actions-runner-guide.md` 7번 — 관리자 PowerShell에서 `svc.cmd install/start` 실행해서 러너를 `online`으로
2. 4번 Docker DB 켠 상태에서 `npx prisma migrate dev --name init` 실행 (Phase 1 마무리)
3. `apps/cron` — 트렌드 수집 스크립트 작성 시작 (Phase 2)
