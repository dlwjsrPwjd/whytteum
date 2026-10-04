#!/bin/sh
# cron 컨테이너 진입점: 마이그레이션 적용 후 COLLECT_INTERVAL_SECONDS마다 수집
# (유튜브 탐색은 할당량 때문에 코드에서 4시간 간격으로만 돌고 나머지 회차는 건너뜀)
set -u

npx prisma migrate deploy || exit 1

INTERVAL="${COLLECT_INTERVAL_SECONDS:-3600}"
while true; do
  echo "===== $(date '+%Y-%m-%d %H:%M:%S') ====="
  npm run collect -w cron
  rc=$?
  echo "===== done $(date '+%Y-%m-%d %H:%M:%S') (exit $rc) ====="
  sleep "$INTERVAL"
done
