## Chapter 1: Introduction to Version Control {#chapter-1}

*Sessions 1–2 · 4 hours · Missions M-01, M-02 · Lab L-01*

### Learning outcomes {#ch1-outcomes}

By the end of Unit 1, a student can:

1. Explain in their own words what a version control system is and the four questions it answers (what, who, when, why).
2. Compare local, centralized and distributed version control, and say which one Git is and why that matters.
3. Explain the difference between Git and GitHub, and name two alternatives to GitHub.
4. Install Git for Windows with sensible options and verify it.
5. Configure `user.name` and `user.email`, and explain `--global` vs local configuration.
6. Find help with `git help`, `git help <command>` and `git <command> -h`.
7. Create a secure, professional GitHub account with two-factor authentication.

### Episode 1: The final_FINAL disaster {#ch1-episode}

> It is the second week of the final-year project. Hetvi has a WhatsApp group called *Amroli Canteen 🍽️* with forty-three unread messages. Most of them are files.
>
> On Monday, Krish sends `menu.html`. It works. On Tuesday he sends `menu_v2.html` with a new design, and the cart button stops working. Nobody can find Monday's version: it was on his laptop, and he saved over it.
>
> Dhruvi edits `app.py` to add order numbers and sends it at 11 pm. Krish, who had downloaded the previous `app.py` that morning, adds a discount feature and sends *his* copy at midnight. Dhruvi's order numbers vanish. Nobody notices for three days.
>
> On Friday the total price shows ₹0. Everyone says "I didn't touch that."
>
> The next Monday, Meet's laptop will not start. The database tables he designed over two weeks were only on that laptop.
>
> Hetvi calls a meeting in the lab. "This is how students work," she says. "It is not how companies work. They use something called **version control**. This week we all learn Git."

Use this episode as the opening of Session 1. Ask students to count the problems: there are five (lost work, file-name chaos, overwritten work, no history, no backup). Each is solved by a feature they will learn.

### The ideas in depth {#ch1-depth}

#### What a version control system really stores

A version control system keeps a **history of snapshots** of a project. In Git, each snapshot is a **commit**. A commit records:

- the complete state of every tracked file at that moment (Git stores *snapshots*, not just differences, and saves space by reusing unchanged files and compressing data),
- the **author** and **committer** (name, email, time),
- a **message** explaining the change,
- a link to the **parent** commit(s), so the history forms a chain (and later, with branches, a graph).

Each commit is identified by a **hash**, a 40-character hexadecimal ID calculated from its contents (SHA-1 by default). Change anything in a commit and its hash changes, which is why history in Git is very hard to corrupt silently. Students usually see the first seven characters, e.g. `6cb774b`.

#### A short history of version control

| Year | System | Type | Note for class |
|---|---|---|---|
| 1972 | SCCS (Bell Labs) | local | one of the first: tracked versions of single files |
| 1982 | RCS (Walter Tichy) | local | the "local VCS" example used in Unit 1 |
| 1990 | CVS | centralized | first widely used team system |
| 2000 | Subversion (SVN) | centralized | "CVS done right"; still found in some companies |
| 2005 | **Git** (Linus Torvalds) | distributed | built for the Linux kernel |
| 2005 | Mercurial | distributed | similar idea to Git; less common today |

**The Git origin story** (students enjoy it): from 2002 the Linux kernel used a commercial distributed system called BitKeeper for free. In April 2005 that free licence was withdrawn. Linus Torvalds wrote the first version of Git in about ten days, aiming for speed, a distributed model and strong protection against corrupted history. Since mid-2005 Git has been maintained by Junio Hamano.

#### Local vs centralized vs distributed, more precisely

- **Local:** a version database on one machine. Good for one person; no collaboration; one disk failure loses everything.
- **Centralized:** a single server holds the *only* full history. Clients have just a working copy. You need the server for almost every operation (commit, log, diff against old versions). Server failure = nobody can work; server data loss = history lost.
- **Distributed:** every clone is a **complete repository** with the full history. Commit, log, diff and branch all work offline; you only need the network to *share* (push, fetch, pull). Any clone can rebuild the server. In practice teams still agree on one shared copy (GitHub), but it is a convention, not a technical necessity.

#### Git vs GitHub vs the alternatives

| | What it is | Notes |
|---|---|---|
| **Git** | free, open-source version control software | runs on your computer; command line or GUI |
| **GitHub** | website and company that hosts Git repositories | founded 2008, owned by Microsoft since 2018; issues, pull requests, Actions, Pages |
| **GitLab** | similar hosting service | can also be installed on a company's own server |
| **Bitbucket** | similar hosting service | from Atlassian; integrates with Jira |
| **Gitea** | lightweight self-hosted service | common for private college / company servers |

The commands students learn are identical everywhere; only the website changes.

#### Configuration levels

Git reads settings from three places, and a later (more specific) one overrides an earlier one:

| Level | Option | File | Applies to |
|---|---|---|---|
| system | `--system` | Git's install folder (`etc/gitconfig`) | every user on the computer |
| global | `--global` | `~/.gitconfig` | one user account |
| local | *(default inside a repo)* | `.git/config` | one repository |

`git config --list --show-origin` shows which file each setting comes from. This is useful when a student's commits show the wrong name on a lab PC.

**Lab PCs:** recommend students set name and email **locally** (without `--global`) inside their project folder, so the next user of the PC doesn't commit under their name.

**Privacy:** GitHub can hide a user's real email. Under *Settings → Emails*, tick *Keep my email addresses private* and use the address GitHub shows (`ID+username@users.noreply.github.com`) as `user.email`.

