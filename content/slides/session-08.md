---
title: Merging & resolving conflicts
session: 08
unit: 3
duration: 120
---
<!-- slide: title -->
<p class="kicker">Session 8 · Unit 3</p>

# Bring it home

Merging · fast-forward · three-way · conflicts

Notes:
Timeline: recap graphs from homework 10 · merge types 20 · conflict demo 25 · Missions M-09/M-10 + conflict game 20 · pair conflict on GitHub 35 · exit ticket 10.

---
<!-- slide: center big -->
## The merge rule

**Switch to the branch that receives the work**, then merge the other one **in**.

`git switch main` → `git merge feature-menu`

---
## Two kinds of merge

:::diagram merge-types

---
<!-- slide: command -->
## Fast-forward

```terminal
$ git switch main
$ git merge feature-menu
Updating 8391a89..b97cb83
Fast-forward
 menu.txt | 1 +
 1 file changed, 1 insertion(+)
```

`main` had nothing new, so Git just **moved the label**.

---
<!-- slide: command -->
## Three-way merge

```terminal
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
* | b97cb83 Add vada pav to menu
|/
* 8391a89 Add opening time
```

Notes:
Both branches had new commits, so Git makes a merge commit with two parents. On real PCs the editor may open with the message: save and close.

---
<!-- slide: center big -->
## Dhruvi: `Open: 8 AM`
## Krish: `Open: 10 AM`

Same line. Same file. Different branches.

---
<!-- slide: command -->
## CONFLICT

```terminal
$ git merge change-timing
Auto-merging timing.txt
CONFLICT (content): Merge conflict in timing.txt
Automatic merge failed; fix conflicts and then commit the result.
$ git status
On branch main
You have unmerged paths.
  (fix conflicts and run "git commit")
  (use "git merge --abort" to abort the merge)
```

Notes:
Emphasise: this is not an error. Git refuses to guess and asks a human.

---
## Reading the markers

:::diagram conflict-anatomy

---
<!-- slide: content reveal -->
## Resolve in four steps

- **Edit** the file: keep yours, theirs, or a mix
- **Delete** every `<<<<<<<` `=======` `>>>>>>>` line
- `git add timing.txt`: mark it resolved
- `git commit`: finish the merge

:::tip+ Escape hatch
`git merge --abort` puts everything back as it was before the merge.
:::

---
<!-- slide: activity 20 -->
## Practise

- Mission **M-09** · Bring it home
- Mission **M-10** · Two edits, one line ⚔️
- The **conflict game** in Unit 3 of the course site

Notes:
Press T. M-10 earns the Conflict Crusher badge, which students like to show off.

---
<!-- slide: activity 35 -->
## Pairs: a real conflict on GitHub

1. Both partners edit **the same line** of `README.md`
2. Both commit and push
3. The second push is **rejected** → `git pull` → CONFLICT
4. Agree the final text, remove markers, `add`, `commit`, `push`

Notes:
Walk around. Common problem: students commit with markers still in the file. Make them search for <<<<<<< before git add.

---
<!-- slide: quiz reveal -->
## Exit ticket

1. When does a fast-forward happen?
2. Label: `<<<<<<<` · `=======` · `>>>>>>>`
3. How do you cancel a merge in progress?

:::reveal+ Answers
receiving branch had no new commits · start of yours · divider · end of theirs · `git merge --abort`
:::
