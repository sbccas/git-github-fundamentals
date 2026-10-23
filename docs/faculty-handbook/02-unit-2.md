## Chapter 2: Getting Started with Git {#chapter-2}

*Sessions 3–6 · 8 hours · Missions M-03 – M-07 · Unit 2 lab*

### Learning outcomes {#ch2-outcomes}

By the end of Unit 2, a student can:

1. Navigate folders in Git Bash (`pwd`, `ls`, `cd`, `mkdir`) and avoid running Git in the wrong folder.
2. Explain local vs remote repositories and what `origin` means.
3. Create a repository with `git init` and describe what the `.git` folder holds.
4. Explain the three stages (working directory, staging area, repository) and move changes between them with `git add`, `git restore --staged` and `git commit`.
5. Read `git status` in long and short form.
6. Write clear commit messages.
7. Connect a local repository to GitHub (`git remote add`, `git push -u`) and copy a remote one (`git clone`).
8. Explain and use `git fetch` vs `git pull`, and recover from a rejected push.

### Episode 2: First commit, first push {#ch2-episode}

> Monday morning, lab 3. Krish opens Git Bash and makes a folder, `amroli-canteen`. He types `git init`. "That's it?" he asks. "Nothing happened." Hetvi tells him to type `ls -a`, and a hidden `.git` folder appears. "That folder *is* the repository," she says.
>
> Krish writes the first menu line, `Samosa 15`, and tries to commit. Git says nothing is staged. He learns `git add`, and then makes his first commit: `[main (root-commit) 6cb774b] Add menu`. He grins: "Root commit. Like the first checkpoint."
>
> By lunch he has three commits. He tried `git add .` once, and his personal `notes-private.txt` nearly went in with the project. He unstaged it with `git restore --staged` just in time.
>
> Hetvi creates an empty repository on GitHub. Krish connects it (`git remote add origin …`) and pushes. The files appear on the GitHub page and the class claps.
>
> That night Dhruvi clones the repository, adds `orders.py`, and pushes at 11:40 pm.
>
> Tuesday morning, Krish adds a new menu item and pushes. **Rejected.** "Updates were rejected because the remote contains work that you do not have locally." Hetvi smiles: "Dhruvi was up late. Fetch first, look, then pull."

Session mapping: Session 3 = the first half (init, three stages); Session 4 = staging decisions and messages (the private-notes moment); Session 5 = remote, push, clone; Session 6 = the rejected push, fetch and pull.

### The ideas in depth {#ch2-depth}

#### What is inside `.git`

| Item | Holds |
|---|---|
| `objects/` | every version of every file (**blobs**), every folder listing (**trees**), every **commit** |
| `refs/heads/` | branch names, each a file containing a commit hash |
| `refs/remotes/origin/` | **remote-tracking branches**: Git's memory of where GitHub's branches were at the last fetch/push |
| `HEAD` | which branch you are on (usually `ref: refs/heads/main`) |
| `index` | the **staging area** (created on the first `git add`) |
| `config` | settings for this repository, including remotes |

Three object types matter for teaching: a **blob** is a file's content, a **tree** is a folder (names → blobs/trees), and a **commit** points to one tree (the snapshot) plus its parent commit(s), author, date and message. That is the whole model; branches are just labels pointing to commits.

#### The three stages, precisely

- The **working directory** is ordinary files.
- The **staging area (index)** is *the snapshot Git will save next*. `git add file` copies the file's current content into it.
- The **repository** holds the saved commits.

A file therefore has a lifecycle:

```output
untracked --git add--> staged --git commit--> unmodified --edit--> modified --git add--> staged …
```

**Important subtlety for strong students:** `git add` stages the content *as it is at that moment*. If you edit the file again after `git add`, `git status` shows it **both** under "Changes to be committed" and "Changes not staged". Commit now and only the first version is saved. Demonstrate this; it explains why the staging area exists.

