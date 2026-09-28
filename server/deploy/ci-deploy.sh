#!/usr/bin/env bash
# Run on the box by the GitHub deploy (.github/workflows/deploy-scores.yml → ci-deploy-entry.sh): ship the
# leaderboard server, then make each game's season match server/seasons.json. Safe to re-run; it's the same
# go-live as a manual update (docs/LAUNCH_CHECKLIST.md Part H).
set -Eeuo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEST="${GAMETRONYX_SCORES:-/opt/gametronyx-scores}"
bash "$REPO/server/deploy/scores-go-live.sh"
printf '\n==> Seasons (server/seasons.json)\n'
bash "$DEST/deploy/scores-admin.sh" apply "$(cat "$DEST/seasons.json")"
printf '\nDEPLOYED.\n'
