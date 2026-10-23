---
title: Terminal basics, git init & the three stages
session: 03
unit: 2
duration: 120
---
<!-- slide: title -->
<p class="kicker">Session 3 · Unit 2 · Getting Started with Git</p>

# Your first repository

Terminal basics · `git init` · the three stages

Notes:
Timeline: profile README check 10 · terminal survival kit 20 · three stages 25 · demo 25 · Mission M-03 + Git Bash 30 · exit ticket 10.
Start by showing two students' profile READMEs from the homework.

---
## Terminal survival kit

| Command | Means |
|---|---|
| `pwd` | where am I? |
| `ls` / `ls -a` | list files (`-a` shows hidden ones) |
| `cd folder` / `cd ..` | go in / go up |
| `mkdir name` | make a folder |
| `echo "text" > file` | write a file |
| `cat file` | show a file |

---
<!-- slide: center big -->
## The #1 beginner mistake

Running Git in the **wrong folder**.

`fatal: not a git repository` → run `pwd`, then `cd` into your project.

---
<!-- slide: command -->
## `git init`: Krish starts the project

```terminal
$ mkdir amroli-canteen
$ cd amroli-canteen
$ git init
Initialized empty Git repository in /home/student/amroli-canteen/.git/
$ ls -a
./  ../  .git/
```

Notes:
"That's it? Nothing happened?" Ask students to predict, then show ls -a. The hidden .git folder IS the repository.

---
## Inside `.git`

:::diagram git-folder

Notes:
One sentence each: HEAD = where you are; objects = every saved version; refs = branch and tag names. Then: never edit by hand, never git init in your home folder.

---
<!-- slide: center big -->
## The ==most important idea== in Git

Every change passes through **three places**.

---
## The three stages

:::diagram three-stages

Notes:
The post-office analogy: desk (working directory), envelope (staging area), posted letter (commit). Ask: why would you NOT want to send every letter on your desk?

---
<!-- slide: command -->
## Watch a file travel

```terminal
$ echo "Samosa 15" > menu.txt
$ git status -s
?? menu.txt
$ git add menu.txt
$ git status -s
A  menu.txt
$ git commit -m "Add menu"
[main (root-commit) 6cb774b] Add menu
 1 file changed, 1 insertion(+)
 create mode 100644 menu.txt
```

Notes:
Run git status before and after every command: the habit matters more than the commands. `??` untracked, `A` added (staged), then committed.

---
<!-- slide: two -->
## Reading the commit output

:::neon `[main (root-commit) 6cb774b]`
**main** = branch · **root-commit** = the very first one · **6cb774b** = short ID (hash)
:::

:::neon+ `git log`
Shows the commit, author, date and message. Every commit gets a unique 40-character ID.
:::

---
<!-- slide: activity 30 -->
## Mission M-03 · Day One

1. Do **M-03** on the course site (browser)
2. Then repeat the same steps in **Git Bash** on the lab PC
3. Finish with `git log --oneline`

Notes:
Press T. Students on phones do M-03 only. Walk around: most problems will be the wrong folder or forgetting git add.

---
<!-- slide: quiz reveal -->
## Exit ticket: put in order

1. `git commit -m "…"`
2. `git init`
3. `git add file`
4. create / edit a file

:::reveal+ Answer
**2 → 4 → 3 → 1**: init, edit, add, commit (and `git status` between every step)
:::

---
<!-- slide: content -->
## Homework

:::example Three commits
Create a repository on your phone (Playground) or PC with three commits:
README → a notes file → an edit to the notes. Show `git log --oneline` next class.
:::
