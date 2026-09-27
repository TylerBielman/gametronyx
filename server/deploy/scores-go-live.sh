#!/usr/bin/env bash
# Gametronyx leaderboard go-live, run ON THE BOX as root. Any SSH client works; nothing to install on your side.
# It is also how updates ship: re-run it after pulling.
#
#   ssh root@noeasywayup.com
#   git clone https://github.com/TylerBielman/gametronyx /opt/gametronyx-src 2>/dev/null || git -C /opt/gametronyx-src pull --ff-only
#   bash /opt/gametronyx-src/server/deploy/scores-go-live.sh
#
# What it does:
#   - checks: root, Docker, the accounts API answering on 127.0.0.1:8001, DNS for scores.gametronyx.com;
#   - builds the new image while the old one keeps serving;
#   - copies server/ to /opt/gametronyx-scores (data/ is kept), with a safety copy of the scores database;
#   - (re)starts the container and waits for it to be healthy;
#   - installs the scores.gametronyx.com web server config and its HTTPS certificate;
#   - checks everything.
#
# It never touches the accounts API, its database, NEWU or api.gametronyx.com.
set -Eeuo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC="$REPO/server"
DEST=/opt/gametronyx-scores
HOST=scores.gametronyx.com
VHOST=/etc/nginx/sites-available/$HOST
PORT=8004
COMPOSE=(docker compose -f docker-compose.prod.yml)

step() { printf '\n==> %s\n' "$*"; }
fail() {
  trap - ERR
  printf '\n!! STOPPED: %s\n   Nothing after this point ran. Copy everything above and send it to Claude.\n' "$*" >&2
  exit 1
}
trap 'fail "the command on line $LINENO failed"' ERR

healthy() { curl -fsS "http://127.0.0.1:$PORT/api/leaderboards/health" >/dev/null 2>&1; }

step "1/6 Checks"
[ "$(id -u)" = 0 ] || fail "run this as root (ssh root@noeasywayup.com first)"
[ -f "$SRC/src/app.ts" ] || fail "$SRC doesn't look like the leaderboard server; pull the gametronyx repo first"
docker compose version >/dev/null 2>&1 || fail "docker compose isn't available"
curl -fsS http://127.0.0.1:8001/api/health >/dev/null 2>&1 ||
  fail "the accounts API isn't answering on 127.0.0.1:8001; the leaderboard needs it to recognise players"
getent hosts "$HOST" >/dev/null || fail "$HOST doesn't resolve yet (add the GoDaddy A record, then wait a few minutes)"
# Port 8004 must be free, or already ours.
if ! healthy && (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
  fail "something else is using port $PORT; pick a free port in docker-compose.prod.yml and the nginx file"
fi
printf '    from %s (%s)\n' "$REPO" "$(git -C "$REPO" rev-parse --short HEAD 2>/dev/null || echo 'no git')"

step "2/6 Build the new image (the running server keeps serving)"
STAGE="$(mktemp -d)"
tar -C "$SRC" --exclude=./node_modules --exclude=./dist --exclude=./data -cf - . | tar -C "$STAGE" -xf -
(cd "$STAGE" && "${COMPOSE[@]}" build --pull)
echo "    built"

step "3/6 Copy the server to $DEST (keeping its data)"
mkdir -p "$DEST/data/backups"
if [ -f "$DEST/data/scores.db" ]; then
  (cd "$DEST" && "${COMPOSE[@]}" stop)
  safety="$DEST/data/backups/before-deploy-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$safety"
  cp -p "$DEST"/data/scores.db* "$safety/"
  echo "    safety copy in $safety"
fi
find "$DEST" -mindepth 1 -maxdepth 1 ! -name data -exec rm -rf {} +
tar -C "$STAGE" -cf - . | tar -C "$DEST" -xf -
rm -rf "$STAGE"
chown -R 1000:1000 "$DEST/data"  # the image runs as `node` (uid 1000)

step "4/6 Start the leaderboard server"
(cd "$DEST" && "${COMPOSE[@]}" up -d --build)
for _ in $(seq 1 30); do healthy && break; sleep 1; done
healthy || { (cd "$DEST" && "${COMPOSE[@]}" logs --tail 40) || true; fail "the server didn't come up on 127.0.0.1:$PORT (logs above)"; }
echo "    up on 127.0.0.1:$PORT"

step "5/6 $HOST (web server + HTTPS certificate)"
if [ -f "$VHOST" ] && grep -q "managed by Certbot" "$VHOST"; then
  echo "    already installed with a certificate"
else
  install -m 644 "$SRC/deploy/nginx-scores-gametronyx.conf" "$VHOST"
  ln -sf "$VHOST" "/etc/nginx/sites-enabled/$HOST"
  if ! nginx -t >/dev/null 2>&1; then
    nginx -t || true
    rm -f "/etc/nginx/sites-enabled/$HOST"
    fail "nginx rejected the $HOST config, so it was disabled again"
  fi
  systemctl reload nginx
fi
# --keep-until-expiring makes re-runs a no-op.
certbot --nginx -d "$HOST" --non-interactive --agree-tos \
  --register-unsafely-without-email --redirect --keep-until-expiring
echo "    https://$HOST is set up"

step "6/6 Checks"
bad=0
check() {  # check <label> <command...>
  local label="$1"; shift
  if "$@" >/dev/null 2>&1; then echo "    OK    $label"; else echo "    FAIL  $label"; bad=1; fi
}
check "leaderboard server is healthy" healthy
check "https://$HOST answers" curl -fsS --resolve "$HOST:443:127.0.0.1" "https://$HOST/api/leaderboards/health"
check "Jerboa's board is open" bash -c \
  "curl -fsS --resolve $HOST:443:127.0.0.1 https://$HOST/api/leaderboards/jerboa | grep -q '\"season\"'"
check "browsers on gametronyx.com may call it" bash -c \
  "curl -fsS -o /dev/null -D - -X OPTIONS -H 'Origin: https://gametronyx.com' -H 'Access-Control-Request-Method: POST' \
   --resolve $HOST:443:127.0.0.1 https://$HOST/api/leaderboards/jerboa/scores | grep -qi '^access-control-allow-origin: https://gametronyx.com'"
check "the accounts API still answers" curl -fsS http://127.0.0.1:8001/api/health

trap - ERR
if [ "$bad" = 0 ]; then
  printf '\nALL DONE. The leaderboard is live at https://%s\n' "$HOST"
else
  printf '\n!! Some checks failed. Copy everything above and send it to Claude.\n'
  exit 1
fi
