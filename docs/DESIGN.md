# Gametronyx.com — Playtest Coordinator and Launcher

Design and technical spec, v1.0 (2026-09-26). Owner: Tyler Bielman.

Filled in from Tyler's original brief (kept verbatim in §1) through a Q&A session. Every decision is listed in [DECISIONS.md](DECISIONS.md), with Tyler's answers kept separate from calls the agent made. Calls marked *(agent)* in this spec are defaults Tyler can overrule.

---

## 1. Original brief (verbatim)

> **Gametronyx.com playtest coordinator and launcher**
>
> Note that I already have the domain name.
>
> For now, this site should run off github pages and link out to certain other sites of mine like redringgame.com and noeasywayup.com
>
> This site needs to serve 2 purposes;
> - Allow access to live games like the jerboa game
> - Help me schedule gaming sessions for multiplayer games like Red Ring
>
> **Functionality**
> - A playtester can create an account on the site using a temporary password I provide manually. There should be a "master" password that will always work, and one-offs that I can provide.
>   - Uninvited guests to the site cannot playtest
> - After verification with the temp password, the playtester must provide an email, choose a username, choose a password.
> - The same player accounts from existing No Easy Way Up should work on Gametronyx.com seamlessly without playtesters having to make new accounts
> - Once in, the playtester can play any open playtest games as much as they like – Right now this is the Jerboa game, formerly 3 minutes to midnight and NEWU, which has its own URL that the player should be routed to.
> - The Jerboa game needs a popup every 3 games played that asks for their feedback
> - Feedback is routed to a new github issue in the repo with appropriate tags
> - There is a playtest coordination tool that allows players to sign up for scheduled playtests of other games (red ring, more to come).
>   - The player chooses from a menu of games and sees a brief description
>   - The player chooses a timeslot from a list of currently available days and times
>   - The player can opt into an email reminder 4 hours before the game
>   - 15 minutes before the game time, the player receives a link to a discord session for the playtest with instructions to join the server and the voice channel for this playtest
> - My admin functions need to include:
>   - Account management
>   - Temp password assignment
>   - Choosing playtest dates and times for playtesters to choose from
>   - Recent site activity
>   - Adding new games to the site

---

## 2. Summary

Gametronyx.com is a static React site on GitHub Pages. It talks to one **shared player-accounts API**, which is the existing No Easy Way Up (NEWU) accounts service. That service is extended and exposed at `api.gametronyx.com` on Tyler's existing Hetzner server. Because both sites use the same service, every NEWU account already works on Gametronyx, and every new Gametronyx account works on NEWU.

| Area | Decision |
|---|---|
| Front end | Static React + Vite + TypeScript + Tailwind site in `TylerBielman/gametronyx`, served by GitHub Pages at `gametronyx.com` |
| Back end | The existing NEWU FastAPI + Postgres accounts service (`TylerBielman/EFdungeon/backend`), extended with Gametronyx endpoints |
| Hosting cost | $0 extra. The Hetzner server is already paid for, and GitHub Pages, Resend and GitHub API usage stay on free tiers |
| Email | A **new, separate** free Resend account for `gametronyx.com`. It is never shared with underdog-football |
| Look | The GT-01 handheld: an ironic 80s Eastern-bloc games bureau with faux-Soviet lettering (§4.4, U21) |
| Gate | Launcher-only for now. Game links sit behind login; game URLs stay public |
| Scheduling | Built into Gametronyx on the shared API: seat caps + waitlist, opt-in 4-hour email reminder, and a 15-minute email with the Discord details. Each slot is also posted as a Discord Scheduled Event |
| DNS | GoDaddy |

---

## 3. Architecture

```
            Browser (phone or desktop)
                        │
 ┌───────────────────────────────────────────────┐
 │ gametronyx.com (GitHub Pages, static SPA)     │
 │ showcase · join · login · play · schedule     │
 │ admin                                         │
 └───────────────────────────────────────────────┘
                        │ HTTPS + JSON + Bearer JWT (CORS)
                        ▼
 ┌───────────────────────────────────────────────┐
 │ Hetzner server (existing)                     │
 │                                               │
 │ nginx: api.gametronyx.com ──┐                 │
 │ nginx: noeasywayup.com/api ─┴─► accounts API  │
 │ systemd timer (1/min) ────────► (FastAPI)     │
 │                                  │            │
 │                                  ▼            │
 │                        Postgres (efdungeon)   │
 │                                               │
 │ nginx: scores.gametronyx.com ─► leaderboard   │
 │   server (Node, this repo's server/)          │
 │   ├─ SQLite scores.db (+ daily backups)       │
 │   └─ asks the accounts API who a player is    │
 └───────────────────────────────────────────────┘
                        │ outbound from the API
                        ├─► Resend (new free account): email
                        ├─► GitHub REST API: feedback issues
                        └─► Discord REST API (bot): scheduled events

 Game sites reached through the launcher:
   Jerboa ─ tylerbielman.github.io/3-minutes-to-midnight/
   NEWU   ─ noeasywayup.com (same Hetzner server)
 Each game shows its own leaderboard from scores.gametronyx.com (§15).
```

