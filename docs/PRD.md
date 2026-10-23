# PRD — Git & GitHub Fundamentals Learning Platform

| | |
|---|---|
| **Product** | Git & GitHub Fundamentals — interactive learning platform |
| **Owner** | Sutex Bank College of Computer Applications & Science (SBCCAS), Amroli, Surat |
| **Repo (planned)** | `github.com/sbccas/git-github-fundamentals` → `https://sbccas.github.io/git-github-fundamentals/` |
| **Local path** | `D:\Future Projects\git-github-fundamentals` |
| **Status** | v1.8 — approved; Phase 1: Milestones 1–5 committed, Milestone 6 (polish & launch) built — GitHub push and Pages next. Progress cross-check: [PROGRESS.md](PROGRESS.md) |
| **Last updated** | 2026-10-22 |

> **How to use this document.** This PRD is the single source of truth. We build only what is listed here.
> Any new idea goes into **§14 Backlog** first and is built only after it is approved and moved into a phase.

---

## 1. Vision

A free, futuristic, mobile-first learning platform where SBCCAS students learn Git & GitHub by **doing**, not just reading.
Every concept is paired with a real Git terminal that runs inside the browser (even on a phone), a live animated commit graph,
story-based missions, and quizzes — all mapped exactly to the 5-unit certificate-course syllabus.

## 2. Goals & success measures

| Goal | Measure of success |
|---|---|
| Cover 100% of the syllabus | Every syllabus bullet maps to a lesson section (see §5) |
| Hands-on learning on any device | Every Unit 1–4 command can be practised in the browser terminal on Android Chrome & iOS Safari |
| Engagement | A student can complete all missions and quizzes without a laptop |
| Zero cost for Phase 1 | Hosted on GitHub Pages, no paid services |
| Easy for faculty to maintain | Lesson text and quiz questions live in plain content files, editable without touching app logic |

## 3. Users

| User | Needs |
|---|---|
| **Students** — BCA, BCA-AI, B.Sc. Data Science, B.Sc. IT (beginners) | Clear explanations, practice without installing anything, instant feedback, progress tracking |
| **Faculty / course in-charge** | Teach in class from the site, assign labs, (Phase 2) see student progress, run live quizzes, approve certificates |

## 4. Phases (agreed)

| Phase | Scope | Hosting / services | Cost |
|---|---|---|---|
| **Phase 1 — Core platform** | All lessons, quizzes, real-Git browser terminal, missions, commit graph, cheat sheet, labs, PWA | GitHub Pages only | Free |
| **Phase 2 — Classroom & identity** | Sign in with GitHub, progress sync, leaderboard, live classroom quiz, teacher dashboard, certificate verification | GitHub Pages + **Supabase** | Free tier |
| **Phase 3 — AI tutor** | `git explain`, "Why did this fail?", commit-message coach, AI practice questions, AI PR reviewer | Supabase Edge Function → **Claude API** | Pay-per-use, capped |

**Decision:** Vercel is **not** used. Supabase Edge Functions host the AI proxy, so the stack stays GitHub Pages + Supabase.
Phase 1 must be complete and fully usable on its own; Phases 2–3 are additive and must not require a redesign.

---

## 5. Course content (Phase 1)

Source: certificate-course syllabus (Git & GitHub Fundamentals, 2 credits, 30 hours). Only the unit topics are used —
no college or faculty details from that document.

