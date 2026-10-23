## About this page {#about}

These topics are **not in the certificate syllabus** and won't be in the exam. They are things you'll meet as soon as you use Git on a real project, so read them when you're curious.

## `.gitignore`: files Git should skip {#gitignore}

:::analogy Packing a suitcase
You pack clothes for the trip, not your rubbish bin or your personal diary. `.gitignore` is the list you hand Git that says "don't pack these".
:::

Create a file named `.gitignore` in the project root:

```output
# secrets: never commit these
.env
passwords.txt

# Python
__pycache__/
*.pyc
venv/

# Node.js
node_modules/

# C programs (compiled output)
*.exe
*.o
a.out

# editors and OS junk
.vscode/
Thumbs.db
.DS_Store
```

| Pattern | Ignores |
|---|---|
| `notes.txt` | that file, in any folder |
| `*.log` | every file ending in `.log` |
| `build/` | the whole `build` folder |
| `/todo.txt` | only `todo.txt` in the root |
| `!keep.log` | do **not** ignore this one (exception) |

:::warning Already committed?
`.gitignore` only affects **untracked** files. If you already committed a secret, remove it from tracking with `git rm --cached passwords.txt`, commit, and **change the password**: it is still in the history.
:::

GitHub offers ready-made templates when you create a repository, and `gitignore.io` generates one for your languages.

## `.gitattributes`: consistent line endings {#gitattributes}

Windows ends lines with *CR LF*; macOS and Linux with *LF*. Mixed teams can see whole files marked as "changed" for no visible reason. A `.gitattributes` file sets the rules for everyone:

```output
* text=auto eol=lf
*.bat text eol=crlf
*.png binary
*.jpg binary
```

That's why Git for Windows sometimes prints *"LF will be replaced by CRLF"*. It is converting line endings and is usually harmless.

## `.gitkeep`: keeping empty folders {#gitkeep}

Git tracks files, not folders, so an empty folder disappears from the repository. By convention people add an empty file named `.gitkeep` (the name isn't special to Git; any file works):

```terminal
$ mkdir -p uploads
$ touch uploads/.gitkeep
$ git add uploads/.gitkeep
```

## HTTPS or SSH? {#ssh}

| | HTTPS | SSH |
|---|---|---|
| URL looks like | `https://github.com/user/repo.git` | `git@github.com:user/repo.git` |
| Setup | none: sign in via the browser (Git Credential Manager) | create a key once and add it to GitHub |
| Best for | lab PCs, beginners | your own laptop |

Set up SSH on your own laptop (Git Bash):

```terminal notry
$ ssh-keygen -t ed25519 -C "you@example.com"
$ cat ~/.ssh/id_ed25519.pub
$ ssh -T git@github.com
```

Copy the line printed by `cat` (it starts with `ssh-ed25519`) into **GitHub → Settings → SSH and GPG keys → New SSH key**. Never share the file **without** `.pub`: that's your private key.

## A professional team workflow {#workflow}

1. `git switch main && git pull`: start from the latest code.
2. `git switch -c feature-x`: one branch per task.
3. Commit small, clear steps.
4. `git push -u origin feature-x` and open a **pull request**.
5. A teammate reviews it; fix and push until it's approved.
6. Merge on GitHub, delete the branch, `git switch main && git pull`.

Protect `main` on GitHub (*Settings → Branches*) so nobody can push to it without a reviewed pull request.

## Git in VS Code {#vscode}

VS Code has Git built in: click the **Source Control** icon (the branch symbol) in the left bar.

| VS Code | Git command |
|---|---|
| **+** next to a file | `git add <file>` |
| type a message, click **✓ Commit** | `git commit -m "…"` |
| **Sync Changes** / ⋯ → Push, Pull | `git push`, `git pull` |
| branch name at the bottom-left | `git switch` |
| click a changed file | `git diff` |

The buttons run the same commands you learned, so knowing the commands means you understand what the buttons do.

## Publishing a website with GitHub Pages {#pages}

Any repository can become a free website at `https://<username>.github.io/<repo>/`:

1. Put an `index.html` in the repository and push.
2. **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root → Save.**
3. Wait a minute and open the URL.

This course website is published with GitHub Pages too, using **GitHub Actions** to build it on every push.

## Real Git on your phone {#phone}

The Playground runs Git in your browser. If you want **real** Git on your phone:

- **Android: Termux.** Install Termux (the F-Droid version is the up-to-date one), then run `pkg update` and `pkg install git`. All the commands in this course work. For pushing, use a GitHub **personal access token** as the password, or an SSH key.
- **iPhone: a-Shell or Working Copy.** a-Shell includes a Git-compatible command (`lg2`); Working Copy is a full Git app with a graphical interface.

## Other Git hosting services {#hosts}

| Service | Notes |
|---|---|
| **GitLab** | very similar to GitHub; companies can install it on their own servers; "merge requests" instead of pull requests |
| **Bitbucket** | from Atlassian; works closely with Jira |
| **Gitea / Forgejo** | lightweight, self-hosted, popular for private college servers |

The Git commands are identical everywhere. Only the website changes.

## GitHub for students {#student-pack}

With a verified student email (your college address), GitHub's **Student Developer Pack** gives free access to developer tools and services while you study. Apply at *education.github.com*.
