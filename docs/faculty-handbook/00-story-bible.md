## Story bible: the Amroli Canteen {#story-bible}

Every unit of this course is taught through one continuing story. Lessons, missions, quizzes and slides all use the same characters, so students meet the same people again and again and remember the Git idea attached to each of their problems. This section is the reference every faculty member should use, so the story stays consistent across classes and teachers.

### Why teach Git with a story? {#why-stories}

Git commands are abstract: *staging area*, *remote-tracking branch*, *fast-forward*. Students forget definitions, but they remember **what went wrong for someone and how it was fixed**. Each Git concept in this course is introduced as the solution to a problem a character actually has:

- "Meet's laptop crashed" → why distributed version control matters.
- "Dhruvi and Krish both changed the opening time" → merge conflicts.
- "The price shows ₹0 since last week. Who changed it?" → `git log`, `git diff`.

When a student later asks "why do we need `git fetch`?", you can answer "remember the morning Dhruvi pushed overnight?" and the class already knows.

### The project {#project}

**Amroli Canteen** is a BCA final-year project at SBCCAS: a small web app where students order snacks *before* the lunch break and pick them up without queuing.

| Part | File(s) | Built by |
|---|---|---|
| Menu page | `index.html`, `menu.txt`, `menu.css` | Krish |
| Cart | `cart.js` | Krish |
| Order system | `app.py`, `orders.py` | Dhruvi |
| Database | `schema.sql`, `seed.sql` | Meet |
| Documentation | `README.md`, `team.md`, planning notes repo `canteen-docs` | Hetvi |
| Opening time | `timing.txt` (used in the conflict story) | everyone, and that's the problem |

GitHub repositories used in the course (simulated in the Playground, real in labs):
`krish-patel/amroli-canteen` (main project) and `hetvi-desai/canteen-docs` (planning notes).

### The cast {#cast}

| Character | Role | Personality you can play up | Typical mistake (and lesson) |
|---|---|---|---|
| **Krish Patel** | frontend: menu & cart | Fast, enthusiastic, "I'll just quickly change it" | Commits everything with `git add .`, writes "update" as a message, breaks working code. Teaches staging, good messages, branches, undo. |
| **Dhruvi Patel** | backend: orders | Careful, organised, pushes late at night | Her overnight pushes cause Krish's rejected pushes. Teaches fetch, pull, rejected pushes. |
| **Meet Shah** | database | Quiet, works alone on his laptop | Laptop crashes with unpushed work. Teaches backups, distributed VCS, push often. |
| **Hetvi Desai** | team lead | Plans, reviews, protects `main` | Insists on branches and pull requests; tags releases. Teaches workflow, reviews, issues, tags. |

Supporting characters you may use: **Mr. Desai**, the canteen manager who reports bugs (*issues* in Unit 5), and **the juniors** who later *fork* the project for another college (Unit 5).

### The story arc {#arc}

| Unit | Episode | What happens | Git ideas | Missions |
|---|---|---|---|---|
| 1 | *The final_FINAL disaster* | Two weeks of WhatsApp and pen-drive sharing: lost work, file chaos, overwrites, no history, Meet's crash. Hetvi says: "we learn Git." Everyone installs Git and makes GitHub accounts. | VCS types, Git vs GitHub, install, `config`, `help`, GitHub account | M-01, M-02 |
| 2 | *First commit, first push* | Krish creates the repo and commits the menu. He pushes to GitHub. Dhruvi clones it, adds the order system and pushes overnight. Next morning Krish fetches and pulls. | `init`, three stages, `status`/`add`/`commit`, `remote`, `push`, `clone`, `fetch`, `pull` | M-03 – M-07 |
| 3 | *Parallel universes* | Krish builds the cart on a branch while main keeps working. Dhruvi and Krish both change the opening time; the merge conflicts and they resolve it together. Old branches are cleaned up. | branches, `switch`, merge (fast-forward / 3-way), conflicts, deleting branches | M-08 – M-11 |
| 4 | *Detective work* | Prices show ₹0. The team reads the history to find the bad commit. During a demo, an urgent fix interrupts half-done work (stash). They tag v1.0 for the college tech fest and safely undo a pushed mistake. | `log`, `diff`, `show`, `stash`, tags, `reset`, `revert`, `restore` | M-12 – M-15 |
| 5 | *Going public* | The repo goes public. Mr. Desai reports bugs as issues. Every change now goes through a pull request reviewed by Hetvi. Juniors from another college fork the project. | GitHub interface, repos, issues, pull requests, forks | L-01 – L-04 |

### Other story settings for variety {#other-stories}

Use these when a class has heard the canteen story enough, or when you want students to *transfer* the idea to a new situation. These settings are used in the handbook chapters and make good exam questions.

| Setting | Use it for |
|---|---|
| **Spectrum 2026 tech-fest website**: 6 volunteers edit the event schedule page the night before the fest | conflicts, branches per event, tags for "final schedule" |
| **College library management system**: a C/Python project passed from one batch to the next | clone, history, `log`, why commit messages matter years later |
| **PCPM class assignment**: a student's folder of C programs (`practical1.c` … `practical20.c`) | `init`, staging, small commits, undoing a broken program, a first personal GitHub portfolio |
| **Thesis / project report** in Word: `report_final_v7.docx` | the "why version control" hook for non-programmers |

### Tips for telling the story {#telling}

1. **Name the character, then the command.** "Krish needs to save his work → `git commit`."
2. **Let students predict.** "Dhruvi pushed last night. Krish pushes now. What will happen?" Then show the rejected push.
3. **Use the same file names** as the lessons (`menu.txt`, `orders.py`, `timing.txt`) so demos match what students see in missions.
4. **Show the mistake first.** Each episode starts with something going wrong. The fix only makes sense after students feel the problem.
5. **Keep it light.** Students enjoy Krish's mistakes; they will make the same ones.
