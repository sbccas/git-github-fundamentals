## The ₹0 mystery {#mystery}

A week before the Spectrum 2026 tech fest, Mr. Desai, the canteen manager, phones Hetvi: *"The cart says the total is ₹0!"* Nobody remembers touching the cart code. In Unit 1 this would have been a disaster. With Git, it's a detective story: the history records **every change, who made it, when and why**.

In this unit you will learn to:

- **read** history (`git log`, `git show`, `git diff`),
- **park** unfinished work (`git stash`),
- **mark** releases (`git tag`),
- and **undo** mistakes safely (`git restore`, `git reset`, `git revert`).

## Reading history: `git log` {#log}

```terminal notry
$ git log
commit be6e58670ebd8d0c94d25d66a5ca7b213c10e50c (HEAD -> main)
Author: Krish Patel <krish@example.com>
Date:   Fri Oct 23 06:18:46 2026 +0530

    Add tea to menu

commit 03474ce19d00da77f18110754b73539ef13411e2
Author: Dhruvi Patel <dhruvi@example.com>
Date:   Fri Oct 23 06:18:46 2026 +0530

    Refactor cart total
```

The full log is long; these options make it useful:

| Command | Shows |
|---|---|
| `git log --oneline` | one line per commit |
| `git log -n 3` or `git log -3` | only the last 3 commits |
| `git log --oneline --graph --all` | every branch, drawn as a graph |
| `git log --author="Dhruvi"` | commits by one person |
| `git log --grep="cart"` | commits whose **message** contains "cart" |
| `git log -- cart.js` | commits that **changed** `cart.js` |
| `git log --stat` | which files each commit changed |

The detective work begins. Which commits touched the cart?

```terminal notry
$ git log --oneline
be6e586 (HEAD -> main) Add tea to menu
03474ce Refactor cart total
63a4905 Add vada pav
1d297a5 Add menu
$ git log --oneline -- cart.js
03474ce Refactor cart total
```

:::tip Press q to quit
If the log is longer than the screen, Git Bash shows it page by page. Use ↑ ↓ or Space to scroll and **q** to quit.
:::

## Inspecting one commit: `git show` {#show}

```terminal notry
$ git show HEAD~1
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

Found it: `total = 0`. Now the team knows **what** changed, **who** changed it and **when**, and can ask Dhruvi **why**.

**Naming commits.** You can refer to a commit by its short hash (`03474ce`), a branch or tag name (`main`, `v1.0`), or relative to HEAD:

| Name | Means |
|---|---|
| `HEAD` | the commit you are on now |
| `HEAD~1` | one commit before HEAD (its parent) |
| `HEAD~3` | three commits back |
| `main~2` | two commits before the tip of `main` |

`git show HEAD:menu.txt` prints a file **as it was** in that commit.

## Seeing changes: `git diff` {#diff}

`git diff` shows **line-by-line** differences. Lines starting with `-` were removed, `+` were added.

```terminal notry
$ echo "Coffee 20" >> menu.txt
$ git diff
diff --git a/menu.txt b/menu.txt
index 49bfe2c..ef592dd 100644
--- a/menu.txt
+++ b/menu.txt
@@ -1,3 +1,4 @@
 Samosa 15
 Vada Pav 20
 Tea 10
+Coffee 20
$ git add menu.txt
$ git diff
$ git diff --staged
diff --git a/menu.txt b/menu.txt
index 49bfe2c..ef592dd 100644
--- a/menu.txt
+++ b/menu.txt
@@ -1,3 +1,4 @@
 Samosa 15
 Vada Pav 20
 Tea 10
+Coffee 20
```

Notice that after `git add`, plain `git diff` shows **nothing**: the change moved to the staging area. Each form of `diff` compares two of the three stages:

| Command | Compares |
|---|---|
| `git diff` | working directory ↔ staging area (unstaged changes) |
| `git diff --staged` | staging area ↔ last commit (what you're about to commit) |
| `git diff main feature-cart` | two branches |
| `git diff HEAD~2 HEAD` | two commits (add `--stat` for a summary) |

## Parking work: `git stash` {#stash}

Krish is halfway through the cart when Hetvi messages: *"The samosa price is wrong on the live demo. Fix it NOW!"* His cart code is broken and not ready to commit.

:::analogy Saving your game mid-level
`git stash` is like pausing a game and saving it in a slot. Your half-done changes are put in a drawer, the working tree becomes clean, you fix the urgent bug, then you take your changes back out exactly as they were.
:::

```terminal notry
$ git status -s
 M cart.js
$ git stash
Saved working directory and index state WIP on main: 88f8fde Add coffee
$ git status
On branch main

nothing to commit, working tree clean
$ git stash list
stash@{0}: WIP on main: 88f8fde Add coffee
```

Now fix the urgent bug and commit it, then bring the cart work back:

```terminal notry
$ git stash pop
On branch main

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   cart.js

