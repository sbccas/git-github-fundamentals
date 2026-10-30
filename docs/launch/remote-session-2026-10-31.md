# Remote Session — Step-by-Step Task Sheet

**Saturday 31 October 2026 · 11:00 AM – 3:00 PM · from home**

Git & GitHub Fundamentals · SYBCA AI · Sutex Bank College of Computer Applications & Science, Amroli

This session counts as **attendance**. Work for **at least 2 hours** between 11:00 AM and 3:00 PM.
Everything you do is saved with its time, and your faculty see it live on the dashboard.

:::note What you need
- A **laptop or PC** with internet (Part B needs a computer; Part A also works on a phone)
- **Google Chrome**
- Your **GitHub account** (the one you use on the course site)
- The folder of your **AI project**
:::

## Step 0 — Get ready (10 minutes)

1. Open **<https://sbccas.github.io/git-github-fundamentals/account/>** in **Chrome**.
   On a phone: if it opens inside WhatsApp, tap **⋮ → Open in Chrome**.
2. Tap **I agree — continue with GitHub** and sign in.
3. In **Edit profile**, check your **Roll no** — just your number, for example `541` — and tap **Save profile**.
4. Under **Your batch** it must say **BCA 2026 – SY AI**. If not, type the class code and tap **Join**.
5. Scroll down to **Remote session — Saturday 31 October**. This card is your checklist for today. ✅

## Part A — On the course site (about 60 minutes)

1. **Missions M-12, M-13, M-14 and M-15** — open **Missions** from the menu.
   Read the story, type the commands in the terminal, and watch the goals tick. Stuck? Tap **Hint**.
2. **Unit 4 quiz** — open **Units → Unit 4**, scroll to the quiz at the end. Pass mark **60 %**; you may try again.
3. **Unit 5 quiz** — same, in **Unit 5**.
4. **Self-check** — open **More → Self-check** and take the final practice test.
5. Go back to your account page: all seven Part A items should show **✓**.

:::tip Your active time
Your active time is counted whenever your progress changes on the course site — lessons, missions, quizzes.
Keep the site open and keep working; finishing everything in 20 minutes and leaving does not count as 2 hours.
:::

## Part B — Upload your AI project to GitHub (about 60–75 minutes)

Your repository must have **all six**:

| ✓ | Item |
|---|---|
| 1 | Repository is **public** |
| 2 | **README.md** — project name, what it does, how to run it, team members |
| 3 | **.gitignore** — so secret files are never uploaded |
| 4 | **At least 5 commits** |
| 5 | **One pull request merged** from a branch |
| 6 | A tag **v1.0** |

:::warning Never upload API keys or passwords
AI projects often contain keys (OpenAI, Gemini, Groq …). Keep them in a file named `.env` and make sure `.env` is
listed in `.gitignore` **before your first commit**. If a key was ever pushed to GitHub, **delete that key on the
provider's website and create a new one** — deleting the file from GitHub is not enough, because history keeps it.
:::

Choose **Way 1** (Git on your laptop — recommended) **or** **Way 2** (GitHub website only, if Git is not installed).

### Way 1 — With Git on your laptop

**B1. Check Git.** Open **Git Bash** (or the VS Code terminal) and type:

```terminal notry
$ git --version
git version 2.47.0.windows.1
```

No version shown? Install Git from <https://git-scm.com> and open Git Bash again. Then tell Git who you are
(use the email of your GitHub account):

```terminal notry
$ git config --global user.name "Your Name"
$ git config --global user.email "you@example.com"
```

**B2. Create an empty repository on GitHub.** On github.com tap **+ → New repository**.
Name it after your project (for example `ai-study-buddy`), choose **Public**, and **do not** tick *Add a README*.
Tap **Create repository** and keep that page open — it shows your repository link.

**B3. Open your project folder in the terminal.** In File Explorer, open the project folder, right-click an empty
area → **Open Git Bash here** (or open the folder in VS Code → **Terminal → New Terminal**).

**B4. Create `.gitignore` FIRST.** Create a new file named exactly `.gitignore` in the project folder and put these
lines in it:

```text
.env
venv/
.venv/
__pycache__/
node_modules/
*.log
```

**B5. First commit.**

```terminal notry
$ git init
$ git status
$ git add .
$ git commit -m "Initial version of my AI project"
```

Look at the `git status` list before `git add .` — **`.env` must not appear**. If it does, fix `.gitignore` first.

**B6. Push to GitHub.** Copy the link from the GitHub page of step B2 and use it here:

