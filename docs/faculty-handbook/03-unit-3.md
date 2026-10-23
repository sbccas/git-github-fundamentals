## Chapter 3: Branching and Merging {#chapter-3}

*Sessions 7–9 · 6 hours · Missions M-08 – M-11 · Conflict game · Unit 3 lab*

### Learning outcomes {#ch3-outcomes}

By the end of Unit 3, a student can:

1. Explain what a branch is (a movable pointer) and what HEAD is.
2. Create, list and switch branches with `git branch`, `git switch` / `git checkout`, `-c` / `-b`.
3. Predict how the working directory changes when switching branches.
4. Merge a branch, and tell a fast-forward from a three-way merge (with a merge commit).
5. Resolve a merge conflict: read the markers, edit, `git add`, `git commit`, or `git merge --abort`.
6. Delete local branches (`-d`, `-D`) and remote branches (`git push origin --delete`).
7. Follow a simple feature-branch workflow in a team.

### Episode 3: Parallel universes {#ch3-episode}

> The app is working, and Hetvi demonstrates it to Mr. Desai, the canteen manager, every Friday. "Nobody touches `main` unless it works," she says.
>
> Krish wants to redesign the menu page, and Dhruvi wants to add online payment. Both will take a week. Hetvi draws two lines branching off the main line on the whiteboard: "Each of you gets a branch."
>
> Krish types `git switch -c feature-menu`, adds *Vada Pav*, commits, and switches back to `main` to check the demo. He gasps: "My Vada Pav is gone!" Hetvi laughs. "It's on your branch. `main` didn't change. That's the point."
>
> On Thursday Krish merges his finished menu into `main`: *Fast-forward*. Then Dhruvi merges the cart: *Merge made by the 'ort' strategy*, and a new merge commit appears in the graph.
>
> Friday morning, disaster. Dhruvi changed the opening time to 8 AM on her branch; Krish changed the same line on `main` to 10 AM. `git merge` stops: **CONFLICT**. The file shows both lines between strange arrows. Hetvi decides on 8 AM, Krish deletes the markers, `git add`, `git commit`, and the demo is saved.
>
> Afterwards the repository has eleven branches. "Spring cleaning," says Hetvi. Merged branches are deleted with `-d`; the failed `experiment` branch needs `-D`.

### The ideas in depth {#ch3-depth}

#### Branches are pointers

A branch is a file in `.git/refs/heads/` containing one commit hash. That's all. Creating a branch writes a 41-byte file, which is why it is instant even in huge projects. When you commit, Git creates the commit and then **moves the current branch's pointer** to it.

**HEAD** is usually a *symbolic* reference: the file `.git/HEAD` contains `ref: refs/heads/main`. "Switching branches" means: change HEAD to the other branch, then update the working directory and index to match that branch's commit.

**Detached HEAD** (Unit 4) is when `.git/HEAD` contains a commit hash directly instead of a branch name.

#### What switching really does

1. Git compares the current commit's tree with the target commit's tree.
2. Files that differ are rewritten in your folder; files that exist only in the target appear; files that exist only in the current commit disappear.
3. Untracked files and unrelated uncommitted edits are left alone.
4. If an uncommitted edit would be **overwritten**, Git refuses (*"Your local changes … would be overwritten by checkout"*).

This explains the classic surprise: "my file vanished when I switched". It is in the other branch's commit.

#### `checkout` vs `switch` / `restore`

`git checkout` historically did two unrelated jobs: switching branches **and** restoring files. Since Git 2.23 (2019) there are two clearer commands, `git switch` (branches) and `git restore` (files). The syllabus names `checkout`, and most online material uses it, so teach both and show the mapping:

| Task | Classic | Modern |
|---|---|---|
| Switch branch | `git checkout main` | `git switch main` |
| Create + switch | `git checkout -b x` | `git switch -c x` |
| Discard file edits | `git checkout -- file` | `git restore file` |
| Visit an old commit | `git checkout a1b2c3d` | `git switch --detach a1b2c3d` |

#### How a merge works

To merge branch B into the current branch A, Git finds the **merge base**, the most recent common ancestor of A and B.

- If the merge base **is A itself** (A has no new commits), the merge is a **fast-forward**: A's pointer simply moves to B. No new commit.
- Otherwise Git performs a **three-way merge**: it compares *base → A* and *base → B* for every file. Changes to different files, or to different parts of a file, are combined automatically. The result is saved as a **merge commit with two parents**.
- The default strategy in modern Git is called **ort** (*"Ostensibly Recursive's Twin"*), which is why the message says *Merge made by the 'ort' strategy*.
- `git merge --no-ff` forces a merge commit even when a fast-forward is possible. Some teams like this to keep a visible record of each feature.

#### Conflicts, precisely

A conflict happens when both sides changed **the same lines** (or one side edited a file the other deleted). Git:

- writes both versions into the file between markers (`<<<<<<< HEAD`, `=======`, `>>>>>>> branch`),
- records the file as **unmerged** in the index (`git status` shows *both modified*),
- writes `MERGE_HEAD` so the next `git commit` creates a merge commit with two parents.

The student's job: produce the correct content, remove the markers, `git add` (marks it resolved), `git commit`. `git merge --abort` returns to the state before the merge.

**Important teaching point:** Git checks for unmerged files, **not** for leftover marker text. If a student runs `git add` on a file that still contains `<<<<<<<`, Git accepts it and the markers end up committed. Train them to check the file before `git add`.

