---
title: Teamwork: fetch vs pull
session: 06
unit: 2
duration: 120
---
<!-- slide: title -->
<p class="kicker">Session 6 · Unit 2</p>

# Teammate pushed overnight

`git fetch` · `git pull` · rejected pushes

Notes:
Timeline: recap 10 · concept 20 · two-terminal demo 20 · Mission M-06 20 · pair activity on real GitHub 40 · Unit 2 quiz 10.
Before class: pairs where Student A adds Student B as a collaborator (Settings → Collaborators).

---
<!-- slide: center big -->
## 11:40 pm

Dhruvi pushes `orders.py` to GitHub.

## 9:00 am

Krish adds a menu item and types `git push`…

---
<!-- slide: command -->
## Rejected!

```output
To https://github.com/krish-patel/amroli-canteen.git
 ! [rejected]        main -> main (fetch first)
error: failed to push some refs to 'https://github.com/krish-patel/amroli-canteen.git'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally. This is usually caused by another repository pushing to
hint: the same ref. If you want to integrate the remote changes, use
hint: 'git pull' before pushing again.
```

Notes:
Git refuses to overwrite Dhruvi's work. This is a feature, not an error. Never "fix" it with --force.

---
## fetch vs pull

:::diagram fetch-pull

---
<!-- slide: command -->
## Look before you leap: `git fetch`

```terminal
$ git fetch
From https://github.com/krish-patel/amroli-canteen
   92bd5b5..e423aad  main -> origin/main
$ git status
On branch main
Your branch is behind 'origin/main' by 1 commit, and can be fast-forwarded.
  (use "git pull" to update your local branch)

nothing to commit, working tree clean
$ git log --oneline main..origin/main
e423aad (origin/main) Add orders list
```

Notes:
Your files have not changed. origin/main moved. git log main..origin/main = "what is on GitHub that I don't have".

---
<!-- slide: command -->
## Bring it in: `git pull`

```terminal
$ git pull
Updating 92bd5b5..e423aad
Fast-forward
 orders.py | 1 +
 1 file changed, 1 insertion(+)
 create mode 100644 orders.py
```

`git pull` = `git fetch` + `git merge`

---
<!-- slide: two -->
## `origin/main`, explained

:::neon What it is
Git's **bookmark** of where GitHub's `main` was the last time you talked to GitHub.
:::

:::neon+ When it moves
Only on `fetch`, `pull` or `push`. Never by itself.
:::

---
<!-- slide: center -->
:::tip The daily loop
☀️ `git pull` → ✏️ edit → 🔍 `git status` → 📦 `git add` → 💾 `git commit` → ☁️ `git push`
:::

Pull **before** you start. Push **when you finish**.

---
<!-- slide: activity 20 -->
## Mission M-06 · Teammate pushed overnight

Fetch Dhruvi's work, **look** at it, then pull it into `main`.

Notes:
Press T. Check that students run something between fetch and pull (status or log main..origin/main): the goal list requires it.

---
<!-- slide: activity 40 -->
## Pair activity on real GitHub

1. **B** clones **A**'s repository
2. **B** commits and pushes
3. **A** runs `git fetch`, inspects, then `git pull`
4. Swap roles

Bonus: both edit **different** files and push: who gets rejected?

Notes:
The bonus previews Unit 3: the second pusher is rejected even with different files, pulls (a merge commit appears), then pushes.

---
<!-- slide: quiz reveal -->
## Exit ticket

1. `fetch` vs `pull` in one line each
2. Push rejected with "fetch first". What do you type?
3. Does `git fetch` change your files?

:::reveal+ Answers
fetch = download only · pull = download + merge · `git pull` then `git push` · no, only `origin/main` moves
:::

---
<!-- slide: content -->
## Unit 2 complete 🎉

- Repository · three stages · `status` / `add` / `commit`
- `remote` · `push -u` · `clone` · `fetch` · `pull`

:::example Homework
Unit 2 quiz on the website (aim for 80%+). Next session: **branches**.
:::