```terminal notry
$ git branch -M main
$ git remote add origin https://github.com/your-name/ai-study-buddy.git
$ git push -u origin main
```

A browser window may ask you to sign in to GitHub — allow it. Refresh the GitHub page: your files are there. 🎉

**B7. Add a README.** Create `README.md` in the folder with your project details:

```text
# AI Study Buddy
An AI chatbot that answers questions from class notes.

## How to run
1. pip install -r requirements.txt
2. Put your API key in a .env file (see .env.example)
3. python app.py

## Team
- Your Name (541)
```

```terminal notry
$ git add README.md
$ git commit -m "Add README"
$ git push
```

**B8. More commits (5 in total).** Make small, real improvements — each one is a commit:
add `requirements.txt`, add `.env.example` (key names only, **no real keys**), add comments to your code,
add a screenshot folder … After each change:

```terminal notry
$ git add .
$ git commit -m "Describe what you changed"
$ git push
```

**B9. A branch and a pull request.**

```terminal notry
$ git switch -c feature/readme-features
```

Add a **Features** section to `README.md`, then:

```terminal notry
$ git add README.md
$ git commit -m "Add features section"
$ git push -u origin feature/readme-features
```

On GitHub tap **Compare & pull request → Create pull request → Merge pull request → Confirm merge**.
Then bring the merge back to your laptop:

```terminal notry
$ git switch main
$ git pull
```

**B10. Tag v1.0.**

```terminal notry
$ git tag v1.0
$ git push origin v1.0
```

**B11. Submit.** Copy your repository link (for example `https://github.com/your-name/ai-study-buddy`), paste it on
the account page under **Part B** and tap **Check and submit**. The site checks your repository and shows what is
still missing — fix it and tap **Check again** until you see **6 of 6**.

### Way 2 — GitHub website only (no Git installed)

**W1.** On github.com tap **+ → New repository**, choose **Public**, **tick *Add a README file***, tap **Create**.

**W2. `.gitignore` first:** **Add file → Create new file**, name it `.gitignore`, paste the lines from step B4,
tap **Commit changes**.

**W3. Upload your project:** **Add file → Upload files**, drag in your project files — **not** `.env`, `venv` or
`node_modules` — and tap **Commit changes**. Upload in two or three parts, and edit the README (pencil ✏️) with
your project details: each upload or edit is one commit — make **at least 5**.

**W4. Branch and pull request:** open `README.md` → pencil ✏️ → add a *Features* section → **Commit changes…** →
choose **Create a new branch for this commit and start a pull request** → **Propose changes → Create pull request →
Merge pull request → Confirm merge**.

**W5. Tag v1.0:** **Releases → Create a new release → Choose a tag** → type `v1.0` → **Create new tag** →
**Publish release**.

**W6. Submit** as in step B11.

## Part C — Class wall (optional, about 15 minutes)

1. Open **<https://github.com/sbccas/sy-ai-2026-wall>** and tap **Fork → Create fork**.
2. In **your fork**: **Add file → Create new file**. Name it with your roll number, for example `541.md`, and write:

   ```text
   # Your Full Name
   - Roll no: 541
   - GitHub: @your-username
   - My AI project: https://github.com/your-name/ai-study-buddy
   - One line about it: …
   ```

3. Tap **Commit changes**, then **Contribute → Open pull request**. Title: `541 – Your Name`.
   Tap **Create pull request**.
4. Copy the pull request link (it contains `/pull/`) and paste it on the account page under **Part C → Submit**.

## Before 3:00 PM — final check

- Part A: seven **✓** on your account page
- Part B: **Checklist 6 of 6**
- Part C: pull request link submitted (bonus)
- You worked for **at least 2 hours**

## If something goes wrong

| Problem | What to do |
|---|---|
| Sign-in does not finish on the phone | Open the link in **Chrome**, not inside WhatsApp, and sign in again |
| "Repository not found or private" | On GitHub: **Settings → General → Change visibility → Public**, then **Check again** |
| "GitHub is busy right now" | Your link is saved. Wait 10–15 minutes and tap **Check again** |
| `git push` is rejected (*fetch first*) | Run `git pull --rebase origin main`, then `git push` |
| `src refspec main does not match any` | You have not committed yet — do step B5 first |
| `.env` warning on the account page | Delete the key on the provider's website, create a new one, remove `.env` from GitHub, add it to `.gitignore` |
| Anything else | Ask in the class WhatsApp group |

**All the best! 🌟**
