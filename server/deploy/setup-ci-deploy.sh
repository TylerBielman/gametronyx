#!/usr/bin/env bash
# One-time setup for automatic leaderboard deploys (docs/LAUNCH_CHECKLIST.md Part H, "Automatic deploys").
# Run ON THE BOX as root:
#   git -C /opt/gametronyx-src pull --ff-only && bash /opt/gametronyx-src/server/deploy/setup-ci-deploy.sh
# It makes a deploy key that can only run the deploy (move to main, go live, apply server/seasons.json), and prints
# ONE block to paste into GitHub as the repository secret SCORES_DEPLOY. The private key isn't kept on the box.
# Re-running replaces the key; the old one stops working.
set -Eeuo pipefail
SRC="${GAMETRONYX_SRC:-/opt/gametronyx-src}"
SSH_DIR="${GAMETRONYX_SSH_DIR:-/root/.ssh}"
ENTRY="${GAMETRONYX_ENTRY:-/usr/local/sbin/gametronyx-scores-deploy}"
HOST_KEY="${GAMETRONYX_HOST_KEY:-/etc/ssh/ssh_host_ed25519_key.pub}"
HOST="${GAMETRONYX_HOST:-noeasywayup.com}"
TAG=gametronyx-scores-ci-deploy

fail() { printf '\n!! STOPPED: %s\n   Nothing was changed. Copy everything above and send it to Claude.\n' "$*" >&2; exit 1; }
[ -n "${GAMETRONYX_SSH_DIR:-}" ] || [ "$(id -u)" = 0 ] || fail "run this as root (ssh root@$HOST first)"
[ -d "$SRC/.git" ] || fail "$SRC isn't the gametronyx clone (see Part H, H2)"
[ -f "$SRC/server/deploy/ci-deploy-entry.sh" ] || fail "$SRC is out of date: run  git -C $SRC pull --ff-only  first"
[ -r "$HOST_KEY" ] || fail "can't read this server's SSH host key ($HOST_KEY)"
command -v ssh-keygen >/dev/null && command -v flock >/dev/null || fail "ssh-keygen and flock are needed"

install -m 755 "$SRC/server/deploy/ci-deploy-entry.sh" "$ENTRY"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
ssh-keygen -q -t ed25519 -N '' -C "$TAG" -f "$tmp/key"
install -d -m 700 "$SSH_DIR"; touch "$SSH_DIR/authorized_keys"; chmod 600 "$SSH_DIR/authorized_keys"
# Keep every other key; replace an earlier deploy key. `restrict` turns off shells, forwarding and ttys.
{ grep -v " $TAG\$" "$SSH_DIR/authorized_keys" || true; printf 'restrict,command="%s" %s\n' "$ENTRY" "$(cat "$tmp/key.pub")"; } >"$tmp/authorized_keys"
cat "$tmp/authorized_keys" >"$SSH_DIR/authorized_keys"

printf '\nDone on the box. Now, in GitHub: TylerBielman/gametronyx → Settings → Secrets and variables → Actions →\n'
printf 'New repository secret. Name: SCORES_DEPLOY. Secret: everything between the two lines below.\n\n'
printf -- '----- copy from the next line -----\n'
cat "$tmp/key"
printf '%s %s\n' "$HOST" "$(cut -d' ' -f1-2 "$HOST_KEY")"
printf -- '----- to the line above -----\n\n'
printf 'Then tell Claude it is set; Claude runs the first deploy from GitHub.\n'