| Unit | Hours | Syllabus topics | Lesson sections |
|---|---|---|---|
| **1. Introduction to Version Control** | 4 | Local / Centralized / Distributed VCS · Benefits of Git & GitHub · Installing Git on Windows · `config` · `help` · Creating a GitHub account | Why VCS (team-project story) · 3 types of VCS · Git vs GitHub · Install on Windows (step-by-step) · `git config` · `git help` · GitHub sign-up & profile |
| **2. Getting Started with Git** | 8 | Local vs remote repositories · `init`, `clone`, `status`, `add`, `commit`, `pull`, `push`, `fetch` · Creating your first repository | Local vs remote · The `.git` folder · Three stages (working dir → staging → repo) · Each command with real output · First repo: remote-first & local-first methods |
| **3. Branching and Merging** | 6 | Introduction to branches · Creating & switching · Merging & resolving conflicts · Deleting branches | What is a branch · `branch` / `switch` / `checkout -b` · Fast-forward vs 3-way merge · Conflict markers & resolution · Deleting local/remote branches |
| **4. Advanced Git Commands** | 6 | `log`, `diff`, `stash`, `reset` · Stashing & tags · Undoing changes: `revert`, `reset`, `checkout` | `log` variants · `diff` (unstaged / staged / branches) · `stash` workflow · `reset` soft/mixed/hard · `tag` (light & annotated) · Undo decision guide (revert vs reset vs checkout/restore) |
| **5. Introduction to GitHub** | 4 | Navigating the GitHub interface · Creating & managing repos · Issues & pull requests · Forking · Git cheat sheet | Tour of the GitHub UI · Repo settings, README, visibility · Issues · Pull requests & review · Fork → clone → branch → PR flow · Cheat sheet |
| **Final assessment** | 2 | — | Practical test, self-check, showcase (see faculty guide, Session 15) |
| **Bonus (optional, marked "Beyond the syllabus")** | — | — | `.gitignore` · `.gitattributes` · `.gitkeep` · SSH vs HTTPS · Daily team workflow & rules · VS Code Source Control · GitHub Pages · Real Git on phone (Termux / a-Shell) · Other hosts (GitLab, Bitbucket, Gitea) |

Teaching examples and analogies are catalogued in [`reference-examples.md`](reference-examples.md).
Session-by-session teaching plans (15 × 2 hours) are in [`faculty-guide.md`](faculty-guide.md).

---

## 6. Functional requirements — Phase 1

### 6.1 Site pages

| ID | Page | Requirements |
|---|---|---|
| P-01 | **Home** (`/`) | Hero, course overview (5 units, 30 hrs, 2 credits), unit cards with progress rings, "Start learning" / "Open terminal" CTAs, college info, footer |
| P-02 | **Unit pages** (`/unit-1` … `/unit-5`) | Lesson sections (§5), sticky table of contents with scroll-spy, "Try it in terminal" buttons, labs, end-of-unit quiz, "Mark unit complete", previous/next unit |
| P-03 | **Playground** (`/playground`) | Full-screen real-Git terminal + live commit graph + file explorer (§6.2) |
| P-04 | **Missions** (`/missions`) | Mission map and mission runner (§6.3) |
| P-05 | **Cheat sheet** (`/cheatsheet`) | Searchable, filter by unit/category, copy buttons, print-friendly layout |
| P-06 | **Labs** (`/labs`) | Practical assignments per unit with steps and expected outcome |
| P-07 | **Final self-check** (`/self-check`) | 40-question mixed test across units, score report by unit. Not a certificate. |
| P-08 | **Bonus** (`/bonus`) | Beyond-the-syllabus topics (§5) |
| P-09 | **Glossary** (`/glossary`) | All terms; same terms show a hover/tap definition inside lessons |
| P-10 | **About** (`/about`) | College details (§10), course details, hidden faculty section (§10) |
| P-11 | **Teach** (`/teach/`, `/teach/session-NN/`, `/teach/handbook/`) | Lecture slide decks, presenter view and the Faculty Handbook — see §6.6 F-04 – F-18 |

### 6.2 Practice terminal (real Git in the browser)

