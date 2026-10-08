# Gametronyx decision ledger

Tyler's answers and agent calls are kept apart. Agent calls are defaults Tyler can overrule at any time. When one changes, update [DESIGN.md](DESIGN.md) in the same commit.

## Tyler-approved (2026-09-26 Q&A)

| # | Topic | Decision |
|---|---|---|
| U1 | Project home | New GitHub repo `TylerBielman/gametronyx` |
| U2 | Hosting | Front end on GitHub Pages "for now"; the domain `gametronyx.com` is already owned |
| U3 | DNS | GoDaddy |
| U4 | Budget | **Free only.** Email uses a **new, separate free Resend account** so underdog-football's Resend service is never put at risk |
| U5 | Shared accounts | NEWU's accounts turned out to be a custom FastAPI + Postgres API on the Hetzner server. **Extend that API** into one shared player-accounts service for NEWU and Gametronyx. This supersedes NEWU's earlier "own per-game namespace, no shared SSO" decision |
| U6 | One-off temp passwords | **Single-use, never expire** (revocable). The master code always works until rotated |
| U7 | Game gate | **Launcher-only for now**: links sit behind login and game URLs stay public. May be tightened later |
| U8 | Logged-out visitors | **Showcase + invite requests**: public game cards and link-outs, a login, an invite-code entry, and a "Request an invite" form that feeds an admin queue |
| U9 | Feedback destination | The **game's own repo, username only** (never email), labeled |
| U10 | NEWU link | **Hand off login and drop the basic-auth prompt**: players arrive at NEWU logged in, and NEWU's shared browser password is removed |
| U11 | Feedback popup content | **Free text only**, with a Skip button |
| U12 | Slot capacity | **Seat cap per slot + waitlist** with automatic promotion |
| U13 | Look | ~~Match NEWU~~ (superseded by U21 on 2026-09-26) |
| U14 | Age | **No age check** (invite-only; Tyler vouches for invitees) |
| U15 | Link-outs | **noeasywayup.com only** for now (card link removed by U23). Red Ring is shown only as a scheduled-playtest game, not as a link-out |
| U16 | Scheduling | Use a free existing tool only if it is seamless for players. Research found none that meets the brief, so it is **built in** on the shared API (Cal.com Free was the runner-up; see DESIGN §7) |
| U17 | Discord | Email carries the Discord details; **each slot is also posted as a Discord Scheduled Event** through a bot |
| U18 | Repo visibility | Private while building; **public at launch** so GitHub Pages works on the free plan |
| U19 | NEWU integration (2026-09-26) | **On hold.** No NEWU front-end deploy (it would ship unreleased NEWU work on `main`) and no basic-auth removal (live telemetry depends on it). Gametronyx launches without them; see LAUNCH_CHECKLIST Part G |
| U20 | Discord (2026-09-26) | Skipped at launch; add the bot token and the server settings later |
| U21 | Look (2026-09-26) | **The 80s handheld** from the four mockups: an ironic old Eastern-bloc game company, with the catchphrase "We kill your high score in the face!" No real language: decorative text is **faux-Soviet lettering** only. No price stickers over the game art. The A and B keys must make it obvious what to press. Red Ring's card art is Tyler's hand screenshot |
| U22 | Platforms (2026-09-26) | Cartridges say where each game runs: **Jerboa: mobile or desktop**; **No Easy Way Up and Red Ring: desktop only** |
| U23 | Card link-outs (2026-09-26) | **No "Visit site" link on game cards.** Play already opens the game. Replaces U15's card link-out; the footer link to noeasywayup.com stays |

## Tyler-approved (2026-09-27, leaderboards)

| # | Topic | Decision |
|---|---|---|
| U24 | Leaderboards | Games get leaderboards of players by Gametronyx username. The **back end lives in this repo** (`server/`); **each game's front end lives in that game's repo** (Jerboa: 3-minutes-to-midnight). Nothing leaderboard-related goes in EFdungeon |
| U25 | Jerboa end screen | When the Ring catches him, a celebration with the board and Play again replaces the game-over panel; the player's row always shows, about a third of the way down (3-minutes-to-midnight DECISIONS L1–L3) |

## Tyler-approved (2026-09-28, deploys)

