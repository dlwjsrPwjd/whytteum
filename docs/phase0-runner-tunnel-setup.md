# Phase 0 마무리: self-hosted runner + Cloudflare Tunnel 설정 가이드

Phase 0의 나머지 두 항목(자체 GitHub Actions 러너 등록, Cloudflare Tunnel)은 브라우저 OAuth 인증이 필요해 로컬에서 직접 실행해야 합니다. 아래 순서대로 진행하세요.

## 0. 사전 설치

```powershell
winget install --id GitHub.cli -e
winget install --id Cloudflare.cloudflared -e
```

설치 후 새 터미널을 열어 PATH를 갱신하세요.

## 1. GitHub CLI 로그인

```powershell
gh auth login
```

- GitHub.com 선택 → HTTPS → 브라우저로 로그인 (권장)

## 2. Fork PR 승인 설정 (public + self-hosted runner 보안 필수)

레포가 public이고 self-hosted runner를 쓰면 fork PR을 통한 임의 코드 실행 위험이 있으므로 **반드시** 아래를 먼저 설정합니다.

1. https://github.com/dlwjsrPwjd/whytteum/settings/actions 접속
2. "Fork pull request workflows from outside collaborators" →
   **"Require approval for all outside collaborators"** 선택 후 저장

(대안으로 배포 워크플로우는 `main` push에만 트리거하고, PR용 lint/test는 GitHub 제공 러너로 분리하는 방법도 있음 — Phase 6에서 `deploy.yml` 작성 시 적용)

## 3. Self-hosted runner 등록 (Windows)

등록 토큰 발급 (택1):

```powershell
# CLI로 발급
gh api -X POST repos/dlwjsrPwjd/whytteum/actions/runners/registration-token --jq .token
```

또는 https://github.com/dlwjsrPwjd/whytteum/settings/actions/runners/new?arch=x64&os=win 에서 안내되는 토큰/스크립트를 그대로 사용해도 됨 (버전 번호가 자동으로 최신으로 채워져서 더 편함).

```powershell
mkdir C:\actions-runner
cd C:\actions-runner

# 위 GitHub 페이지에 안내된 최신 버전 URL로 교체하세요
Invoke-WebRequest -Uri https://github.com/actions/runner/releases/latest/download/actions-runner-win-x64.zip -OutFile actions-runner.zip
Expand-Archive -Path actions-runner.zip -DestinationPath . -Force

./config.cmd --url https://github.com/dlwjsrPwjd/whytteum --token <위에서_발급한_토큰>
# 이름/라벨은 기본값(Enter)으로 진행해도 무방

# 상시 실행되도록 Windows 서비스로 등록 (관리자 권한 PowerShell 필요)
./svc.cmd install
./svc.cmd start
```

정상 등록 확인: https://github.com/dlwjsrPwjd/whytteum/settings/actions/runners 에서 러너 상태가 **Idle**(초록색)로 표시되는지 확인.

## 4. Cloudflare Tunnel — Quick Tunnel 방식

도메인 없이 바로 쓸 수 있는 방식. 앱이 로컬에서 떠 있는 상태(`npm run dev` 또는 추후 `docker compose up`, 기본 포트 3000)에서:

```powershell
cloudflared tunnel --url http://localhost:3000
```

콘솔에 출력되는 `https://<랜덤문자열>.trycloudflare.com` 주소가 외부 접속 주소입니다.

> 주의: 프로세스를 재시작할 때마다 주소가 바뀝니다. 고정 주소가 필요해지면(Phase 5 배포 단계 이후) 저가 도메인을 구매해 Cloudflare Named Tunnel로 전환하세요 (`cloudflared tunnel login` → `cloudflared tunnel create` → DNS 라우팅).

향후 Phase 5(프로덕션 배포)에서는 이 명령을 `docker compose`와 함께 상시 실행되도록 스크립트/서비스로 묶을 예정입니다.

## 완료 확인 체크리스트

- [ ] `settings/actions`에서 Fork PR 승인 설정 완료
- [ ] `settings/actions/runners`에 러너가 Idle 상태로 표시됨
- [ ] `cloudflared tunnel --url http://localhost:3000` 실행 후 trycloudflare.com 주소로 로컬 Next.js dev 서버 접속 확인