no changes added to commit (use "git add" and/or "git commit -a")
Dropped refs/stash@{0} (37aff8fdb12a0f05787c4165c766f0ca3261096d)
```

| Command | Does |
|---|---|
| `git stash` / `git stash push -m "msg"` | save changes and clean the working tree |
| `git stash list` | list saved stashes (`stash@{0}` is the newest) |
| `git stash pop` | bring back the newest stash **and remove it** from the list |
| `git stash apply` | bring it back but **keep** it in the list |
| `git stash drop` | delete a stash without applying it |

:::note Untracked files are not stashed
By default, `git stash` saves changes to **tracked** files. Brand-new files you never added stay where they are.
:::

## Marking releases: `git tag` {#tags}

On the day of the tech fest, Hetvi wants a permanent name for "the version we demonstrated". Commit hashes are hard to remember, and branches move. **Tags don't move.**

```terminal notry
$ git tag v1.0
$ git tag -a v1.1 -m "Menu and cart released for Spectrum 2026"
$ git tag
v1.0
v1.1
$ git log --oneline -3
07f793e (HEAD -> main, tag: v1.0, tag: v1.1) Finish cart
26ff36d Fix samosa price
88f8fde Add coffee
```

| Kind | Command | Stores |
|---|---|---|
| Lightweight | `git tag v1.0` | just a name for the commit |
| Annotated (for releases) | `git tag -a v1.1 -m "…"` | name + message + who tagged it + date |

`git show v1.1` shows the tag's message and the commit. Tags are **not pushed automatically**: use `git push origin v1.1`, or `git push origin --tags` for all of them. Delete a tag with `git tag -d v1.0`.

## Undoing changes: which command? {#undo}

Git has several "undo" commands. Choosing the right one depends on two questions:

:::diagram undo-decision

:::warning The golden rule of undo
**Not pushed yet?** `reset` is fine: you're only rewriting your own history.
**Already pushed?** Use `revert`. It adds a new commit and never rewrites history your team already has.
:::

## Discarding edits: `git restore` (and `checkout --`) {#restore}

You edited a file, it's a mess, and you want the last committed version back:

```terminal
$ echo "oops" >> menu.txt
$ git restore menu.txt
$ git status -s
```

The classic command does the same thing: `git checkout -- menu.txt`. (The `--` means "what follows is a file, not a branch".)

:::warning No undo for restore
`git restore <file>` permanently throws away the **uncommitted** edits in that file. Git never saved them, so it can't bring them back.
:::

## Moving back in time: `git reset` {#reset}

`git reset` moves the current branch back to an earlier commit. The three modes decide what happens to the changes from the commits you "undo":

:::diagram reset-modes

```terminal notry
$ echo "Dosa 40" >> menu.txt && git commit -qam "add dosa"
$ git reset --soft HEAD~1
$ git status -s
M  menu.txt
$ git commit -qm "Add dosa to menu"
$ git reset HEAD~1
Unstaged changes after reset:
M	menu.txt
$ git commit -qam "Add dosa to menu"
$ git reset --hard HEAD~1
HEAD is now at 07f793e Finish cart
```

- `--soft`: perfect for fixing a bad commit message or adding a forgotten file. Changes stay **staged**.
- `--mixed` (the default): undo the commit and decide again what to stage.
- `--hard`: throw the commit **and** its changes away. ⚠️ Use with care.

`git reset <file>` (without a mode) simply **unstages** a file, like `git restore --staged`.

## Undoing a pushed commit: `git revert` {#revert}

Krish pushed *Finish cart*, and it broke the live demo. His teammates have already pulled it, so rewriting history with `reset` would cause chaos. Instead he **reverts** it:

```terminal notry
$ git revert HEAD --no-edit
[main c47f6d3] Revert "Finish cart"
 1 file changed, 1 deletion(-)
$ git log --oneline -3
c47f6d3 (HEAD -> main) Revert "Finish cart"
07f793e (tag: v1.0, tag: v1.1) Finish cart
26ff36d Fix samosa price
```

`git revert <commit>` creates a **new commit that does the opposite** of the old one. The history stays honest: anyone can see the mistake *and* its fix. Without `--no-edit`, Git opens the editor with a ready-made message.

| | `reset` | `revert` |
|---|---|---|
| How | moves the branch back | adds a new "opposite" commit |
| History | rewritten (commits disappear) | kept (nothing disappears) |
| Safe after pushing? | ⚠️ No | ✅ Yes |

## Visiting the past: detached HEAD {#detached}

`git checkout <commit>` lets you **look at** an old version of the whole project:

```terminal notry
$ git checkout HEAD~2
Note: switching to 'HEAD~2'.

You are in 'detached HEAD' state. You can look around, make experimental
changes and commit them, and you can discard any commits you make in this
state without impacting any branches by switching back to a branch.
…
HEAD is now at 26ff36d Fix samosa price
$ git switch main
Switched to branch 'main'
```

**Detached HEAD** means HEAD points to a commit instead of a branch. Look around, run the old code, then `git switch main` to come back. If you want to keep work done there, create a branch first: `git switch -c old-idea`.

:::tip Time travel in the Playground
In the [Playground](/playground/), open the **Graph** tab and press **⏳ Time travel** to slide through your history and read any file at any commit, without changing anything.
:::

## Unit 4 summary {#summary}

- `git log` (with `--oneline`, `--graph --all`, `-n`, `--author`, `--grep`, `-- file`) reads history; `git show` inspects one commit.
- `git diff` = unstaged; `git diff --staged` = staged; `git diff A B` = two commits or branches.
- `git stash` parks work; `git stash pop` brings it back.
- `git tag -a v1.0 -m "…"` marks a release; push tags explicitly.
- Undo: `restore` (uncommitted edits), `reset` (local commits: soft / mixed / hard), `revert` (pushed commits).
- `git checkout <commit>` visits the past (detached HEAD); `git switch main` returns.

Practise with **Missions M-12 to M-15**, then take the Unit 4 quiz.
