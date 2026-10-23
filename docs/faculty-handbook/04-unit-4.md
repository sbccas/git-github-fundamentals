## Chapter 4: Advanced Git Commands {#chapter-4}

*Sessions 10–12 · 6 hours · Missions M-12 – M-15 · Unit 4 lab*

### Learning outcomes {#ch4-outcomes}

By the end of Unit 4, a student can:

1. Search history with `git log` and its options (`--oneline`, `--graph --all`, `-n`, `--author`, `--grep`, `-- <file>`).
2. Inspect a commit with `git show`, and refer to commits as `HEAD~n`, short hashes, branch and tag names.
3. Choose the right `git diff` (unstaged, `--staged`, two commits, two branches) and read a diff.
4. Park and restore unfinished work with `git stash` (push, list, pop, apply, drop).
5. Create lightweight and annotated tags and push them.
6. Choose the right undo command: `restore` / `checkout --` (uncommitted), `reset` (local commits; soft, mixed, hard), `revert` (pushed commits).
7. Visit an old commit (detached HEAD) and return.

### Episode 4: Detective work {#ch4-episode}

> One week before the Spectrum 2026 tech fest, Mr. Desai phones Hetvi: "Your app says a samosa costs zero rupees!"
>
> Nobody remembers changing prices. Hetvi opens Git Bash: `git log --oneline -- menu.txt`. Three commits touched the menu. `git show` on the second one reveals the culprit: *Update price list* by Meet changed `Samosa 15` to `Samosa 0`, a typo. Meet is embarrassed, but nobody had to search through files for an hour. "Next time," Hetvi says, "write *why* you changed prices in the message."
>
> The day before the fest, Krish is halfway through a new cart feature when the price bug resurfaces on the live demo. His cart code is broken, so he can't commit it. He types `git stash`, fixes the price, commits, pushes, then `git stash pop`, and his half-done cart is back.
>
> On fest day Hetvi tags the demonstrated version: `git tag -a v1.0 -m "Released at Spectrum 2026"` and pushes the tag.
>
> That evening Krish pushes *Change prices*, which accidentally sets everything to ₹99. Dhruvi has already pulled it. Krish wants to `git reset --hard`, but Hetvi stops him: "It's pushed. Use `git revert`, so nobody's history breaks."

### The ideas in depth {#ch4-depth}

#### Naming commits (revisions)

| Form | Meaning |
|---|---|
| `a1b2c3d` | a commit by (unique prefix of) its hash; 4+ characters |
| `main`, `feature-cart`, `origin/main` | the commit a branch points to |
| `v1.0` | the commit a tag points to |
| `HEAD` | the current commit |
| `HEAD~1`, `HEAD~3` | 1 or 3 first-parent steps back |
| `HEAD^2` | the second parent of a merge commit |
| `main..feature` | commits on `feature` that are not on `main` |

`HEAD~n` is **relative**: after the next commit, `HEAD~2` means something different. That's why scripts and notes should record hashes or tags.

#### `git log` options worth knowing