#### Getting help

| Command | Output |
|---|---|
| `git help` | list of common commands, grouped by task |
| `git help <command>` / `git <command> --help` | full manual page (opens in a browser on Git for Windows) |
| `git <command> -h` | short usage summary printed in the terminal |
| `git help -g` | list of concept guides (e.g. `git help everyday`, `git help glossary`) |

Train the habit: **read the error message first.** Git's messages often contain the exact fix.

#### GitHub accounts

- **Username:** short, professional, permanent-looking (`krish-patel`). It becomes the portfolio URL.
- **Two-factor authentication:** GitHub requires 2FA for everyone who contributes code (rolled out during 2023). Students should use an authenticator app or GitHub Mobile and **store the recovery codes**. A lost phone without recovery codes can lock them out permanently.
- **Passwords are not used for Git commands.** Since August 2021 GitHub rejects account passwords for Git over HTTPS. On Windows, Git Credential Manager handles sign-in through the browser; alternatives are personal access tokens or SSH keys.
- **Profile README:** a repository named exactly like the username shows its README on the profile page (Lab L-01).

### More story examples {#ch1-stories}

**Spectrum 2026 tech-fest website.** Six volunteers edit `schedule.html` the night before the fest. Two of them change the time of the robotics event. In the morning the printed schedule is wrong and nobody knows whose copy was printed. *Use to show:* why a central "source of truth" plus history matters.

**The PCPM assignment folder.** A first-year student keeps `practical1.c` … `practical20.c`. Practical 12 compiled on Friday; on Monday, after "a small fix", it doesn't. *Use to show:* that version control is useful even for one person; a commit after each working practical is a checkpoint.

**The library management system.** The college library software was written by a 2019 batch. A 2026 student must fix a bug. With Git, `git log` shows every change since 2019 with reasons; without it, there is just a ZIP file. *Use to show:* history and messages are documentation for the future.

### Board diagrams to draw {#ch1-board}

**The three kinds of VCS** (draw in three columns):

```output
 LOCAL              CENTRALIZED               DISTRIBUTED
 [PC + history]      [ SERVER + history ]       [ GitHub + history ]
                     /       |        \        /        |        \
                  [PC]     [PC]      [PC]   [PC+hist] [PC+hist] [PC+hist]
 one disk fails:    server fails:              any copy can restore
 history lost       nobody can work            the others
```

**Git vs GitHub:** a laptop labelled *Git (tool)* with an arrow labelled *push* to a cloud labelled *GitHub (website)*.

### Questions students ask {#ch1-questions}

**"Is Google Drive version control?"**
Partly. Drive keeps old versions of single files, but not a snapshot of the whole project at a moment, no messages explaining why, no branches and no merging of two people's changes. Git does all of these.

**"Do I need the internet to use Git?"**
No. Everything except sharing (push, fetch, pull, clone) works offline.

**"Is GitHub free?"**
Yes for students and most uses: unlimited public and private repositories. The GitHub Student Developer Pack adds free extras with a verified student email.

**"Can people see my code on GitHub?"**
Only if the repository is **public**. Private repositories are visible only to people you invite.

**"Why does the installer ask so many questions?"**
Most defaults are fine. The important choices are the editor (Notepad or VS Code, not Vim) and the default branch name (`main`).

**"I set the wrong email. Are my old commits ruined?"**
No. Fix `user.email` for future commits. (Rewriting old commits is possible but not needed in this course.)

**"What is the difference between `git help commit` and `git commit -h`?"**
The first opens the full manual; the second prints a short summary in the terminal.

### Misconceptions to correct {#ch1-misconceptions}

| Misconception | Correction |
|---|---|
| "GitHub is a version control system." | Git is the VCS; GitHub hosts Git repositories. |
| "Version control is only for big teams." | It helps one student too: undo, history, backup. |
| "Distributed means there is no main copy." | Teams still agree on a shared copy (GitHub); distributed means *every* copy is complete. |
| "`user.name` is my GitHub login." | It is just text written into commits. The **email** links commits to the GitHub account. |
| "Git saves only the differences." | Conceptually Git stores snapshots; compression is an internal detail. |

### Self-check for faculty {#ch1-selfcheck}

1. Which VCS type keeps the only full history on one server? *Centralized.*
2. Name the four questions a VCS answers. *What, who, when, why.*
3. Who created Git, and what event triggered it? *Linus Torvalds, 2005, when Linux lost its free BitKeeper licence.*
4. What file does `git config --global` write to? *`~/.gitconfig`.*
5. Which setting wins: global or local? *Local.*
6. Which command prints a short usage summary? *`git <command> -h`.*
7. Why should `user.email` match the GitHub account? *So GitHub links commits to the profile and contribution graph.*
8. Why can't students push with their GitHub password? *GitHub stopped accepting passwords for Git over HTTPS in 2021; use Credential Manager, a token or SSH.*
9. What makes a repository a "profile README"? *Its name equals the username and it contains a README.*
10. Give one non-programming example of version-control pain. *`report_final_v7.docx`.*

### 10-minute recap {#ch1-recap}

Use at the start of Session 3 or in a revision lecture:

1. Show the `project_FINAL_really.zip` list. Ask: "What problem is this?" (no history)
2. Draw the three VCS types; ask which one Git is and why that protects Meet.
3. Ask a student to type the two `git config --global` commands from memory.
4. One-sentence answers: Git vs GitHub; `git help commit` vs `git commit -h`.
