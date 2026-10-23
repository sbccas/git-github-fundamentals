## How labs work {#about}

Missions run in your browser. **Labs run on a real computer and the real github.com**, the way you will use Git at work. Each lab has steps, a checklist, and something to **submit** (usually a link) so your teacher can check it.

:::warning On a shared lab computer
- Set your name and email **without** `--global`, inside your own project folder.
- When you finish, remove your saved GitHub sign-in: **Control Panel → Credential Manager → Windows Credentials →** remove entries starting with `git:https://github.com`.
- Sign out of github.com in the browser.
:::

## Unit 1 lab: Set up Git and GitHub {#unit-1}

**Time:** 60 minutes · **Needs:** a Windows PC, an email address, your phone (for two-factor authentication)

1. Install **Git for Windows** from git-scm.com, following the installer choices in [Unit 1](/unit-1/#install): editor **Notepad**, initial branch **main**.
2. Open **Git Bash** and check the version:

```terminal notry
$ git --version
```

3. Tell Git who you are. On your own laptop use `--global`; on a lab PC, skip `--global` and do it inside your project folder later.

```terminal
$ git config --global user.name "Your Name"
$ git config --global user.email "you@example.com"
$ git config --list
```

4. Practise asking Git for help: run `git help`, `git help commit` and `git commit -h`. Write down one thing you learned from each.
5. Create your **GitHub account** with the same email, a professional username, and **two-factor authentication** turned on. Store your recovery codes safely.

:::example Checklist
- [ ] `git --version` prints a version number
- [ ] `git config --list` shows your name and email
- [ ] GitHub account created, email verified, 2FA turned on
- [ ] Profile photo and bio added
:::

**Submit:** your GitHub profile link, e.g. `https://github.com/krish-patel`.

### Lab L-01: Your profile README {#l-01}

GitHub shows a special README on your profile page, like a developer business card.

1. On GitHub click **+ → New repository**.
2. Name the repository **exactly your username** (for example `krish-patel`). GitHub shows: *"You found a secret!"*
3. Make it **Public**, tick **Add a README file**, and click **Create repository**.
4. Click the ✏️ pencil on `README.md` and write about yourself in Markdown:

```markdown
# Hi, I'm Krish 👋

- 🎓 BCA student at SBCCAS, Amroli, Surat
- 💻 Learning: Git, GitHub, Python, web development
- 🍽️ Building: Amroli Canteen, a canteen pre-order app
- 📫 Reach me: krish@example.com
```

5. Click **Commit changes…**, write a message such as `Add profile introduction`, and commit.
6. Open your profile page (`github.com/<your-username>`). Your README now appears at the top.

**Submit:** your profile link.

## Unit 2 lab: Your first project on GitHub {#unit-2}

**Time:** 90 minutes · **Needs:** Git Bash, your GitHub account

### Part A: local first, then push

1. Create a project and make three separate commits:

```terminal notry
$ cd ~/Desktop
$ mkdir my-first-repo
$ cd my-first-repo
$ git init
$ echo "# My First Repo" > README.md
$ git add README.md
$ git commit -m "Add README"
$ echo "I am a BCA student at SBCCAS." > about-me.txt
$ git add about-me.txt
$ git commit -m "Add about me"
$ echo "Hobbies: cricket, coding" >> about-me.txt
$ git commit -am "Add hobbies"
$ git log --oneline
```

2. On github.com create a **new, empty** repository named `my-first-repo`. **Do not** add a README.
3. Connect and push. Git Credential Manager opens a browser window: sign in to GitHub there.

```terminal notry
$ git remote add origin https://github.com/<your-username>/my-first-repo.git
$ git push -u origin main
```

4. Refresh the GitHub page. Your three files and three commits are online.

### Part B: clone, change, pull

1. Clone your own repository into a second folder. This pretends to be a teammate's laptop:

```terminal notry
$ cd ~/Desktop
$ git clone https://github.com/<your-username>/my-first-repo.git teammate-copy
$ cd teammate-copy
$ echo "Favourite subject: Git & GitHub" >> about-me.txt
$ git commit -am "Add favourite subject"
$ git push
```

2. Go back to the first folder and get the change:

```terminal notry
$ cd ~/Desktop/my-first-repo
$ git fetch
$ git status
$ git pull
$ cat about-me.txt
```

:::example Checklist
- [ ] Repository has at least **5 commits**, each with a clear message starting with a verb
- [ ] `git status` in both folders says *up to date* and *working tree clean*
- [ ] You can explain the difference between `fetch` and `pull` in one sentence
:::

**Submit:** your repository link, e.g. `https://github.com/krish-patel/my-first-repo`.

## Units 3–5 labs {#later}

The labs for branching (Unit 3), advanced commands (Unit 4) and GitHub collaboration (Unit 5), including **L-02** *create and configure a repository*, **L-03** *open an issue* and **L-04** *fork and pull request*, arrive in the next milestones.