| # | Topic | Decision |
|---|---|---|
| U26 | Hands-off deploys | Tyler no longer deploys by hand. **GitHub deploys the leaderboard server** when a change to `server/` merges to main, and **Claude merges its own PRs once CI is green**, saying what shipped. Tyler can still ask to review anything first. His one remaining step was the one-time key setup (A56) |

## Tyler-approved (2026-10-08, game submissions)

| # | Topic | Decision |
|---|---|---|
| U27 | Who adds external games | **Tyler only, in admin.** Friends send him their game's URL; he pastes it in (DESIGN §16) |
| U28 | Card descriptions | **Free.** The site drafts the pitch from the game page's own text; Tyler edits and approves it. No paid AI model |

## Agent calls (for Tyler's review)

| # | Call | Why |
|---|---|---|
| A1 | Front end: React + Vite + TypeScript + Tailwind, `BrowserRouter` + `404.html` fallback | Same stack as NEWU's `ef-app`; the URL fragment is kept free for handoff codes |
| A2 | Gametronyx endpoints live in `EFdungeon/backend` as new routers; extract later if a third site needs accounts | Reuses the existing deploy scripts, migrations and tests. One service, one deploy |
| A3 | API at `api.gametronyx.com` (nginx + certbot on the existing server); NEWU keeps `noeasywayup.com/api` | Clean cross-origin API for the Pages site with no NEWU URL changes |
| A4 | Login by username **or** email; new passwords ≥ 8 characters (existing ones grandfathered) | Email is now collected; 6 was below common guidance |
| A5 | Existing NEWU players add their email once, on their first Gametronyx login | The brief says every playtester provides an email; NEWU accounts have none |
| A6 | Master code lives in the DB and is rotated from admin; `INVITE_CODE` env only seeds it | The brief asks for admin temp-password management |
| A7 | Email verification is not blocking; the welcome email has a confirm link | Keeps sign-up friction low for invited testers |
| A8 | One-time **handoff code** (60 s, single use) in the URL fragment, never the JWT | Keeps long-lived tokens out of URLs and history |
| A9 | Rate limits per §5.8; the `is_active` login fix; `token_version` force-logout | NEWU's docs say to harden before widening the audience |
| A10 | Feedback counts **completed runs**; popup only when launched with a Gametronyx session; counter per browser | Matches "every 3 games played"; direct public visitors can't post |
| A11 | Feedback issue title/body/labels per §6.2; failed GitHub posts retried for 24 h | Nothing is lost if GitHub is down |
| A12 | Sender `playtest@gametronyx.com`; reply-to set in admin | No personal address in code or docs |
| A13 | Systemd timer every minute for emails and retries; idempotent `*_sent_at` guards | The server has no scheduler today |
| A14 | Nightly `pg_dump`, 14-day retention | NEWU's runbook lists backups as missing; emails raise the stakes |
| A15 | Admin = Tyler only at launch; promote others from the Players tab | The brief says "my admin functions" |
| A16 | Activity kept 180 days; failed-login bursts logged, not every failure | Useful without flooding the feed |
| A17 | Game art by URL in v1 (no uploads) | GitHub Pages can't take uploads; keeps v1 small |
| A18 | The 4-hour reminder box starts **unchecked** and then remembers the player's last choice | The brief says players "opt into" it |
| A19 | Sign-up closes at the start time; cancel any time before; the oldest waitlisted player is promoted; the leftover waitlist expires quietly at the start | Simple, predictable rules |
| A20 | No 4-hour reminder for signups made inside the 4-hour window; late or promoted players get the Discord email immediately if already inside 15 minutes | Avoids redundant or missed messages |
| A21 | Confirmation email carries a `.ics` file and an "Add to Google Calendar" link | Lightweight calendar integration without a third-party tool |
| A22 | `users.timezone` is captured from the browser; emails and pages show local times; admin enters times in their own zone, stored as UTC | Players and Tyler may be in different zones |
| A23 | Voice channel is picked from a bot-loaded dropdown; one permanent server invite in Settings (not one per session) | Fewer moving parts; the bot already has access |
| A24 | Slot defaults: 60 minutes, 6 seats (admin settings). Seats can't drop below the confirmed count; time or channel edits email everyone signed up and update the Discord event | Settings, not questions |
| A25 | Reset and confirmation links carry their token in the URL fragment (`/reset#token=…`, `/verify-email#token=…`) | Fragments never reach a server log (GitHub Pages included) |
| A26 | `game_launched` is logged when the API issues the handoff code, not when the game redeems it | One place to log it; no game-side code needed |
| A27 | Login tries the username first and falls back to email only when the input contains `@` | Existing NEWU usernames keep working even if one contains `@` |
| A28 | Rate limits key on nginx's `X-Real-IP`; per-IP-only buckets switch off for loopback; the login lockout counts failures only | `X-Forwarded-For` is spoofable; a proxy misconfiguration shouldn't lock every player out |
| A29 | Without `RESEND_API_KEY_GTX`, emails are marked `disabled` instead of queued | Stale reset links shouldn't fire once a key is added |
| A30 | The API keeps NEWU's specific invite errors ("Invalid invite code", "Invite code already used"); the Gametronyx UI shows one generic message | NEWU's client and tests depend on the specific messages |
| A31 | Fixed a pre-existing bug found while testing: over-size saves and bug reports returned 500 instead of 413 | Separate commit on the same branch; test-provable |
| A32 | Fonts bundled with the site (Fontsource) instead of Google Fonts | No third-party requests from playtesters' browsers; one less outside dependency |
| A33 | ~~Primary buttons use NEWU's red~~ | Superseded by U21 and A45 |
| A34 | Pages deploy is gated on the `PAGES_ENABLED` repo variable | The repo stays private until launch (U18); CI shouldn't be red meanwhile |
| A35 | `GET /games` never returns `play_url`; Play goes through the handoff | Keeps the launcher-only gate (U7) meaningful |
| A36 | Logging out goes through a public `/logout` route | Logging out on a protected page otherwise bounced to `/login?next=…` |
| A37 | Link fragments (`#code`, `#token`) are picked up even on fragment-only navigation, then stripped | Pasting a link into a tab already on that page must still work |
| A38 | `.npmrc` sets `legacy-peer-deps` | npm 10 crashes resolving vitest's optional peers; peers are listed explicitly instead |
| A39 | On phones the account link reads "Me" (the full username is in its tooltip and accessible name) | Wordmark plus Play, Schedule and a username overflowed 360 px; usernames can be 50 characters |
| A40 | Sign-up needs an email on the account; the API refuses without one | The 15-minute Discord link is sent by email |
| A41 | Emails carry times already formatted in each player's zone, stored in the outbox payload | A retried send says exactly what the first attempt would have |
| A42 | A signup waitlisted after the 4-hour mark gets no reminder; one promoted inside 15 minutes gets the Discord email at once | Consistent with A21 |
| A43 | The server go-live is one root command on the box (`gametronyx-go-live.sh`), with the code staged by the box's own Actions runner | Tyler has no bash or rsync on his desktop. Claude stages; Tyler pulls the trigger (EFdungeon's RED lane) |
| A44 | Removing NEWU's basic auth needs a telemetry decision first | `POST /api/telemetry` has its own basic auth and relies on browsers holding the playtest credential |
| A45 | GT-01 details: the signed-out keys are A = Request invite, B = Log in and a level ▶ key = I have a code; signed in, A = Play, B = Schedule and ▶ = My account. Faux letters swap A, N, O, R and W only; the key letters use the headline font | Keeps faux words readable; the ▶ key keeps the invite-code path one tap away. Tyler asked for it level and labelled "I have a code", not "Start" |
| A46 | The leaderboard server is its own package in `server/`: Node 22, TypeScript, Fastify, and SQLite through Node's built-in `node:sqlite` | Same language as the rest of this repo; no native modules to compile; one small container. Its own npm package and CI job keep it apart from the Pages build |
| A47 | It runs on the Hetzner box beside the accounts API, on its own hostname **`scores.gametronyx.com`** (nginx + certbot) and port `127.0.0.1:8004` | GitHub Pages can't run a server. Its own hostname means nothing in EFdungeon or the `api.gametronyx.com` config changes |
| A48 | Players are identified by asking the accounts API `GET /api/auth/me` with the game's session token, cached a minute; the server keeps only user id and username | No shared signing key and no access to the accounts database, so the server holds no secrets; disabled accounts and force-logouts are honoured |
| A49 | Its own SQLite database with a daily copy kept 14 days (`VACUUM INTO`), not a table in the accounts Postgres | Playtest scale; separate storage keeps the two services independent. The box's nightly job only covers Postgres |
| A50 | Boards: each player's best score per season; ties share a rank, earlier first. Replies carry the top 10 and 5 places above and 10 below the viewer | Matches the Jerboa end screen (L3: the player's row a third of the way down) |
| A51 | A game's `ranked_settings` must match the run exactly apart from `free_settings` (Jerboa: seed); per-game sanity checks refuse impossible runs; a resent `run_id` isn't counted twice; 30 posts per player per hour | Keeps honest mistakes and nonsense off the board. The score comes from the browser, so a determined cheat is handled by admin **hide** |
| A52 | Seasons are admin-named ("Playtest 6"). Jerboa is seeded at first start: enabled, season "Playtest 6", Playtest 6's defaults. Changing a game's defaults means starting a new season with the new ranked settings | Scores stay comparable within a season; old seasons stay readable |
| A53 | Deploy: pull this public repo on the box and run `server/deploy/scores-go-live.sh` as root; it's also how updates ship | One root command, like the accounts go-live (A43), without a second Actions runner |
| A54 | Until the `/admin` Leaderboards tab exists, seasons and hiding run on the box: `deploy/scores-admin.sh` (the same rules as the admin API, §15.3) | The server shipped first; the tab is the next step. Like `make_admin` for accounts |
| A56 | U26's deploy: `.github/workflows/deploy-scores.yml` tests the server, then SSHes to the box with the `SCORES_DEPLOY` secret: a deploy key whose `authorized_keys` line is `restrict,command="/usr/local/sbin/gametronyx-scores-deploy"`, so it can only run the deploy (fast-forward `/opt/gametronyx-src` to main, `scores-go-live.sh`, apply seasons), with no shell, forwarding or tty. The secret's last line pins the box's host key. `server/deploy/setup-ci-deploy.sh` makes the key once and keeps no private key on the box | Agents still never SSH to the box, and deploys don't depend on anyone's computer. The log is in Actions, so Claude can read and fix failures. The key can do nothing a merge to main couldn't already |
| A57 | Seasons are code: `server/seasons.json` holds each game's current season, ranked settings, free settings and on/off, and every deploy applies it (`cli.ts apply`: unchanged games are left alone, a new season name starts a fresh board). `scores-admin.sh` stays for hiding scores and one-offs | A new season ships with the change that needs it, reviewed like code, with no SSH |
| A55 | Jerboa posts to `VITE_SCORES_API` (default `https://scores.gametronyx.com`), fixed at build time like the accounts address | A URL override could send the session token elsewhere (3-minutes-to-midnight G-06) |
| A58 | Game submissions (M9, DESIGN §16) run in this repo's `server/`, with their own tables beside the scores; approved external games are merged into the site's card list | Deploys itself on merge (U26); no EFdungeon migration or hand deploy; the server already knows who a member is (A48) |
| A59 | Screenshots come from a headless Chromium in the server's container, at desktop and phone width; public https URLs only | No third-party screenshot service and no cost; the URL check stops the server being pointed at private addresses |
| A60 | External cartridges are public like the others, Play sits behind login (U7) and opens the game's own URL in a new tab | Same gate as today's games; there is no handoff to an external site |
| A61 | Milestones are code: `.github/milestones.json`, synced by `.github/workflows/milestones.yml` on merge | Agents can't create milestones through the GitHub tools they have; the file also records the roadmap |

## Open items
None block the design. Values Tyler supplies at setup (DESIGN §12): the Discord server ID and invite, the bot token, the Resend key, the GitHub token, and the GoDaddy DNS records.

Leaderboards (live 2026-09-27):
- **Whenever a game's default settings change, start a new season** with the new ranked settings: edit `server/seasons.json` in the same change (A57), or its runs are refused as not ranked.
- Not built yet (DESIGN §13): the `/admin` Leaderboards tab, a player opt-out on `/me`, and removing disabled or deleted accounts from boards automatically.
