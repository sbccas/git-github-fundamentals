---
title: Installing Git, config, help & GitHub account
session: 02
unit: 1
duration: 120
---
<!-- slide: title -->
<p class="kicker">Session 2 · Unit 1</p>

# Setting up Git &amp; GitHub

Install · configure · ask for help · create your account

Notes:
Timeline: recap 10 · install walkthrough 20 · config & help demo 20 · Missions M-01/M-02 15 · GitHub account + 2FA 40 · collect usernames + exit ticket 15.
Have the Git for Windows installer downloaded so you can show the screens even if lab PCs already have Git.

---
<!-- slide: quiz reveal -->
## Recap from Session 1

1. Local, centralized, distributed: which one is Git?
2. Git or GitHub: which one is the *tool*?
3. What happens in a centralized VCS when the server is down?

:::reveal+ Answers
Distributed · Git is the tool, GitHub the website · nobody can commit or see history
:::

---
<!-- slide: content reveal -->
## Install Git for Windows

- **git-scm.com** → *Download for Windows* (64-bit)
- Default editor → **Notepad** or **VS Code** (not Vim!)
- Initial branch name → **Override → `main`**
- PATH → *Git from the command line and also from 3rd-party software*
- Credential helper → **Git Credential Manager**
- Everything else → keep the defaults

Notes:
Walk through the installer on the projector. The two choices that matter: editor (Vim traps beginners; if it opens, type :wq and Enter) and the default branch name (main, to match GitHub).

---
<!-- slide: command -->
## Check the installation

Open **Git Bash** from the Start menu:

```terminal notry
$ git --version
git version 2.47.1.windows.1
```

Any `2.x` version is fine.

---
<!-- slide: two -->
## Tell Git who you are

```terminal
$ git config --global user.name "Krish Patel"
$ git config --global user.email "krish@example.com"
```

:::neon Why?
Every commit records an **author name and email**. Use the **same email** as your GitHub account so commits link to your profile.
:::

---
<!-- slide: command -->
## Read your settings back

```terminal
$ git config --list
init.defaultbranch=main
user.name=Krish Patel
user.email=krish@example.com
$ git config user.name
Krish Patel
```

Notes:
Point out: reading a setting = same command without a value.

---
## `--global` or not?

| | Saved in | Applies to |
|---|---|---|
| `--global` | `~/.gitconfig` | **every** repository of this user |
| *(no option, inside a repo)* | `.git/config` | **this** repository only |

:::warning+ Shared lab PCs
Set your identity **without** `--global` inside your own project, or the next student's commits get *your* name.
:::

---
<!-- slide: command -->
## Forgot to configure? Git tells you

```output
Author identity unknown

*** Please tell me who you are.

Run

  git config --global user.email "you@example.com"
  git config --global user.name "Your Name"
```

Notes:
Show this on purpose: make a commit on a machine without identity. Teach the habit: read the message, it contains the fix.

---
## Three ways to get help

| Command | Gives you |
|---|---|
| `git help` | the most common commands |
| `git help commit` | the full manual page |
| `git commit -h` | a short summary in the terminal |
| `git help -g` | concept guides |

---
<!-- slide: activity 15 -->
## Missions M-01 &amp; M-02

Open **Missions** on the course site (phone or lab PC):

- **M-01 · Who am I?** set and check your identity
- **M-02 · Ask the manual** explore Git's help

Goals tick automatically. Hints are there if you're stuck.

Notes:
Press T for the 15-minute timer. Students without laptops can do these on phones. Walk around and look for students whose goals aren't ticking.

---
<!-- slide: content reveal -->
## Create your GitHub account

- github.com → **Sign up**
- Email = the one in `git config`
- Username: **professional**: `krish-patel`, not `coolboy007`
- Verify with the code GitHub emails you
- Plan: **Free**

Notes:
Explain that the username becomes the portfolio URL github.com/username which recruiters see.

---
<!-- slide: center -->
:::warning Turn on two-factor authentication
*Settings → Password and authentication → Enable 2FA*

Authenticator app or **GitHub Mobile** · **save your recovery codes**
:::

GitHub requires 2FA for everyone who contributes code.

Notes:
Lost phone + no recovery codes = locked out forever. Make students write the codes somewhere safe (not only on the same phone).

---
<!-- slide: content -->
## Your profile README: Lab L-01 (homework)

- New repository named **exactly your username**
- Public · **Add a README file**
- Write about yourself in Markdown → **Commit changes**
- It appears on `github.com/<username>`

Notes:
Collect every student's GitHub username in your class sheet before they leave.

---
<!-- slide: quiz reveal -->
## Exit ticket

1. Command to see all your Git settings?
2. `git help commit` vs `git commit -h`?
3. Why turn on two-factor authentication?

:::reveal+ Answers
`git config --list` · full manual vs short summary · protects the account even if the password leaks; GitHub requires it
:::
