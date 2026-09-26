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
| U13 | Look | **Match NEWU** (palette and fonts from `ef-app/src/styles/tokens.css`) |
| U14 | Age | **No age check** (invite-only; Tyler vouches for invitees) |
| U15 | Link-outs | **noeasywayup.com only** for now. Red Ring is shown only as a scheduled-playtest game, not as a link-out |
| U16 | Scheduling | Use a free existing tool only if it is seamless for players. Research found none that meets the brief, so it is **built in** on the shared API (Cal.com Free was the runner-up; see DESIGN §7) |
| U17 | Discord | Email carries the Discord details; **each slot is also posted as a Discord Scheduled Event** through a bot |
| U18 | Repo visibility | Private while building; **public at launch** so GitHub Pages works on the free plan |

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

## Open items
None block the design. Values Tyler supplies at setup (DESIGN §12): the Discord server ID and invite, the bot token, the Resend key, the GitHub token, and the GoDaddy DNS records.
