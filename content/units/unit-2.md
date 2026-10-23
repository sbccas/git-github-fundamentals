## Your terminal survival kit {#terminal}

Git is used from a **terminal**: on Windows that is **Git Bash**, on a Mac the Terminal app. You only need a handful of commands to move around:

| Command | Does | Example |
|---|---|---|
| `pwd` | **p**rint **w**orking **d**irectory: where am I? | `pwd` → `/home/student` |
| `ls` | list files (`ls -a` also shows hidden ones like `.git`) | `ls -a` |
| `cd` | change directory (`cd ..` = up one level, `cd ~` = home) | `cd amroli-canteen` |
| `mkdir` | make a directory (folder) | `mkdir amroli-canteen` |
| `touch` | create an empty file | `touch notes.txt` |
| `echo "…" > file` | write text into a file (`>>` adds to the end) | `echo "Samosa 15" > menu.txt` |
| `cat` | show a file | `cat menu.txt` |

```terminal
$ pwd
/home/student
$ mkdir amroli-canteen
$ cd amroli-canteen
```

:::tip The number one beginner mistake
Running Git in the wrong folder. If Git says `fatal: not a git repository`, run `pwd` and `cd` into your project. The prompt shows your folder: `~/amroli-canteen (main)`.
:::

## Local and remote repositories {#local-remote}

A **repository** (or *repo*) is a project folder that Git tracks: your files plus their complete history.

:::diagram local-remote

| | Local repository | Remote repository |
|---|---|---|
| Lives on | your computer (the `.git` folder) | a server such as GitHub |
| Needs internet? | No | Yes, to sync |
| Who can see it? | only you | your team, or the whole world if public |
| If your laptop dies | gone | **safe** |
| You send work with | n/a | `git push` |
| You get work with | n/a | `git clone`, `git fetch`, `git pull` |

:::analogy Your notebook and the class notice board
Your local repo is your own notebook: you can write in it anywhere, even with no network. The remote repo is the class notice board: everyone reads from it, and you **pin** (push) your work there when it is ready.
:::

By convention the main remote is called **`origin`**.

## Creating a repository: `git init` {#init}

```terminal
$ cd ~/amroli-canteen
$ git init
Initialized empty Git repository in /home/student/amroli-canteen/.git/
$ ls -a
./  ../  .git/
```

`git init` creates one hidden folder, **`.git`**. That folder *is* the repository: all history, branches and settings live inside it. Delete `.git` and the folder becomes an ordinary folder again.

:::diagram git-folder

:::warning Never edit .git by hand
Look inside if you are curious (`ls .git`), but let Git manage it. Also, never run `git init` in your home folder or on your Desktop: only inside a project folder.
:::

## The three stages {#three-stages}

This is **the most important idea in Git**. Every change passes through three places:

:::diagram three-stages

1. **Working directory**: the files you see and edit.
2. **Staging area** (also called the *index*): the changes you have *chosen* for the next snapshot.
3. **Repository**: the snapshots (**commits**) saved permanently in `.git`.

:::analogy The post office
You write letters at your **desk** (working directory). You put the ones that are ready into an **envelope** (staging area); you don't have to send every letter you wrote. When you **post** the envelope (commit), it is sent and recorded.
:::

Why have a staging area at all? Because real work is messy. You may fix a bug *and* start a new feature in the same hour. Staging lets you commit them as two clean, separate commits.

## Checking where things are: `git status` {#status}

`git status` is the command you will type most often. Run it before and after everything.

```terminal
$ echo "Samosa 15" > menu.txt
$ git status
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	menu.txt

nothing added to commit but untracked files present (use "git add" to track)
```

**Untracked** means Git sees the file but has never saved it. Notice that Git even tells you what to do next.

| What status says | Meaning | Colour in Git Bash |
|---|---|---|
| Untracked files | new file Git has never saved | red |
| Changes not staged for commit | a saved file was edited, but not staged | red |
| Changes to be committed | staged, ready for the next commit | green |
| nothing to commit, working tree clean | everything is saved | n/a |

