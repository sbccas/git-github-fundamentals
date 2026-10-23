## Chapter 5: Introduction to GitHub {#chapter-5}

*Sessions 13–14 · 4 hours · Labs L-01 – L-04 · Unit 5 quiz · Final self-check*

### Learning outcomes {#ch5-outcomes}

By the end of Unit 5, a student can:

1. Navigate a GitHub repository page: code, history, branches, README, clone URL, issues, pull requests, settings.
2. Create a repository with suitable options (visibility, README, `.gitignore`, licence) and manage it (collaborators, default branch, branch protection, releases).
3. Write a useful issue, label and assign it, and close it from a commit message.
4. Open, review and merge a pull request, and explain the three merge options.
5. Fork a repository, contribute through a pull request, and keep the fork up to date with `upstream`.
6. Use the course cheat sheet confidently.

### Episode 5: Going public {#ch5-episode}

> The Amroli Canteen app has been running for a month. Mr. Desai keeps phoning Hetvi with problems, and she loses track of them. "Write them on GitHub," she tells him, and creates his first **issue**: *Cart total wrong when the same item is added twice*. Krish fixes it and writes `fixes #3` in his commit message. When the commit reaches `main`, the issue closes itself. Mr. Desai is impressed.
>
> Then Hetvi turns on **branch protection**: nobody may push to `main` directly any more. Krish's next feature arrives as a **pull request**. Hetvi leaves a comment on line 12 ("this crashes if the cart is empty"), Krish pushes a fix to the same branch, the PR updates, and Hetvi approves and merges it.
>
> A month later, students from another college find the repository. They can't push to it, so they **fork** it, add a feature for their own canteen, and open a pull request back. Krish reviews code from strangers for the first time. "This is open source," says Hetvi.

### The ideas in depth {#ch5-depth}

#### GitHub is Git plus a website

Everything under *Code* is plain Git: commits, branches, tags. GitHub adds **collaboration features stored outside Git**: issues, pull request discussions, reviews, stars, Actions. They don't travel with `git clone`. Make sure students see the line between "Git does this" and "GitHub does this".

#### Visibility and access

- **Public:** anyone can see and clone; only collaborators can push.
- **Private:** only invited people can see it.
- **Collaborators** (personal repositories) get push access; organisations like `sbccas` use teams and roles.
- Pushing needs permission **and** authentication (browser sign-in, token or SSH).

#### Issues

Issues are numbered per repository (`#1`, `#2`…), and pull requests share the same numbering. Labels, assignees and milestones organise them. Closing keywords (`close`, `closes`, `closed`, `fix`, `fixes`, `fixed`, `resolve`, `resolves`, `resolved`) followed by `#n` close the issue when the commit or PR reaches the **default branch**. Mention people with `@username`, and link issues by writing `#n`.

#### Pull requests

A PR is a request to merge a **head** branch (yours) into a **base** branch (usually `main`). It isn't a Git object. It lives on GitHub and is updated automatically whenever the head branch receives new commits.

Reviews come in three kinds: *Comment*, *Approve*, *Request changes*. With branch protection, a PR may require approvals and passing checks before merging.

Merge options:

| Option | History on `main` | When teams choose it |
|---|---|---|
| Merge commit | all commits + a merge commit | keep full detail of each feature |
| Squash and merge | one commit per PR | tidy history; small PRs |
| Rebase and merge | commits replayed linearly | linear history without merge commits |

**Draft PRs** signal work in progress. A PR that conflicts with `main` must be updated: merge `main` into the branch locally, resolve, push.

#### Forks

A fork is a server-side copy under the user's account, linked to the original. The standard remote names:

- `origin` = **your fork** (you push here),
- `upstream` = **the original** (you pull updates from here).

Keep a fork current with `git pull upstream main` then `git push`, or GitHub's **Sync fork** button. Contributors typically make a **branch per PR** in their fork, so several PRs can be open at once.

#### Open-source etiquette and licences

Without a licence, code is "all rights reserved" by default, even if it is public. **MIT** is a short, permissive licence; this course's content uses **CC BY-SA 4.0**. Good contributors read `CONTRIBUTING.md`, start with *good first issue* labels, keep PRs small and respond politely to review.