#### Reading `git status`

| Section | Meaning | Next command |
|---|---|---|
| Untracked files | never added | `git add <file>` |
| Changes not staged for commit | tracked file edited | `git add <file>` or `git restore <file>` to discard |
| Changes to be committed | staged | `git commit`, or `git restore --staged <file>` to unstage |
| Your branch is ahead of 'origin/main' by N commits | local commits not pushed | `git push` |
| Your branch is behind 'origin/main' … can be fast-forwarded | fetched commits not merged | `git pull` |

Short form (`git status -s`): two columns, **left = staging area, right = working directory**: `M ` staged change, ` M` unstaged change, `MM` both, `A ` new file staged, `??` untracked.

#### Commit messages

A good message completes the sentence *"If applied, this commit will …"*:

- ✅ `Add vada pav to menu` · `Fix total when cart is empty` · `Remove unused CSS`
- ❌ `update` · `changes` · `final` · `asdf` · `done`

Keep the first line under about 50 characters. For bigger changes, leave a blank line and explain *why* in a body (`git commit` without `-m` opens the editor).

#### Remotes, `origin` and upstream

- A **remote** is a named URL. `git remote add origin <url>` creates one called `origin` (a convention, not a keyword).
- `git push -u origin main` uploads `main` **and** records the **upstream** (`branch.main.remote=origin`, `branch.main.merge=refs/heads/main` in `.git/config`). After that, plain `git push`/`git pull` know where to go, and `git status` can say "ahead/behind".
- `origin/main` is a **remote-tracking branch**: a read-only bookmark of where GitHub's `main` was at the last contact. It moves only on `fetch`, `pull` or `push`, never on its own.

#### `clone` vs `init`

| | `git init` | `git clone <url>` |
|---|---|---|
| Starts with | an existing folder of yours | a repository on GitHub |
| Creates | empty history | full history copied |
| Remote | none (add one yourself) | `origin` set automatically |
| Branch tracking | none until `push -u` | `main` already tracks `origin/main` |

#### `fetch`, `pull` and rejected pushes

- `git fetch` downloads new commits and moves `origin/main`. Your `main` and your files don't change.
- `git pull` = `git fetch` + `git merge origin/main` (the default on Git for Windows is *fast-forward or merge*).
- A push is **rejected** when GitHub has commits you don't have. Git refuses to overwrite them. Correct response: `git pull` (resolve any conflict), then `git push`. Never teach `--force` as a fix at this stage.

#### Signing in (real computers)

