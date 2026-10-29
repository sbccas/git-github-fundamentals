# Remote session — Saturday 31 October 2026, 11:00 – 15:00 (at home)

Git & GitHub Fundamentals · SYBCA AI · Sutex Bank College of Computer Applications & Science, Amroli

**Work for at least 2 hours.** Everything you do is saved with its time, and your faculty see it live on the
dashboard — this session counts as **attendance**.

Before you start: open <https://sbccas.github.io/git-github-fundamentals/account/> **in Chrome** (not inside WhatsApp),
sign in with GitHub, check your **roll number** in *Edit profile*, and make sure you are in **BCA 2026 – SY AI**.
The task list is on that page under **Remote session**.

## Part A — on the course site (about 60 minutes)

- Missions **M-12, M-13, M-14, M-15** (Missions page)
- **Unit 4 quiz** and **Unit 5 quiz** — pass mark 60 %
- **Self-check** (final practice test)

## Part B — upload your AI project to GitHub (about 60 minutes)

Push the AI-based project you already built to a **public** repository on your GitHub account.

1. Create the repository on GitHub (**New → Public**), without adding files.
2. **First**, in your project folder, create a file named `.gitignore` containing at least:
   `.env`, `venv/`, `__pycache__/`, `node_modules/` (one per line) — so your API keys are never uploaded.
3. Then: `git init` → `git status` (check that `.env` is **not** listed) → `git add .` →
   `git commit -m "First version"` → `git branch -M main` →
   `git remote add origin https://github.com/<you>/<project>.git` → `git push -u origin main`.
4. Complete the checklist:
   - **README.md** — project name, what it does, how to run it, team members
   - **.gitignore** — done in step 2
   - **At least 5 commits** — commit in small, meaningful steps
   - **A branch merged with a pull request** — `git switch -c feature/readme`, change, commit, `git push -u origin
     feature/readme`, open a pull request on GitHub, **Merge**
   - **A tag `v1.0`** — `git tag v1.0` → `git push origin v1.0` (or *Releases → Draft a new release*)
5. ⚠️ **Never upload API keys or passwords.** Keep them in `.env` and list `.env` in `.gitignore`. If a key was ever
   pushed, delete it on the provider's website and create a new one — removing the file is not enough.
6. Paste the repository link on the account page → **Check and submit**. The site checks your repository and shows
   what is still missing; fix it and tap **Check again**.

## Part C — class wall (optional, about 15 minutes)

Fork <https://github.com/sbccas/sy-ai-2026-wall>, add `<your-roll-no>.md`, open a pull request and paste its link on
the account page (Part C). Instructions are in the repository's README.

## Help

Stuck? Re-read the hint in the mission, the Unit pages and the cheat sheet. Message your faculty in the class group.
