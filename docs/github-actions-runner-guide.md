# self-hosted GitHub Actions 러너 등록 — 스텝별 학습 노트

2026-09-11 세션에서 실제로 실행한 순서 그대로 정리. "왜 이 명령을 쓰는지"와 "각 옵션이 뭘 하는지"에 집중.
결과 요약만 필요하면 `phase0-runner-tunnel-setup.md`를 보고, 개념을 이해하고 싶으면 이 문서를 읽을 것.

## 0. self-hosted runner가 뭐고 왜 쓰나

GitHub Actions는 기본적으로 GitHub가 관리하는 클라우드 VM(**GitHub-hosted runner**)에서 워크플로우를 돌린다.
**self-hosted runner**는 그 대신 내 PC/서버에 에이전트 프로그램을 설치해서, GitHub가 "이 작업 실행해" 하고 잡(job)을 내려주면 내 컴퓨터가 대신 실행하는 방식.

왜뜸 프로젝트에서 쓰는 이유:
- 로컬 Docker(Postgres 등) 환경에 붙여서 통합 테스트/배포를 하고 싶은데, GitHub-hosted runner는 내 로컬 네트워크에 접근할 수 없음
- 개인 프로젝트라 무료 사용량(GitHub-hosted runner 분당 과금/제한)을 아끼고 싶음
- 최종적으로 Cloudflare Tunnel + 로컬 Docker Compose로 "배포"할 계획이라, 배포 자체를 내 PC에서 실행해야 함

**트레이드오프(중요)**: self-hosted runner는 내 컴퓨터에서 코드를 실행하는 것과 같다. public 레포에서 아무나 PR을 올려도 그 코드가 워크플로우에 걸리면 내 PC에서 돌아갈 수 있음 → 그래서 아래 2번 "Fork PR 승인 설정"이 필수.

## 1. GitHub CLI(`gh`) 로그인 — 왜 필요한가

이후 단계(등록 토큰 발급, 러너 목록 조회, 저장소 설정 변경)를 전부 GitHub REST API로 처리하는데, `gh`는 이 API 호출에 필요한 인증 토큰을 대신 관리해준다. 브라우저로 로그인하면 `gh`가 내부적으로 OAuth 토큰을 저장해두고, 이후 `gh api ...` 명령이 그 토큰을 자동으로 실어서 요청을 보낸다.

```powershell
gh auth login
# 로그인 상태 확인
gh auth status
```

이번 세션에서는 이미 `dlwjsrPwjd` 계정으로 로그인되어 있어서 이 단계는 생략하고 바로 다음으로 넘어갔음.

## 2. Fork PR 승인 설정 — 보안 필수 단계

**왜**: public 레포 + self-hosted runner 조합에서, 외부인이 fork에서 PR을 보내면 그 PR의 워크플로우 코드가 기본적으로 내 러너(=내 PC)에서 실행될 수 있음. 이걸 막으려면 "바깥 협업자의 fork PR 워크플로우는 승인 후에만 실행" 옵션을 켜야 함.

**어떻게**: 이 설정은 REST API로 깔끔하게 조회/변경하는 전용 엔드포인트가 없어서, 웹 UI에서 수동으로 확인해야 함:

1. https://github.com/dlwjsrPwjd/whytteum/settings/actions 접속
2. "Fork pull request workflows from outside collaborators" 섹션에서
   **"Require approval for all outside collaborators"** 선택 → Save

> 체크리스트: 이 항목은 아직 수동 확인이 필요함 (다음에 이 문서 볼 때 확인).

## 3. 러너 등록 토큰 발급 — 왜, 어떻게

**왜**: 러너를 레포에 "이 러너를 등록해줘"라고 붙이려면 1회용 등록 토큰이 필요함. 이 토큰은 짧은 시간(약 1시간) 동안만 유효하고, `config.cmd` 실행 시 한 번만 쓰인다. (배포용 PAT나 로그인 토큰과는 다른, 등록 전용 임시 토큰.)

```powershell
gh api -X POST repos/dlwjsrPwjd/whytteum/actions/runners/registration-token --jq .token
```

- `gh api -X POST <path>` : GitHub REST API에 POST 요청을 보냄. `gh`가 인증 헤더를 자동으로 붙여줌.
- `--jq .token` : 응답 JSON(`{"token": "...", "expires_at": "..."}`)에서 `token` 필드만 뽑아냄. `gh`에 내장된 jq 필터라 별도 jq 설치 불필요.

## 4. 러너 바이너리 다운로드 & 압축 해제

