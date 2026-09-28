# AGENTS.md — Gametronyx.com

## Current authority
Read `docs/DESIGN.md` and `docs/DECISIONS.md` before any change. Tyler's original brief is quoted verbatim in DESIGN.md §1.

Tyler lets the agent make routine calls, provided they are recorded in the decision ledger, apart from his own decisions. Ask only about choices that materially change the site. Anything that is really a tuning value should be an admin setting, not a question.

## Shape of the system
- This repo is the **static front end** (React + Vite + TypeScript + Tailwind on GitHub Pages at gametronyx.com). Commands: `npm ci`, `npm test`, `npm run typecheck`, `npm run build` (see README).
- It also holds the **leaderboard server** in `server/` (Node + Fastify + SQLite, on the Hetzner box as `scores.gametronyx.com`; DESIGN §15). It is its own package: `cd server && npm ci && npm test`. Leaderboard back-end work goes there, and each game's leaderboard front end goes in that game's repo (U24). Nothing leaderboard-related goes in EFdungeon.
- The API is the **shared player-accounts service** in `TylerBielman/EFdungeon/backend` (FastAPI + Postgres on the Hetzner server). No Easy Way Up uses the same service, so any change to accounts affects both sites.
- Games are launched through one-time handoff codes (DESIGN §5.6). Never put a JWT in a URL.

## Guardrails
- Free tiers only. Gametronyx email uses its **own** Resend account. Never reuse underdog-football's.
- No secrets in this repo. The leaderboard deploy key lives only in the `SCORES_DEPLOY` Actions secret (A56). `VITE_API_BASE` is the only build-time value. The leaderboard server needs none: it identifies players by asking the accounts API `GET /api/auth/me`, and never reads the accounts database.
- Feedback issues go to public repos: include the username, **never** the email. Leaderboards show usernames only, too.
- Existing `users` and `invite_codes` rows must never be wiped. Schema changes are forward-only Alembic migrations.
- Agents cannot root-SSH to the server. The **leaderboard server deploys itself** from GitHub when a change to `server/` merges to main (`.github/workflows/deploy-scores.yml`, DECISIONS U26/A56); check that run and fix it if it fails. Seasons change by editing `server/seasons.json` (A57). Other server steps go in the setup checklist (DESIGN §12) for Tyler to run.
- Tyler authorized Claude to **merge its own PRs once CI is green** (U26, 2026-09-28) and say what shipped, unless he asks to review first.
- Match NEWU's look (DESIGN §4.4). The site is mobile-first.
- Test meaningful auth, handoff, timing (reminders, feedback cadence) and input changes. Before handing off UI work, drive it in a real browser against a local API (README) at phone width, 360–390 px.
- Colors come from CSS variables, so Tailwind's `/opacity` modifiers (`text-bone/20`) silently do nothing. Use `rgba()` instead.
