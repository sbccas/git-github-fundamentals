## Going public {#going-public}

The Amroli Canteen app is a success. Mr. Desai wants to report bugs directly, juniors from another college want to use the code for *their* canteen, and Hetvi wants every change reviewed before it reaches `main`.

So far you have used GitHub as a place to **store** commits. In this unit you'll use it as a place to **work together**: browsing projects, managing repositories, tracking work with **issues**, reviewing changes with **pull requests**, and contributing to other people's projects with **forks**.

:::note GitHub's design changes
GitHub updates its website regularly. Buttons may move or look slightly different from these notes, but the ideas (repositories, issues, pull requests, forks) stay the same.
:::

## A tour of a repository page {#tour}

:::diagram github-repo-page

Some useful things to know:

- Press **`t`** on a repository page to search for a file, and **`.`** to open it in a web code editor.
- Click **🕒 commits** to see the history (like `git log`), and click any commit to see its diff (like `git show`).
- Open a file and choose **History** (its commits) or **Blame** (who last changed each line).
- The **branch menu** lets you look at any branch without cloning.

## Your profile and finding projects {#profile}

Your profile page (`github.com/<username>`) shows your profile README (Lab L-01), pinned repositories and the **contribution graph**: the green squares that grow with every commit linked to your email.

| Action | What it does |
|---|---|
| ⭐ **Star** | bookmark a project and show appreciation; stars measure popularity |
| 👁 **Watch** | get notifications about a repository's activity |
| ⑂ **Fork** | make your own copy of someone else's repository (below) |
| 🔍 **Search** / **Explore** | find projects by topic, language or name |

:::tip Your portfolio
Recruiters look at GitHub profiles. Pin your best three repositories, give each a clear README, and commit regularly. Steady green squares tell a story.
:::

## Creating a repository on GitHub {#create-repo}

Click **+ → New repository**. The form asks for:

| Field | Advice |
|---|---|
| **Repository name** | short, lowercase, hyphens: `amroli-canteen` |
| **Description** | one sentence: what it is |
| **Public / Private** | public = anyone can see; private = only people you invite |
| **Add a README** | yes if you will `git clone` it; **no** if you will push an existing project |
| **.gitignore template** | pick your language (Python, Node, C…) to ignore build files |
| **License** | for open source, e.g. MIT; without one, others may not legally reuse your code |

You can also create a file directly on GitHub (**Add file → Create new file**) and **commit** it in the browser. That creates a real commit, which you then `git pull` to your computer.

## Managing a repository {#manage}

Everything under **Settings** is visible only to owners and admins:

| Setting | Use |
|---|---|
| **General → Repository name** | rename (GitHub redirects old links) |
| **General → Default branch** | the branch people see first (usually `main`) |
| **Collaborators** | give teammates push access (they must accept the invitation) |
| **Branches → Branch protection** | e.g. "require a pull request before merging into `main`" |
| **Pages** | publish a website from the repository (see Bonus) |
| **Danger zone** | change visibility, transfer, archive or **delete** (no undo) |

**Releases** turn a tag (Unit 4) into a downloadable version with notes: *Releases → Draft a new release → choose tag `v1.0`*.

## Issues: tracking work {#issues}

An **issue** is a discussion about one task: a bug, a feature request, a question. Every issue gets a number (`#3`).

:::story Mr. Desai reports a bug
**Title:** Cart total wrong when the same item is added twice
**Body:** Steps: 1) add Samosa, 2) add Samosa again, 3) open cart. Expected ₹30, shows ₹15. Phone: Android, Chrome.
:::

A good issue has:

- a **clear title** that names the problem,
- **steps to reproduce**, **expected** vs **actual** result,
- screenshots or error messages if possible.

Then the team:

- adds **labels** (`bug`, `enhancement`, `good first issue`),
- **assigns** someone,
- discusses in **comments** (Markdown works; mention people with `@username`).

**Close an issue from a commit** by writing a keyword and the number in the message:

```terminal notry
$ git commit -m "Fix cart total for repeated items (fixes #3)"
$ git push
```

When that commit reaches the default branch, GitHub closes issue #3 automatically. Keywords that work include `fixes`, `closes` and `resolves`.

## Pull requests: proposing changes {#pull-requests}

