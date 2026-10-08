---
name: session-start
description: Start a Gametronyx work session. Use when Tyler types /session-start or opens a new session on gametronyx.com work. It covers getting oriented, Tyler's working style, and asking him questions in the moment.
---

# Session start: Gametronyx

Get oriented quickly, tell Tyler where things stand in a few lines, then ask what we're working on.

## 1. Get oriented (silently)
1. `git fetch origin` and check the branch, any unpushed work, and whether the session's branch has a merged PR. If it does, restart the branch from `origin/main`.
2. Read `AGENTS.md`, then `docs/DECISIONS.md` and the parts of `docs/DESIGN.md` the work touches. DESIGN §14 lists the milestones and §16 covers game submissions.
3. List open PRs, and the open issues in the earliest open milestone (Milestones tab; `.github/milestones.json` is the source). Note any red CI on `main`, and whether the last **Deploy leaderboard server** run failed.
4. If the work touches Jerboa, read `3-minutes-to-midnight/AGENTS.md` too. Seasons ship as gametronyx PRs merged first.

## 2. Tell Tyler where things stand
Keep it to about 8 lines, in plain language:
- **Current milestone**, and the next one or two issues in it.
- **Open PRs**, and anything red.
- **Waiting on Tyler**: only steps that need his accounts, DNS or the server, each with exact click-by-click steps.
- **Recommended first task**, with one line saying why.

Then ask **"What are we working on today?"** as a multiple-choice question (step 3), with the recommended task first.

## 3. How Tyler likes to work

### Asking questions
- **Ask in the moment, with a question card**: AskUserQuestion in Claude Code, or a decision card in a Claude project thread. Use 2–4 short options, each with a one-line consequence, and mark one "(Recommended)".
- **Never leave an open question** in a doc, a PR description or a GitHub issue. Pick the sensible default, write it down as the decision, and ask him right then if it's his call. If he answers differently, update the doc or issue.
- If a card fails to show (it happens on his phone), ask the same question again.
- Ask only about choices that change what he'd see or his goals. Make routine calls yourself and log them in `docs/DECISIONS.md` as agent calls (A#), kept apart from his decisions (U#). Anything that is really a tuning value becomes an admin setting, not a question.

### How to talk to him
- Use plain language. He often works from his phone (iOS) and is on Windows with PowerShell. He has no bash, no SSH habits and no local clone.
- Take the technical work yourself. When he must do something, give one step at a time, exactly where to click and what to paste. Never hand him a shell command without saying which app to paste it into.
- Lead with what shipped or what's needed from him. Give the live URL every time (gametronyx.com, or the PR link).
- After a change, list **what shipped**, then **choices I made that you might want changed**.

### Shipping
- Work on a `claude/*` branch and open a PR. **Merge your own PR once CI is green** and say what shipped (U26), unless he asks to review first. Merging to main deploys the site, and changes under `server/` deploy the leaderboard.
- Update DESIGN and DECISIONS in the same commit as the code.
- Run `npm test`, `npm run typecheck` and `npm run build` (and `cd server && npm test` for server changes). Check UI changes in a real browser at 360–390 px.
- Free tiers only (U4), unless he approves a cost in the moment.
- Never SSH to the server. Steps that need root go in `docs/LAUNCH_CHECKLIST.md` with exact instructions for him.
- Don't disturb his work in progress, such as live telemetry or a branch he's playtesting.

### GitHub issues
- Milestones are code: edit `.github/milestones.json` and merge.
- Each issue says what's done and how, and when it counts as done. No open questions in issues.
- Close an issue when its PR merges and the change is live.
- Feedback issues show the player's username, **never an email**.