`--oneline`, `--graph --all`, `-n 5` / `-5`, `--author="name"`, `--grep="text"` (messages), `-- path` (commits that changed a path), `--stat` (files changed), `-p` (full patches), `--since="2 weeks ago"`, `main..origin/main` (what you haven't merged yet).

#### Reading a diff

```output
@@ -1,3 +1,4 @@
 Samosa 15
 Vada Pav 20
 Tea 10
+Coffee 20
```

`@@ -1,3 +1,4 @@` means "the old file's lines 1–3 became the new file's lines 1–4". Lines starting with a space are unchanged context, `-` removed, `+` added. A modified line appears as one `-` and one `+`.

The three stages explain the three `diff`s: `git diff` = working directory vs index; `git diff --staged` (`--cached`) = index vs HEAD; `git diff A B` = commit vs commit.

#### How stash works

`git stash` saves the current changes as special commits (one for the index, one for the working directory) referenced by `refs/stash`, then resets your files to HEAD. `stash@{0}` is the newest. `pop` = `apply` + `drop`. If applying would overwrite local changes, Git refuses and keeps the stash. By default untracked files are not stashed (`git stash -u` includes them).

Good uses: an urgent fix, pulling while you have uncommitted work, switching branches with unfinished changes. Bad use: long-term storage. Stashes are easy to forget, so use a branch instead.

#### Tags

- **Lightweight** (`git tag v1.0`): a ref in `refs/tags/` pointing to a commit, like a branch that never moves.
- **Annotated** (`git tag -a v1.0 -m "…"`): a tag **object** with tagger, date and message. Use these for releases; `git show v1.0` displays the message.
- Tags are pushed only explicitly (`git push origin v1.0` or `--tags`). On GitHub, tags appear under *Tags*, and *Releases* are built on them (Unit 5).
- Versioning convention many teams use: **semantic versioning** `MAJOR.MINOR.PATCH`, e.g. v1.2.3.

#### The undo toolbox

| Situation | Command | What changes |
|---|---|---|
| Unwanted edit, not staged | `git restore f` / `git checkout -- f` | working file ← index |
| Staged by mistake | `git restore --staged f` / `git reset f` | index ← HEAD |
| Last commit wrong, not pushed, keep work staged | `git reset --soft HEAD~1` | branch moves |
| … keep work unstaged | `git reset HEAD~1` (mixed) | branch + index move |
| … throw work away | `git reset --hard HEAD~1` | branch + index + files |
| Commit already pushed | `git revert <commit>` | new commit added |
| Just fix the last message, not pushed | `git commit --amend -m "…"` | last commit replaced |

**Why `reset` is dangerous after pushing:** it removes commits from *your* branch, but teammates still have them. Your next push is rejected (non-fast-forward); forcing it deletes their base and causes confusion. `revert` only adds a commit, so everybody can pull it normally.

**Safety net (advanced, mention only):** `git reflog` lists where HEAD has been, so even a `reset --hard` can usually be undone within a few weeks, unless the changes were never committed.

#### Detached HEAD

`git checkout <commit>` (or `git switch --detach <commit>`) points HEAD directly at a commit. You can look around, build and run the old code. New commits made here belong to no branch; create one (`git switch -c name`) before leaving if you want to keep them. `git switch main` (or `git switch -`) returns.

### Worked walkthrough (real output) {#ch4-walkthrough}

```terminal
$ git log --oneline -- cart.js
03474ce Refactor cart total
$ git show 03474ce
commit 03474ce19d00da77f18110754b73539ef13411e2
Author: Dhruvi Patel <dhruvi@example.com>
Date:   Fri Oct 23 06:18:46 2026 +0530

    Refactor cart total

diff --git a/cart.js b/cart.js
new file mode 100644
index 0000000..0cd9610
--- /dev/null
+++ b/cart.js
@@ -0,0 +1 @@
+total = 0
```

Narrate as detective work: *log* narrows the suspects, *show* examines the evidence, the author line tells you whom to ask.

### More story examples {#ch4-stories}

**Spectrum 2026 schedule (tags).** The printed schedule must match the website exactly. The team tags `schedule-final` when printing. When someone edits the site later, `git diff schedule-final` shows exactly what changed since the printout.

**Library system (revert).** A 2024 change to the fine calculation is wrong, and three batches have built on top of it. Resetting is impossible; `git revert <old commit>` undoes just that change. *Ask:* why is reset not an option?

**PCPM assignment (stash).** Halfway through `practical15.c`, the teacher asks for a quick fix to `practical14.c` before marking. `git stash`, fix, commit, `git stash pop`.

**Thesis report (diff).** Supervisor asks "what did you change since my last review?" `git diff review-1` answers instantly (with text formats like Markdown or LaTeX).

### Board diagrams to draw {#ch4-board}

**Reset modes vs the three stages:**

```output
                    branch   index   working files
reset --soft          ✓        –          –
reset (mixed)         ✓        ✓          –
reset --hard          ✓        ✓          ✓   ⚠️
```

**Reset vs revert:**

```output
reset:   A---B---C (main)   →   A---B (main)              C is gone from main
revert:  A---B---C (main)   →   A---B---C---C' (main)     C' undoes C; nothing disappears
```

### Questions students ask {#ch4-questions}

**"How do I get out of `git log`?"**
Press `q`. It's the pager, not Git being stuck.

**"Why is `git diff` empty when I changed a file?"**
Either the file is already staged (`git diff --staged`), or it's untracked (diff only shows tracked files).

**"Is a stash saved on GitHub?"**
No. Stashes are local only and are not pushed.

**"What's the difference between a tag and a branch?"**
Both are names for commits; a branch moves when you commit, a tag never moves.

**"I did `git reset --hard` and lost my work!"**
If it was committed, `git reflog` can find it. If it was never committed, Git never stored it. This is why `--hard` deserves respect.

**"Can I undo a revert?"**
Yes: revert the revert commit.

**"What's the difference between `HEAD~1` and `HEAD^`?"**
For normal commits they're the same (the parent). They differ only for merge commits: `^2` means the second parent.

### Misconceptions to correct {#ch4-misconceptions}

| Misconception | Correction |
|---|---|
| "`git revert` deletes a commit." | It adds a new opposite commit; history keeps both. |
| "`git reset` is always safe." | `--hard` discards changes; any reset after pushing causes trouble for the team. |
| "Stash is a backup on GitHub." | It's local and temporary. |
| "Tags are pushed with `git push`." | They must be pushed explicitly. |
| "`git diff` shows everything I changed." | Only unstaged changes to tracked files. |
| "Detached HEAD means something is broken." | It just means you're looking at a commit instead of a branch. |

### Self-check for faculty {#ch4-selfcheck}

1. Show commits that changed `menu.txt`. *`git log -- menu.txt`.*
2. What does `@@ -1,3 +1,4 @@` mean? *Old lines 1–3 became new lines 1–4.*
3. Show staged changes. *`git diff --staged`.*
4. `stash pop` vs `apply`? *pop removes the stash after applying.*
5. Why prefer annotated tags for releases? *They record message, tagger and date.*
6. Push all tags. *`git push origin --tags`.*
7. Undo the last local commit but keep changes staged. *`git reset --soft HEAD~1`.*
8. Why not reset a pushed commit? *Teammates still have it; the next push is rejected or forcing breaks their history.*
9. What does `git revert` create? *A new commit applying the inverse change.*
10. Return from detached HEAD. *`git switch main` (or `git switch -`).*

### 10-minute recap {#ch4-recap}

1. Give a "₹0" scenario; students name the three commands to find the culprit (`log -- file`, `show`, author line).
2. Draw the undo decision guide; students fill in the commands.
3. "You're halfway through a feature and need to fix a bug on main." (stash, or commit on a branch)
4. One sentence each: lightweight vs annotated tag; reset vs revert.
