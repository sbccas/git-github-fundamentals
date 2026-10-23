---
title: Local vs remote: push, clone & your first GitHub repo
session: 05
unit: 2
duration: 120
---
<!-- slide: title -->
<p class="kicker">Session 5 · Unit 2</p>

# Ship it to GitHub

Local vs remote · `git push` · `git clone`

Notes:
Timeline: recap 10 · local vs remote 20 · local-first demo on real GitHub 20 · remote-first (clone) 15 · Missions M-05/M-07 + real push 40 · remove credentials + exit ticket 15.

---
## Local and remote repositories

:::diagram local-remote

Notes:
Notebook vs class notice board. You write in your notebook anywhere; you pin (push) to the board when ready.

---
## Local vs remote

| | Local | Remote (GitHub) |
|---|---|---|
| Lives on | your computer | a server |
| Needs internet | no | yes, to sync |
| If your laptop dies | gone | **safe** |
| Send work | n/a | `git push` |
| Get work | n/a | `git clone` · `fetch` · `pull` |

---
## Two ways to start

| | Method 1: local first | Method 2: GitHub first |
|---|---|---|
| Start with | your folder (`git init`) | a new repo on github.com |
| GitHub repo | **empty**, no README | **with** README |
| Then | `remote add` + `push -u` | `git clone` |

---
<!-- slide: command -->
## Method 1: connect and push

```terminal
$ git remote add origin https://github.com/krish-patel/amroli-canteen.git
$ git remote -v
origin	https://github.com/krish-patel/amroli-canteen.git (fetch)
origin	https://github.com/krish-patel/amroli-canteen.git (push)
$ git push -u origin main
To https://github.com/krish-patel/amroli-canteen.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```

Notes:
On a real PC the first push opens a browser window (Git Credential Manager). GitHub does not accept your password typed in the terminal. Refresh the GitHub page: the files are there.

---
<!-- slide: two -->
## What those words mean

:::neon `origin`
A nickname for the GitHub URL. A convention, not magic.
:::

:::neon+ `-u` (set upstream)
Links your `main` to `origin/main`. From now on plain `git push` / `git pull` just work.
:::

---
<!-- slide: command -->
## Method 2: `git clone`

```terminal
$ git clone https://github.com/hetvi-desai/canteen-docs.git
Cloning into 'canteen-docs'...
Receiving objects: 100% (3/3), done.
$ cd canteen-docs
$ git remote -v
origin	https://github.com/hetvi-desai/canteen-docs.git (fetch)
origin	https://github.com/hetvi-desai/canteen-docs.git (push)
```

Every file **and the whole history**, with `origin` already set.

---
<!-- slide: center -->
:::warning Clone ≠ Download ZIP
A ZIP has **no history** and **no connection** to GitHub: you can't push or pull.
:::

---
<!-- slide: center -->
:::warning "refusing to merge unrelated histories"
You created the GitHub repo **with** a README *and* ran `git init` locally: two different first commits.

**Pick one method.** (Fix: `git pull origin main --allow-unrelated-histories`)
:::

---
<!-- slide: activity 40 -->
## Practice

- Missions **M-05** (push) and **M-07** (clone, commit, push)
- Then on the lab PC: push your Session 3 repository to **your real GitHub**

Notes:
Press T. Real pushes need the browser sign-in. Have students who finish help neighbours.

---
<!-- slide: center -->
:::warning Before you leave a lab PC
*Control Panel → Credential Manager → Windows Credentials →* remove `git:https://github.com`

…and sign out of github.com in the browser.
:::

---
<!-- slide: quiz reveal -->
## Exit ticket

1. What does `-u` do in `git push -u origin main`?
2. What is `origin`?
3. When do you use `clone` instead of `init`?

:::reveal+ Answers
Sets the upstream so later push/pull need no arguments · the default name of the remote · when the project already exists on GitHub
:::