There is also a short format: `git status -s` prints `??` for untracked, `M` for modified (left column = staged, right column = not staged).

## Staging changes: `git add` {#add}

```terminal
$ git add menu.txt
$ git status
On branch main

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
	new file:   menu.txt
```

Ways to stage:

| Command | Stages |
|---|---|
| `git add menu.txt` | one file |
| `git add menu.txt cart.js` | several files |
| `git add *.css` | every `.css` file in this folder |
| `git add .` | **everything** changed in this folder and below |

Staged something by mistake? Unstage it, and your edit stays safe in the file:

```terminal
$ git add .
$ git restore --staged menu.css
$ git status -s
M  menu.txt
?? menu.css
```

## Saving a snapshot: `git commit` {#commit}

```terminal
$ git commit -m "Add menu"
[main (root-commit) 6cb774b] Add menu
 1 file changed, 1 insertion(+)
 create mode 100644 menu.txt
```

Read that output: on branch **main**, the very first (**root**) commit, its short ID **6cb774b**, your message, and what changed. Every commit gets a unique 40-character ID (a SHA-1 hash). Git usually shows the first seven characters.

```terminal
$ git log
commit 6cb774b24074eb78d807a9a2420e109ab07b3a89 (HEAD -> main)
Author: Krish Patel <krish@example.com>
Date:   Thu Oct 22 22:55:39 2026 +0530

    Add menu
```

Krish edits the menu and adds a stylesheet. He commits them **separately**, because they are two different changes:

```terminal
$ echo "Vada Pav 20" >> menu.txt
$ git diff
diff --git a/menu.txt b/menu.txt
index 4b00757..b0be448 100644
--- a/menu.txt
+++ b/menu.txt
@@ -1 +1,2 @@
 Samosa 15
+Vada Pav 20
$ git add menu.txt
$ git commit -m "Add vada pav to menu"
[main b0d4373] Add vada pav to menu
 1 file changed, 1 insertion(+)
$ git add menu.css
$ git commit -m "Add menu styles"
[main 92bd5b5] Add menu styles
 1 file changed, 1 insertion(+)
 create mode 100644 menu.css
$ git log --oneline
92bd5b5 (HEAD -> main) Add menu styles
b0d4373 Add vada pav to menu
6cb774b Add menu
```

:::tip Good commit messages
Write what the commit *does*, starting with a verb: **"Add vada pav to menu"**, **"Fix total when cart is empty"**. Not "update", "changes" or "final". Your future self, and your teammates, read these messages to understand the history.
:::

:::note Shortcut: `git commit -am "message"`
`-a` stages every **modified tracked** file before committing. It does **not** add new (untracked) files; those still need `git add`.
:::

## Your first repository on GitHub {#first-repo}

There are two ways to connect a project to GitHub. Both end in the same place.

| | Method 1: local first | Method 2: GitHub first |
|---|---|---|
| Start with | a folder on your computer (`git init`) | a new repo on github.com |
| On GitHub, create the repo… | **empty**: don't add a README | **with** a README |
| Then run | `git remote add origin <url>` and `git push -u origin main` | `git clone <url>` |
| Best when | you already have code | you are starting fresh |

To create a repo on GitHub: click **+** (top right) → **New repository** → type a name → choose Public or Private → **Create repository**. GitHub then shows the exact commands to run.

:::warning "refusing to merge unrelated histories"
This error appears if you create the GitHub repo **with** a README *and* also run `git init` locally, so the two have different first commits. Pick one method. (The fix is `git pull origin main --allow-unrelated-histories`.)
:::

## Uploading: `git remote` and `git push` {#push}

Krish uses Method 1. He created an empty repo on GitHub, so he connects his local repo to it and pushes:

