---
title: Branches: create & switch
session: 07
unit: 3
duration: 120
---
<!-- slide: title -->
<p class="kicker">Session 7 · Unit 3 · Branching and Merging</p>

# Parallel universes

Branches · `git branch` · `git switch`

Notes:
Timeline: hook 10 · what a branch is 20 · demo 25 · checkout vs switch 15 · Mission M-08 40 · exit ticket 10.

---
<!-- slide: center big -->
## Krish wants to redesign the menu…

…but `main` is the version Hetvi shows to the canteen manager **every day**.

How can he experiment **without breaking** it?

Notes:
Let students suggest answers: "copy the folder", "make menu2.html"… then: "Git has a built-in answer: branches."

---
<!-- slide: content reveal -->
## A branch is a parallel universe

- Try ideas in **your own universe**
- `main` keeps working for everyone else
- It works? **Merge** it back
- It failed? **Delete** the universe; `main` never knew

---
## What a branch really is

:::diagram branch-pointer

Notes:
Key insight: a branch is NOT a copy of files, just a label on a commit. That's why it's instant. HEAD = which branch you are on (Git Bash shows it in the prompt).

---
<!-- slide: command -->
## Create and list

```terminal
$ git branch
* main
$ git branch feature-menu
$ git branch
  feature-menu
* main
```

`*` marks where you are. `git branch <name>` creates but **does not switch**.

---
<!-- slide: command -->
## Switch and commit

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

Notes:
Point at the graph: feature-menu moved forward, main stayed behind.

---
<!-- slide: command -->
## Where did my line go?!

```terminal
$ git switch main
Switched to branch 'main'
$ cat menu.txt
Samosa 15
```

:::neon+ Not lost
Switching branches **changes your files** to match that branch. Vada Pav is safe on `feature-menu`.
:::

Notes:
Predict first: "What will cat menu.txt print?" Many students will expect the new line. This surprise is the moment branches "click".

---
## Two ways to switch

| New (Git 2.23+) | Classic | Does |
|---|---|---|
| `git switch main` | `git checkout main` | go to a branch |
| `git switch -c feature-cart` | `git checkout -b feature-cart` | create **and** go |

`checkout` also restores files, so newer Git split it into `switch` + `restore`. The syllabus uses `checkout`: know both.

---
<!-- slide: center -->
:::warning Commit before you switch
Uncommitted changes to a file that differs on the other branch?
Git refuses: *"Your local changes … would be overwritten by checkout"*.

**Commit** (or `git stash`, Unit 4) first.
:::

---
<!-- slide: activity 40 -->
## Mission M-08 · Parallel universe

Create `feature-menu`, add an item there, go back to `main` and prove the item isn't there.

Then explore in the **Playground**: watch the **Graph** tab as you switch.

Notes:
Press T. Homework idea for fast finishers: two branches with one commit each, screenshot of git log --oneline --graph --all.

---
<!-- slide: quiz reveal -->
## Exit ticket

1. Create **and** switch in one command (two ways)?
2. What does `*` mean in `git branch`?
3. Is a branch a copy of all files?

:::reveal+ Answers
`git switch -c x` / `git checkout -b x` · the branch you are on · no, just a label pointing to a commit
:::
