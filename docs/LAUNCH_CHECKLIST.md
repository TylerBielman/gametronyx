# Gametronyx launch checklist (Tyler)

These are the steps only you can do: they need your accounts, your DNS, or root SSH to the server. Work top to bottom.

**Part A** can start right now and in any order.
**Parts B–E** follow once the code is merged.

Keep secrets in your password manager. Never paste them into GitHub, Discord or chat.

## What you'll collect

| Item | From | Used in |
|---|---|---|
| Resend API key (`re_…`) | A1 | C2 `RESEND_API_KEY_GTX` |
| GitHub fine-grained token (`github_pat_…`) | A4 | C2 `GTX_GITHUB_TOKEN` |
| Discord bot token | A5 | C2 `DISCORD_BOT_TOKEN` |
| Discord server ID and permanent invite link | A5 | Gametronyx Admin → Settings |
| A reply-to address for playtest emails | you | C2 `EMAIL_REPLY_TO` |

---

## Part A — accounts and DNS (start now)

### A1. New Resend account (email)
Use a separate account so underdog-football's Resend is never touched.

1. Go to <https://resend.com> and sign up with an address that is **not** the one on underdog-football's account. A Gmail alias works: `yourname+gametronyx@gmail.com`.
2. **Domains → Add Domain**. Enter `gametronyx.com` and keep the default region (US East).
3. Resend shows about three DNS records: an **MX** and a **TXT (SPF)** on the host `send`, and a **TXT (DKIM)** on the host `resend._domainkey`.
   - Add them at GoDaddy (A2), copying each value exactly.
   - Come back and click **Verify DNS Records**. It can take from a few minutes up to an hour.
4. **API Keys → Create API Key**:
   - Name: `gametronyx-prod`
   - Permission: **Sending access**
   - Domain: `gametronyx.com`
   - Copy the key now; Resend only shows it once.

### A2. GoDaddy DNS for gametronyx.com
Go to GoDaddy → **My Products** → `gametronyx.com` → **DNS** (Manage DNS).

In GoDaddy's **Name** field, type only the host part (`@`, `www`, `api`, `send`, `_dmarc`…), never the full domain.

1. **Remove GoDaddy's defaults** if they're there:
   - the `A @` record pointing to "Parked" or "WebsiteBuilder Site";
   - the `CNAME www → @` record;
   - any **Forwarding** on the domain.
2. **Website (GitHub Pages)**: add these records.

   | Type | Name | Value |
   |---|---|---|
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | AAAA | `@` | `2606:50c0:8000::153` |
   | AAAA | `@` | `2606:50c0:8001::153` |
   | AAAA | `@` | `2606:50c0:8002::153` |
   | AAAA | `@` | `2606:50c0:8003::153` |
   | CNAME | `www` | `tylerbielman.github.io` |

3. **API**: add `A` with name `api` and value **the same IP noeasywayup.com uses**. That's your Hetzner box; the IP is in `EFdungeon/deploy/README.md`.
4. **Email**:
   - Add the Resend records from A1.
   - Add `TXT` with name `_dmarc` and value `v=DMARC1; p=none;`.
5. **Domain verification**: add the GitHub TXT record from A3.

### A3. Verify the domain with GitHub
This stops anyone else from claiming gametronyx.com on GitHub Pages.

1. Go to github.com → your avatar → **Settings** → **Pages** (in the left sidebar under "Code, planning, and automation") → **Add a domain**.
2. Enter `gametronyx.com`. GitHub shows a TXT record named like `_github-pages-challenge-TylerBielman`.
3. Add that record at GoDaddy (A2), then click **Verify**.

### A4. GitHub token for feedback issues (M4)
1. Go to github.com → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Set it up:
   - **Name**: `gametronyx-feedback`
   - **Expiration**: 1 year. Add a calendar reminder to renew it.
   - **Resource owner**: TylerBielman
   - **Repository access**: *Only select repositories* → `3-minutes-to-midnight`
   - **Permissions → Repository permissions → Issues**: **Read and write**
3. Generate it and copy the token.

You don't need to create labels: the API creates missing ones itself.

### A5. Discord (M5, scheduled playtests)
1. **Channels**: in your playtest server, create a voice channel per session type, e.g. `red-ring-playtest`. A "Playtests" category keeps them tidy.
2. **Permanent invite**:
   - Right-click the server → **Invite People** → **Edit invite link**.
   - Set **Expire After**: *Never* and **Max Number of Uses**: *No limit*, then save and copy the link.