### 3.1 Front end: `TylerBielman/gametronyx`
- **Stack** *(agent)*: React + Vite + TypeScript + Tailwind, the same as NEWU's `ef-app`, so tokens and components can be copied across.
- **Routing** *(agent)*: `BrowserRouter`, with a `404.html` that is a copy of `index.html`, so deep links work on GitHub Pages. Hash routing is not used because the URL fragment carries login handoff codes (§5.6).
- **Deploy**: a GitHub Actions workflow builds on every push to `main` and publishes to Pages. The `CNAME` file contains `gametronyx.com`, and "Enforce HTTPS" is on.
- **Config**: `VITE_API_BASE=https://api.gametronyx.com`. This is the only build-time value, and it is not secret. In development it is empty and Vite proxies `/api` to a local API on port 8000.
- **Fonts** *(agent)*: PT Sans Narrow, PT Mono and Press Start 2P are bundled with the site (Fontsource, latin and cyrillic subsets). The site makes no third-party requests.
- **Deploy gate**: every push runs typecheck, tests and build. Pushes to `main` deploy to Pages only once the repo variable `PAGES_ENABLED` is `true`, so CI stays green while the repo is private.
- **Repo visibility**: the repo stays **private while we build and is made public at launch** (Tyler's decision), right before Pages is turned on. GitHub Pages on a private repo needs a paid plan. The repo holds the front end, the leaderboard server (§15) and docs, so never commit secrets, server IPs or admin details. Those live in the EFdungeon repo and on the server. The leaderboard server needs no secrets.

### 3.2 Back end: shared player-accounts API
- **Code** *(agent)*: stays in `TylerBielman/EFdungeon/backend`, which already has the deploy scripts, Alembic chain and tests. Gametronyx endpoints are added as new routers (`app/api/routes/gtx_*.py`). If a third site ever needs accounts, extract the service into its own repo.
- The service's `APP_NAME` becomes "Player Accounts API". Its database name stays `efdungeon`, so no data has to move.
- **Exposure**: a new nginx server block for `api.gametronyx.com`, with a Let's Encrypt certificate from certbot, proxying to the same `127.0.0.1:8001` container. NEWU keeps using its same-origin `noeasywayup.com/api`.
- **CORS**: add `https://gametronyx.com`, `https://www.gametronyx.com` and `https://tylerbielman.github.io` (for Jerboa feedback) to `CORS_ORIGINS`.
- **nginx**: forward `X-Forwarded-For` / `X-Real-IP` so the API can rate-limit by client IP.
- **Scheduled work**: a systemd timer on the server runs `docker compose exec -T api python -m scripts.run_notifications` every minute. The job is idempotent, because every send is guarded by a `*_sent_at` column.
- **Backups** *(agent)*: add the nightly `pg_dump` cron that NEWU's runbook lists as missing, kept for 14 days in `/var/backups/player-accounts/`. Email addresses make this data harder to recreate.
- **Deploys**: Tyler runs them from the desktop with `deploy/accounts-server/deploy.sh`. Agents are refused root SSH to the server.

### 3.3 Email
- A **new free Resend account (or team) used only for gametronyx.com**, as Tyler asked, so underdog-football's sending reputation and quota are never at risk.
- Sender: `Gametronyx Playtests <playtest@gametronyx.com>` *(agent)*. The reply-to address is set in admin settings.
- DNS records at GoDaddy: Resend's DKIM (TXT), SPF (TXT on the bounce subdomain) and MX records, plus DMARC `v=DMARC1; p=none;` to start.
- Free-tier limits (3,000/month and 100/day at time of writing; re-check at sign-up) are far above playtest volume. If a send fails, it is logged to the activity feed and retried on the next timer tick, up to 5 tries.

### 3.4 GitHub integration (feedback issues)
- A fine-grained personal access token with only **Issues: read and write**, limited to the game repos that collect feedback (today just `3-minutes-to-midnight`). It is stored as `GTX_GITHUB_TOKEN` in `.env.production` on the server.
- It is kept separate from NEWU's existing bug-report `GITHUB_TOKEN`.

### 3.5 Discord integration
- A Discord application with a **bot user** is added to Tyler's playtest server. It never joins voice and never sends DMs. The API server uses it only through REST calls; no gateway connection or bot hosting is needed.
- The token is stored as `DISCORD_BOT_TOKEN` in `.env.production`. The server ID is set in admin → Settings.
- **Permissions**: View Channels, Connect, Create Events and Manage Events, applied to the playtest voice channels.
- **Uses**:
  - List the server's voice channels, so admin can pick one per slot.
  - Create, update, start, complete and cancel a **Scheduled Event** for each slot (§7.5).
- If a Discord API call fails, it is logged in Activity and retried by the timer. Email delivery never depends on Discord.

---

## 4. Site map and UX

The whole site is mobile-first, since most playtests happen on phones.

### 4.1 Public (not logged in)
| Route | Content |
|---|---|
| `/` | **Showcase**. The GT-01 handheld (§4.4). Its A, B and ▶ keys are **Request invite**, **Log in** and **I have a code**. Operating instructions sit beside it. Game cartridges show art, name, one-line pitch and status ("Open playtest" / "Scheduled sessions" / "Coming soon"). Link-outs to Tyler's other sites are covered in §11. |
| `/request-invite` | Form: name, email, "Which game are you interested in?" (optional), "Anything you'd like Tyler to know?" (optional). It has a hidden honeypot field and is rate-limited. The page then says "Thanks, Tyler will email you an invite code if there's room." |
| `/join` | Step 1: invite code, prefilled from `/join#code=…` in an approved-invite email. Step 2: email, username, password and password confirmation, plus a line linking the privacy notice. It then logs the player in and goes to `/play`. |
| `/login` | Username **or** email, plus password. Links to "Forgot password?" and "I have an invite code". |
| `/reset` | Request a reset link by email. `/reset#token=…` (the emailed link) sets a new password. Tokens ride in the URL fragment so they never reach a server log. |
| `/verify-email#token=…` | Confirms the player's email from the welcome or change-of-email message. Works without being logged in. |
| `/logout` | Signs out and returns to the showcase. |
| `/privacy` | Short privacy notice (§10.3). |

### 4.2 Player (logged in)
| Route | Content |
|---|---|
| `/play` | **Open playtests**: a card per open game with a **Play** button (§5.6 handoff; the game opens in the same tab). **Scheduled playtests** show "Sign-ups open soon" until M5. A banner asks unconfirmed players to confirm their email. |
| `/add-email` | The one-time step for NEWU accounts without an email (below). |
| `/schedule` | Menu of scheduled-playtest games with brief descriptions and their session counts. |
| `/schedule/:slug` | That game's upcoming sessions, grouped by day in the player's time zone, with seats left or the waitlist length. **Sign up** or **Join waitlist** opens a confirm sheet with the 4-hour reminder checkbox (§7). |
| `/me` | Account: **My sessions** (status, reminder toggle, Cancel/Leave waitlist, and the Discord join panel from 15 minutes before), email (edit), change password, and log out. |

- **First login by an existing NEWU player**: if the account has no email, a one-time "Add your email" step appears before `/play`, because the brief says every playtester provides an email.

### 4.3 Admin (role = admin)
`/admin` with tabs: **Activity · Players · Invite codes · Invite requests · Games · Playtest slots · Settings** (detail in §8).

### 4.4 Visual design: the GT-01 handheld
The site is an ironic 80s Eastern-bloc games bureau: the home page is a beige handheld, the "GT-01", and each game is a cartridge (U21). Tyler's logo (`public/brand/gametronyx-logo.webp`) sits in the charcoal header and on the handheld. The catchphrase is **"We kill your high score in the face!"**

- **Home page.** The handheld's LCD carries the catchphrase and spells out the controls. The keys are the real actions:
  - Signed out: **A** = Request invite, **B** = Log in, and a small **▶** key = I have a code.
  - Signed in: **A** = Play, **B** = Schedule, **▶** = My account.
  - Beside it, the "Operating instructions" explain the same steps.
- **Cartridges.** A game card has grip ridges and a paper label. It shows the game's art, its catalogue number (GT-02, GT-03, GT-04), a platform tag, the pitch and a status line. The platform tag is teal "Mobile or desktop" for Jerboa and red "Desktop only" for No Easy Way Up and Red Ring (U22). It is set per game in `src/lib/art.ts` (`PLATFORMS`). Art comes from the game's `art_url` if admin set one, else the built-in images in `public/art/<slug>.webp`.
- **Faux-Soviet lettering.** Decorative labels swap in Cyrillic look-alikes (Д for A, И for N, Ф for O, Я for R, Ш for W): "MФDEL GT-01", "ФPEЯДTIИG MДИUДL". It is not a real language (U21). Anything a player must read or tap stays plain English, and screen readers get the plain English (`<Faux>`).
- **Tokens** (`src/styles/index.css`):

| Token | Value | Use |
|---|---|---|
| `--page` | `#CFC8B6` | Page background (beige plastic) |
| `--casing` / `--paper` / `--field` | `#E6E0CF` / `#F1ECDF` / `#FBF8F0` | Handheld shell, panels and manual pages, inputs |
| `--char` / `--char-2` / `--char-3` | `#262521` / `#2D2C28` / `#3A3934` | Header, bezel, dark keys, cartridge shells |
| `--fg` / `--fg-2` / `--fg-3` | `#262521` / `#45413A` / `#57524A` | Text; `--fg-3` is 4.6:1 on `--page` |
| `--red` / `--red-key` / `--red-text` | `#BF3A1B` / `#D8431F` / `#922B14` | Primary buttons, the A key, accent text and links |
| `--amber` / `--teal` | `#F2A33A` / `#1FB3B8` | Secondary buttons; the red, amber and teal casing stripe |
| `--lcd` / `--lcd-ink` | `#A6B389` / `#26301B` | The LCD, confirmations |
| Display and body | PT Sans Narrow 400/700 | Headings (uppercase) and body |
| Mono | PT Mono | Labels, codes, times |
| Pixel | Press Start 2P | LCD text |

Fonts are bundled (latin and cyrillic subsets), so the site makes no third-party requests. Buttons are pill keys (`.btn primary / gold / cash / ghost`). Every text pair meets WCAG AA; the tightest is `--red-text` on `--page` at 4.9:1. Link previews use `public/brand/og.jpg`, made from Tyler's CRT artwork.

---

## 5. Accounts and access

### 5.1 Identity
- There is a single `users` table: the existing NEWU table, extended (§9).
- **Usernames** follow NEWU's rules: at most 50 characters, stored as typed, unique ignoring case.
- **Login** accepts a username or an email. The server treats the value as an email when it contains `@`. This works on both sites.
- **Passwords**: bcrypt, as NEWU already does. New or changed passwords must be at least **8 characters** *(agent; NEWU's old minimum was 6)*. Existing passwords are grandfathered.
- **Sessions**: the existing 90-day HS256 JWT. Gametronyx stores it in `localStorage['gtx_auth_token_v1']`.
- Logout clears the token locally. *(agent)* Add a `token_version` column that an admin can bump to force-log-out a user, since there is no server-side logout today.
- **Disabled accounts**: `is_active=false` blocks login as well as API calls. This fixes the existing gap where `/login` skipped the check.

### 5.2 Invite codes: the "temp passwords"
The existing `invite_codes` table already models both kinds of code:

| Kind | Behavior (Tyler's decisions) |
|---|---|
| **Master code** | Multi-use and always works. It is stored in the DB and **rotated from admin**. `INVITE_CODE` in `.env` only seeds it if none exists. Rotating it instantly invalidates the old one. |
| **One-off code** | **Single-use, never expires.** Revocable from admin. Records who redeemed it and when. |

- Codes are 8 uppercase letters and digits (the existing generator). Admin can also type a custom code.
- Each code can carry a note, such as "for Sam from Discord".
- The same code works on Gametronyx and NEWU, since there is one table.

### 5.3 Sign-up flow
1. `/join`: enter the code, then `POST /api/auth/invite/check`, which is rate-limited. A wrong code shows "That code isn't valid." and never says why.
2. Enter email, username and password, then `POST /api/auth/register` with `{invite_code, email, username, password}`. In one transaction it creates the user and redeems the code (single-use codes are marked redeemed).
3. The server returns a JWT. The site stores it and goes to `/play`, then sends a welcome email.

Email verification *(agent)*: v1 does not block on verification. The welcome email includes a "confirm this is you" link (`/verify-email#token=…`, valid 7 days) that sets `email_verified_at`. Changing the email voids the old link and sends a new one. Admin sees who is unverified.

### 5.4 Invite requests (public)
- `POST /api/invite-requests` stores the name, email and notes, then emails Tyler (a toggle in admin settings).
- In admin, **Approve** mints a single-use code and emails it to the requester using an editable template. **Decline** is silent by default.
- Limits: 3 requests per IP per day, and one open request per email.

### 5.5 Password reset
- `POST /api/auth/reset/request` accepts an email. The response is the same whether or not the email exists.
- It emails a one-time link (`/reset#token=…`) that is valid for 1 hour. The token is stored hashed.
- Setting the new password burns every outstanding link for the account and signs out all other sessions, on NEWU too.
- For players who have no email yet, admin can set a temporary password from the Players tab and tell them directly.

### 5.6 Launching games (login handoff)
Game sites live on other origins, so they cannot read Gametronyx's `localStorage`. The launcher passes a **one-time handoff code** instead of the JWT itself, which keeps long-lived tokens out of URLs and browser history:

1. The player taps **Play**. The site calls `POST /api/auth/handoff {game_slug}` and gets back a random code, stored hashed, that is **single-use and valid for 60 seconds**.
2. The browser opens `<game play_url>#gtx_handoff=<code>`.
3. The game reads the fragment, strips it with `history.replaceState`, and calls `POST /api/auth/handoff/redeem {code}`, which returns a normal JWT.
4. The API logs a `game_launched` activity event when it issues the code.

Per game:
- **NEWU**: its `authClient` redeems the code and stores the JWT under its existing `ef_auth_token_v1` key, so the player arrives logged in.
- **NEWU's shared nginx basic-auth prompt is removed** (Tyler's decision). Note: NEWU guest play is then reachable by anyone with the URL, which is consistent with the launcher-only gate below.
- **Jerboa**: stores the JWT as `gtx_auth_token_v1` in its own origin. It is used only to attribute feedback (§6).

### 5.7 Gate strength
The gate is **launcher-only for now** (Tyler's decision; it may be tightened later):
- Game links, the schedule and the Discord details are behind login.
- Game URLs themselves stay public, and the games do not require a login.
- Hardening later (a game-side login check, or builds served only to signed-in players) is listed in §13.

### 5.8 Rate limits *(agent)*
In-memory per-process limits are enough at this scale, because there is a single API container. They key on the `X-Real-IP` header nginx sets, never on `X-Forwarded-For`, whose first hop the client controls. If a request arrives without `X-Real-IP` (a misconfigured proxy), the per-IP-only buckets switch off rather than lumping every player into one bucket.

| Endpoint | Limit |
|---|---|
| login | 10 **failed** attempts / 15 min per IP + username, and 50 attempts / 15 min per IP |
| invite check / register | 20 / hour per IP |
| reset request | 5 / hour per IP |
| resend confirmation email | 3 / hour per account |
| handoff redeem | 60 / minute per IP |
| invite request (M2) | 3 / day per IP |
| feedback (M4) | 10 / hour per user |

### 5.9 Account API (built in M1)
All paths are under `https://api.gametronyx.com/api`. `/auth/*` is also reachable same-origin at `noeasywayup.com/api/auth/*`.

| Method and path | Auth | Purpose |
|---|---|---|
| `POST /auth/invite/check` `{invite_code}` | none | Step 1 of `/join` |
| `POST /auth/register` `{invite_code, username, password, email?, timezone?}` | none | Create an account; returns `{access_token}` |
| `POST /auth/login` (form: `username`, `password`) | none | Username **or** email; returns `{access_token}` |
| `GET /auth/me` | player | `id, username, email, email_verified, needs_email, role, timezone, reminder_default` |
| `PATCH /auth/me` `{email?, timezone?, reminder_default?}` | player | Add or change email (sends a confirmation), time zone, reminder default |
| `POST /auth/me/password` `{current_password, new_password}` | player | Returns a fresh token; other sessions are signed out |
| `POST /auth/email/verify` `{token}` | none | From the `/verify-email#token=…` link |
| `POST /auth/email/verify/resend` | player | Resend the confirmation email |
| `POST /auth/reset/request` `{email}` | none | Always `202`, whether or not the email has an account |
| `POST /auth/reset/confirm` `{token, password}` | none | Returns `{access_token}` |
| `POST /auth/handoff` `{game_slug}` | player | Returns `{code, expires_in, launch_url}` |
| `POST /auth/handoff/redeem` `{code}` | none | Called by the game; returns `{access_token}` |
| `GET/POST /admin/invite-codes` `{count, note?}` | admin | List codes / mint one-off codes |
| `POST /admin/invite-codes/{id}/revoke` | admin | Revoke an unused one-off code |
| `GET/POST /admin/invite-codes/master` `{code?}` | admin | Show the master code / rotate it (custom or generated) |
| `GET /games` | none | Showcase and launcher games. Never includes `play_url`; `launchable` says which get a Play button (M2) |
| `POST /invite-requests` `{name, email, game_interest?, message?, website}` | none | "Request an invite"; `website` is a honeypot. Always `202` (M2) |
| `GET /admin/invite-requests` | admin | Pending first, then handled (M2) |
| `POST /admin/invite-requests/{id}/approve` | admin | Mints a one-off code and emails a `/join#code=…` link (M2) |
| `POST /admin/invite-requests/{id}/decline` | admin | Silent decline (M2) |
| `POST /feedback` `{game_slug, text, build_sha?, runs?, client?}` | player | In-game feedback, filed as a GitHub issue in the background; 10 per hour (M4) |
| `GET /playtests/slots` | player | Upcoming open sessions with seats, waitlist length and your signup (M5) |
| `POST /playtests/slots/{id}/signup` `{remind_4h}` · `DELETE` the same path | player | Take a seat (or join the waitlist) · give it up, which promotes the next player (M5) |
| `PATCH /playtests/signups/{id}` `{remind_4h}` | player | Toggle the 4-hour reminder (M5) |
| `GET /playtests/me` | player | Your upcoming sessions, with Discord join details from 15 minutes before (M5) |
| `GET/POST /admin/playtests/slots` · `PATCH /admin/playtests/slots/{id}` · `POST …/{id}/cancel` | admin | List (`?when=upcoming\|past`), create (with `repeat_weeks`), edit, cancel sessions (M5) |
| `GET/POST /admin/playtests/slots/{id}/roster` · `DELETE …/roster/{signup_id}` | admin | Roster; add a player by username or email; remove (promotes) (M5) |
| `GET /admin/discord/channels` | admin | Voice channels, loaded through the bot (M5) |
| `GET/PUT /admin/settings` | admin | Discord server ID and invite, slot defaults, alert toggles, and which secrets are configured (M5) |
| `GET /admin/players?q=` · `PATCH /admin/players/{id}` `{email?, is_active?, role?}` | admin | Search and edit players; disabling signs them out (M6) |
| `POST /admin/players/{id}/password` · `POST …/{id}/logout` · `DELETE /admin/players/{id}?confirm=<username>` | admin | Temporary password, force log-out, delete (M6) |
| `GET/POST /admin/games` · `PATCH /admin/games/{id}` | admin | All games; add; edit (the slug is fixed) (M6) |
| `GET /admin/activity?type=&before_id=` · `GET /admin/activity/types` | admin | Activity feed, newest first (M6) |

Errors come back as `{detail: "<message>"}` with `400` (bad input), `401` (no or expired session), `403` (disabled account or not an admin), `404`, `409` (username or email taken) or `429` (rate limited, with `Retry-After`). The site shows its own friendly copy for invite-code errors (§5.3).

---

## 6. Jerboa feedback popup

### 6.1 Behavior
- A "game played" means a **completed run**, one that ends when the Ring catches the jerboa. Abandoned or restarted runs don't count. *(agent)*
- After every **3rd** completed run, a modal appears over the game-over screen. The cadence is set per game in admin and defaults to 3.
- The modal is **free text only** (Tyler's decision). It has a title, "How was it?", a text area with the placeholder "Anything fun, confusing or broken?", and **Send** and **Skip** buttons.
- The text is limited to 4,000 characters. Either button resets the counter, and a blank text area disables Send.
- The popup only appears when the player has a Gametronyx session, meaning they were launched from the site. Direct visitors to the public URL never see it, and their runs are not counted. *(agent)*
- The counter lives in `localStorage['gtx_feedback_runs_v1']`, per browser.
- The run count and build are attached automatically. The build is the Git commit SHA, injected at build time as `VITE_BUILD_SHA`.

### 6.2 Routing to GitHub
`POST /api/feedback` sends `{game_slug, text, build_sha, runs_this_session, client: {ua, viewport}}` with a Bearer token. The server then:
1. Validates the input, applies the rate limit, and stores a row in `feedback`.
2. Creates an issue in the game's configured repo, `TylerBielman/3-minutes-to-midnight` for Jerboa:
   - **Title**: `Playtest feedback (<username>): <first 60 chars>`
   - **Body**: the feedback quoted, then a details table with username, game, build SHA, runs completed, device/browser and time (UTC). The footer reads "Sent from gametronyx.com".
   - The **username only, never the email** (Tyler's decision: the repo is public).
   - **Labels**: `feedback`, `playtest`, `game:jerboa`, plus any extra labels set on the game in admin. The labels are created once during setup (§12).
3. Saves the issue URL on the row and logs `feedback_submitted`.
4. If GitHub is down, the row is kept with `issue_url = null`, and the notifications job retries it every tick, up to 24 hours.

### 6.3 Changes needed in `3-minutes-to-midnight`
- A `gtx/` module containing: the handoff redeem on boot, the run counter hooked to the run-end event, the feedback modal (Pointer Events, portrait-safe), and the API client.
- The deploy workflow injects `VITE_BUILD_SHA`.
- Tests: the counter cadence (3, 6, 9…), Skip resetting the counter, no popup without a session, and handoff fragment stripping. This follows that repo's AGENTS.md rule to test timing and input changes.

---

## 7. Playtest scheduling

**Built in** (Tyler's decision). Free tools were checked on 2026-09-26: Cal.com Free and Cal.diy, Zcal, Calendly, Google appointment schedules, TidyCal, Luma, Sesh/Apollo, Discord Events, Doodle, YouCanBookMe and Easy!Appointments. None can send an *opt-in* 4-hour reminder or a 15-minute message naming each session's voice channel on a free plan. Cal.com Free came closest, but it offers no opt-in, no waitlist and no custom text, uses one fixed location per game, carries Cal.com branding, and sends its own emails. The built-in version reuses the accounts, database and server Gametronyx already has, so players never leave the site or retype anything.

### 7.1 Player flow
1. **`/schedule` → game menu.** Cards for every active game of type *scheduled playtest* (today: Red Ring). Each shows the art, name, **brief description** and "N upcoming sessions".
2. **Pick a game → timeslot list.** Only slots that are published and haven't started are shown. They are grouped by day and shown in the **player's local time zone** (labeled, e.g. "7:00 PM PDT"). Each shows the time, length and seats ("3 of 6 seats left", or "Full: join waitlist (2 ahead)").
3. **Pick a slot → confirm sheet**: the game, date and time, the length, and a checkbox, **"Email me a reminder 4 hours before"**.
   - The first time, the box is **unchecked**, because the brief says players opt in. After that it remembers the player's last choice (`users.reminder_default`). *(agent)*
   - **Confirm** signs the player up, or puts them on the waitlist if the slot is full.
4. **Confirmation email** (always sent) with a `.ics` calendar attachment and an "Add to Google Calendar" link *(agent)*.
   - A waitlisted player gets a "You're on the waitlist (#N)" email instead.
5. **`/me` → My sessions** lists upcoming signups with their status (Confirmed / Waitlisted #N), the reminder toggle and **Cancel**.
   - From 15 minutes before start until the session ends, the entry turns into a **Join on Discord** panel with the same content as the email (§7.4).

**Rules** *(agent)*
- Sign-up closes at the start time.
- Players can cancel any time before the start.
- One signup per player per slot. Overlapping slots are allowed.
- When a confirmed player cancels, the **oldest waitlisted player is promoted** and gets a "You're in!" email. If that happens within 15 minutes of start, they also get the Discord email straight away.
- When the session starts, anyone still waitlisted is marked `expired` and gets no email; My sessions shows "Session was full".
- Seat changes use a row lock (`SELECT … FOR UPDATE` on the slot), so two players can never take the last seat at once.

### 7.2 Admin: playtest slots
- **Create a slot**:
  - Game.
  - Date and start time, entered in the admin's local time zone and stored in UTC.
  - Length (default 60 min, a setting).
  - **Seats** (default 6, a setting).
  - **Voice channel**: a dropdown of the server's voice channels, loaded through the bot.
  - **Session notes**: plain text with links, e.g. where to download the build. They are included in the 15-minute email.
  - Draft or published.
- **Repeat weekly for N weeks** and **Duplicate** make recurring sessions quick.
- **Edit**:
  - Changing the time or the channel emails every confirmed and waitlisted player a "Session updated" notice and updates the Discord event.
  - Seats can't drop below the current confirmed count; remove players first.
- **Cancel slot**: emails everyone signed up and cancels the Discord event.
- **Roster**:
  - Shows confirmed players and the waitlist in order, with usernames, emails, reminder opt-in and email delivery status.
  - Admin can add a player manually or remove one; a removal promotes the next player on the waitlist.
- **Lists**: upcoming and past slots, with signup and cancellation counts.

### 7.3 Timing (systemd timer, every minute)
| Job | Who | When |
|---|---|---|
| Confirmation | Player who signs up or is waitlisted | Immediately |
| 4-hour reminder | Confirmed players with `remind_4h = true` | Once `now ≥ start − 4 h`, and only if they signed up **before** that point *(agent: late signups already have the confirmation email)* |
| 15-minute Discord email | **All confirmed players** | Once `now ≥ start − 15 min`. Players confirmed or promoted after that get it immediately |
| Discord event → Active | Slot | At the start time |
| Discord event → Completed; waitlist → expired | Slot | At the start time for the waitlist, and at start + length for the event |

- Every send is claimed with `UPDATE … SET <x>_sent_at = now() WHERE <x>_sent_at IS NULL … RETURNING`, so it goes out exactly once even if the timer overlaps.
- Emails are queued in `email_outbox` and retried up to 5 times.

### 7.4 Emails
Times in emails use the player's saved time zone (`users.timezone`, captured from the browser).

**4-hour reminder**
- Subject: *Reminder: Red Ring playtest today at 7:00 PM PDT*.
- Body: the game, time, length, and a "Can't make it? Cancel" link to `/me`.

**15-minute Discord email**
- Subject: *Red Ring playtest starts in 15 minutes: join us on Discord*.
- Body:
  1. **Join the Gametronyx Discord server** (skip if you're already a member): the permanent invite from admin → Settings.
  2. **Open the voice channel _#red-ring-playtest_**: a direct link, `https://discord.com/channels/<server>/<channel>`.
  3. **Session notes from Tyler**: the slot's notes.
  4. Footer: "Can't make it? Cancel" (link to `/me`) so the next player on the waitlist is promoted.

**Other templates**: confirmation (with the `.ics`), waitlisted, promoted, session updated, session cancelled. All templates can be edited in admin → Settings.

### 7.5 Discord Scheduled Events (Tyler's decision)
Each published slot is mirrored as a **voice-channel Scheduled Event** in Tyler's server:
- **Create**: `POST /guilds/{server}/scheduled-events` with `entity_type = VOICE`, the slot's `channel_id`, start and end times, the name "<Game> playtest", and the description "Sign up at gametronyx.com/schedule". The returned event ID is stored on the slot.
- **Edit**: `PATCH` the event. **Cancel**: set the status to *Canceled*.
- **Start and end**: voice events don't start on their own, so the timer sets the status to **Active** at the start time and **Completed** at the end. Starting the event triggers Discord's own ping to members who clicked "Interested".
- **Limits**:
  - The event is a **bonus signal**, not the delivery channel. Gametronyx signups can't be marked "Interested" through the API.
  - Any server member can see the event and join the voice channel.
  - Discord allows at most 100 scheduled events per server at once.
- The Discord invite is the permanent invite from Settings, not a new one per session *(agent)*.

## 8. Admin

Admin access comes from `users.role = 'admin'`. The first admin is created with `python -m scripts.make_admin <username>` on the server. *(agent: Tyler only; helpers can be promoted later from the Players tab.)*

| Tab | Functions |
|---|---|
| **Activity** | Newest-first feed of `activity_events`, filterable by type, game and player, 50 per page. Events: account created, login, failed-login bursts (≥5 in 15 min), invite created/revoked/redeemed, invite requested/approved/declined, game launched, feedback submitted (links the issue), playtest signup/cancel/waitlist/promotion, slot created/edited/cancelled, email failed, admin actions. Kept for 180 days *(agent)*. |
| **Players** | Search by username or email. Columns: username, email (verified?), created, last login, games launched, feedback count, upcoming sessions, status. Actions: edit email, set temporary password, disable/enable, force log-out (`token_version`), promote/demote admin, delete (with confirmation; cascades saves, signups and feedback rows, but GitHub issues stay). |
| **Invite codes** | Show and **rotate the master code**. Mint one-off codes, one or many at a time, each with a note. List them with status (unused / redeemed by X on date / revoked), copy button, and revoke. |
| **Invite requests** | Queue of pending requests with **Approve**, which mints and emails a code, and **Decline**. |
| **Games** | Add/edit a game (fields in §9, `games`): name, slug, one-line pitch, description, art URL, type (**open playtest** / **scheduled playtest** / **showcase only**), play URL, external site URL, handoff on/off, feedback repo + labels + popup cadence, showcase visibility, status (active / paused / archived), sort order. |
| **Playtest slots** | See §7. |
| **Settings** | Email reply-to, admin alert toggles (invite request, playtest signup, playtest cancellation, and daily digest, which is off by default), Discord server invite link, email templates (welcome, invite approved, reminder, Discord session), and the privacy notice text. |

Admin endpoints all sit under `/api/admin/*` and require `role=admin`. Every admin action writes an activity event.

---

## 9. Data model

These are Postgres tables in the existing `efdungeon` database. The changes ship as Alembic migrations `0006_*` onward. Existing tables must never be wiped.

**`users`** (existing, extended)
- Existing columns: `id`, `username`, `password_hash`, `is_active`, `created_at`.
- New: `email` (nullable, unique on `lower(email)`), `email_verified_at`, `role` (`player` | `admin`, default `player`), `token_version` (int, default 0), `last_login_at`, `timezone` (IANA name, from the browser), `reminder_default` (bool, default **false**), `invited_via_code_id`.

**`invite_codes`** (existing, extended)
- Existing columns: `id`, `code`, `redeemed`, `single_use`, `redeemed_by`, `redeemed_at`, `created_at`.
- New: `is_master` (bool; a partial unique index allows only one active master), `note`, `revoked_at`, `created_by`.

**New tables** *(agent)*

| Table | Columns |
|---|---|
| `password_resets` | `id`, `user_id`, `token_hash`, `expires_at`, `used_at` |
| `handoff_codes` | `code_hash`, `user_id`, `game_id`, `expires_at`, `used_at` |
| `invite_requests` | `id`, `name`, `email`, `game_interest`, `message`, `status`, `ip_hash`, `created_at`, `handled_at`, `invite_code_id` |
| `games` | `id`, `slug`, `name`, `pitch`, `description`, `art_url`, `type`, `play_url`, `site_url`, `handoff_enabled`, `feedback_repo`, `feedback_labels[]`, `feedback_every_n_runs`, `show_on_showcase`, `status`, `sort_order`, `created_at` |
| `feedback` | `id`, `user_id`, `game_id`, `text`, `build_sha`, `runs`, `client_json`, `issue_url`, `attempts`, `created_at` |
| `activity_events` | `id`, `at`, `actor_user_id`, `type`, `game_id`, `subject_user_id`, `details_json` |
| `settings` | `key`, `value_json` |
| `email_outbox` | `id`, `to_email`, `template`, `payload_json`, `status` (`pending` \| `sending` \| `sent` \| `failed` \| `disabled`), `attempts`, `last_error`, `provider_id`, `send_after`, `sent_at`, `created_at`, `updated_at` |
| `playtest_slots` | `id`, `game_id`, `starts_at` (timestamptz), `duration_min`, `capacity`, `discord_channel_id`, `discord_channel_name`, `discord_event_id`, `notes`, `status` (`draft` \| `open` \| `cancelled` \| `completed`), `event_started_at`, `event_completed_at`, `created_by`, `created_at`, `updated_at` |
| `playtest_signups` | `id`, `slot_id`, `user_id`, `status` (`confirmed` \| `waitlisted` \| `cancelled` \| `expired`), `remind_4h`, `reminded_4h_at`, `join_sent_at`, `created_at`, `promoted_at`, `cancelled_at`. Unique on (`slot_id`, `user_id`) while confirmed or waitlisted; the waitlist is ordered by `created_at` |

`settings` keys include `discord_server_id`, `discord_invite_url`, `default_slot_minutes` (60), `default_slot_seats` (6), `email_reply_to`, the `alert_*` toggles, and the email templates.

**Seed games**
- **Jerboa**: open playtest, play URL `https://tylerbielman.github.io/3-minutes-to-midnight/`, handoff on, feedback repo `TylerBielman/3-minutes-to-midnight`, every 3 runs.
- **No Easy Way Up**: open playtest, play URL `https://noeasywayup.com/`, handoff on, no feedback popup.
- **Red Ring**: scheduled playtest only, with no site link-out (Tyler's decision).

---

## 10. Security and privacy

### 10.1 Secrets
These live only in `.env.production` on the server:
- `SECRET_KEY`
- `POSTGRES_PASSWORD`
- `GTX_GITHUB_TOKEN`
- `RESEND_API_KEY_GTX`
- `DISCORD_BOT_TOKEN`
- `INVITE_CODE` (seed only)

The front end holds no secrets.

### 10.2 Hardening that comes with widening the audience
- Rate limits (§5.8) and the `is_active` login fix.
- Hashed reset and handoff tokens.
- Admin role checks on the server.
- CORS limited to the listed origins.
- The honeypot on the invite-request form.
- NEWU's docs warn that the service was "playtester-minimal", so these items ship **before** the Gametronyx login goes live.

### 10.3 Privacy notice (`/privacy`)
- **What is collected**: username, email, hashed password, sessions signed up for, feedback text, and basic activity (logins, game launches).
- **Why**: running playtests and emailing reminders. It is never sold or shared.
- **Where feedback goes**: it is posted to a public GitHub issue under the player's username.
- **Deletion**: players can ask Tyler to delete their account, and admin can delete it.
- **Age**: there is no age check (Tyler's decision). The invite-only model means Tyler vouches for invitees.

### 10.4 Email hygiene
- Every reminder email links to `/me` to change reminder settings.
- Transactional emails (sign-up, the Discord link) are always sent.

---

## 11. Link-outs
- Game cards carry **no website link**: the Play button already opens the game (U23). A game's `site_url` stays in admin but isn't shown. The footer keeps one link, to noeasywayup.com.
- Red Ring appears **only as a scheduled-playtest game**, not as a link-out (Tyler's decision).

## 12. Setup checklist (for Tyler)

Steps that need Tyler's accounts or root SSH on the server:

1. **GitHub**
   - Make `TylerBielman/gametronyx` public **at launch** (it stays private while we build).
   - Settings → Pages → Source: GitHub Actions; custom domain `gametronyx.com`; Enforce HTTPS.
   - Settings → Secrets and variables → Actions → Variables: `PAGES_ENABLED` = `true`. Then push to `main` or re-run the workflow.
   - Install the Claude GitHub App on the repo so agents can push.
2. **GoDaddy DNS**
   - Apex `A` records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, and the matching `AAAA` records.
   - `CNAME www → tylerbielman.github.io`.
   - `A api → <Hetzner server IP>`.
   - Resend's DKIM, SPF and MX records, and a DMARC TXT record.
3. **Resend**: create a new free account or team just for Gametronyx, add and verify `gametronyx.com`, and create an API key.
4. **GitHub token**: create a fine-grained PAT with Issues read/write on `3-minutes-to-midnight` only. Create the labels `feedback`, `playtest` and `game:jerboa` in that repo.
5. **Discord**
   - Create a permanent (never-expiring) server invite.
   - In the Discord Developer Portal, create an application, add a bot, and copy its token into `DISCORD_BOT_TOKEN`.
   - Invite the bot to the server with View Channels, Connect, Create Events and Manage Events.
   - Paste the server ID and the invite into admin → Settings.
6. **Server** (from the desktop)
   - Add the nginx server block and certbot certificate for `api.gametronyx.com`.
   - Add the new env vars and `CORS_ORIGINS`.
   - Deploy the API; migrations run on start.
   - Install the notifications systemd timer and the backup cron.
   - Run `make_admin tyler`.
   - Remove NEWU's basic-auth block and reload nginx.
7. **Smoke test**
   - Request an invite → approve → join.
   - Play Jerboa ×3 → a feedback issue appears.
   - Create a test slot 5 hours out with 1 seat → sign up with the reminder ticked, and sign up a second account → it is waitlisted.
   - Cancel the first account → the second is promoted.
   - Receive the 4-hour and 15-minute emails; the Discord event goes Active at the start time.

---

## 13. Deferred / out of scope (v1)
- A hard gate on game builds (a game-side login check or signed-in-only hosting).
- Stricter age checks.
- Third-party analytics.
- Feedback popups for NEWU (per-game toggle exists, but NEWU needs client work).
- Game art uploads (v1 takes an art URL).
- Moving the site off GitHub Pages.
- Extracting the accounts service into its own repo.
- Per-session Discord invites, Discord DMs, and bulk "message everyone in this slot" from admin.

---

## 14. Milestones
1. **M1 Accounts API** (*built* on EFdungeon branch `claude/exciting-cray-m4hq8k`; not yet deployed): migration `0006`; email, role and rate limits; login `is_active` fix; invite master and revoke; reset; email confirmation; handoff; CORS; the `api.gametronyx.com` vhost; the notifications timer. The `settings`, `invite_requests`, `feedback` and playtest tables arrive with the milestones that use them.
2. **M2 Site shell** (*built*; the API half is on the same EFdungeon branch as M1): repo scaffold, NEWU tokens, showcase, request-invite, join, login, add-email, reset, verify-email, privacy, `/play` launcher and `/me`, plus the Pages workflow. Deploys once the repo is public and `PAGES_ENABLED` is set.
3. **M3 Launcher** (*built*: NEWU on the EFdungeon branch, Jerboa on 3-minutes-to-midnight's `claude/exciting-cray-m4hq8k`): `/play`, handoff in NEWU and Jerboa, and NEWU's basic auth removed from the repo configs. The live nginx edit is checklist step C7.
4. **M4 Feedback** (*built*): `POST /api/feedback`, GitHub issues with retries (EFdungeon branch); the Jerboa popup with tests (3-minutes-to-midnight branch).
5. **M5 Scheduling** (*built*: API on the EFdungeon branch, pages here): slots, signups and waitlist; `/schedule` and My sessions; the timer; confirmation, reminder and Discord emails with `.ics`; Discord Scheduled Events. Creating sessions needs the admin UI (M6), or the admin API until then.
6. **M6 Admin** (*built*): `/admin` with Activity, Players, Invite codes, Requests, Games, Sessions (with rosters) and Settings. It works at phone width. Admins reach it from `/me` (Open admin) or, on wider screens, the header.
7. **M7 Launch**: the §12 checklist and smoke test; invite the first playtesters.
8. **M8 Leaderboards** (*built*, not deployed): the leaderboard server in this repo's `server/` (§15) and Jerboa's end-of-run leaderboard in 3-minutes-to-midnight. Going live is checklist Part H. Next: a Leaderboards tab in `/admin`.

---

## 15. Leaderboards

Tyler's decision (2026-09-27): the leaderboard back end lives in this repo, and each game's front end lives in that game's repo. Jerboa's end-of-run celebration and board are in 3-minutes-to-midnight (`src/finale.ts`, `src/leaderboard.ts`, `src/gtx.ts`).

### 15.1 Shape
- **Code**: `server/`, its own npm package (Node 22 + TypeScript + Fastify). Nothing from the site is shared with it at runtime; CI tests it in its own job.
- **Where it runs**: a Docker container on the Hetzner box beside the accounts API, listening on `127.0.0.1:8004`. nginx serves it as **`scores.gametronyx.com`**, with its own certificate. It never touches `api.gametronyx.com`, the accounts code or the accounts database.
- **Storage**: SQLite (`node:sqlite`) in `/opt/gametronyx-scores/data/scores.db`, with a daily copy in `data/backups/` kept 14 days. Forward-only migrations; rows are never deleted, only hidden.
- **Who is playing**: the game sends the player's Gametronyx session token (from the launch handoff, §5.6). The server asks the accounts API `GET /api/auth/me` on `127.0.0.1:8001` and caches the answer for a minute. So it holds no secrets and never sees passwords or emails; disabled accounts and force-logouts are honoured within that minute.
- **Players are shown by username only**, never email.

### 15.2 Rules
- A board is per game and **season**. Each player's best score in the season counts. Ties share a rank (1, 2, 2, 4), and the earlier score is listed first.
- A game's settings in the leaderboard decide what ranks: `ranked_settings` must match the run's settings exactly, except the `free_settings` (Jerboa: the seed).
- Per-game sanity checks refuse runs that can't have happened. Jerboa: score ≤ 10 × nodes, nodes ≤ hops, the Ring's time ≤ the run length, and play time within the Ring's time plus freezes.
- A resent run (same `run_id` from the same player) is not counted twice, so games can retry safely.
- 30 posts per player per hour, plus nginx smoothing per IP (10 a second, burst 30).
- Jerboa is seeded at first start: enabled, season "Playtest 6", with Playtest 6's default settings.
- **When a game's default settings change, start a new season with the new ranked settings**; until then, runs with the new settings are refused as "not ranked".

### 15.3 API (all under `https://scores.gametronyx.com/api/leaderboards`)

| Method and path | Auth | Purpose |
|---|---|---|
| `GET /health` | none | `{ok: true}` |
| `GET /{game}?season=` | optional | The board: `{game, season, current_season, seasons[], players, rank, best, entries[], me}`. A token marks the viewer's row |
| `POST /{game}/scores` | player | Post a finished run: `{run_id, score, settings, build?, build_sha?, nodes?, hops?, seconds?, ring_seconds?, boosts?, freezes?, near_misses?}`. `201` with the board plus `previous_rank`, `previous_best`, `personal_best`; `200` for a resend |
| `GET /admin/games` | admin | Every game's settings, with its seasons and counts |
| `PUT /admin/games/{game}` `{enabled?, season?, ranked_settings?, free_settings?}` | admin | Add a game or change it. A new `season` starts a fresh board; old seasons stay readable |
| `GET /admin/games/{game}/scores?season=&before_id=&limit=` | admin | Recent runs, hidden ones included |
| `POST /admin/scores/{id}/hide` `{reason?}` · `POST /admin/scores/{id}/unhide` | admin | Take a score off the board, or put it back |

- `entries` are the top 10 plus up to 5 places above and 10 below the viewer, in rank order. `me` is the viewer's own row.
- Errors are `{detail}`, like the accounts API:
  - `400`: bad input;
  - `401`: no session, or it ended;
  - `403`: disabled account, or not an admin;
  - `404`: no leaderboard for that game;
  - `413`: body too large;
  - `422`: not ranked, or a run that can't have happened;
  - `429`: too many posts, with `Retry-After`;
  - `503`: the accounts API couldn't be reached.
- Game clients retry on `429`, `503` and network errors.

### 15.4 Deploy
One root command on the box, which is also how updates ship: `server/deploy/scores-go-live.sh` (checklist Part H). Until the `/admin` tab exists, `deploy/scores-admin.sh` on the box starts seasons, lists scores and hides them, with the same rules as the admin API. It builds the new image while the old one serves, keeps a safety copy of the database, restarts the container, installs the nginx site and certificate, and checks everything.

