#!/usr/bin/env bash
# Leaderboard admin on the box, as root (src/cli.ts). Run with no arguments for the list of commands. Examples:
#   bash /opt/gametronyx-scores/deploy/scores-admin.sh games
#   bash /opt/gametronyx-scores/deploy/scores-admin.sh season jerboa "Playtest 7" '{"duration":180,"grid":19}'
#   bash /opt/gametronyx-scores/deploy/scores-admin.sh scores jerboa 30
#   bash /opt/gametronyx-scores/deploy/scores-admin.sh hide 42 "test run"
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
exec docker compose -f docker-compose.prod.yml exec -T scores \
  node --disable-warning=ExperimentalWarning dist/cli.js "$@"