**왜**: `config.cmd`, `run.cmd`, `svc.cmd` 등 실제 러너 에이전트 프로그램은 GitHub 저장소가 아니라 별도 릴리즈 zip으로 배포됨. 매번 최신 버전을 받아야 하므로 최신 릴리즈 정보를 API로 먼저 조회했다.

```powershell
# 최신 릴리즈 메타데이터 조회 (버전, 다운로드 URL 등)
gh api repos/actions/runner/releases/latest

# Windows x64 zip 다운로드 (이번 세션 기준 v2.337.0)
Invoke-WebRequest -Uri "https://github.com/actions/runner/releases/download/v2.337.0/actions-runner-win-x64-2.337.0.zip" -OutFile actions-runner.zip

# 압축 해제 (같은 폴더에 config.cmd, run.cmd, svc.cmd, bin/, externals/ 생성됨)
Expand-Archive -Path actions-runner.zip -DestinationPath . -Force
```

버전을 하드코딩하지 않고 `releases/latest` API로 조회한 이유: 문서(`phase0-runner-tunnel-setup.md`)에 적힌 고정 URL은 시간이 지나면 구버전이 되므로, 항상 최신을 받도록 API로 확인하는 습관이 좋음.

## 5. `config.cmd` — 러너를 레포에 실제로 등록

```powershell
./config.cmd --url https://github.com/dlwjsrPwjd/whytteum --token <3번에서 받은 토큰> --unattended --name "DESKTOP-605FJAA-runner" --labels self-hosted,windows,x64 --work _work
```

옵션 의미:
- `--url` : 어느 레포(또는 org/enterprise)에 등록할지. 레포 단위로 등록하면 그 레포의 워크플로우만 이 러너를 쓸 수 있음.
- `--token` : 3번에서 발급받은 1회용 등록 토큰.
- `--unattended` : 대화형 프롬프트(이름 물어보기 등)를 스킵하고 넘겨준 플래그 값으로 바로 등록. 스크립트/자동화에서 필수.
- `--name` : GitHub `settings/actions/runners` 화면에 표시될 러너 이름. 안 주면 컴퓨터 이름이 기본값.
- `--labels` : 워크플로우 YAML에서 `runs-on: [self-hosted, windows, x64]` 같은 식으로 이 러너를 지목할 때 쓰는 태그.
- `--work` : 잡 실행 시 체크아웃/빌드가 일어나는 작업 폴더 이름 (러너 폴더 하위에 생성됨).

실행하면 GitHub 쪽에 러너가 등록되고, 로컬에는 `.runner`, `.credentials` 같은 설정 파일이 생긴다 (이 파일들은 절대 git에 커밋하면 안 됨 — 토큰이 들어있음).

## 6. 등록 확인

```powershell
gh api repos/dlwjsrPwjd/whytteum/actions/runners --jq '.runners[] | {name, status, busy, os}'
```

`status`가 `offline`이면 러너 프로그램(서비스)이 아직 안 떠 있는 것 — 다음 단계까지 해야 `online`/`idle`로 바뀜.
웹에서 보려면: https://github.com/dlwjsrPwjd/whytteum/settings/actions/runners

## 7. Windows 서비스로 상시 실행 — 왜 관리자 권한이 필요한가

**왜 서비스로 등록하나**: `run.cmd`를 그냥 실행하면 그 터미널 창을 켜둔 동안만 러너가 동작함(창 닫으면 죽음). Windows 서비스로 등록하면 PC가 켜져 있는 한 백그라운드에서 계속 대기하며, 재부팅 후에도 자동 시작됨.

**왜 관리자 권한**: Windows 서비스를 새로 등록(`sc create`에 해당하는 작업)하는 건 시스템 전역 상태를 바꾸는 작업이라 OS가 관리자 권한을 요구함. 이번 세션의 PowerShell 도구는 일반 권한으로 떠 있어서 이 단계는 직접 실행해야 함:

```powershell
# 관리자 권한 PowerShell을 새로 열고 실행
cd C:\actions-runner
./svc.cmd install
./svc.cmd start
```

성공하면 `services.msc`에 `actions.runner.dlwjsrPwjd-whytteum.DESKTOP-605FJAA-runner` 같은 이름의 서비스가 생기고, 위 6번 명령의 `status`가 `online`으로 바뀐다.

## 참고: 러너 제거하는 법 (나중에 필요할 때)

```powershell
cd C:\actions-runner
./svc.cmd stop
./svc.cmd uninstall
$token = gh api -X POST repos/dlwjsrPwjd/whytteum/actions/runners/remove-token --jq .token
./config.cmd remove --token $token
```

서비스 중지 → 제거 → GitHub 쪽 등록도 해제하는 순서. `config.cmd remove`를 안 하면 GitHub 쪽에는 오프라인 러너가 계속 남아있게 됨.
