---
title: Forks, pull requests & the cheat sheet
session: 14
unit: 5
duration: 120
---
<!-- slide: title -->
<p class="kicker">Session 14 · Unit 5</p>

# Pull requests &amp; forks

Review before you merge · contribute to any project

Notes:
Timeline: recap issues 10 · PR flow 20 · live review demo 20 · fork vs clone vs branch 15 · Lab L-04 with live merging 45 · cheat sheet + Unit 5 quiz 10.
Prepare the class practice repository (faculty guide, Appendix A) before the session.

---
<!-- slide: center big -->
## Hetvi's new rule

**Nothing reaches `main` without a review.**

Every change arrives as a **pull request**.

---
## The pull request flow

:::diagram pr-flow

---
<!-- slide: content reveal -->
## Reviewing a pull request

- **Files changed**: the diff, line by line
- Click a line to **comment**
- **Approve** or **Request changes**
- Author pushes more commits to the **same branch**: the PR updates itself

Notes:
Live demo as maintainer: comment on a line, request a change, the "student" pushes a fix, approve, merge, delete branch.

---
## Three ways to merge

| Button | Result on `main` |
|---|---|
| Create a merge commit | all commits + a merge commit |
| Squash and merge | **one** commit for the whole PR |
| Rebase and merge | commits replayed, no merge commit |

Then **Delete branch**, and locally: `git switch main && git pull`

---
<!-- slide: center big -->
## You can't push to someone else's repository…

…so you **fork** it.

---
## Fork → PR

:::diagram fork-flow

---
## Fork vs clone vs branch

| | Fork | Clone | Branch |
|---|---|---|---|
| Copy where? | on **GitHub**, your account | on **your computer** | **inside** a repository |
| How | Fork button | `git clone` | `git switch -c` |

---
<!-- slide: command -->
## The contribution commands

```terminal notry
$ git clone https://github.com/krish-patel/git-practice-2026.git
$ cd git-practice-2026
$ git remote add upstream https://github.com/sbccas/git-practice-2026.git
$ git switch -c add-krish-patel
$ git add .
$ git commit -m "Add krish-patel profile card"
$ git push -u origin add-krish-patel
```

Then **Compare &amp; pull request** → base: the class repository.

---
<!-- slide: activity 45 -->
## Lab L-04 · Fork and pull request

Add `students/<your-username>.md` to the class repository **through a pull request**.

The teacher reviews and merges them live on the projector.

Notes:
Press T. Each student changes a different file, so PRs won't conflict. For a conflict demonstration, ask two volunteers to edit the same line of README.md.

---
<!-- slide: center -->
:::tip Your cheat sheet
**sbccas.github.io/git-github-fundamentals/cheatsheet/**
Search · filter by unit · copy · print as a two-page handout
:::

---
<!-- slide: quiz reveal -->
## Exit ticket

1. Why fork instead of clone to contribute to someone else's project?
2. What is `upstream`?
3. A reviewer asks for changes. What do you do?

:::reveal+ Answers
you can't push to theirs; the fork is your copy on GitHub · the original repository · push more commits to the same branch
:::
