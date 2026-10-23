## Why branches? {#why-branches}

The Amroli Canteen app works, and Hetvi has shown it to the canteen manager. Now Krish wants to try a **new menu design**, and Dhruvi wants to add **online payment**. Both changes will take days, and both might break things.

If they edit `main` directly, the working app is broken until they finish. If they don't, they can't save their progress. **Branches** solve this.

:::analogy Parallel universes
A branch is a parallel universe for your project. Krish can try his new design in his own universe. If it works, he brings it back to the main universe (a **merge**). If it fails, he deletes that universe, and `main` never even knew.
:::

With branches:

- `main` always stays **working**, ready to demo.
- Each feature gets its **own branch**: `feature-menu`, `feature-payment`.
- Several people work **in parallel** without disturbing each other.
- Finished work is **merged** back into `main`.

## What a branch really is {#what-is-a-branch}

:::diagram branch-pointer

A branch is not a copy of your files. It is a tiny **label that points to one commit**, which is why creating a branch is instant.

- When you commit, the **current branch's label moves forward** to the new commit.
- **HEAD** is a special label that says *which branch you are on*. Git Bash shows it in the prompt: `~/amroli-canteen (feature-menu)`.

## Creating and listing branches {#create}

```terminal
$ git branch
* main
$ git branch feature-menu
$ git branch
  feature-menu
* main
```

- `git branch` lists branches. The `*` marks the one you are on.
- `git branch <name>` **creates** a branch at your current commit, but it does **not** switch to it.

:::tip Naming branches
Use short, descriptive, lowercase names with hyphens: `feature-menu`, `fix-cart-total`, `docs-readme`. No spaces.
:::

## Switching branches {#switch}

```terminal
$ git switch feature-menu
Switched to branch 'feature-menu'
$ echo "Vada Pav 20" >> menu.txt
$ git commit -am "Add vada pav to menu"
[feature-menu b97cb83] Add vada pav to menu
 1 file changed, 1 insertion(+)
$ git log --oneline --graph --all
* b97cb83 (HEAD -> feature-menu) Add vada pav to menu
* 8391a89 (main) Add opening time
* 3c16dcc Add menu
```

Now switch back to `main` and look at the menu:

```terminal notry
$ git switch main
Switched to branch 'main'
$ cat menu.txt
Samosa 15
```

The *Vada Pav* line is gone. That's not lost work: it is safely on `feature-menu`. **Switching branches changes the files in your folder** to match that branch.

Create **and** switch in one step:

| New way (Git 2.23+) | Classic way | Does |
|---|---|---|
| `git switch <branch>` | `git checkout <branch>` | move to an existing branch |
| `git switch -c <new>` | `git checkout -b <new>` | create a branch and move to it |

Both work. `checkout` is older and does many jobs (it also restores files), so newer Git added the clearer `switch`. You will see `checkout` in many tutorials, so know both.

:::warning Commit before you switch
If you have **uncommitted** changes to a file that is different on the other branch, Git refuses to switch: *"Your local changes to the following files would be overwritten by checkout"*. Commit your work (or stash it, Unit 4) first.
:::

## Merging: fast-forward {#fast-forward}

Krish is happy with the new menu. To bring `feature-menu` into `main`, **switch to the branch that receives the changes**, then merge:

```terminal notry
$ git switch main
$ git merge feature-menu
Updating 8391a89..b97cb83
Fast-forward
 menu.txt | 1 +
 1 file changed, 1 insertion(+)
```

**Fast-forward** means `main` had no new commits of its own, so Git simply moved the `main` label forward to Krish's commit. No new commit was needed.

## Three-way merges {#three-way}

:::diagram merge-types

Meanwhile Krish built the cart on `feature-cart`, and someone also added tea to `main`. Now **both** branches have new commits:

```terminal notry
$ git merge feature-cart
Merge made by the 'ort' strategy.
 cart.js | 1 +
 1 file changed, 1 insertion(+)
 create mode 100644 cart.js
$ git log --oneline --graph
*   de0d069 (HEAD -> main) Merge branch 'feature-cart'
|\
* | 3776e7d Add tea
| * 7c7c199 (feature-cart) Add cart
* | b97cb83 (feature-menu) Add vada pav to menu
|/
* 8391a89 Add opening time
* 3c16dcc Add menu
```

