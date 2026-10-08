---
name: session-end
description: Wrap up a Gametronyx work session. Use when Tyler types /session-end or says he's done for now. Leaves nothing unpushed, keeps the docs and issues current, and tells him what shipped and what's next.
---

# Session end: Gametronyx

Leave the repo so the next session's `/session-start` picks up cleanly, with nothing Tyler has to remember.

## 1. Nothing left behind
1. Commit and push any work on the session's `claude/*` branch.
2. For each PR this session opened: if CI is green, merge it (U26). If it's red, fix it, or tell Tyler exactly what's blocking it. Never end with a PR that's red and unexplained.
3. If anything under `server/` merged, check that the **Deploy leaderboard server** run passed.

## 2. Docs and issues match what shipped
1. `docs/DESIGN.md` and `docs/DECISIONS.md` describe what's live. Record new calls as agent decisions (A#) and Tyler's answers as U#, each in the commit that made the change.
2. Close the issues whose PRs merged and are live, with a one-line comment naming the PR.
3. Update an issue whose plan changed during the session, so it says what's done and how, with no open questions.
4. If the roadmap changed, edit `.github/milestones.json` and merge.

## 3. Ask before closing out
Ask Tyler, as a question card (AskUserQuestion, or a decision card in a project thread):
- **"Anything you haven't tried yet on your phone?"** Offer what shipped this session as options. Put each untested item on its issue as a "Needs testing" comment, and keep that issue open until he says it works.

## 4. Tell Tyler
Keep it to about 6 lines, in plain language:
- **Shipped**: what's live now, with the link (gametronyx.com or the PR).
- **Choices I made that you might want changed**, if any.
- **Waiting on you**: only steps that need his accounts, DNS or the server, with exact click-by-click steps.
- **Next up**: the next issue in the current milestone.