```terminal
$ git remote add origin https://github.com/krish-patel/amroli-canteen.git
$ git remote -v
origin	https://github.com/krish-patel/amroli-canteen.git (fetch)
origin	https://github.com/krish-patel/amroli-canteen.git (push)
$ git push -u origin main
Enumerating objects: 9, done.
Counting objects: 100% (9/9), done.
Writing objects: 100% (9/9), done.
Total 9 (delta 0), reused 0 (delta 0), pack-reused 0
To https://github.com/krish-patel/amroli-canteen.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```

- `origin` is the nickname for the GitHub URL.
- `-u` (set **u**pstream) links your `main` to `origin/main`. From now on, plain `git push` and `git pull` know where to go.

:::note Signing in
On a real computer the first push opens a browser window from **Git Credential Manager** to sign in to GitHub. GitHub no longer accepts your account password typed in the terminal. In this site's Playground the GitHub is simulated, so no sign-in is needed.
:::

## Downloading a project: `git clone` {#clone}

Hetvi created a repo for project notes. Dhruvi wants a copy on her laptop:

```terminal
$ git clone https://github.com/hetvi-desai/canteen-docs.git
Cloning into 'canteen-docs'...
remote: Enumerating objects: 3, done.
remote: Counting objects: 100% (3/3), done.
remote: Total 3 (delta 0), reused 0 (delta 0), pack-reused 0
Receiving objects: 100% (3/3), done.
$ cd canteen-docs
$ git remote -v
origin	https://github.com/hetvi-desai/canteen-docs.git (fetch)
origin	https://github.com/hetvi-desai/canteen-docs.git (push)
```

`git clone` downloads **every file and the whole history**, and sets up `origin` for you. That's why you don't run `git init` or `git remote add` after cloning.

:::warning Clone ≠ Download ZIP
GitHub's *Download ZIP* button gives you only the files: no history and no connection to GitHub. You can't push or pull from it.
:::

## Getting your team's work: `git fetch` and `git pull` {#fetch-pull}

Overnight, Dhruvi pushed a new file, `orders.py`. Next morning Krish gets her work.

:::diagram fetch-pull

**Look before you leap** with `git fetch`:

```terminal
$ git fetch
remote: Enumerating objects: 3, done.
remote: Counting objects: 100% (3/3), done.
remote: Total 3 (delta 0), reused 0 (delta 0), pack-reused 0
Unpacking objects: 100% (3/3), done.
From https://github.com/krish-patel/amroli-canteen
   92bd5b5..e423aad  main -> origin/main
$ git status
On branch main
Your branch is behind 'origin/main' by 1 commit, and can be fast-forwarded.
  (use "git pull" to update your local branch)

nothing to commit, working tree clean
$ git log --oneline main..origin/main
e423aad (origin/main) Add orders list
```

Then bring it in with `git pull` (fetch + merge):

```terminal
$ git pull
Updating 92bd5b5..e423aad
Fast-forward
 orders.py | 1 +
 1 file changed, 1 insertion(+)
 create mode 100644 orders.py
```

:::warning "rejected … (fetch first)"
If a teammate pushed before you, Git refuses your push. Never panic and never force it: run `git pull`, then `git push` again.
:::

## The daily loop {#summary}

<div class="loop">
  <span>☀️ <code>git pull</code></span><span>✏️ edit files</span><span>🔍 <code>git status</code></span><span>📦 <code>git add</code></span><span>💾 <code>git commit -m</code></span><span>☁️ <code>git push</code></span>
</div>

- A **repository** is a folder plus its history in `.git`. `git init` creates one.
- Changes move **working directory → staging area → repository** with `git add` and `git commit`.
- `git status` tells you where every file is. Read it often.
- **Local first:** `git remote add origin <url>` then `git push -u origin main`. **GitHub first:** `git clone <url>`.
- `git fetch` downloads without changing your files; `git pull` downloads and merges.
- Commit small, commit often, and write messages that start with a verb.

Practise with **Missions M-03 to M-07**, then take the Unit 2 quiz.
