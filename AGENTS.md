# AGENTS.md — Gametronyx.com

## Current authority
Read `docs/DESIGN.md` and `docs/DECISIONS.md` before any change. Tyler's original brief is quoted verbatim in DESIGN.md §1.

Tyler lets the agent make routine calls, provided they are recorded in the decision ledger, apart from his own decisions. Ask only about choices that materially change the site. Anything that is really a tuning value should be an admin setting, not a question.

## Shape of the system
- This repo is the **static front end** only (React + Vite + TypeScript + Tailwind on GitHub Pages at gametronyx.com).
- The API is the **shared player-accounts service** in `TylerBielman/EFdungeon/backend` (FastAPI + Postgres on the Hetzner server). No Easy Way Up uses the same service, so any change to accounts affects both sites.
- Games are launched through one-time handoff codes (DESIGN §5.6). Never put a JWT in a URL.

## Guardrails
- Free tiers only. Gametronyx email uses its **own** Resend account. Never reuse underdog-football's.
- No secrets in this repo. `VITE_API_BASE` is the only build-time value.
- Feedback issues go to public repos: include the username, **never** the email.
- Existing `users` and `invite_codes` rows must never be wiped. Schema changes are forward-only Alembic migrations.
- Agents cannot root-SSH to the server. Server steps go in the setup checklist (DESIGN §12) for Tyler to run.
- Match NEWU's look (DESIGN §4.4). The site is mobile-first.
- Test meaningful auth, handoff, timing (reminders, feedback cadence) and input changes.