- **Git Credential Manager** (installed with Git for Windows) opens a browser window to sign in on the first push, then stores a token in Windows Credential Manager.
- Shared lab PCs: remove the stored credential after class (*Control Panel → Credential Manager → Windows Credentials → git:https://github.com*).
- If GitHub is blocked by a proxy: `git config --global http.proxy http://host:port`.

### Worked walkthrough (real output) {#ch2-walkthrough}

This is exactly what students see in the Playground (Mission M-03 and Unit 2 lesson):

```terminal
$ mkdir amroli-canteen && cd amroli-canteen
$ git init
Initialized empty Git repository in /home/student/amroli-canteen/.git/
$ echo "Samosa 15" > menu.txt
$ git status -s
?? menu.txt
$ git add menu.txt
$ git commit -m "Add menu"
[main (root-commit) 6cb774b] Add menu
 1 file changed, 1 insertion(+)
 create mode 100644 menu.txt
$ git log --oneline
6cb774b (HEAD -> main) Add menu
```

Points to narrate: `(root-commit)` means the first commit; `6cb774b` is the short hash; `HEAD -> main` means "you are on main and it points here".

### More story examples {#ch2-stories}

**Spectrum 2026 schedule (staging).** A volunteer fixed a typo in `schedule.html` *and* started redesigning `events.html`, which is half finished. With staging she commits only the typo fix now (`git add schedule.html`), and the redesign later. *Ask:* "Without a staging area, what would happen?"

**Library system (clone).** A new student joins the library project. Instead of copying a ZIP from a senior's pen drive, she runs `git clone` and gets all 400 commits since 2019. *Ask:* "What does she lose if she uses *Download ZIP* instead?"

**PCPM portfolio (push).** A student commits each C practical after it compiles and pushes to a public repository `pcpm-practicals`. At placement time, the GitHub page shows steady work over a semester. *Ask:* "What story do the commit dates tell a recruiter?"

### Board diagrams to draw {#ch2-board}

**Three stages with arrows:**

```output
 Working directory  --git add-->  Staging area  --git commit-->  Repository
   (edit files)     <--git restore --staged--      (index)          (.git)
```

**Fetch vs pull:**

```output
 GitHub main:      A---B---C
 git fetch:        origin/main moves to C, your main stays at B
 git pull:         origin/main -> C, and your main fast-forwards to C
```

### Questions students ask {#ch2-questions}

**"Why not commit directly without `add`?"**
Because you often change several things at once and want to save them as separate, meaningful commits. (`git commit -a` exists for the simple case, but it never adds new files.)

**"Where is the staging area? I can't see it."**
It is a file, `.git/index`. You see it through `git status` and `git diff --staged`.

**"Do I have to type `-u` every time?"**
No, only on the first push of each branch.

**"What happens if two people push at the same time?"**
The second push is rejected. They pull, merge, and push again. Git never silently overwrites someone else's commits.

**"Can I rename `origin`?"**
Yes (`git remote rename origin github`), but everyone uses `origin` by convention.

**"I created the GitHub repo with a README and now `git push` fails."**
Both sides have a different first commit. Use `git pull origin main --allow-unrelated-histories`, or next time create the GitHub repo empty (or clone it instead of `init`).

**"Is `git pull` dangerous?"**
It can create a merge or a conflict, but it never deletes your committed work. Commit first, then pull.

### Misconceptions to correct {#ch2-misconceptions}

| Misconception | Correction |
|---|---|
| "`git add` saves my work." | It only stages. `git commit` saves. |
| "`git commit` uploads to GitHub." | Commit is local; `git push` uploads. |
| "`git init` creates a GitHub repository." | It only creates `.git` locally. |
| "`git fetch` didn't work because my files didn't change." | Fetch updates `origin/main` only. That's the point. |
| "Clone and Download ZIP are the same." | ZIP has no history and no connection to GitHub. |
| "Pushing again with `--force` fixes a rejected push." | It deletes teammates' commits on GitHub. Pull first. |

### Self-check for faculty {#ch2-selfcheck}

1. What does `git init` create? *A `.git` folder: the repository.*
2. Where is the staging area stored? *`.git/index`.*
3. A file shows `MM` in `git status -s`. What does that mean? *Staged change plus another unstaged change.*
4. What does `-u` record, and where? *The upstream, in `.git/config` (`branch.main.remote/merge`).*
5. What is `origin/main`? *A remote-tracking branch: where GitHub's `main` was at the last fetch/push.*
6. When does `origin/main` move? *Only on fetch, pull or push.*
7. Push rejected with "(fetch first)": correct sequence? *`git pull`, resolve if needed, `git push`.*
8. Clone vs init: two differences. *Clone copies history and sets `origin` and tracking; init starts empty with no remote.*
9. Why might `git commit -am` not include a new file? *`-a` only stages tracked files.*
10. Give a good and a bad commit message. *"Fix total when cart is empty" vs "update".*

### 10-minute recap {#ch2-recap}

1. Draw the three stages; ask students to label the arrows (`add`, `commit`, `restore --staged`).
2. Show a `git status` output and ask which command comes next.
3. "Krish's push was rejected. What happened, and what does he type?"
4. One sentence each: `fetch` vs `pull`; `clone` vs `init`.
