---
title: status, add and commit in depth
session: 04
unit: 2
duration: 120
---
<!-- slide: title -->
<p class="kicker">Session 4 · Unit 2</p>

# Pack only what matters

`git status` · `git add` · `git commit`, in depth

Notes:
Timeline: recap quiz 10 · reading status 25 · add/unstage demo 30 · commit messages 10 · Mission M-04 35 · exit ticket 10.

---
<!-- slide: center big -->
## Krish changed three files…

`menu.txt` (new item) · `cart.js` (new) · `notes-private.txt` (his personal notes!)

Which ones should go into the next commit?

Notes:
Ask the class. Then: "This is exactly why Git has a staging area."

---
<!-- slide: command -->
## Read `git status` like a pro

```terminal
$ git status
On branch main

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   menu.txt

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	menu.css

no changes added to commit (use "git add" and/or "git commit -a")
```

Notes:
Read the hint lines aloud. Git is telling you the next command.

---
## What `git status` is telling you

| Section | Meaning | Next |
|---|---|---|
| Untracked files | never saved | `git add` |
| Changes not staged | edited, not staged | `git add` or `git restore` |
| Changes to be committed | staged | `git commit` |
| working tree clean | all saved | 🎉 |

---
## Ways to stage

| Command | Stages |
|---|---|
| `git add menu.txt` | one file |
| `git add menu.txt cart.js` | several |
| `git add *.css` | all `.css` files here |
| `git add .` | ==everything== in this folder |

:::warning+ `git add .` is a bulldozer
Fast, but it also picks up private notes, passwords, big files.
:::

---
<!-- slide: command -->
## Oops, unstage it

```terminal
$ git add .
$ git restore --staged menu.css
$ git status -s
M  menu.txt
?? menu.css
```

Left column = **staged**, right column = **not staged**, `??` = untracked.

---
<!-- slide: command -->
## Two changes, two commits

```terminal
$ git add menu.txt
$ git commit -m "Add vada pav to menu"
[main b0d4373] Add vada pav to menu
 1 file changed, 1 insertion(+)
$ git add menu.css
$ git commit -m "Add menu styles"
[main 92bd5b5] Add menu styles
 1 file changed, 1 insertion(+)
 create mode 100644 menu.css
```

---
<!-- slide: two -->
## Commit messages

:::tip Good: starts with a verb
`Add vada pav to menu`
`Fix total when cart is empty`
`Remove unused styles`
:::

:::warning Bad: says nothing
`update` · `changes` · `final` · `asdf` · `done`
:::

Notes:
From today, reject vague messages in labs. Test: "If applied, this commit will …" + message.

---
<!-- slide: content reveal -->
## Shortcut: `git commit -am`

- `-a` stages every **modified tracked** file, then commits
- It does **not** add new (untracked) files
- Great for "I only edited existing files"

---
<!-- slide: activity 35 -->
## Mission M-04 · Pack only what matters

Commit the menu change and `cart.js`, but **never** `notes-private.txt`.

Bonus: hide it forever with a `.gitignore` file.

Notes:
Press T. The goal checklist will catch anyone who uses git add . without thinking.

---
<!-- slide: quiz reveal -->
## Exit ticket: rewrite these messages

1. `update`
2. `fixed stuff`
3. `final final`

:::reveal+ Example answers
`Add idli to menu` · `Fix price rounding in cart` · `Remove debug prints before demo`
:::