A **pull request (PR)** says: *"Here is my branch. Please review it and merge it into `main`."* It is how professional teams merge work, because a teammate checks the code first.

:::diagram pr-flow

**Opening a PR:** after `git push -u origin feature-cart`, GitHub shows a yellow **Compare & pull request** banner. Choose **base: `main`** ← **compare: `feature-cart`**, write a title and a description (what, why, how to test, `Closes #3`), and click **Create pull request**.

**Reviewing a PR** (Hetvi's job):

- **Files changed** tab: the diff, like `git diff main feature-cart`.
- Click a line to add a **comment**.
- Finish the review: **Comment**, **Approve**, or **Request changes**.
- The author fixes things by **pushing more commits to the same branch**. The PR updates by itself.

**Merging a PR** offers three buttons:

| Option | Result |
|---|---|
| **Create a merge commit** | keeps all commits plus a merge commit (like `git merge --no-ff`) |
| **Squash and merge** | combines the branch into one commit on `main` |
| **Rebase and merge** | replays the commits on top of `main`, no merge commit |

After merging, click **Delete branch**, then update your computer: `git switch main` and `git pull`.

:::warning Conflicts in a PR
If `main` changed the same lines, GitHub says *"This branch has conflicts that must be resolved"*. Fix it exactly as in Unit 3: merge `main` into your branch locally, resolve, commit and push. (Small conflicts can also be resolved in GitHub's web editor.)
:::

## Forking: contributing to other projects {#forking}

You can't push to a repository you don't own. To contribute anyway, you **fork** it: GitHub copies it to your account, you change your copy, and you send a pull request back.

:::diagram fork-flow

| | Fork | Clone | Branch |
|---|---|---|---|
| Creates | a copy **on GitHub**, under your account | a copy **on your computer** | a new line of work **inside** a repository |
| Done with | the **Fork** button | `git clone` | `git branch` / `git switch -c` |

**The seven-step contribution flow:**

```terminal notry
$ git clone https://github.com/krish-patel/git-practice-2026.git
$ cd git-practice-2026
$ git remote add upstream https://github.com/sbccas/git-practice-2026.git
$ git switch -c add-krish-patel
$ echo "# Krish Patel" > students/krish-patel.md
$ git add .
$ git commit -m "Add krish-patel profile card"
$ git push -u origin add-krish-patel
```

Then open the pull request from your fork to the original. Later, to get the original's new commits: `git pull upstream main`, or press **Sync fork** on your fork's GitHub page.

## Open source etiquette {#open-source}

Well-run projects contain a few standard files:

| File | Purpose |
|---|---|
| `README.md` | what the project is, how to install and use it |
| `LICENSE` | what others may legally do with the code |
| `CONTRIBUTING.md` | how to contribute: branch names, code style, PR rules |
| `.gitignore` | files Git should not track |

Before contributing: read `CONTRIBUTING.md`, look for issues labelled **good first issue**, keep each PR small and focused, and be polite in reviews.

## Your Git cheat sheet {#cheatsheet}

The full, searchable, printable list is on the [Cheat sheet](/cheatsheet/) page. The ten commands you'll use most:

| Command | Does |
|---|---|
| `git status` | where is everything? |
| `git add <file>` / `git add .` | stage |
| `git commit -m "…"` | save a snapshot |
| `git pull` | get the team's work |
| `git push` | share your work |
| `git switch -c <branch>` | start a feature |
| `git merge <branch>` | bring a branch in |
| `git log --oneline --graph --all` | see the history |
| `git diff` | see what changed |
| `git restore <file>` | discard an edit |

## Unit 5 summary {#summary}

- A repository page shows code, history, branches, issues, pull requests and settings; the README is its front page.
- Create repositories with a README (to clone) or empty (to push); choose visibility, `.gitignore` and licence.
- **Issues** track bugs and tasks; `fixes #3` in a commit closes issue 3.
- **Pull requests** propose merging a branch; teammates review, then merge (merge commit, squash or rebase).
- **Fork** = your copy on GitHub; contribute with fork → clone → branch → commit → push → PR; `upstream` points to the original.

Practise with **Labs L-01 – L-04**, then take the Unit 5 quiz and the final [Self-check](/self-check/).