| ID | Requirement |
|---|---|
| T-01 | Uses **isomorphic-git** with **lightning-fs** (IndexedDB) — real objects, real SHA-1 hashes, real branches. |
| T-02 | Works on Android Chrome, iOS Safari, and desktop browsers; no install, no login. |
| T-03 | **Git commands supported:** `init`, `config`, `help`, `status`, `add`, `commit`, `log` (`--oneline`, `--graph`, `--all`, `-n`), `diff` (`--staged`, branch/commit compare), `show`, `branch` (`-a`, `-d`, `-D`), `switch` (`-c`), `checkout` (branch, `-b`, `-- <file>`), `merge` (incl. conflicts), `restore` (`--staged`), `reset` (`--soft`/`--mixed`/`--hard`), `revert`, `stash` (`push`, `pop`, `list`, `apply`, `drop`), `tag` (`-a`, `-m`, `-d`), `remote` (`add`, `-v`, `remove`, `set-url`), `clone`, `fetch`, `pull`, `push` (`-u`, `--tags`, `--delete`). |
| T-04 | **Shell commands supported:** `pwd`, `ls` (`-a`, `-la`), `cd`, `mkdir` (`-p`), `touch`, `cat`, `echo` (with `>` and `>>`), `rm`, `mv`, `clear`, `history`, `reset-lab`. |
| T-05 | **Simulated remote:** a built-in "GitHub" lives inside the browser as a second repo. `clone`, `push`, `pull`, `fetch` work against it with realistic output. A "teammate" can push commits to it (used by missions to practise `fetch`/`pull` and conflicts). |
| T-06 | **File editor:** `edit <file>` (alias `nano`, `code`) opens a mobile-friendly editor sheet; saving writes to the virtual file system. Used for conflict resolution. |
| T-07 | **Output** matches real Git wording as closely as practical; errors are shown in real Git style with a plain-English hint line below. |
| T-08 | **Live commit graph** beside the terminal (below it on phones): commits, branches, HEAD, tags, remote-tracking branches; animates on every change. |
| T-09 | **Time-travel slider** on the graph: scrub through commits to see file contents at each point (read-only). |
| T-10 | **File explorer** panel showing working-directory files with status colours (untracked / modified / staged). |
| T-11 | **Mobile key bar:** Tab, ↑, ↓, Ctrl+C, and quick-insert buttons (`git `, `status`, `add .`, `commit -m ""`, `log --oneline`). |
| T-12 | Tab autocompletion for commands, branch names and file names; ↑/↓ history. |
| T-13 | Multiple named sandboxes; "Reset sandbox" restores a clean state. Lessons can open the terminal pre-loaded with a scenario. |
| T-14 | Unsupported command → friendly message listing supported commands; never a blank or crash. |

### 6.3 Missions (story mode)

Cast: an SBCCAS student team building their final-year project (see `reference-examples.md`).
Each mission: story brief → goal checklist → hint button (3 levels) → automatic success check → XP + badge.

| ID | Unit | Mission | Skill checked |
|---|---|---|---|
| M-01 | 1 | *Who am I?* | `config` name/email, `config --list` |
| M-02 | 1 | *Ask the manual* | `help`, `<cmd> --help` |
| M-03 | 2 | *Day One* | `init`, `add`, `commit` first repo |
| M-04 | 2 | *Pack only what matters* | selective staging, `status`, `restore --staged` |
| M-05 | 2 | *Ship it to origin* | `remote add`, `push -u` |
| M-06 | 2 | *Teammate pushed overnight* | `fetch` vs `pull` |
| M-07 | 2 | *Join the project* | `clone` |
| M-08 | 3 | *Parallel universe* | create & switch branches |
| M-09 | 3 | *Bring it home* | fast-forward and 3-way merge |
| M-10 | 3 | *Two edits, one line* | merge conflict resolution |
| M-11 | 3 | *Spring cleaning* | delete merged / unmerged branches |
| M-12 | 4 | *Detective* | `log`, `diff`, `show` to find the bad commit |
| M-13 | 4 | *Drop everything!* | `stash`, fix, `stash pop` |
| M-14 | 4 | *Release day* | annotated tag, push tags |
| M-15 | 4 | *Undo, the safe way* | `revert` vs `reset` vs `checkout`/`restore` |

Unit 5 is practised as **guided GitHub labs** on the real github.com (P-06), because issues, PRs and forks happen on the website:
L-01 profile README · L-02 create & configure a repo · L-03 open an issue · L-04 fork a class practice repo and open a PR.

### 6.4 Quizzes

| ID | Requirement |
|---|---|
| Q-01 | 10–15 questions per unit; types: single choice, multiple choice, "predict the output", "order the commands". |
| Q-02 | Instant feedback with explanation for every option. |
| Q-03 | Questions shuffled; answers stored locally; best score kept. |
| Q-04 | Questions live in content files (JSON/Markdown) editable by faculty. |
| Q-05 | Mini conflict-resolution game: choose the correct final lines for a conflicted file. |

### 6.5 Progress & gamification (local, Phase 1)

| ID | Requirement |
|---|---|
| G-01 | Progress saved in the browser (sections read, quizzes, missions). Works without login; clearly labelled "saved on this device". |
| G-02 | XP for missions/quizzes, levels, and a fixed badge set (one per unit, one per mission group, "Conflict Crusher", "Time Traveller", "Course Complete"). |
| G-03 | Export / import progress as a file (for switching devices before Phase 2). |