### Running Lab L-04 smoothly {#ch5-l04}

- Create the class practice repository before Session 14 (faculty guide, Appendix A) with a `students/` folder and a `CONTRIBUTING.md`.
- Each student adds **only** `students/<username>.md`, so PRs never conflict.
- Review on the projector: open *Pull requests*, pick one, show *Files changed*, comment, approve, **Squash and merge**. Students see their work land live.
- For a conflict demonstration, ask two volunteers to edit the same line of `README.md`.
- Common problems: PR opened against **their own fork** instead of the class repository (check *base repository*); committing the whole folder of another student's file; branch pushed but PR not created.

### More story examples {#ch5-stories}

**Spectrum 2026 website (issues).** Visitors report broken links as issues; volunteers pick issues labelled *good first issue*. *Ask:* how does an issue list help a team of volunteers who never meet?

**Library system (pull requests).** A junior proposes a new fine rule as a PR. The senior asks for changes because a test case is missing. *Ask:* what would have happened without review?

**PCPM portfolio (fork).** A student finds a classmate's C programs repository with a bug in the factorial program. They fork, fix it on a branch and open a PR. *Ask:* why can't they push directly?

### Board diagrams to draw {#ch5-board}

```output
upstream (original)  ──Fork button──▶  origin (your fork)  ──git clone──▶  your computer
        ▲                                     ▲                                │
        └──────────── pull request ───────────┴────────── git push ────────────┘
```

```output
feature branch ──push──▶ GitHub ──PR──▶ review (comment / request changes / approve) ──merge──▶ main
```

### Questions students ask {#ch5-questions}

**"Is a pull request the same as `git pull`?"**
No. Despite the name, a pull request is a GitHub *review-and-merge request*. `git pull` downloads commits.

**"Do issues and PRs come with `git clone`?"**
No. They live on GitHub, not in the Git repository.

**"Can I make a PR inside my own repository?"**
Yes: branch → push → PR into `main`. That's how teams with branch protection work.

**"Someone forked my repository. Can they change my code?"**
No. They change their copy. Their changes reach yours only if you merge their PR.

**"Should I make my college projects public?"**
Usually yes, as a portfolio, unless they contain secrets or your college forbids sharing assignments.

**"Which merge button should we use?"**
Any is fine for this course. Many teams use *Squash and merge* for small PRs.

### Misconceptions to correct {#ch5-misconceptions}

| Misconception | Correction |
|---|---|
| "A pull request downloads code." | It asks to merge a branch, after review. |
| "Forking and cloning are the same." | A fork is on GitHub; a clone is on your computer. |
| "Public means anyone can push." | Anyone can read; only collaborators can push. |
| "Closing an issue fixes the bug." | The fix is a commit; the keyword just links and closes the issue. |
| "No licence means free to use." | No licence means all rights reserved. |

### Self-check for faculty {#ch5-selfcheck}

1. Name three GitHub features that are not part of Git. *Issues, pull requests, reviews (also stars, Actions).*
2. What happens when `fixes #3` reaches a feature branch only? *Nothing until it reaches the default branch.*
3. Head vs base in a PR? *Head = the branch with changes; base = where they will be merged.*
4. What does *Squash and merge* produce? *One commit on the base branch.*
5. In a fork workflow, what are `origin` and `upstream`? *Your fork; the original.*
6. How do you keep a fork updated? *`git pull upstream main` then push, or Sync fork.*
7. How do you stop direct pushes to `main`? *Branch protection rule requiring a PR.*
8. Why should each L-04 student change only their own file? *To avoid conflicts between PRs.*
9. Default rights on public code without a licence? *All rights reserved.*
10. Where does a release come from? *A tag, published with notes under Releases.*

### 10-minute recap {#ch5-recap}

1. Show a repository page; students point out the clone URL, history, issues and PR tabs.
2. "Mr. Desai found a bug." Students write the issue title and the commit message that closes it.
3. Draw the PR flow; students fill in the six steps.
4. One sentence each: fork vs clone; `origin` vs `upstream`.
