## The Amroli Canteen problem {#why}

Meet four BCA final-year students at SBCCAS. For their project they are building **Amroli Canteen**, a web app that lets students order samosas and chai *before* the lunch break, so nobody waits in the queue.

| Student | Builds |
|---|---|
| **Krish** | the menu and cart pages |
| **Dhruvi** | the order system in Python |
| **Meet** | the database |
| **Hetvi** | team lead: plans, reviews and writes the README |

In the first two weeks they share code the way many students do: WhatsApp, pen drives and email. Here is what happened.

<div class="flip-grid">
  <button class="flip-card" type="button"><span class="flip-front"><b>1 · Lost work</b>Krish's login page worked on Monday. On Tuesday he "improved" it and broke it. Monday's version is gone.</span><span class="flip-back"><b>With Git</b>Every commit is a saved snapshot. Krish can go back to Monday's version in one command.</span></button>
  <button class="flip-card" type="button"><span class="flip-front"><b>2 · File-name chaos</b><code>menu.html</code>, <code>menu_v2.html</code>, <code>menu_FINAL.html</code>, <code>menu_FINAL_use_this.html</code>…</span><span class="flip-back"><b>With Git</b>One file name. History keeps every version, with a message saying what changed.</span></button>
  <button class="flip-card" type="button"><span class="flip-front"><b>3 · Overwritten work</b>Dhruvi and Krish both edited <code>app.py</code> and sent it on WhatsApp. Whoever sent last "won".</span><span class="flip-back"><b>With Git</b>Changes are merged. If two people edit the same line, Git stops and asks a human to decide.</span></button>
  <button class="flip-card" type="button"><span class="flip-front"><b>4 · Who broke it?</b>The total price shows ₹0. Nobody knows when it broke or why.</span><span class="flip-back"><b>With Git</b>The log shows who changed what, when and why. You can find the exact change.</span></button>
  <button class="flip-card" type="button"><span class="flip-front"><b>5 · No backup</b>Meet's laptop crashed a week before the review. His database work was only on that laptop.</span><span class="flip-back"><b>With Git + GitHub</b>Every teammate and GitHub hold a full copy. A crashed laptop costs minutes, not weeks.</span></button>
</div>

<p class="flip-hint">Tap a card to see how Git fixes it.</p>

Hetvi, the team lead, says: *"Professional teams don't work like this. They use **Git** and **GitHub**. Let's learn it properly."* That is exactly what you will do in this course.

## What is version control? {#what-is-vcs}

A **version control system (VCS)** is software that records changes to files over time, so you can see who changed what and bring back any earlier version.

:::analogy A time machine for your project
Think of a video game that saves your progress at every checkpoint. If you fall into lava, you restart from the last checkpoint instead of from the beginning. A VCS gives your code the same superpower, and each checkpoint is called a **commit**.
:::

A VCS answers four questions about every change:

- **What** changed? (exactly which lines)
- **Who** changed it?
- **When** was it changed?
- **Why**? (the message the author wrote)

## Three kinds of version control {#vcs-types}

Version control has grown up in three stages.

:::diagram vcs-types

**1. Local VCS.** Versions are kept in a small database on one computer. An early example is RCS (1982).
*Like a personal diary in your room: useful, but only you can read it, and if the house floods it is gone.*

**2. Centralized VCS.** One central server holds all versions. Developers *check out* files from it and send changes back. Examples: CVS and Subversion (SVN).
*Like one library book the whole class must share: if the library is closed, nobody can study.* The server is a **single point of failure**.

**3. Distributed VCS.** Every developer has a **complete copy** of the project *and its whole history* on their own computer. Examples: **Git** and Mercurial.
*Like every student owning a full photocopy of the book: if one copy is lost, any other copy can replace it.*

| | Local | Centralized | Distributed (Git) |
|---|---|---|---|
| Where history lives | One computer | One server | Every computer |
| Work offline? | Yes | No | **Yes** |
| Team work | No | Yes | **Yes** |
| If one machine dies | History lost | Everyone stuck | **Nothing lost** |

:::insight Why Git won
Git was created in 2005 by **Linus Torvalds**, who also created Linux, to manage the Linux kernel's thousands of contributors. It is fast, works offline and makes branching cheap. Today almost every software company uses it.
:::

## Benefits of Git and GitHub {#benefits}

:::diagram git-vs-github

**Git** is the tool on your computer. **GitHub** is a website that hosts Git repositories so a team can share them. Together they give you:

- **Complete history**: every change, with who, when and why.
- **Safe experiments**: try an idea on a *branch* without breaking working code (Unit 3).
- **Teamwork**: many people work on the same project at the same time.
- **Undo**: go back to any earlier version in seconds (Unit 4).
- **Backup**: your code is safe on GitHub even if your laptop is not.
- **Career**: your GitHub profile is a portfolio that recruiters look at.

:::warning Git ≠ GitHub
A common exam mistake is writing "GitHub is a version control system". **Git** is the version control system. **GitHub** is a hosting service built around Git. GitLab and Bitbucket are similar services.
:::

## Installing Git on Windows {#install}

The SBCCAS labs use Windows, so here is the Windows installer step by step. (On macOS, Git comes with the Xcode tools; on Ubuntu, run `sudo apt install git`.)