### 6.6 Faculty resources

| ID | Requirement |
|---|---|
| F-01 | **Faculty guide** (`docs/faculty-guide.md`): lab setup checklist, teaching method, 15 session plans (objectives, timeline, demo script, activity, misconceptions, check questions, homework), assessment scheme and rubric, troubleshooting, class-practice-repo setup, syllabus mapping. Status: draft v1.0 written 2026-10-22. |
| F-02 | Faculty guide must stay in sync with lessons, missions and labs — any change to an M-xx / L-xx item updates the guide in the same commit. |
| F-03 | Faculty guide must be exportable to PDF for printing (Markdown → PDF). |

#### Lecture slides — "Teach" section (approved 2026-10-22)

Web-based slide decks that faculty project in class. One deck per session (15 decks), following the session plans in the faculty guide.

| ID | Requirement |
|---|---|
| F-04 | **Teach hub** at `/teach/`: list of the 15 sessions grouped by unit, each with duration, objectives and links to its deck, its faculty-guide plan and its handbook chapter. Linked from the "More" menu and the footer. Public (same as the faculty guide). |
| F-05 | **Deck page** at `/teach/session-NN/` (NN = 01–15). 16:9 stage that scales to fill any screen; slide number and progress bar; works offline once loaded. |
| F-06 | **Projector look:** dark background with **neon glowing borders** and highlight boxes in the unit colours; large type (body ≥ 28 px at 1080p, code ≥ 24 px); high contrast so text stays readable on projectors and LCD panels. A "projector boost" toggle increases glow and contrast for washed-out projectors. |
| F-07 | **Highlights:** step-by-step reveals ("fragments") so faculty can show one point at a time; a neon outline pulse on the currently revealed item; a spotlight that dims everything except one block. |
| F-08 | **Slide types:** title, concept + analogy, diagram (three stages, branches, local/remote), command demo (command, real output, explanation), story scene (Amroli Canteen), compare table, quiz question with reveal, activity / timer, recap. |
| F-09 | **Controls:** → / Space / Page Down = next; ← / Page Up = previous (works with presentation clickers); F = full screen; O = overview grid; P = presenter view; T = start/stop activity timer; B = blank screen; Home/End. Touch swipe on tablets. |
| F-10 | **Presenter view** (P): opens a second window with current + next slide, speaker notes, elapsed time and the session timeline from the faculty guide; kept in sync with the projected window (BroadcastChannel). |
| F-11 | **Live demo link:** command-demo slides have a "Run in Playground" button that opens `/playground/?cmd=…` in a new tab. |
| F-12 | **Content as data:** each deck is a content file (`content/slides/session-NN.*`) so faculty can edit text without touching code. |
| F-13 | **Print/PDF:** print stylesheet puts one slide per landscape page (light background, borders kept) for handouts. |
| F-14 | Respects "reduce motion": glow pulses and transitions turn off; highlights stay as static outlines. |

#### Faculty Handbook (approved 2026-10-22)

A book-style companion for staff: what to *know* before teaching (the faculty guide covers how to *run* each session).

| ID | Requirement |
|---|---|
| F-15 | **Location:** `docs/faculty-handbook/` — one Markdown chapter per unit plus a front matter file and appendices; also rendered on the site at `/teach/handbook/` and printable to PDF. Public. |
| F-16 | **Each chapter contains:** learning outcomes; in-depth explanations (deeper than the student lessons); the **Amroli Canteen story episode** for that unit; 2–3 **additional story examples** in other settings students know (college fest website, library management system, a class assignment); analogies and board diagrams to draw; worked command walkthroughs with real output; common student questions with model answers; misconceptions and how to correct them; a 10-question self-check for faculty with answers; a "10-minute recap" for revision lectures. |
| F-17 | **Story bible** (front matter): the Amroli Canteen cast, their project, files and the full story arc across all five units, so every faculty member tells the same story. |
| F-18 | Handbook, slides, lessons and faculty guide stay consistent — a change to a session's content updates all four in the same commit (extends F-02). |

### 6.7 Global UX

