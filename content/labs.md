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

## Unit 3 lab: Branches and a real conflict {#unit-3}

**Time:** 90 minutes · **Needs:** Git Bash, a partner, the `my-first-repo` repository from the Unit 2 lab

### Part A: feature branches on your own

```terminal notry
$ cd ~/Desktop/my-first-repo
$ git switch -c feature-skills
$ echo "Skills: C, Python, Git" >> about-me.txt
$ git commit -am "Add skills"
$ git switch main
$ git switch -c feature-goals
$ echo "Goal: become a full-stack developer" > goals.txt
$ git add goals.txt
$ git commit -m "Add career goal"
$ git switch main
$ git merge feature-skills
$ git merge feature-goals
$ git log --oneline --graph --all
$ git branch -d feature-skills feature-goals
$ git push
```

Write down which merge was a **fast-forward** and which created a **merge commit**, and why.

### Part B: cause and resolve a conflict with a partner

1. **Partner A** adds **Partner B** as a collaborator: on GitHub, *Settings → Collaborators → Add people*. B accepts the invitation email.
2. Both clone A's repository (A can use the existing folder).
3. Both edit **the same line** of `README.md` (for example, change the title), commit, and push.
4. The second person's push is **rejected**. They run `git pull`, which reports a **CONFLICT**.
5. Open `README.md`, agree on the final title together, delete the markers, then:

```terminal notry
$ git add README.md
$ git commit -m "Resolve README title conflict"
$ git push
```

6. The first person runs `git pull` to get the resolved version.

:::example Checklist
- [ ] `git log --oneline --graph` shows at least one merge commit
- [ ] Your partner's repository shows the conflict-resolution commit
- [ ] No `<<<<<<<` markers are left in any file
- [ ] Merged feature branches are deleted
:::

**Submit:** both repository links and a screenshot of `git log --oneline --graph`.

## Unit 4 lab: Detective, stash, tag and undo {#unit-4}

**Time:** 90 minutes · **Needs:** Git Bash and your `my-first-repo`

1. **Detective.** Answer these with Git commands and write down the command you used:
   - How many commits does the repository have? (`git log --oneline`)
   - Which commits changed `about-me.txt`? (`git log --oneline -- about-me.txt`)
   - What exactly changed in your second commit? (`git show HEAD~N`)
   - Which commits did your partner make? (`git log --author="…"`)
2. **Stash.** Start editing `goals.txt` (don't commit). Stash it, fix a typo in `README.md` and commit, then `git stash pop`. Commit the goals change.
3. **Tag a release** and push it:

```terminal notry
$ git tag -a v1.0 -m "First complete version"
$ git push origin v1.0
```

   On GitHub, open the **Tags** list to see it.
4. **Undo three ways:**
   - Edit a file, then throw the edit away with `git restore <file>`.
   - Make a commit you don't push, then remove it with `git reset --soft HEAD~1` and commit it again with a better message.
   - Push a commit that adds a silly line, then undo it with `git revert HEAD` and push. Look at the history on GitHub: both commits are there.

:::example Checklist
- [ ] Written answers to the four detective questions, with commands
- [ ] Tag `v1.0` visible on GitHub
- [ ] A `Revert "…"` commit visible on GitHub
:::

**Submit:** your repository link and the detective answers.

## Unit 5 labs {#later}

The GitHub collaboration labs, **L-02** *create and configure a repository*, **L-03** *open an issue* and **L-04** *fork and pull request*, arrive in the next milestone.