Git found the common ancestor (`8391a89`), combined both sets of changes, and created a **merge commit** with two parents. Read the graph from the top: the `|\` is where the history splits; the `|/` is where it started.

:::note Opens an editor?
On a real computer, `git merge` may open your editor with the message *Merge branch 'feature-cart'*. Just save and close it to accept.
:::

## Merge conflicts {#conflicts}

Sometimes Git cannot decide alone. Dhruvi changed the opening time to **8 AM** on her branch; on `main`, Krish changed the same line to **10 AM**.

```terminal notry
$ git merge change-timing
Auto-merging timing.txt
CONFLICT (content): Merge conflict in timing.txt
Automatic merge failed; fix conflicts and then commit the result.
$ git status
On branch main
You have unmerged paths.
  (fix conflicts and run "git commit")
  (use "git merge --abort" to abort the merge)

Unmerged paths:
  (use "git add <file>..." to mark resolution)
	both modified:   timing.txt
```

A **conflict** happens when two branches change **the same lines** of the same file. Git stops and asks a human to decide. That isn't an error: it is Git refusing to guess.

Git writes **both versions** into the file, between markers:

:::diagram conflict-anatomy

**Resolving a conflict, step by step:**

1. Open the file (`edit timing.txt` in the Playground, or your editor).
2. Decide the correct content. Keep one side, the other, or a mix.
3. **Delete all three marker lines.**
4. Mark it resolved: `git add timing.txt`.
5. Finish the merge: `git commit`.

```terminal notry
$ echo "Open: 8 AM" > timing.txt
$ git add timing.txt
$ git status
On branch main
All conflicts fixed but you are still merging.
  (use "git commit" to conclude merge)

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
	modified:   timing.txt
$ git commit --no-edit
[main e41ab0c] Merge branch 'change-timing'
```

:::tip The escape hatch
Changed your mind halfway? `git merge --abort` puts everything back exactly as it was before the merge.
:::

## Practise resolving conflicts {#conflict-game}

Tap lines to delete them until each file matches what the team decided, with no markers left.

<div class="conflict-game" data-conflict-game><p class="muted">Loading the conflict game…</p></div>

## Deleting branches {#delete}

After a branch is merged, its label is no longer needed. Deleting it keeps `git branch` tidy (the commits stay in `main`'s history):

```terminal notry
$ git branch -d feature-menu
Deleted branch feature-menu (was b97cb83).
```

Git protects you from deleting work that was **never merged**:

```terminal notry
$ git branch -d experiment
error: the branch 'experiment' is not fully merged
hint: If you are sure you want to delete it, run 'git branch -D experiment'
hint: Disable this message with "git config set advice.forceDeleteBranch false"
$ git branch -D experiment
Deleted branch experiment (was 84079e6).
```

| Command | Deletes |
|---|---|
| `git branch -d <name>` | a **merged** branch (safe) |
| `git branch -D <name>` | any branch, **even unmerged** (its unique commits are abandoned) |
| `git push origin --delete <name>` | the branch **on GitHub** |

You can't delete the branch you are standing on; switch away first.

## Branches on GitHub {#remote-branches}

Branches can be pushed like `main`, so teammates can see or review them:

```terminal notry
$ git push -u origin feature-payment
To https://github.com/krish-patel/amroli-canteen.git
 * [new branch]      feature-payment -> feature-payment
branch 'feature-payment' set up to track 'origin/feature-payment'.
$ git branch -a
  change-timing
  feature-cart
* feature-payment
  main
  remotes/origin/feature-payment
  remotes/origin/main
```

`git branch -a` shows **all** branches, including the remote-tracking ones (`remotes/origin/…`).

## Team branching workflow {#workflow}

Hetvi's four rules for the Amroli Canteen team:

1. **Never commit directly to `main`.** `main` must always work.
2. **One feature = one branch**: `feature-cart`, `fix-total`.
3. **Pull before you start**, so you branch from the latest `main`.
4. **Merge small and often.** Small branches mean small conflicts.

```terminal notry
$ git switch main
$ git pull
$ git switch -c feature-search
$ git add .
$ git commit -m "Add menu search box"
$ git switch main
$ git merge feature-search
$ git branch -d feature-search
```

In Unit 5 you'll replace the local merge with a **pull request** on GitHub, so a teammate reviews the work first.

## Unit 3 summary {#summary}

- A **branch** is a movable label on a commit; **HEAD** marks the branch you are on.
- `git branch` lists/creates; `git switch` (or `checkout`) moves; `-c` / `-b` create and move.
- Merge **into** the branch you are on: `git switch main` then `git merge feature-x`.
- **Fast-forward** just moves the label; a **three-way merge** creates a merge commit.
- A **conflict** = both sides changed the same lines. Edit, remove markers, `git add`, `git commit` (or `git merge --abort`).
- `git branch -d` deletes merged branches; `-D` forces; `git push origin --delete` removes it from GitHub.

Practise with **Missions M-08 to M-11**, then take the Unit 3 quiz.