#### Deleting branches

- `git branch -d x` deletes the label only if its commits are already contained in the current branch (merged).
- `git branch -D x` deletes it regardless. Commits that were only on that branch become unreachable and are eventually garbage-collected. (Advanced: `git reflog` can rescue them for a while.)
- `git push origin --delete x` deletes the branch on GitHub. Other people's `origin/x` remains until they run `git fetch --prune`.

### Worked walkthrough (real output) {#ch3-walkthrough}

```terminal
$ git merge change-timing
Auto-merging timing.txt
CONFLICT (content): Merge conflict in timing.txt
Automatic merge failed; fix conflicts and then commit the result.
$ cat timing.txt
<<<<<<< HEAD
Open: 10 AM
=======
Open: 8 AM
>>>>>>> change-timing
$ echo "Open: 8 AM" > timing.txt
$ git add timing.txt
$ git commit --no-edit
[main e41ab0c] Merge branch 'change-timing'
```

Narrate: *HEAD* = the branch you are on (main, Krish's 10 AM); *change-timing* = the branch being merged (Dhruvi's 8 AM). The final commit has two parents; show it in `git log --oneline --graph`.

### More story examples {#ch3-stories}

**Spectrum 2026 schedule.** The robotics team and the coding-contest team both edit `schedule.html` on their own branches. They change *different* rows, so the merge is automatic. Then both change the *lunch break* row, which is a conflict. *Ask:* "Why did the first merge succeed and the second stop?"

**Library system.** A senior's half-finished "fine calculator" feature sits on an unmerged branch for months. A new student is about to delete it with `-D`. *Ask:* "What happens to that work? How could the team have avoided this?" (Push branches; merge small and often; name branches clearly.)

**PCPM assignment.** A student keeps the working version of `practical7.c` on `main` and tries a faster algorithm on `faster-sort`. The experiment fails, so `git switch main` and `git branch -D faster-sort`. *Use to show:* branches make experiments cheap.

### Board diagrams to draw {#ch3-board}

**Branch pointers and HEAD:**

```output
            HEAD
             |
        feature-menu
             |
A --- B --- C --- D
            |
           main
```

**Fast-forward vs three-way:**

```output
Fast-forward:  A---B (main)---C---D (feature)   →   main jumps to D

Three-way:     A---B---E (main)
                    \
                     C---D (feature)            →   A---B---E---M (main)
                                                         \     /
                                                          C---D
```

### Questions students ask {#ch3-questions}

**"Does creating a branch copy my project? Will it fill my disk?"**
No. A branch is a 41-byte file pointing to a commit.

**"Which branch do I merge from?"**
Always switch to the branch that **receives** the work, then `git merge <other>`.

**"Why didn't Git make a merge commit?"**
It was a fast-forward: the receiving branch had no new commits.

**"Can a conflict delete my work?"**
No. Both versions are in the file. If you're unsure, `git merge --abort` restores everything.

**"Why does the editor open after merge?"**
Git asks you to confirm the merge commit message. Save and close to accept (or use `--no-edit`).

**"I deleted a branch by mistake!"**
If it was merged, nothing is lost: the commits are in `main`. If not, `git reflog` can usually find the commit for a few weeks (beyond this course; show it if asked).

**"Should every small change have a branch?"**
In a team, yes: it keeps `main` working and makes review easy (Unit 5).

### Misconceptions to correct {#ch3-misconceptions}

| Misconception | Correction |
|---|---|
| "A branch is a copy of the files." | It's a pointer to a commit. |
| "Switching branches lost my work." | The work is committed on the other branch; switch back. |
| "`git merge x` merges the current branch into x." | It merges **x into** the current branch. |
| "A conflict means Git is broken / I did something wrong." | It means two people changed the same lines; Git asks a human. |
| "`git add` checks that markers are removed." | It doesn't. Check the file yourself. |
| "Deleting a branch deletes its commits." | Merged commits stay in history; only the label goes. |

### Self-check for faculty {#ch3-selfcheck}

1. Where is a branch stored, and what does it contain? *`.git/refs/heads/<name>`, one commit hash.*
2. What does `.git/HEAD` normally contain? *`ref: refs/heads/<branch>`.*
3. When is a merge a fast-forward? *When the receiving branch is an ancestor of the other branch (no new commits).*
4. What is a merge base? *The most recent common ancestor of the two branches.*
5. What makes a merge commit special? *It has two parents.*
6. What does Git write while a conflict is in progress? *Markers in the file, unmerged index entries, `MERGE_HEAD`.*
7. How do you cancel a conflicted merge? *`git merge --abort`.*
8. `git branch -d` refuses. Why, and what are the options? *Unmerged commits; merge first or force with `-D`.*
9. Classic equivalent of `git switch -c x`? *`git checkout -b x`.*
10. Delete a branch on GitHub from the terminal? *`git push origin --delete x`.*

### 10-minute recap {#ch3-recap}

1. Draw A–B–C with `main` and `feature` labels; ask what moves when you commit on `feature`.
2. Ask: "Krish is on `main` and types `git merge feature-cart`. Into which branch does the work go?"
3. Show a conflict block; students label HEAD, divider, theirs, and say the four resolution steps.
4. One sentence each: `-d` vs `-D`; fast-forward vs merge commit.
