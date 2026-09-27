# Gametronyx

Source for **gametronyx.com**, Tyler Bielman's playtest launcher and scheduling hub.

- Invited playtesters create an account with an invite code. Existing No Easy Way Up accounts already work.
- From there they can launch open playtests (Jerboa, No Easy Way Up) and sign up for scheduled multiplayer sessions (Red Ring) that include email reminders and Discord details.
- Admin: accounts, invite codes, playtest slots, games and recent activity.

This repo is the static front end (React + Vite + TypeScript + Tailwind, GitHub Pages) and the **leaderboard server** (`server/`, at `scores.gametronyx.com`). The accounts API is the shared player-accounts service in `TylerBielman/EFdungeon/backend`. Each game shows its own leaderboard from its own repo.

## Documents
- [Design and technical spec](docs/DESIGN.md), including the API reference (§5.9) and milestones (§14)
- [Decision ledger](docs/DECISIONS.md)
- [Launch checklist](docs/LAUNCH_CHECKLIST.md): the steps only Tyler can do (accounts, DNS, server, go-live)
- [Original brief, filled in (.docx)](docs/Gametronyx_site_design.docx)

## Develop

```sh
npm ci
npm run dev        # http://localhost:5173, proxies /api to 127.0.0.1:8000
npm test           # vitest
npm run typecheck
npm run build      # dist/ (+ 404.html for deep links on Pages)
```

For a local API, from `EFdungeon/backend`:

```sh
DATABASE_URL=sqlite:///./dev.db alembic upgrade head
DATABASE_URL=sqlite:///./dev.db INVITE_CODE=DEV-MASTER GTX_SITE_URL=http://localhost:5173 \
  uvicorn app.main:app --port 8000
```

`DEV-MASTER` is then the master invite code. Without `RESEND_API_KEY_GTX` no email is sent; links sit in the `email_outbox` table.

## Leaderboard server (`server/`)

Games post finished runs here and get the board back; players are recognised by asking the accounts API who their session token belongs to. See [DESIGN §15](docs/DESIGN.md) for the rules and API.

```sh
cd server
npm ci
npm test           # vitest
npm run typecheck
npm run build && npm start   # http://127.0.0.1:8004/api/leaderboards/health
```

Locally it talks to an accounts API on `ACCOUNTS_API` (default `http://127.0.0.1:8001`; use `http://127.0.0.1:8000` for the local API above) and keeps `scores.db` in `DATA_DIR` (default `./data`). `CORS_ORIGINS` takes a comma-separated list, e.g. `http://localhost:4173` for a local game build.

It goes live, and updates, with one root command on the box: [LAUNCH_CHECKLIST Part H](docs/LAUNCH_CHECKLIST.md).

## Deploy

`.github/workflows/pages.yml` typechecks, tests and builds every push. Pushes to `main` deploy to GitHub Pages once the repo is public and the `PAGES_ENABLED` variable is `true` (DESIGN §12).

Status: M1 (accounts API) and M2 (site shell) are built; neither is deployed yet. M8 (leaderboard server) is built and not deployed.
