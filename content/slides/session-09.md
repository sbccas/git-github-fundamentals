---
title: Deleting branches & team branching workflow
session: 09
unit: 3
duration: 120
---
<!-- slide: title -->
<p class="kicker">Session 9 · Unit 3</p>

# Spring cleaning &amp; teamwork

Deleting branches · branches on GitHub · team workflow

Notes:
Timeline: recap 10 · delete demo 20 · team rules 15 · Mission M-11 15 · group mini-project 50 · Unit 3 quiz 10.

---
<!-- slide: command -->
## Delete a merged branch

```terminal
$ git branch -d feature-menu
Deleted branch feature-menu (was b97cb83).
```

Only the **label** goes. The commits stay in `main`'s history.

---
<!-- slide: command -->
## Git protects unmerged work

```terminal
$ git branch -d experiment
error: the branch 'experiment' is not fully merged
hint: If you are sure you want to delete it, run 'git branch -D experiment'
$ git branch -D experiment
Deleted branch experiment (was 84079e6).
```

`-D` = "I'm sure". Its unique commits are abandoned.

---
<!-- slide: command -->
## Branches on GitHub

```terminal
$ git push -u origin feature-payment
To https://github.com/krish-patel/amroli-canteen.git
 * [new branch]      feature-payment -> feature-payment
branch 'feature-payment' set up to track 'origin/feature-payment'.
$ git branch -a
* feature-payment
  main
  remotes/origin/feature-payment
  remotes/origin/main
$ git push origin --delete feature-payment
To https://github.com/krish-patel/amroli-canteen.git
 - [deleted]         feature-payment
```

---
## Deleting cheat sheet

| Command | Deletes |
|---|---|
| `git branch -d name` | a merged branch (safe) |
| `git branch -D name` | any branch, even unmerged |
| `git push origin --delete name` | the branch on GitHub |

You can't delete the branch you're standing on: switch away first.

---
<!-- slide: content reveal -->
## Hetvi's four team rules

- **Never commit directly to `main`**: it must always work
- **One feature = one branch**: `feature-cart`, `fix-total`
- **Pull before you start**: branch from the latest `main`
- **Merge small and often**: small branches, small conflicts

---
<!-- slide: command -->
## The feature-branch loop

```terminal notry
$ git switch main
$ git pull
$ git switch -c feature-search
$ git add .
$ git commit -m "Add menu search box"
$ git switch main
$ git merge feature-search
$ git branch -d feature-search
$ git push
```

In Unit 5 the merge step becomes a **pull request** that a teammate reviews.

---
<!-- slide: activity 15 -->
## Mission M-11 · Spring cleaning

Clean up merged and unmerged branches, locally **and** on GitHub, without losing `main`.

---
<!-- slide: activity 50 -->
## Group mini-project · Amroli Canteen

Groups of 3–4 · one shared repo

1. Each member builds one feature on **their own branch**: menu · cart · timings · about page
2. Push your branch
3. The group lead merges the branches **one by one**
4. Resolve any conflicts **together**
5. Delete merged branches, locally and on GitHub

Notes:
This is assessed (15%, see faculty guide §5). Look for: one branch per feature, clear messages, merge commits in the graph, no leftover markers.

---
<!-- slide: quiz reveal -->
## Exit ticket

1. `-d` vs `-D`?
2. Delete `feature-cart` on GitHub from the terminal?
3. Why never commit directly to `main` in a team?

:::reveal+ Answers
`-d` only merged · `-D` forces · `git push origin --delete feature-cart` · `main` must always work for everyone
:::