| ID | Requirement |
|---|---|
| U-01 | **Ctrl+K / ⌘K command palette** (and a search button on mobile): jump to any lesson, command, glossary term or mission. |
| U-02 | Dark (default) and light themes; respects system setting; toggle remembered. |
| U-03 | Copy button on every code block; "Run in terminal" button on runnable examples. |
| U-04 | Glossary terms show a definition on hover/tap. |
| U-05 | **PWA:** installable to home screen, works offline after first visit. |
| U-06 | Subtle motion (graph animations, section reveals); respects "reduce motion" setting. |

---

## 7. Functional requirements — Phase 2 (Supabase)

| ID | Requirement |
|---|---|
| S-01 | **Sign in with GitHub** (Supabase Auth). Local progress is merged into the account on first sign-in. |
| S-02 | Progress sync across devices. |
| S-03 | Student profile: name, GitHub username, programme (BCA / BCA-AI / B.Sc. DS / B.Sc. IT), batch/division. |
| S-04 | **Leaderboard** by batch (XP); students can opt out of public display. |
| S-05 | **Live classroom quiz:** faculty starts a session, students join with a code, questions appear in real time, live results chart. |
| S-06 | **Teacher dashboard:** per-batch completion of units, missions, quiz scores; CSV export. Faculty role only. |
| S-07 | **Certificate verification:** faculty approve completion → certificate record with unique ID → public page `/verify/<id>` shows name, course, date, college. Certificates are issued by the college, not auto-generated. |
| S-08 | Row-level security: students see only their own data; faculty see their batches. |

Data (indicative): `profiles`, `batches`, `progress`, `quiz_attempts`, `mission_runs`, `live_sessions`, `live_answers`, `certificates`.

## 8. Functional requirements — Phase 3 (AI)

| ID | Requirement |
|---|---|
| A-01 | `git explain <command or error>` in the terminal — explains using the student's current repo state. |
| A-02 | **"Why did this fail?"** button appears after any terminal error. |
| A-03 | **Commit-message coach:** rates a commit message and suggests a better one. |
| A-04 | **AI practice questions:** fresh questions per unit on demand (supplements, never replaces, the fixed quizzes). |
| A-05 | **AI PR reviewer** in a practice pull-request lab. |
| A-06 | All AI calls go through a Supabase Edge Function; API key never reaches the browser. |
| A-07 | Signed-in users only; per-student daily limit; global monthly spend cap; graceful "AI is resting" fallback. |
| A-08 | Model: a fast, low-cost Claude model (default **Claude Haiku 5.5**, `claude-haiku-5-5`). Prompts restricted to Git/GitHub learning. |

---

## 9. Non-functional requirements

| ID | Requirement |
|---|---|
| N-01 | **Mobile-first:** works at 360 px width; no horizontal scroll; touch targets ≥ 44 px. |
| N-02 | **Performance:** home page interactive in < 3 s on a mid-range phone on 4G; terminal engine lazy-loaded only where needed. |
| N-03 | **Browsers:** latest Chrome, Edge, Firefox, Safari (iOS 16+), Android Chrome. |
| N-04 | **Accessibility:** WCAG 2.1 AA contrast, keyboard navigable, screen-reader labels, reduced-motion support. |
| N-05 | **Privacy (Phase 1):** no analytics, no cookies, no third-party trackers. Phase 2 stores only the fields in S-03. |
| N-06 | **Accuracy:** every sample output must be real Git output (verified against Git 2.4x); no invented hashes or messages. |
| N-07 | **Maintainability:** lesson text, quizzes, missions, glossary and cheat sheet are content files separate from code. |
| N-08 | **Licence:** content CC BY-SA 4.0, code MIT (to confirm). |

## 10. Branding & institution details

Source: `github.com/sbccas` and `sbccas.github.io`.

- **College:** Sutex Bank College of Computer Applications & Science (Amroli College) — short name **SBCCAS**
- **Location:** Amroli, Surat, Gujarat, India
- **Affiliation:** Veer Narmad South Gujarat University (VNSGU)
- **Managed by:** Jivan Jyot Trust
- **Contact:** info@amrolicollege.ac.in · www.amrolicollege.ac.in · Instagram @amrolibca · GitHub @sbccas
- **Programmes:** BCA · BCA – AI · B.Sc. Data Science · B.Sc. IT
- **Links back to:** sbccas.github.io portal and github-showcase
- **Faculty section:** built but **hidden** (feature flag) until faculty details are provided.
- **Not used:** any college name, faculty name or course code from the syllabus PDF (it belongs to a different college).