3. **Server ID**:
   - Turn on **User Settings → Advanced → Developer Mode**.
   - Right-click the server icon → **Copy Server ID**.
4. **Bot**:
   - Go to <https://discord.com/developers/applications> → **New Application** → name it `Gametronyx`.
   - **Bot** tab → **Reset Token** → copy it. Leave all "Privileged Gateway Intents" off.
   - **OAuth2 → URL Generator**:
     - Scopes: `bot`.
     - Bot permissions: **View Channels**, **Connect**, **Create Events**, **Manage Events**.
     - Open the generated URL, choose your server, and click **Authorize**.

---

## Part B — merge the code ✅ done 2026-09-26

- EFdungeon [#1620](https://github.com/TylerBielman/EFdungeon/pull/1620) (accounts API plus NEWU changes): merged. Merging doesn't deploy anything.
- 3-minutes-to-midnight [#3](https://github.com/TylerBielman/3-minutes-to-midnight/pull/3) (Jerboa launch handoff and feedback popup): merged, and Jerboa redeployed itself.

## Part C — server (any SSH client; nothing to install on your computer)

1. **Secrets** ✅ done. For reference: SSH into the box (`ssh root@noeasywayup.com` works from Windows PowerShell or macOS Terminal) and edit the env file:
   ```bash
   nano /opt/efdungeon-accounts/backend/.env.production
   ```
   Append these lines (no spaces around `=`, no quotes), then save with **Ctrl+O**, **Enter**, **Ctrl+X**:
   ```
   RESEND_API_KEY_GTX=re_...
   EMAIL_REPLY_TO=you@example.com
   GTX_GITHUB_TOKEN=github_pat_...
   DISCORD_BOT_TOKEN=...          # optional; add it whenever
   ```
2. **Stage the code on the box.** GitHub → EFdungeon → **Actions** → **stage accounts server** → **Run workflow**. The box's own runner checks out `main`. Nothing is built or shipped, and Claude can run this step for you.
3. **Go live: one command.** SSH into the box and paste:
   ```bash
   bash /opt/actions-runner/_work/EFdungeon/EFdungeon/deploy/accounts-server/gametronyx-go-live.sh
   ```
   When asked, type your No Easy Way Up username; that account becomes admin.
   - It takes a few minutes, working through 7 numbered steps, and ends with **ALL DONE**. If it prints **STOPPED** or **FAIL**, copy everything it printed and send it to Claude.
   - What it does: a safety backup of the player database, then the accounts API update, the `api.gametronyx.com` web server and certificate, the email timer, the nightly backup and your admin role, with a check of each.
   - Safe to run again. It doesn't touch the NEWU game or its browser password.

## Part D — go live

1. **gametronyx → Settings → General → Danger Zone → Change visibility → Public.**
2. **Settings → Pages**:
   - **Source**: *GitHub Actions*.
   - **Custom domain**: `gametronyx.com` → **Save**. Wait for "DNS check successful".
   - Tick **Enforce HTTPS**. It can be greyed out for up to an hour while the certificate is issued.
3. **Settings → Secrets and variables → Actions → Variables → New repository variable**: `PAGES_ENABLED` = `true`.
4. **Actions → "Build and deploy site" → Run workflow** on `main`.

## Part E — smoke test (about 10 minutes, on your phone)

1. Open <https://gametronyx.com>. The three game cards should load.
2. **Log in** with your NEWU account. It should ask for your email once, then show `/play`.
3. Tap **Play Jerboa**. The game opens, still logged in for feedback. Finish 3 runs and the feedback popup appears. **Send** it, then check the new issue in 3-minutes-to-midnight.
4. Tap **Play No Easy Way Up**. Until Part G is done it still shows the browser password prompt and asks you to log in; after Part G it opens already logged in.
5. Log out. Use **Forgot password?** with your email and follow the emailed link.
6. In a private window, **Request an invite** with a second email address.
   - You should get the admin email.
   - Approve it in **Admin → Requests**.
   - The requester email arrives with a `/join#code=…` link. Create the account.

## Part F — after launch

- **Rotate the master code.** `NOEASYWAYUP` has been shared widely and appears in the EFdungeon repo. Use **Admin → Invite codes → Rotate**, or the command line:
  ```bash
  ssh root@noeasywayup.com 'cd /opt/efdungeon-accounts/backend && docker compose -f docker-compose.prod.yml exec api python -m scripts.invite_codes rotate'
  ```
- **One-off codes for specific people:** **Admin → Invite codes → Mint codes**, with a note saying who they're for.
- **Discord:** in **Admin → Settings**, paste the server ID and permanent invite from A5. Then **Admin → Sessions → New session** can pick the voice channel.
- **First Red Ring sessions:** in **Admin → Sessions → New session**, choose a time, seats and channel, and add session notes. "Repeat weekly" creates a series.

## Part G — No Easy Way Up (on hold)

Held by Tyler on 2026-09-26. Gametronyx works without it: NEWU still launches, it just asks players to log in and keeps the browser password prompt.

1. **Ship the NEWU front end with the launch handoff.**
   - The repo side is merged, but a NEWU deploy ships everything on EFdungeon `main`, including unreleased NEWU work. Do this with your next NEWU release: GitHub → EFdungeon → **Actions** → **deploy** → **Run workflow**, with `confirm` = `ship`.
2. **Remove the browser password (basic auth).**
   - First decide how `POST /api/telemetry` is gated. It has its own basic auth and relies on players' browsers already holding the playtest password. Drop the site prompt alone and telemetry starts failing, and a browser may even prompt mid-run.
   - Options:
     - open it, with an nginx per-IP rate limit;
     - move it behind the player's account token;
     - retire it.
   - After that:
     ```bash
     ssh root@noeasywayup.com "sed -i -E 's/^([[:space:]]*)(auth_basic \"EFdungeon playtest\";|auth_basic_user_file \/etc\/nginx\/.htpasswd-noeasywayup;)/\1# \2/' /etc/nginx/sites-available/noeasywayup.com && nginx -t && systemctl reload nginx"
     curl -sI https://noeasywayup.com | head -1    # HTTP/2 200 (no longer 401)
     ```

## Part H — leaderboard server (scores.gametronyx.com)

Needs Part C done (the accounts API running on the box). About 10 minutes, any SSH client.

### H1. DNS
This tells the internet that `scores.gametronyx.com` lives on the same server as `api.gametronyx.com`.

1. GoDaddy → **My Products** → `gametronyx.com` → **DNS** → **Add New Record**.
2. Fill it in, then **Save**:

   | Type | Name | Value |
   |---|---|---|
   | CNAME | `scores` | `api.gametronyx.com` |

3. It usually works within a few minutes, and can take up to an hour.

A CNAME points at the `api` name, so there's no server address to copy, and it follows `api` if the server ever moves.

### H2. Go live
```bash
ssh root@noeasywayup.com
git clone https://github.com/TylerBielman/gametronyx /opt/gametronyx-src 2>/dev/null || git -C /opt/gametronyx-src pull --ff-only
bash /opt/gametronyx-src/server/deploy/scores-go-live.sh
```
- What it does: builds the leaderboard server, keeps a safety copy of the scores, starts it, sets up `https://scores.gametronyx.com` with a certificate, and checks each step.
- It ends with **ALL DONE**. If it stops, copy everything it printed and send it to Claude.
- It doesn't touch the accounts API, its database, NEWU or `api.gametronyx.com`.

### H3. Try it
On your phone: gametronyx.com → **Play Jerboa**, and let the Ring catch him. The end screen should say **LEADERBOARD · PLAYTEST 6** with your username highlighted.

### Updates
Run the same two commands from H2 again: they pull the latest code and restart the server with the scores kept.

### New season, hiding a score
When a Jerboa playtest changes the default settings, the board needs a new season with the new settings, or new runs are refused as "not ranked". Until the admin tab exists, do it on the box. Claude can write the exact line with the new settings for you.
```bash
ssh root@noeasywayup.com
bash /opt/gametronyx-scores/deploy/scores-admin.sh season jerboa "Playtest 7" '<new settings from Claude>'
```
The same command handles the rest; run it with no arguments for the list:
- `games` shows each board and its seasons;
- `scores jerboa 30` lists recent scores with their numbers;
- `hide 42 "test run"` takes score #42 off the board, and `unhide 42` puts it back.
Old seasons stay readable.