1. Open **git-scm.com** and click **Download for Windows**. Choose the 64-bit installer.
2. Run the installer and click **Next** on the licence screen.
3. **Select Components:** keep the defaults.
4. **Choosing the default editor:** change *Vim* to **Notepad** or **Visual Studio Code**. (Vim confuses beginners. If it ever opens, type `:wq` and press Enter to leave.)
5. **Adjusting the name of the initial branch:** choose **Override the default branch name** and type `main`. GitHub uses `main` too.
6. **Adjusting your PATH:** keep **Git from the command line and also from 3rd-party software** (recommended).
7. **SSH executable:** keep *Use bundled OpenSSH*.
8. **HTTPS transport backend:** keep *Use the OpenSSL library*. (If the college network blocks GitHub, your lab admin may choose *Windows Secure Channel*.)
9. **Line ending conversions:** keep *Checkout Windows-style, commit Unix-style line endings*.
10. **Terminal emulator:** keep *Use MinTTY*.
11. **Default behaviour of `git pull`:** keep *Fast-forward or merge*.
12. **Credential helper:** keep **Git Credential Manager**. It opens a browser window to sign in to GitHub.
13. Keep the remaining defaults and click **Install**, then **Finish**.

Now open **Git Bash** from the Start menu and check the installation:

```terminal notry
$ git --version
git version 2.47.1.windows.1
```

Your number may be newer. Any version 2.x is fine.

:::tip No laptop? No problem.
Everything in Units 1–4 can also be practised in this site's [Playground](/playground/), which runs real Git inside your browser, even on a phone.
:::

## Telling Git who you are: `git config` {#config}

Every commit records an **author name** and **email**. Before your first commit, tell Git who you are. You only need to do this once per computer:

```terminal
$ git config --global user.name "Krish Patel"
$ git config --global user.email "krish@example.com"
```

Check your settings:

```terminal
$ git config --list
init.defaultbranch=main
user.name=Krish Patel
user.email=krish@example.com
$ git config user.name
Krish Patel
```

| Option | Where the setting is saved | Applies to |
|---|---|---|
| `--global` | `~/.gitconfig` in your home folder | every repository for your user account |
| *(no option, inside a repository)* | `.git/config` | only this repository |

:::warning Use the same email as GitHub
Use the email address you will use for your GitHub account. GitHub uses it to link your commits to your profile and to show the green squares on your contribution graph.
:::

:::note Shared lab computers
On a shared lab PC, set your name **without** `--global` inside your own project folder, so the next student's commits are not labelled with your name.
:::

If you forget to configure Git, your first commit stops with this message. Now you know how to fix it:

```output
Author identity unknown

*** Please tell me who you are.

Run

  git config --global user.email "you@example.com"
  git config --global user.name "Your Name"
```

## Getting help: `git help` {#help}

Git has its own manual built in. There are three ways to ask it for help:

| Command | What you get |
|---|---|
| `git help` | the list of the most common Git commands |
| `git help <command>` | the full manual page for one command, e.g. `git help commit` |
| `git <command> -h` | a short summary of options, right in the terminal |

```terminal
$ git commit -h
usage: git commit [-a] [-m <msg>] [--amend] [--allow-empty]

    -m <msg>     use the given message
    -a, --all    stage modified and deleted tracked files first
    --amend      replace the last commit
```

:::tip Read the error messages
Git's messages are unusually helpful. They often tell you the exact command to run next. Before searching the internet, read what Git printed.
:::

## Creating your GitHub account {#github-account}

1. Go to **github.com** and click **Sign up**.
2. Enter your **email**, the same one you used in `git config`.
3. Create a strong **password**.
4. Choose a **professional username**: `krish-patel` or `krishpatel-dev`, not `coolboy007`. It becomes your portfolio address: `github.com/krish-patel`.
5. Solve the puzzle, then type the **code GitHub emails you**.
6. Choose the **Free** plan.
7. Turn on **two-factor authentication (2FA)**: *Settings → Password and authentication → Enable two-factor authentication*. Use an authenticator app or the GitHub Mobile app, and **save your recovery codes** somewhere safe. GitHub requires 2FA for everyone who contributes code.
8. Add a profile photo, your name, and "BCA student at SBCCAS, Surat" in your bio.

:::example Lab L-01: your profile README
Create a repository named **exactly the same as your username** (for example `krish-patel/krish-patel`) and tick *Add a README file*. Whatever you write in that README appears on your GitHub profile page, like a business card. The full steps are on the [Labs](/labs/) page.
:::

## Unit 1 summary {#summary}

- A **version control system** records every change: what, who, when and why.
- **Local** VCS keeps history on one machine; **centralized** VCS on one server; **distributed** VCS (Git) on every computer.
- **Git** is the tool on your computer; **GitHub** is the website that hosts repositories for teams.
- On Windows, install **Git for Windows**, and set the default branch to `main` and the editor to Notepad or VS Code.
- `git config --global user.name` and `user.email` tell Git who you are.
- `git help`, `git help <command>` and `git <command> -h` are your built-in manual.
- Create a GitHub account with a professional username and **turn on 2FA**.

Next, practise with **Missions M-01 and M-02** below, then take the Unit 1 quiz.
