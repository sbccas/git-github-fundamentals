---
title: The GitHub interface, repositories & issues
session: 13
unit: 5
duration: 120
---
<!-- slide: title -->
<p class="kicker">Session 13 · Unit 5 · Introduction to GitHub</p>

# Going public

The GitHub interface · repositories · issues

Notes:
Timeline: recap 10 · interface tour 30 · creating & managing repos 20 · issues 15 · Labs L-02 / L-03 35 · exit ticket 10.
Use github.com/sbccas as the live example during the tour.

---
<!-- slide: center big -->
## From storing code to working together

Mr. Desai wants to **report bugs**. Juniors want to **reuse** the app. Hetvi wants **every change reviewed**.

GitHub is built for exactly this.

---
## A repository page

:::diagram github-repo-page

Notes:
Do the tour live in a browser on the projector. Show: Code button (clone URL), commits link (= git log), a commit (= git show), the branch dropdown, a file's History and Blame, Star/Watch/Fork. Press "t" to show the file finder and "." to open the web editor.

---
<!-- slide: content reveal -->
## Quick wins on GitHub

- Commit history = `git log` · a commit = `git show`
- **History** and **Blame** on any file
- Press **t** to find a file · **.** for the web editor
- ⭐ Star · 👁 Watch · ⑂ Fork

---
## Creating a repository

| Field | Advice |
|---|---|
| Name | short, lowercase, hyphens |
| Public / Private | who can see it |
| Add a README | **yes** to clone · **no** to push an existing project |
| .gitignore template | pick your language |
| License | MIT for open source |

---
## Managing it: Settings

| Setting | Use |
|---|---|
| Collaborators | give teammates push access |
| Default branch | usually `main` |
| Branch protection | require a pull request into `main` |
| Pages | publish a website |
| Danger zone | rename · transfer · archive · **delete** |

Notes:
Explain the danger zone but don't click anything in it. Releases: Releases → Draft a new release from a tag (link back to Unit 4).

---
<!-- slide: two -->
## Issues: one task each

:::story Mr. Desai's bug report
**Title:** Cart total wrong when the same item is added twice
Steps · expected ₹30 · actual ₹15 · Android, Chrome
:::

:::neon+ A good issue
Clear title · steps to reproduce · expected vs actual · screenshot · labels · assignee
:::

---
<!-- slide: command -->
## Close it from a commit

```terminal notry
$ git commit -m "Fix cart total for repeated items (fixes #3)"
$ git push
```

When the commit reaches `main`, issue **#3 closes automatically**.

`fixes` · `closes` · `resolves` all work.

---
<!-- slide: activity 35 -->
## Labs

- **L-02** · Create and configure a repository (README, .gitignore, licence, collaborator, release)
- **L-03** · Report and fix an issue, in pairs, closed by a commit

Notes:
Press T. Check that pairs use each other's repositories for L-03 and that the issue is closed by the commit, not by the button.

---
<!-- slide: quiz reveal -->
## Exit ticket

1. Where do you add a collaborator?
2. Create the repo with or without a README if you'll push an existing project?
3. What does `fixes #3` in a commit message do?

:::reveal+ Answers
Settings → Collaborators · without · closes issue #3 when the commit reaches the default branch
:::