**Visual direction:** dark, futuristic "developer console" look — deep navy background, indigo/violet primary with teal/green accents,
glass-style cards, glowing commit-graph lines. Fonts: a geometric display font for headings, a clean sans for body, a monospace
for code (all from Google Fonts). Final palette and tokens defined in the design step and recorded here.

## 11. Technical architecture

| Layer | Choice |
|---|---|
| Front end | Static multi-page site, vanilla JavaScript (ES modules) + CSS custom properties, built with **Vite 6**. Shared header/footer are HTML partials inserted at build time. Fonts self-hosted (Inter, Sora, JetBrains Mono via Fontsource). |
| Git engine | isomorphic-git + lightning-fs (IndexedDB), loaded on terminal pages only. Status, checkout safety and merge working-tree updates are computed by our own code **by file content**, because isomorphic-git trusts timestamps and misses same-second edits. Merge state (MERGE_HEAD, conflicts) is managed by our code. |
| Terminal UI | **Custom DOM terminal** (decided in Milestone 2): a native `<input>` works with phone keyboards, IME and screen readers; Git Bash–style prompt; ANSI colours rendered as HTML |
| Graph | SVG, custom renderer with CSS/JS animation |
| Offline | Service worker + web app manifest |
| Hosting | GitHub Pages from `sbccas/git-github-fundamentals` |
| Phase 2 | Supabase: Auth (GitHub OAuth), Postgres + RLS, Realtime (live quiz) |
| Phase 3 | Supabase Edge Function → Claude API |

### Planned repository layout

```
git-github-fundamentals/
├── docs/                 PRD.md, reference-examples.md, faculty-guide.md, content-guide.md, faculty-handbook/
├── content/              units/*.md, quizzes/*.json, missions/*.json, slides/session-NN.*, glossary.json, cheatsheet.json
├── src/
│   ├── pages/            home, unit, playground, missions, cheatsheet, labs, self-check, bonus, glossary, about, teach
│   ├── terminal/         shell, git command adapters, simulated remote, editor
│   ├── graph/            commit-graph renderer, time-travel
│   ├── components/       nav, palette, quiz, code-block, progress
│   └── styles/
├── public/               icons, manifest, service worker
└── README.md
```

## 12. Milestones (Phase 1)

| # | Milestone | Output | Review |
|---|---|---|---|
| 1 | Foundation | Repo, design system, layout, home page, navigation, theme, command palette | ✅ **approved & committed 2026-10-22** |
| 2 | Terminal engine | Real-Git terminal, simulated remote, editor, file explorer, live graph | ✅ **committed 2026-10-22** |
| 3 | Units 1–2 + Teach foundation | Lessons, quizzes, missions M-01 – M-07, labs · **slide engine + neon theme + Teach hub** · decks for sessions 1–6 · handbook front matter (story bible) + chapters 1–2 | ✅ **committed 2026-10-23** |
| 4 | Units 3–4 | Lessons, quizzes, missions M-08 – M-15, conflict game, time-travel · decks for sessions 7–12 · handbook chapters 3–4 | ✅ **committed 2026-10-23** |
| 5 | Unit 5 + extras | Unit 5, GitHub labs, cheat sheet, glossary, bonus, self-check, about · decks for sessions 13–15 · handbook chapter 5 + appendices · presenter view polish | ✅ **committed 2026-10-23** |
| 6 | Polish & launch | PWA, accessibility & mobile/projector testing, PDF exports (guide, handbook, slides) · **push to github.com/sbccas step by step** · enable GitHub Pages | ✅ go-live — **polish built 2026-10-23; push & Pages pending** |

## 13. Out of scope (all phases unless moved by approval)

- Real push/pull to github.com from the browser terminal
- Rebase, cherry-pick, submodules, bisect, hooks, worktrees, Git LFS (not in syllabus)
- GitHub Actions authoring, GitHub Projects, Codespaces
- Paid courses, payments, or ads
- Auto-generated certificates without faculty approval
- Native mobile apps (the PWA covers mobile)

## 14. Open decisions

