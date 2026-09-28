#!/usr/bin/env bash
# The only thing the GitHub deploy key can run on the box (its authorized_keys line forces this command, whatever the
# client asks for). setup-ci-deploy.sh installs it as /usr/local/sbin/gametronyx-scores-deploy. It moves the box's
# copy of this repo to origin/main, then runs that version's server/deploy/ci-deploy.sh. One deploy at a time.
set -Eeuo pipefail
SRC="${GAMETRONYX_SRC:-/opt/gametronyx-src}"
exec 9>"${GAMETRONYX_DEPLOY_LOCK:-/run/lock/gametronyx-scores-deploy.lock}"
flock -w 900 9 || { echo "!! Another deploy is still running; try again when it finishes." >&2; exit 1; }
cd "$SRC"
git fetch --quiet origin main
git checkout --quiet main
git merge --ff-only --quiet origin/main || { echo "!! $SRC has changes of its own, so it can't move to origin/main." >&2; exit 1; }
printf '==> Deploying %s: %s\n' "$(git rev-parse --short HEAD)" "$(git log -1 --format=%s)"
exec bash "$SRC/server/deploy/ci-deploy.sh"
