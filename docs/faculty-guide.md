# Faculty Guide — Git & GitHub Fundamentals

**Certificate course · 2 credits · 30 hours · Sutex Bank College of Computer Applications & Science (SBCCAS), Amroli, Surat**

This guide helps any faculty member run the course, including someone teaching Git for the first time. It is written for
**15 sessions of 2 hours**. If your timetable uses 1-hour lectures, run **Part A** and **Part B** of each session as separate lectures.

Every session uses the course website (`https://sbccas.github.io/git-github-fundamentals/`). In this guide:
- **M-xx** = a story mission on the website (Missions page)
- **L-xx** = a guided lab on real github.com (Labs page)
- **Terminal** = the in-browser practice terminal (Playground page). It runs real Git, works on phones, and needs no install.

> Requirement IDs (M-xx, L-xx, P-xx) match `docs/PRD.md`.

---

## Contents

1. [Before the course starts](#1-before-the-course-starts)
2. [How to teach this course](#2-how-to-teach-this-course)
3. [Course map — 15 sessions](#3-course-map--15-sessions)
4. [Session plans](#4-session-plans)
5. [Assessment](#5-assessment)
6. [Troubleshooting — lab & student problems](#6-troubleshooting--lab--student-problems)
7. [Appendices](#7-appendices)

---

## 1. Before the course starts

### 1.1 Lab PC checklist (do this one week before Session 1)

| ✔ | Task | How to check |
|---|---|---|
| ☐ | **Git for Windows** installed on every lab PC (latest version from git-scm.com) | Open *Git Bash* → `git --version` |
| ☐ | **VS Code** installed (optional but recommended) | Start menu → Visual Studio Code |
| ☐ | Internet access to `github.com` works in the lab | Open github.com in a browser; run `git ls-remote https://github.com/git/git` in Git Bash — it should list refs |
| ☐ | If the college network uses a proxy, note the proxy address | See §6.3 |
| ☐ | Course website opens on lab PCs **and** on a phone | Open the Playground page and run `git init` |
| ☐ | Projector shows the terminal clearly | Increase terminal font to 18–20 pt |

### 1.2 Faculty preparation

| ✔ | Task |
|---|---|
| ☐ | Read this guide and complete all 15 missions yourself once (about 3 hours). |
| ☐ | Create a **class practice repository** under `github.com/sbccas` for Lab L-04 (see Appendix A). |
| ☐ | Prepare a student list with columns: name, roll no., programme, GitHub username. |
| ☐ | Decide the assessment weights with the course in-charge (see §5). |

### 1.3 Ask students to bring

- A phone (for the practice terminal and GitHub two-factor authentication)
- A personal email address they can open in class (to create the GitHub account)
- A notebook for the command log they will keep throughout the course

---

## 2. How to teach this course

### 2.1 The rhythm of every session

| Time | Step | What you do |
|---|---|---|
| 0–10 min | **Hook / recap** | A story problem from the Amroli Canteen team, or 3 quick recall questions |
| 10–35 min | **Concept** | Explain with the analogy and diagram on the unit page. Keep it short. |
| 35–65 min | **Live demo** | Type every command yourself on the projector. Say *what you expect* before pressing Enter, then compare. |
| 65–110 min | **Hands-on** | Students do the mission (M-xx) or lab (L-xx). You walk around. |
| 110–120 min | **Exit ticket** | 2–3 questions from the unit quiz, or "write the command for…" on paper |

### 2.2 Ten teaching rules that work for Git

1. **Always run `git status`** before and after every command in demos. Students copy the habit.
2. **Predict, then run.** Ask "what will happen?" before pressing Enter. Wrong predictions are where learning happens.
3. **Show the graph.** After every commit, branch or merge, point at the live commit graph on the Playground page.
4. **Type slowly and read output aloud.** Git's messages usually tell you what to do next. Teach students to read them.
5. **Make mistakes on purpose.** Commit without staging, push without a remote, create a conflict. Then fix them.
6. **One concept, one command.** Do not show five flags at once. Add flags only when a need appears.
7. **Phones are fine.** Students without a laptop can do every Unit 1–4 mission in the browser terminal on a phone.
8. **Pair programming for Units 2–3.** Collaboration commands (push, pull, conflicts) only make sense with two people.
9. **Use the story cast.** Krish (frontend), Dhruvi (backend), Meet (database) and Hetvi (team lead) build the "Amroli Canteen" app. Referring to them makes scenarios memorable.
10. **Commit messages matter.** From Session 3 onwards, reject messages like `update` or `changes`. Ask for "verb + what", e.g. `Add menu page`.

### 2.3 Shared lab PCs — important

Lab computers are shared, so one student's identity can leak into the next student's work.

- In the lab, have students set identity **per repository** (without `--global`):
  `git config user.name "Your Name"` and `git config user.email "you@example.com"` inside each repo.
  On their own laptop or phone, `--global` is fine. Explain the difference in Session 2.
- At the end of any session that used github.com from Git Bash, students must **remove saved GitHub credentials**:
  *Control Panel → Credential Manager → Windows Credentials → remove entries starting with `git:https://github.com`*.
- Students should sign out of github.com in the browser before leaving.

---

## 3. Course map — 15 sessions

| # | Unit | Session title | Missions / labs | Hours |
|---|---|---|---|---|
| 1 | 1 | Why version control? | — | 2 |
| 2 | 1 | Installing Git, `config`, `help` & GitHub account | M-01, M-02, L-01 (home) | 2 |
| 3 | 2 | Terminal basics, `init` and the three stages | M-03 | 2 |
| 4 | 2 | `status`, `add`, `commit` in depth | M-04 | 2 |
| 5 | 2 | Local vs remote: `push`, `clone` & your first GitHub repo | M-05, M-07 | 2 |
| 6 | 2 | Teamwork: `fetch` vs `pull` | M-06 | 2 |
| 7 | 3 | Branches: create & switch | M-08 | 2 |
| 8 | 3 | Merging & resolving conflicts | M-09, M-10 | 2 |
| 9 | 3 | Deleting branches & team branching workflow | M-11 | 2 |
| 10 | 4 | Reading history: `log`, `diff`, `show` | M-12 | 2 |
| 11 | 4 | `stash` & tags | M-13, M-14 | 2 |
| 12 | 4 | Undoing changes: `restore`/`checkout`, `reset`, `revert` | M-15 | 2 |
| 13 | 5 | The GitHub interface, repositories & issues | L-02, L-03 | 2 |
| 14 | 5 | Forks, pull requests & the cheat sheet | L-04 | 2 |
| 15 | — | Final practical, self-check & showcase | Self-check (P-07) | 2 |
| | | | **Total** | **30** |

Unit hours: Unit 1 = 4 · Unit 2 = 8 · Unit 3 = 6 · Unit 4 = 6 · Unit 5 = 4 · Assessment = 2.

---

## 4. Session plans

Each plan lists objectives, the syllabus points covered, a timeline, a demo script, the student activity,
common misconceptions, check questions with answers, and homework.

---

### Session 1 — Why version control?  *(Unit 1)*

**Objectives:** By the end, students can explain why version control exists, name the three types of VCS, and say how Git and GitHub differ.

**Syllabus:** Overview of VCS (local, centralized, distributed) · Benefits of using Git and GitHub.

**Prepare:** Unit 1 page open on the projector. A folder on your desktop with files named `project.zip`, `project_v2.zip`, `project_FINAL.zip`, `project_FINAL_really.zip`.

| Time | Activity |
|---|---|
| 0–10 | **Hook:** show the folder of `FINAL` zips. Ask: "Which one is the latest? Who changed what?" Let students share their own "final_final" stories. |
| 10–30 | **The Amroli Canteen story:** the five problems (lost work, file-name chaos, emailing files, no history, crashed laptop). Use the flip cards on the Unit 1 page. |
| 30–55 | **Three types of VCS** with the analogies (private diary / one shared library book / everyone owns a full copy). Use the "unplug the server" animation. Short history: Linus Torvalds created Git in 2005 for the Linux kernel. |
| 55–75 | **Git vs GitHub:** Git is a tool on your computer; GitHub is a website that hosts Git repositories. Git works without GitHub; GitHub needs Git. Mention GitLab and Bitbucket as alternatives. |
| 75–105 | **Group activity (paper):** groups of 4 draw how their team would share code for a project *without* Git, then list what could go wrong. Each group presents one risk. |
| 105–120 | **Exit ticket:** Unit 1 quiz questions on VCS types and Git vs GitHub. |

**Misconceptions to correct**
- "Git and GitHub are the same thing." → Git is software; GitHub is a service.
- "Version control is only for big teams." → It helps a single student too (undo, history, backup).
- "Google Drive is version control." → Drive keeps file versions, but not project-wide snapshots, branches or merging.

**Check questions**
1. Which VCS type has a single point of failure? → *Centralized.*
2. Why can Git work offline? → *Every copy of a repository contains the full history.*
3. Name one alternative to GitHub. → *GitLab, Bitbucket or Gitea.*

**Homework:** Read Unit 1 sections on installation. Bring a personal email address and phone next session.

---

### Session 2 — Installing Git, `config`, `help` & GitHub account  *(Unit 1)*

**Objectives:** Install Git on Windows, configure identity, find help from Git itself, and create a GitHub account with two-factor authentication.

**Syllabus:** Installing Git on Windows · `config` command · `help` command · Creating a GitHub account.

**Prepare:** Git for Windows installer downloaded (to show the screens even if lab PCs already have Git).

| Time | Activity |
|---|---|
| 0–10 | **Recap:** three VCS types; Git vs GitHub. |
| 10–30 | **Part A — Install walkthrough** on the projector. Recommended choices: default components; editor → *Notepad* or *VS Code* (not Vim, which confuses beginners); default branch → **override to `main`**; PATH → "Git from the command line and also from 3rd-party software"; keep the defaults for the rest. |
| 30–50 | **Demo — config & help** (script below). |
| 50–65 | **Students:** Mission **M-01** "Who am I?" and **M-02** "Ask the manual" in the browser terminal. |
| 65–105 | **Part B — GitHub account:** sign up with a professional username (e.g. `krish-patel`, not `coolboy007`). Verify email. **Enable two-factor authentication** (GitHub requires it for code contributors) using an authenticator app or GitHub Mobile. Students save their recovery codes. Add a photo and bio. |
| 105–120 | **Collect GitHub usernames** into the class sheet. Exit ticket. |

**Demo script**
```bash
git --version                                   # Git is installed
git config --global user.name "Your Name"       # who you are
git config --global user.email "you@example.com"
git config --global init.defaultBranch main     # new repos start on 'main'
git config --list                               # see all settings (press q to quit if paged)
git config user.name                            # read one setting
git help                                        # common commands
git help -g                                     # list of Git guides
git help commit                                 # full manual page
git commit -h                                   # short usage summary in the terminal
```
Point out: the email should match the GitHub account email, otherwise commits do not link to the profile.
Explain `--global` (all repos for this user) vs no flag (this repo only) and the shared-PC rule in §2.3.

**Misconceptions to correct**
- "`user.name` is my GitHub login." → It is just a label written into commits; it can be anything.
- "I need GitHub to use Git." → No; GitHub is only needed for sharing.

**Check questions**
1. Command to see all Git settings? → *`git config --list`*
2. Difference between `git help commit` and `git commit -h`? → *Full manual vs short summary.*
3. Why enable two-factor authentication? → *It protects the account even if the password leaks; GitHub requires it for contributors.*

**Homework:** Lab **L-01** — create the profile README (repository named exactly as your username).

---

### Session 3 — Terminal basics, `init` and the three stages  *(Unit 2)*

**Objectives:** Navigate folders in the terminal, create a repository with `git init`, and explain working directory → staging area → repository.

**Syllabus:** Understanding repositories · `init` · `status` · `add` · `commit` · Creating your first repository.

| Time | Activity |
|---|---|
| 0–10 | **Recap:** check that L-01 profile READMEs are live — show two on the projector. |
| 10–30 | **Terminal survival kit:** `pwd`, `ls`, `ls -a`, `cd`, `cd ..`, `mkdir`, `touch`, `echo "text" > file`, `cat`. Students try them in the browser terminal. |
| 30–55 | **Three stages** with the post-office analogy: desk (working directory) → envelope (staging area) → posted letter (commit). Use the animated three-zone diagram. |
| 55–80 | **Demo** (script below). Open the `.git` tree on the Unit 2 page and explain HEAD, objects and refs in one sentence each. |
| 80–110 | **Students:** Mission **M-03** "Day One". Then repeat the same steps in **Git Bash** on the lab PC. |
| 110–120 | Exit ticket: put the steps in order (`init`, `add`, `commit`, `status`). |

**Demo script**
```bash
mkdir amroli-canteen && cd amroli-canteen
git init                         # creates the hidden .git folder
ls -a                            # show .git
git status                       # "No commits yet", nothing to commit
echo "# Amroli Canteen" > README.md
git status                       # README.md is untracked (red)
git add README.md
git status                       # now staged (green)
git commit -m "Add README"
git status                       # working tree clean
git log --oneline                # one commit — point at the hash
```

**Misconceptions to correct**
- "`git add` saves my work." → It only *stages* changes. `commit` saves the snapshot.
- "`git init` uploads to GitHub." → It only creates a local repository.
- Running `git init` inside another repository, or in the home folder. → Always `cd` into the project folder first. Check with `pwd`.

**Check questions**
1. What does `git init` create? → *A `.git` folder that holds the repository.*
2. Name the three stages. → *Working directory, staging area, repository.*
3. A file shows in red under "Untracked files". What command stages it? → *`git add <file>`*

**Homework:** Create a repo on your own phone/PC with three commits (README, a notes file, an edit to the notes).

---

### Session 4 — `status`, `add`, `commit` in depth  *(Unit 2)*

**Objectives:** Stage selectively, unstage, write good commit messages, and read `git status` fluently.

**Syllabus:** Basic Git commands — `status`, `add`, `commit`.

| Time | Activity |
|---|---|
| 0–10 | **Recap quiz:** order the three stages; what does `add` do? |
| 10–35 | **Reading `git status`**: untracked, modified (not staged), staged ("Changes to be committed"). Read each hint line Git prints. |
| 35–65 | **Demo** (script below): `add` one file, `add .`, unstage with `git restore --staged`, view changes with `git diff` (preview only — full coverage in Unit 4). |
| 65–75 | **Commit messages:** imperative mood, short subject, what and why. Show bad vs good (`fixed stuff` vs `Fix total price when cart is empty`). |
| 75–110 | **Students:** Mission **M-04** "Pack only what matters". |
| 110–120 | Exit ticket: rewrite three bad commit messages. |

**Demo script**
```bash
echo "Samosa 15" > menu.txt
echo "body { }"  > menu.css
git status                       # two untracked files
git add menu.txt                 # stage only one
git status                       # one staged, one untracked
git add .                        # stage everything in this folder
git restore --staged menu.css    # unstage menu.css again
git commit -m "Add menu items"
git status                       # menu.css still untracked
```
Also show what happens when you run `git commit` with nothing staged.

**Misconceptions to correct**
- "`git add .` adds the whole computer." → It stages changes in the current folder and below.
- "Once committed, a file is always included automatically." → Tracked files still need `add` again after each change.

**Check questions**
1. Command to unstage a file but keep the edit? → *`git restore --staged <file>`*
2. What does `git add .` stage? → *All changes in the current directory and its subfolders.*
3. Which is the better message: `update` or `Add login form validation`? Why? → *The second; it says what changed.*

**Homework:** Read the "Local vs remote" section of Unit 2.

---

### Session 5 — Local vs remote: `push`, `clone` & your first GitHub repo  *(Unit 2)*

**Objectives:** Explain local vs remote repositories, push a local repo to GitHub, and clone a GitHub repo.

**Syllabus:** Local vs remote repositories · `push` · `clone` · Creating your first repository.

| Time | Activity |
|---|---|
| 0–10 | **Recap:** status colours; a good commit message. |
| 10–30 | **Local vs remote** table and animation (Krish's laptop ↔ GitHub ↔ Dhruvi's laptop). |
| 30–50 | **Method 1 — Local first** demo on real GitHub: create an **empty** repo on github.com (no README), then push (script below). The first push opens a browser sign-in window (Git Credential Manager). |
| 50–65 | **Method 2 — Remote first:** create a repo on GitHub *with* a README, then `git clone` it. |
| 65–105 | **Students:** Missions **M-05** and **M-07** in the browser terminal, then do Method 1 on real GitHub from the lab PC. |
| 105–120 | **Remove saved credentials** (§2.3). Exit ticket. |

**Demo script**
```bash
# Method 1 — local first (inside amroli-canteen)
git remote add origin https://github.com/<username>/amroli-canteen.git
git remote -v                     # check the connection
git branch                        # make sure the branch is 'main'
git push -u origin main           # -u remembers origin/main for future pushes
# refresh the GitHub page — files and commits are there

# Method 2 — remote first
cd ..
git clone https://github.com/<username>/canteen-docs.git
cd canteen-docs
git remote -v                     # origin is already set
```

**Misconceptions to correct**
- "Commit sends my code to GitHub." → Commit is local; `push` uploads.
- "Clone and download ZIP are the same." → A ZIP has no history and no remote connection.
- Typing the GitHub password in the terminal. → GitHub no longer accepts account passwords for Git; sign in through the browser window (or use a personal access token).

**Check questions**
1. What does `-u` in `git push -u origin main` do? → *Sets the upstream so later `git push` / `git pull` need no arguments.*
2. What is `origin`? → *The default name for the remote repository.*
3. When do you use `clone` instead of `init`? → *When the project already exists on GitHub.*

**Homework:** Push your Session 3 homework repo to GitHub.

---

### Session 6 — Teamwork: `fetch` vs `pull`  *(Unit 2)*

**Objectives:** Get teammates' changes with `fetch` and `pull`, and know the difference.

**Syllabus:** `fetch` · `pull`.

**Prepare:** Pairs of students. In each pair, Student A adds Student B as a **collaborator** on A's repo (Settings → Collaborators).

| Time | Activity |
|---|---|
| 0–10 | **Recap:** push vs commit. |
| 10–30 | **Concept:** `fetch` downloads new commits but does not change your files (parcel at the door). `pull` = `fetch` + `merge` (parcel opened). Show `origin/main` in the commit graph. |
| 30–50 | **Demo** (script below) using two terminals: one as Krish, one as Dhruvi. |
| 50–70 | **Students:** Mission **M-06** "Teammate pushed overnight". |
| 70–110 | **Pair activity on real GitHub:** B clones A's repo; B commits and pushes; A runs `fetch`, inspects, then `pull`. Swap roles. |
| 110–120 | Unit 2 quiz on the website. |

**Demo script**
```bash
# Dhruvi pushed a new commit. Krish:
git fetch origin
git status                        # "Your branch is behind 'origin/main' by 1 commit"
git log --oneline main..origin/main   # what is new on the remote
git merge origin/main             # bring it in
# or, in one step next time:
git pull
```
Then show what happens if Krish tries to push while behind (`rejected … fetch first`) and fix it with `git pull` then `git push`.

**Misconceptions to correct**
- "`fetch` changed nothing, so it failed." → It updated `origin/main`; your branch is unchanged on purpose.
- "Always force-push when rejected." → Never in a team. Pull first.

**Check questions**
1. `fetch` vs `pull` in one line each. → *fetch = download only; pull = download and merge.*
2. Push was rejected with "fetch first". What do you do? → *`git pull`, resolve if needed, then `git push`.*

**Homework:** Finish the Unit 2 quiz with at least 80%.

---

### Session 7 — Branches: create & switch  *(Unit 3)*

**Objectives:** Explain branches, and create, list and switch between them.

**Syllabus:** Introduction to branches · Creating and switching branches.

| Time | Activity |
|---|---|
| 0–10 | **Hook:** "Krish wants to try a new menu design without breaking the working app. How?" |
| 10–30 | **Concept:** a branch is a movable label on a commit; HEAD tells Git which branch you are on. Use the parallel-universe analogy and the live graph. |
| 30–55 | **Demo** (script below). |
| 55–70 | **`checkout` vs `switch`:** both work; `switch` (Git 2.23+) is clearer for branches. The syllabus mentions `checkout`, so teach both. |
| 70–110 | **Students:** Mission **M-08** "Parallel universe". |
| 110–120 | Exit ticket. |

**Demo script**
```bash
git branch                        # * main
git branch feature-menu           # create (stay on main)
git switch feature-menu           # move to it  (old way: git checkout feature-menu)
echo "Vada Pav 20" >> menu.txt
git commit -am "Add vada pav to menu"
git log --oneline --graph --all   # feature-menu is ahead of main
git switch main
cat menu.txt                      # the new line is not here!
git switch -c feature-cart        # create + switch (old way: git checkout -b feature-cart)
```
Highlight: switching branches changes the files in your folder.

**Misconceptions to correct**
- "A branch is a copy of all files." → It is just a pointer to a commit; Git is efficient.
- "My work disappeared after switching." → It is safe on the other branch.

**Check questions**
1. Create and switch in one command (two ways)? → *`git switch -c x` and `git checkout -b x`*
2. What does `*` mean in `git branch` output? → *The current branch.*

**Homework:** Create two branches in your repo with one commit each. Screenshot `git log --oneline --graph --all`.

---

### Session 8 — Merging & resolving conflicts  *(Unit 3)*

**Objectives:** Merge branches, tell fast-forward from three-way merges, and resolve a merge conflict.

**Syllabus:** Merging branches and resolving conflicts.

| Time | Activity |
|---|---|
| 0–10 | **Recap:** graph screenshots from homework. |
| 10–30 | **Fast-forward vs three-way merge:** show both on the commit graph. Rule: switch to the branch that *receives* the changes, then `git merge <other>`. |
| 30–55 | **Demo — conflict** (script below). Read the conflict markers aloud. |
| 55–75 | **Students:** Missions **M-09** "Bring it home" and **M-10** "Two edits, one line", then the conflict mini-game. |
| 75–110 | **Pair activity on GitHub:** both partners edit the *same line* of `README.md` and push. The second pusher gets rejected, pulls, resolves the conflict, and pushes. |
| 110–120 | Exit ticket: label `<<<<<<<`, `=======`, `>>>>>>>`. |

**Demo script**
```bash
git switch main
echo "Open: 9 AM" > timing.txt && git add timing.txt && git commit -m "Add opening time"
git switch -c change-timing
echo "Open: 8 AM" > timing.txt && git commit -am "Open earlier"
git switch main
echo "Open: 10 AM" > timing.txt && git commit -am "Open later"
git merge change-timing          # CONFLICT (content): Merge conflict in timing.txt
git status                       # "both modified: timing.txt"
cat timing.txt                   # show the markers
# edit timing.txt: keep the correct line, delete all markers
git add timing.txt
git commit                       # completes the merge (default message is fine)
git log --oneline --graph
```
Also show `git merge --abort` as the "escape hatch".

**Misconceptions to correct**
- "A conflict means Git is broken." → Git is asking a human to decide.
- Leaving `<<<<<<<` markers in the file. → Always search for markers before `git add`.

**Check questions**
1. When does a fast-forward merge happen? → *When the receiving branch has no new commits of its own.*
2. Steps after fixing the file? → *`git add <file>` then `git commit`.*
3. How do you cancel a merge in progress? → *`git merge --abort`*

**Homework:** Unit 3 reading on deleting branches.

---

### Session 9 — Deleting branches & team branching workflow  *(Unit 3)*

**Objectives:** Delete local and remote branches safely; follow a feature-branch workflow in a team.

**Syllabus:** Deleting branches (plus team practice).

| Time | Activity |
|---|---|
| 0–10 | **Recap:** steps to resolve a conflict. |
| 10–30 | **Demo** (script below): `-d` refuses to delete unmerged work; `-D` forces it. Pushing a branch and deleting it on GitHub. |
| 30–45 | **Team rules:** never commit straight to `main` in a team; pull before you start; small, frequent commits; one feature = one branch. |
| 45–60 | **Students:** Mission **M-11** "Spring cleaning". |
| 60–110 | **Mini-project in groups of 3–4 (Amroli Canteen):** one repo per group; each member adds a feature on their own branch (menu, cart, timings, about page), pushes the branch, and the group lead merges them one by one, resolving any conflicts. |
| 110–120 | Unit 3 quiz. |

**Demo script**
```bash
git branch                        # list
git branch -d feature-menu        # works if merged
git branch -d experiment          # error: not fully merged
git branch -D experiment          # force delete (work on it is lost)
git push -u origin feature-cart   # publish a branch
git branch -a                     # local + remote-tracking branches
git push origin --delete feature-cart   # delete it on GitHub
```

**Check questions**
1. Difference between `-d` and `-D`? → *`-d` deletes only merged branches; `-D` forces.*
2. How do you delete a branch on GitHub from the terminal? → *`git push origin --delete <branch>`*

**Homework:** Finish the group mini-project merges.

---

### Session 10 — Reading history: `log`, `diff`, `show`  *(Unit 4)*

**Objectives:** Search and read history; compare changes between the working directory, staging area, commits and branches.

**Syllabus:** Using `log` and `diff`.

| Time | Activity |
|---|---|
| 0–10 | **Hook:** "The canteen app shows wrong prices since last week. Which commit did it?" |
| 10–40 | **Demo — log** (script below). |
| 40–65 | **Demo — diff:** `git diff` (unstaged), `git diff --staged`, `git diff main feature-x`, `git diff <a> <b>`. Read `-` and `+` lines. |
| 65–105 | **Students:** Mission **M-12** "Detective" — find the commit that broke the prices. |
| 105–120 | Exit ticket: "Which command shows staged changes?" |

**Demo script**
```bash
git log                           # full log (press q to quit)
git log --oneline
git log --oneline --graph --all
git log -n 3                      # last 3 commits
git log --author="Dhruvi"
git log --grep="price"            # search commit messages
git log -- menu.txt               # commits that touched one file
git show <hash>                   # one commit in detail
git diff                          # unstaged changes
git diff --staged                 # staged changes
```

**Misconceptions to correct**
- "`git diff` shows nothing, so there are no changes." → The changes may already be staged; try `--staged`.
- Getting stuck inside the log. → Press **q**.

**Check questions**
1. Show only commits whose message contains "login"? → *`git log --grep="login"`*
2. Show what changed in commit `a1b2c3d`? → *`git show a1b2c3d`*

---

### Session 11 — `stash` & tags  *(Unit 4)*

**Objectives:** Park unfinished work with `stash`, and mark releases with tags.

**Syllabus:** Using `stash` · Stashing changes and working with tags.

| Time | Activity |
|---|---|
| 0–10 | **Hook:** "Krish is halfway through the cart page. Hetvi says the live menu has a bug — fix it now!" |
| 10–40 | **Demo — stash** (script below). Analogy: saving a game mid-level. |
| 40–60 | **Demo — tags:** lightweight vs annotated; tags are not pushed by default. |
| 60–105 | **Students:** Missions **M-13** "Drop everything!" and **M-14** "Release day". |
| 105–120 | Exit ticket. |

**Demo script**
```bash
# stash
echo "cart total" >> cart.js
git status                        # modified
git stash push -m "cart in progress"
git status                        # clean — fix the urgent bug now
git stash list
git stash pop                     # work comes back and the stash is removed
# (git stash apply keeps the stash; git stash drop deletes one)

# tags
git tag v1.0                      # lightweight
git tag -a v1.1 -m "Menu and cart released"   # annotated (preferred for releases)
git tag                           # list
git show v1.1
git push origin v1.1              # push one tag
git push origin --tags            # push all tags
```

**Misconceptions to correct**
- "Stash is a commit on my branch." → It is stored separately and does not appear in normal history.
- "Tags are pushed automatically." → They must be pushed explicitly.

**Check questions**
1. Difference between `stash pop` and `stash apply`? → *pop removes the stash after applying; apply keeps it.*
2. Which tag type stores a message and author? → *Annotated (`-a`).*

---

### Session 12 — Undoing changes: `restore`/`checkout`, `reset`, `revert`  *(Unit 4)*

**Objectives:** Choose the right undo command for each situation.

**Syllabus:** Using `reset` · Undoing changes: `revert`, `reset` and `checkout`.

| Time | Activity |
|---|---|
| 0–10 | **Recap:** stash vs commit. |
| 10–30 | **The undo decision guide** (on the Unit 4 page): Is the change committed? Is the commit pushed? |
| 30–70 | **Demo** (script below) with the three-zone diagram open; show exactly which zone each command changes. |
| 70–105 | **Students:** Mission **M-15** "Undo, the safe way". |
| 105–120 | Unit 4 quiz. |

**Decision guide**

| Situation | Command |
|---|---|
| Edited a file, not staged, want the last committed version back | `git restore <file>` (older form: `git checkout -- <file>`) |
| Staged a file by mistake | `git restore --staged <file>` |
| Last commit is **only local**; keep the changes | `git reset --soft HEAD~1` (changes stay staged) or `git reset HEAD~1` (= `--mixed`, changes unstaged) |
| Last commit is **only local**; throw the changes away | `git reset --hard HEAD~1` ⚠️ cannot be undone easily |
| Commit is **already pushed** | `git revert <hash>` — adds a new commit that undoes it |

**Golden rule:** not pushed → `reset` is fine · already pushed → use `revert`.

**Demo script**
```bash
echo "oops" >> menu.txt
git restore menu.txt              # discard the edit (same as: git checkout -- menu.txt)
echo "Dosa 40" >> menu.txt && git commit -am "Add dosa"
git reset --soft HEAD~1           # commit undone, change still staged
git status
git commit -m "Add dosa to menu"  # recommit with a better message
git revert HEAD                   # new commit that undoes the last one (editor opens; save & close)
git log --oneline                 # history kept — safe for shared branches
```
Also mention: `git checkout <hash>` moves to an old commit in "detached HEAD" state — look around, then `git switch main` to return.

**Misconceptions to correct**
- "`revert` deletes the commit." → It adds a new opposite commit; history stays.
- Using `reset --hard` to "clean up". → It deletes uncommitted work. Use only when you are sure.

**Check questions**
1. A bad commit is already on GitHub. Which command? → *`git revert <hash>`*
2. What does `--soft` keep? → *The changes, staged.*

---

### Session 13 — The GitHub interface, repositories & issues  *(Unit 5)*

**Objectives:** Navigate GitHub confidently; create and manage repositories; use issues.

**Syllabus:** Navigating the GitHub interface · Creating and managing repositories on GitHub · Understanding issues.

| Time | Activity |
|---|---|
| 0–10 | **Recap:** undo decision guide. |
| 10–40 | **Interface tour** on the projector (use `github.com/sbccas` as the example): profile, repositories list, a repo's tabs (Code, Issues, Pull requests, Actions, Settings), the green **Code** button, commits view, branches dropdown, file history and blame, stars and watching. |
| 40–60 | **Creating & managing repos:** public vs private; README, `.gitignore` template and licence options; editing a file in the browser; Settings → rename, collaborators, default branch, danger zone (explain, don't click). |
| 60–75 | **Issues:** a good issue has a clear title, steps to reproduce, expected vs actual. Labels, assignees, closing an issue with a commit message keyword (`Fixes #3`). |
| 75–110 | **Students:** Labs **L-02** (create and configure a repo) and **L-03** (open an issue on a partner's repo; partner fixes it with a commit `Fixes #n`). |
| 110–120 | Exit ticket. |

**Check questions**
1. Where do you add a collaborator? → *Repo → Settings → Collaborators.*
2. What happens when a commit message on the default branch contains `Fixes #3`? → *Issue #3 closes automatically.*

---

### Session 14 — Forks, pull requests & the cheat sheet  *(Unit 5)*

**Objectives:** Contribute to someone else's project with fork → branch → pull request; review and merge a PR.

**Syllabus:** Understanding pull requests · Forking repositories · Git cheat sheet.

**Prepare:** The class practice repository (Appendix A) is ready; you are its maintainer.

| Time | Activity |
|---|---|
| 0–10 | **Recap:** issues. |
| 10–30 | **Fork vs clone vs branch** — fork = your copy on GitHub; clone = a copy on your computer; branch = a line of work inside a repo. Walk through the 7-step contribution flow. |
| 30–50 | **Demo:** fork the class repo, clone the fork, add `upstream`, branch, commit, push, open a PR. Then, as maintainer, review: comment on a line, request a change, approve, merge. Mention merge options (merge commit / squash / rebase). |
| 50–105 | **Students:** Lab **L-04** — each student adds `students/<github-username>.md` to the class repo through a PR. You review and merge live on the projector. |
| 105–120 | **Cheat sheet tour** (Cheat sheet page): search, unit filter, print. Unit 5 quiz. |

**Demo script**
```bash
git clone https://github.com/<your-username>/<class-repo>.git
cd <class-repo>
git remote add upstream https://github.com/sbccas/<class-repo>.git
git switch -c add-<your-username>
echo "# <Your Name>" > students/<your-username>.md
git add . && git commit -m "Add <your-username> profile card"
git push -u origin add-<your-username>
# GitHub shows "Compare & pull request" — open the PR to sbccas/<class-repo>
# later, to stay up to date:
git pull upstream main
```

**Check questions**
1. Why fork instead of clone when contributing to someone else's repo? → *You have no push access to theirs; the fork is your own copy on GitHub.*
2. What is `upstream`? → *A remote pointing to the original repository.*

**Homework:** Revise with the cheat sheet; complete the self-check practice on the website.

---

### Session 15 — Final practical, self-check & showcase

| Time | Activity |
|---|---|
| 0–60 | **Practical test** on lab PCs or the browser terminal (see §5.2). |
| 60–90 | **Self-check** (P-07) on the website — students submit a screenshot of their score report (Phase 1) or it is recorded automatically (Phase 2). |
| 90–120 | **Showcase:** 3–4 groups show their Amroli Canteen repo — branches, merged PRs, tags, and their GitHub profile. Feedback and course wrap-up. |

---

## 5. Assessment

> Suggested scheme — adjust to the college's certificate-course norms and the course in-charge's decision.

### 5.1 Weights

| Component | Weight | Evidence |
|---|---|---|
| Unit quizzes (5) | 20% | Website quiz scores |
| Missions & labs | 30% | Mission completion; L-01 to L-04 links |
| Group mini-project (Session 9) | 15% | Group repo: branches, merges, commit quality |
| Final practical (Session 15) | 25% | Practical test (rubric below) |
| Final self-check | 10% | Score report |

### 5.2 Final practical — sample tasks

Give each student 6–8 tasks. Make your own variants for the real exam; these are samples only.

1. Create a repository `exam-<roll>`, set name and email for this repository only, and make two commits.
2. Create branch `feature-a`, commit a change, merge it into `main`.
3. Create and resolve a merge conflict in `notes.txt`.
4. Stash an unfinished change, make a fix commit, then restore the stash.
5. Tag the current commit as `v1.0` with an annotated message.
6. Undo the last commit but keep its changes staged.
7. Revert a specific earlier commit.
8. Push the repository and the tag to GitHub; submit the URL.

### 5.3 Rubric (per task)

| Score | Meaning |
|---|---|
| 2 | Correct result, correct commands, clean history and clear messages |
| 1 | Correct result with extra or wrong attempts left in history, or unclear messages |
| 0 | Not done or wrong result |

---

## 6. Troubleshooting — lab & student problems

### 6.1 Common Git errors

| Message (shortened) | Cause | Fix |
|---|---|---|
| `fatal: not a git repository` | Running Git outside the project folder | `pwd`, then `cd` into the repo |
| `Author identity unknown … Please tell me who you are` | Name/email not set | `git config user.name …` and `git config user.email …` |
| `error: src refspec main does not match any` | No commits yet, or the branch is called `master` | Commit first; check `git branch`; rename with `git branch -M main` |
| `! [rejected] main -> main (fetch first)` / `non-fast-forward` | Remote has commits you don't have | `git pull`, resolve, then `git push` |
| `fatal: refusing to merge unrelated histories` | Repo created on GitHub *with* a README and also `git init` locally | `git pull origin main --allow-unrelated-histories`, or use Method 2 (clone) next time |
| `Support for password authentication was removed` | Typed the account password | Sign in through the Git Credential Manager browser window, or use a personal access token |
| `fatal: remote origin already exists` | `remote add` run twice | `git remote set-url origin <url>` |
| `Your local changes … would be overwritten by checkout` | Uncommitted changes when switching branch | Commit or `git stash` first |
| `You are in 'detached HEAD' state` | Checked out a commit, not a branch | `git switch main` (or `git switch -c new-branch` to keep work) |
| Screen full of `~` lines / text you can't exit | Vim opened for a commit message | Type `:wq` and Enter; next time use `-m` or set `core.editor` to Notepad |
| `warning: LF will be replaced by CRLF` | Windows line-ending conversion | Harmless; explain briefly (see Bonus → `.gitattributes`) |
| Log output won't go away | Pager is open | Press `q` |

### 6.2 Browser terminal (website)

| Problem | Fix |
|---|---|
| Terminal state is messy | Run `reset-lab` or use **Reset sandbox** |
| Progress missing on a different device | Phase 1 saves progress per device; use **Export / Import progress** |
| Command "not supported" | The terminal lists supported commands; use Git Bash for anything outside the syllabus |
| Phone keyboard hides the terminal | Rotate to landscape or use the key bar's quick buttons |

### 6.3 College network

- If `git clone` hangs or fails behind a proxy:
  `git config --global http.proxy http://<proxy-host>:<port>` (remove later with `git config --global --unset http.proxy`).
- If github.com is blocked in the lab, students can still do every Unit 1–4 mission in the browser terminal and do the GitHub labs at home.

---

## 7. Appendices

### Appendix A — Setting up the class practice repository (for Lab L-04)

1. Under `github.com/sbccas`, create a public repo, e.g. `git-practice-2026`, with a README.
2. Add a folder `students/` containing a `.gitkeep` file.
3. Add `CONTRIBUTING.md` explaining: fork → branch named `add-<username>` → add only `students/<username>.md` → open a PR with a clear title.
4. Settings → Branches → add a protection rule for `main` requiring a pull request before merging.
5. Because each student adds a **different file**, PRs will not conflict. For a conflict demonstration, ask two volunteers to edit the same line of `README.md`.

### Appendix B — Command log template for students

| Date | Command | What it did | Mistake I made / what I learned |
|---|---|---|---|
| | | | |

### Appendix C — Mapping to the syllabus

| Syllabus point | Session(s) |
|---|---|
| Local / centralized / distributed VCS | 1 |
| Benefits of Git and GitHub | 1 |
| Installing Git on Windows · `config` · `help` · GitHub account | 2 |
| Local vs remote repositories | 3, 5 |
| `init`, `status`, `add`, `commit` | 3, 4 |
| `push`, `clone` | 5 |
| `pull`, `fetch` | 6 |
| Creating your first repository | 3, 5 |
| Introduction to branches · creating & switching | 7 |
| Merging & resolving conflicts | 8 |
| Deleting branches | 9 |
| `log`, `diff` | 10 |
| `stash` · tags | 11 |
| `reset` · undoing: `revert`, `reset`, `checkout` | 12 |
| GitHub interface · creating & managing repos · issues | 13 |
| Pull requests · forking · cheat sheet | 14 |

### Appendix D — Faculty FAQ

**Can a student finish the course using only a phone?**
Yes for Units 1–4 (browser terminal and missions). For Unit 5 labs, the GitHub mobile website or app works, but a PC is easier.

**Do students need their own laptops?**
No. Lab PCs plus the browser terminal are enough.

**Should I teach `checkout` or `switch`/`restore`?**
Both. The syllabus names `checkout`; modern Git splits it into `switch` (branches) and `restore` (files). Show the old and new forms side by side.

**How do I check that a student really completed a lab?**
Ask for the GitHub URL (repo, issue or PR). The commit history and timestamps show the work.

---

*Change log*

| Date | Version | Change |
|---|---|---|
| 2026-10-22 | 1.0 | First draft |
