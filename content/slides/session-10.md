---
title: Reading history: log, diff, show
session: 10
unit: 4
duration: 120
---
<!-- slide: title -->
<p class="kicker">Session 10 · Unit 4 · Advanced Git Commands</p>

# The ₹0 mystery

`git log` · `git show` · `git diff`

Notes:
Timeline: hook 10 · log 30 · diff 25 · Mission M-12 "Detective" 40 · exit ticket 15.

---
<!-- slide: center big -->
## "The menu says samosa costs ₹0!"

Six commits this week, four people, and nobody remembers touching the price.

Notes:
Mr. Desai, the canteen manager, phones Hetvi. Ask: "Without Git, how would you find out?" With Git, it's a five-minute detective job.

---
<!-- slide: command -->
## `git log`: the case file

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

Notes:
Point out what/who/when/why: the Unit 1 promise, now real. Press q to leave a long log in Git Bash.

---
## Detective tools

| Command | Shows |
|---|---|
| `git log --oneline` | one line per commit |
| `git log -3` | last 3 commits |
| `git log --oneline --graph --all` | every branch, as a graph |
| `git log --author="Dhruvi"` | one person's commits |
| `git log --grep="price"` | messages containing "price" |
| `git log -- menu.txt` | commits that **changed** that file |

---
<!-- slide: command -->
## Narrow the suspects

```terminal notry
$ git log --oneline
be6e586 (HEAD -> main) Add tea to menu
03474ce Refactor cart total
63a4905 Add vada pav
1d297a5 Add menu
$ git log --oneline -- cart.js
03474ce Refactor cart total
```

---
<!-- slide: command -->
## `git show`: examine the evidence

```terminal notry
$ git show HEAD~1
commit 03474ce19d00da77f18110754b73539ef13411e2
Author: Dhruvi Patel <dhruvi@example.com>

    Refactor cart total

diff --git a/cart.js b/cart.js
--- /dev/null
+++ b/cart.js
@@ -0,0 +1 @@
+total = 0
```

`HEAD~1` = one commit back · `HEAD~3` = three back · or use the short ID

---
<!-- slide: command -->
## `git diff`: what changed?

```terminal notry
$ echo "Coffee 20" >> menu.txt
$ git diff
@@ -1,3 +1,4 @@
 Samosa 15
 Vada Pav 20
 Tea 10
+Coffee 20
$ git add menu.txt
$ git diff
$ git diff --staged
+Coffee 20
```

`-` removed · `+` added

Notes:
The empty git diff after git add surprises students. Ask why before revealing: the change moved to the staging area.

---
## Which `diff`?

| Command | Compares |
|---|---|
| `git diff` | working files ↔ staging area |
| `git diff --staged` | staging area ↔ last commit |
| `git diff main feature-cart` | two branches |
| `git diff HEAD~2 HEAD --stat` | two commits (summary) |

---
<!-- slide: activity 40 -->
## Mission M-12 · Detective

Find the commit that set the samosa to ₹0, **who** made it, and fix it.

Notes:
Press T. The goal list requires students to actually git show the guilty commit. Discuss afterwards: Meet's message "Update price list" didn't say why. Good messages matter.

---
<!-- slide: quiz reveal -->
## Exit ticket

1. Commits whose message mentions "login"?
2. What changed in commit `a1b2c3d`?
3. `git diff` is empty but you edited a file. Why?

:::reveal+ Answers
`git log --grep="login"` · `git show a1b2c3d` · the change is already staged; try `git diff --staged`
:::
