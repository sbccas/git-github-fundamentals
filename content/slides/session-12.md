---
title: Undoing changes: restore, reset, revert
session: 12
unit: 4
duration: 120
---
<!-- slide: title -->
<p class="kicker">Session 12 · Unit 4</p>

# Undo, the safe way

`restore` · `reset` · `revert` · detached HEAD

Notes:
Timeline: recap 10 · decision guide 20 · demo 40 · Mission M-15 35 · Unit 4 quiz 15.

---
<!-- slide: center big -->
## Every undo starts with two questions

Is it **committed**? Is it **pushed**?

---
## The undo decision guide

:::diagram undo-decision

Notes:
Spend time here. If students remember one slide from Unit 4, it should be this one.

---
<!-- slide: center -->
:::warning The golden rule
**Not pushed?** `reset` is fine: it's your own history.
**Pushed?** `revert`: never rewrite history your team already has.
:::

---
<!-- slide: command -->
## Throw away uncommitted edits

```terminal
$ echo "oops" >> menu.txt
$ git restore menu.txt
$ git status -s
```

Classic form: `git checkout -- menu.txt` · ⚠️ the edits are gone for good

---
## `git reset`: three modes

:::diagram reset-modes

---
<!-- slide: command -->
## Reset in action

```terminal notry
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

Notes:
Run git status after each reset. --soft: staged · --mixed: unstaged · --hard: gone.

---
<!-- slide: command -->
## Pushed? `git revert`

```terminal notry
$ git revert HEAD --no-edit
[main c47f6d3] Revert "Finish cart"
 1 file changed, 1 deletion(-)
$ git log --oneline -3
c47f6d3 (HEAD -> main) Revert "Finish cart"
07f793e (tag: v1.0, tag: v1.1) Finish cart
26ff36d Fix samosa price
```

A **new** commit that does the opposite. Nothing disappears.

---
## `reset` vs `revert`

| | `reset` | `revert` |
|---|---|---|
| How | moves the branch back | adds an "opposite" commit |
| History | rewritten | kept |
| After pushing? | ⚠️ no | ✅ yes |

---
<!-- slide: command -->
## Visiting the past

```terminal notry
$ git checkout HEAD~2
You are in 'detached HEAD' state. …
HEAD is now at 26ff36d Fix samosa price
$ git switch main
Switched to branch 'main'
```

Look around, then come back. Want to keep work done there? `git switch -c old-idea`.

Notes:
Show the Playground's Time travel slider here too (Graph tab → ⏳ Time travel): it lets students browse old versions with no risk.

---
<!-- slide: activity 35 -->
## Mission M-15 · Undo, the safe way

Three mistakes, three tools: `restore` · `reset` · `revert`, then push the fix.

---
<!-- slide: quiz reveal -->
## Exit ticket

1. A bad commit is on GitHub. Which command?
2. What does `--soft` keep?
3. Which reset mode can delete your work?

:::reveal+ Answers
`git revert <commit>` · the changes, staged · `--hard`
:::
