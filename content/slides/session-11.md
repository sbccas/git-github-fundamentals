---
title: stash & tags
session: 11
unit: 4
duration: 120
---
<!-- slide: title -->
<p class="kicker">Session 11 · Unit 4</p>

# Drop everything!

`git stash` · `git tag`

Notes:
Timeline: hook 10 · stash 30 · tags 20 · Missions M-13/M-14 45 · exit ticket 15.

---
<!-- slide: center big -->
## Krish is halfway through the cart…

Hetvi: **"The live demo shows Samosa ₹0. Fix it NOW!"**

His cart code is broken and **not ready to commit**.

---
<!-- slide: center -->
:::analogy Save your game mid-level
`git stash` puts your half-done changes in a drawer.
Fix the urgent bug, then take your work back out **exactly as it was**.
:::

---
<!-- slide: command -->
## Park it

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

---
<!-- slide: command -->
## Fix, commit, then bring it back

```terminal notry
$ git commit -am "Fix samosa price"
$ git stash pop
Changes not staged for commit:
	modified:   cart.js
Dropped refs/stash@{0} (37aff8fdb12a0f05787c4165c766f0ca3261096d)
```

---
## Stash commands

| Command | Does |
|---|---|
| `git stash` · `git stash push -m "msg"` | save and clean |
| `git stash list` | list (`stash@{0}` = newest) |
| `git stash pop` | restore **and remove** |
| `git stash apply` | restore, **keep** in list |
| `git stash drop` | delete a stash |

New, untracked files are **not** stashed by default.

---
<!-- slide: center big -->
## Spectrum 2026 · demo day

Hetvi wants a **permanent name** for the version being demonstrated.

Branches move. Hashes are unreadable. **Tags don't move.**

---
<!-- slide: command -->
## `git tag`

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
$ git push origin v1.1
```

---
<!-- slide: two -->
## Two kinds of tag

:::neon Lightweight
`git tag v1.0`
Just a name for a commit.
:::

:::neon+ Annotated, for releases
`git tag -a v1.1 -m "…"`
Name + message + who + when. Shown by `git show v1.1`.
:::

:::warning+ Tags are not pushed automatically
`git push origin v1.1` · or all of them: `git push origin --tags`
:::

---
<!-- slide: activity 45 -->
## Missions

- **M-13** · Drop everything! (stash)
- **M-14** · Release day (tag + push)

Notes:
Press T. Check M-14: many students forget that a normal git push doesn't send tags.

---
<!-- slide: quiz reveal -->
## Exit ticket

1. `stash pop` vs `stash apply`?
2. Which tag type stores a message and author?
3. Push all your tags at once?

:::reveal+ Answers
pop removes the stash after applying, apply keeps it · annotated (`-a`) · `git push origin --tags`
:::