| ID | Decision | Options | Recommendation |
|---|---|---|---|
| D-1 | Build setup | (a) plain HTML/JS, no build · (b) Vite + GitHub Actions deploy | ✅ **Decided 2026-10-22:** Vite 6 multi-page build + GitHub Actions deploy |
| D-2 | Repo name | `git-github-fundamentals` or other | ✅ **Decided:** `git-github-fundamentals` |
| D-3 | Language | English only · English + Gujarati/Hindi notes | ✅ **Decided:** English (regional notes may be proposed via Backlog) |
| D-4 | Licence | CC BY-SA 4.0 content + MIT code · other | ✅ **Decided:** CC BY-SA 4.0 content + MIT code |
| D-7 | Faculty guide visibility & format | Public/private · 15×2 h or 30×1 h | ✅ **Decided:** public, 15 × 2-hour sessions |
| D-5 | Phase 2/3 accounts | College provides Supabase project + Claude API key & monthly budget | Confirm before Phase 2 starts |
| D-6 | Faculty details | To be provided | Section stays hidden until then |

## 15. Backlog (ideas not yet approved)

| Date | Idea | Notes |
|---|---|---|
| 2026-10-22 | ~~Teach mode on the website~~ | **Approved** as the public Teach section (F-04 – F-14). A faculty-only version would need Phase 2 roles. |
| 2026-10-22 | **Private exam bank** — real practical-exam variants kept out of the public repo | Faculty guide holds only sample tasks |

## 16. Change log

| Date | Version | Change |
|---|---|---|
| 2026-10-22 | 1.0 | First draft from planning discussion |
| 2026-10-23 | 1.8 | Milestone 6 polish built: PWA (manifest, icons, service worker precaching the whole site → offline after first visit, U-05/F-05), missions in Ctrl+K (U-01), session objectives on the Teach hub read from the faculty guide (F-04), plain-English hint lines under common errors (T-07) and a command list for unknown commands (T-14), 44 px touch targets on phones (N-01), WCAG AA contrast fixes in the light theme (N-04), print/PDF fixed and verified for slides, guide, handbook and cheat sheet (F-03, F-13, P-05), `npm test` (missions, engine, content) run by the deploy workflow. Progress report added: `docs/PROGRESS.md` |
| 2026-10-23 | 1.7 | Milestone 5 built: Unit 5 lesson (3 diagrams) + quiz, Labs L-02 – L-04, cheat sheet (62 commands, search, unit filter, print), glossary (47 terms, tap-to-define in lessons, Ctrl+K), bonus page, 40-question self-check with per-unit report, About page (hidden faculty section, export/import progress = G-03), decks 13–15, handbook chapter 5 + appendices |
| 2026-10-23 | 1.6 | Milestone 4 built: Unit 3–4 lessons (5 new diagrams), quizzes, missions M-08 – M-15 (all 15 missions validated end-to-end), latching mission goals, conflict mini-game (Q-05), time-travel slider (T-09) with Time Traveller badge, Unit 3–4 labs, decks 7–12, handbook chapters 3–4; `-q` for push/switch/merge |
| 2026-10-22 | 1.5 | Milestone 3 built: Markdown content pipeline (build/markdown.js), Unit 1–2 lessons with diagrams, quizzes (12 each), missions M-01 – M-07 with automatic checks, Labs page (Unit 1, L-01, Unit 2), XP/levels/badges, Teach hub, neon deck engine with presenter view, decks 1–6, faculty guide and handbook (story bible, ch. 1–2) on the site |
| 2026-10-22 | 1.4 | Added lecture slides / Teach section (F-04 – F-14) and Faculty Handbook (F-15 – F-18); slides and handbook chapters built alongside each unit in Milestones 3–5; GitHub push moved into Milestone 6 |
| 2026-10-22 | 1.3 | Milestone 2 built: shell, 24 Git commands, simulated GitHub (create repo, browse, teammate push), editor, file explorer, live graph, sandboxes, `?cmd=` pre-fill for lessons |
| 2026-10-22 | 1.2 | Decisions D-1–D-4, D-7 recorded; Milestone 1 built |
| 2026-10-22 | 1.1 | Added faculty guide (§6.6 F-01–F-03); unit hours aligned to 15 × 2-hour sessions (U1 4, U2 8, U3 6, U4 6, U5 4, assessment 2); backlog items added |
