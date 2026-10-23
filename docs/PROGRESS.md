# Progress Report — Git & GitHub Fundamentals

| | |
|---|---|
| **Report date** | 2026-10-23 |
| **Repository** | `D:\Future Projects\git-github-fundamentals` (local; push to `github.com/sbccas` is the last step of Milestone 6) |
| **PRD version** | v1.8 ([PRD.md](PRD.md)) |
| **Phase** | Phase 1 (core platform): Milestones 1–5 committed; Milestone 6 polish built, **GitHub push and Pages next** |

> This report is the cross-check against the PRD. Every requirement ID appears below with its status.
> **Update it at the end of every milestone** (and whenever a requirement changes) in the same commit as the work.

**Status legend:** ✅ done · 🟡 partial (gap described) · ⏳ planned in a later milestone/phase · ❌ not done

---

## 1. Milestone summary

| # | Milestone | Status | Commit | Date |
|---|---|---|---|---|
| — | Planning: PRD, faculty guide, reference examples | ✅ | `a455490` (included) | 2026-10-22 |
| 1 | Foundation: Vite, design system, home page, navigation, theme, Ctrl+K search | ✅ | `a455490` | 2026-10-22 |
| 2 | Terminal engine: real Git in the browser, simulated GitHub, editor, file explorer, live graph | ✅ | `6e7141b` | 2026-10-22 |
| 3 | Units 1–2, missions M-01 – M-07, labs, quizzes, XP/badges, Teach hub, neon deck engine, decks 1–6, handbook story bible + ch. 1–2 | ✅ | `dfdcd9c` | 2026-10-23 |
| 4 | Units 3–4, missions M-08 – M-15, conflict game, time travel, decks 7–12, handbook ch. 3–4 | ✅ | `73edfa4` | 2026-10-23 |
| 5 | Unit 5, labs L-02 – L-04, cheat sheet, glossary, bonus, self-check, About, decks 13–15, handbook ch. 5 + appendices | ✅ | `7b92357` | 2026-10-23 |
| 6a | Polish: PWA/offline, palette missions, Teach objectives, error hints, touch targets, contrast, print/PDF, `npm test` | ✅ built | not yet committed | 2026-10-23 |
| 6b | Launch: push to `github.com/sbccas` (step by step), enable GitHub Pages, verify live site | ⏳ next | — | — |
| Phase 2 | Supabase: GitHub sign-in, sync, leaderboard, live quiz, teacher dashboard, certificate verification | ⏳ not started | — | — |
| Phase 3 | AI tutor via Supabase Edge Function + Claude | ⏳ not started | — | — |

## 2. What exists (inventory)

| Area | Count / contents |
|---|---|
| Site pages | Home · Units 1–5 · Playground · Missions (hub + runner) · Labs · Cheat sheet · Glossary · Bonus · Self-check · About · Teach hub · 15 decks · Faculty guide page · Handbook page (**32 pages**) |
| Lessons | 5 units, 56 sections, 14 diagrams, flip cards, conflict game |
| Practice | 15 browser missions · 4 GitHub labs (L-01 – L-04) + 4 unit labs · Playground with sandboxes |
| Assessment | 5 unit quizzes × 12 questions (60) · 40-question self-check (25 own + 15 drawn from unit quizzes) |
| Reference | Cheat sheet (62 commands, 9 groups) · Glossary (47 terms) · Bonus (11 topics) |
| Faculty | Faculty guide (15 session plans, each with objectives) · Handbook (story bible, 5 chapters, appendices) · 15 neon decks (172 slides) |
| Git engine | 24 `git` commands + 16 shell commands; simulated GitHub with teammate pushes; 26 plain-English error hints |
| Gamification | XP, levels, 9 badges, progress rings, export/import |
| Offline / install | Web app manifest, 4 icons, service worker precaching all 89 files (~2 MB) |
| Tests | `npm test`: 15 missions end-to-end, 20 engine checks, 10 content checks — also run by the deploy workflow |

## 3. Requirement cross-check

### 3.1 Site pages (§6.1)

| ID | Requirement | Status | Where / notes |
|---|---|---|---|
| P-01 | Home | ✅ | `src/index.html`, `scripts/pages/home.js` |
| P-02 | Unit pages (TOC + scroll-spy, Try-it, labs, quiz, complete, prev/next) | ✅ | `src/unit-N/`, `content/units/unit-N.md`, `scripts/pages/unit.js` |
| P-03 | Playground | ✅ | `src/playground/`, `scripts/terminal/**` |
| P-04 | Missions (map + runner) | ✅ | `src/missions/`, `content/missions/missions.js`, `scripts/missions/engine.js` |
| P-05 | Cheat sheet (search, filter, copy, print) | ✅ | `src/cheatsheet/`, `content/cheatsheet.json`. Print verified: 2 A4/Letter pages, all 62 commands |
| P-06 | Labs | ✅ | `content/labs.md` (Units 1–4 labs, L-01 – L-04) |
| P-07 | Final self-check (40 Q, score by unit) | ✅ | `src/self-check/`, `content/quizzes/self-check.json` |
| P-08 | Bonus | ✅ | `content/bonus.md` |
| P-09 | Glossary (+ tap definitions in lessons) | ✅ | `content/glossary.json`, `scripts/lib/glossary.js` |
| P-10 | About (college, course, hidden faculty) | ✅ | `src/about/`; faculty via `FEATURES.facultySection` + `FACULTY` in `scripts/data/site.js` |
| P-11 | Teach | ✅ | `src/teach/**` |

### 3.2 Practice terminal (§6.2)

| ID | Requirement | Status | Where / notes |
|---|---|---|---|
| T-01 | isomorphic-git + lightning-fs, real objects/hashes | ✅ | `scripts/terminal/git/repo.js`, `vfs.js` |
| T-02 | Android Chrome, iOS Safari, desktop; no install | 🟡 | Chromium desktop + phone emulation at 360 px and 375 px ✅. **Real iPhone / Android device test needs you** (after the site is live). |
| T-03 | Git commands list | ✅ | All listed commands and flags implemented (`scripts/terminal/git/cmd-*.js`), plus `rm`, `show`, `-q` flags |
| T-04 | Shell commands list | ✅ | `scripts/terminal/shell.js` (+ `cp`, `edit`, `help`) |
| T-05 | Simulated remote + teammate pushes | ✅ | `scripts/terminal/git/github.js`, GitHub panel |
| T-06 | `edit` / `nano` / `code` editor sheet | ✅ | `scripts/terminal/ui/editor.js`; also used for commit, revert and tag messages |
| T-07 | Real-Git wording; errors with a plain-English hint line | ✅ | Git's exact message first, then a cyan "→ In plain English: …" line for 26 common errors (`scripts/terminal/hints.js`; shown for any failing command whose output matches) |
| T-08 | Live commit graph (below on phones) | ✅ | `scripts/terminal/ui/graph-view.js` |
| T-09 | Time-travel slider | ✅ | Graph tab → ⏳ Time travel |
| T-10 | File explorer with status colours | ✅ | `scripts/terminal/ui/files-view.js` |
| T-11 | Mobile key bar | ✅ | Playground and Missions (44 px keys on phones) |
| T-12 | Tab completion; ↑/↓ history | ✅ | `scripts/terminal/ui/terminal-view.js` |
| T-13 | Named sandboxes, reset; lessons open a scenario | 🟡 | Sandboxes + reset ✅; lessons pre-fill a **command** via `?cmd=` (not a full scenario). Missions provide scenarios. Accepted as is. |
| T-14 | Unsupported command → friendly message listing supported commands | ✅ | Unknown shell commands: "did you mean" (typos like `sl`, `gti`) + the list of commands the playground understands. Unsupported Git commands: "not part of this course" + `git help` |

### 3.3 Missions (§6.3)

| ID | Status | Notes |
|---|---|---|
| M-01 – M-07 | ✅ | Unit 1–2 missions |
| M-08 – M-11 | ✅ | Unit 3 missions (M-10 earns Conflict Crusher) |
| M-12 – M-15 | ✅ | Unit 4 missions (M-12 uses a latching goal) |
| L-01 – L-04 | ✅ | GitHub labs on `/labs/` |

**Verification:** `npm test` runs every mission headlessly: setup → no required goal ticked (except "guard" goals such as *main must survive*) → the solution from the last hint → every required goal ticks. All 15 pass.

### 3.4 Quizzes (§6.4)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| Q-01 | 10–15 Q per unit, 4 types | ✅ | 12 per unit; single, multi, predict, order |
| Q-02 | Instant feedback + explanation | ✅ | |
| Q-03 | Shuffled; stored locally; best score | ✅ | Questions and options shuffled; best and last score stored |
| Q-04 | Content files editable by faculty | ✅ | `content/quizzes/*.json` (format checked by `npm test`) |
| Q-05 | Conflict mini-game | ✅ | Unit 3, `content/conflict-game.json` |

### 3.5 Progress & gamification (§6.5)

| ID | Status | Notes |
|---|---|---|
| G-01 | ✅ | `scripts/lib/progress.js`; "saved on this device" in footer and About |
| G-02 | ✅ | XP, levels, 9 badges (5 unit badges, First Commit, Conflict Crusher, Time Traveller, Course Complete) |
| G-03 | ✅ | About → Your progress (export / import JSON) |

### 3.6 Faculty resources (§6.6)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| F-01 | Faculty guide | ✅ | `docs/faculty-guide.md`, also `/teach/guide/` |
| F-02 | Guide in sync with M/L items | ✅ | Checked at each milestone; IDs match |
| F-03 | Guide exportable to PDF | ✅ | Print / save-as-PDF button on `/teach/guide/`. Verified: 34 pages, white paper in either theme, code wraps (no scrollbars), each section on a new page |
| F-04 | Teach hub (duration, objectives, links) | ✅ | Objectives for all 15 sessions, read at build time from the guide's **Objectives:** lines (one source; `npm test` checks every session has one) |
| F-05 | Deck page, 16:9 scaling, works offline | ✅ | Offline via the service worker (all 15 decks precached) |
| F-06 | Neon projector look, large type, projector boost | ✅ | `src/styles/deck.css`. **Real projector check needs you.** |
| F-07 | Fragments, pulse, spotlight | ✅ | |
| F-08 | Slide types | ✅ | title, concept/analogy, diagram, command, story, table, quiz-reveal, activity/timer, recap |
| F-09 | Controls incl. clicker keys, swipe | ✅ | |
| F-10 | Presenter view synced | ✅ | Notes, next slide, elapsed and remaining time |
| F-11 | "Run in Playground" on command slides | ✅ | ▶ Try it on terminal blocks |
| F-12 | Decks as content files | ✅ | `content/slides/session-NN.md` |
| F-13 | Print / PDF one slide per page | ✅ | Fixed in M6 and verified: one 16:9 page per slide, white background, neon borders kept in darker inks, all fragments and answers visible |
| F-14 | Reduced motion | ✅ | |
| F-15 | Handbook location, site, print | ✅ | `docs/faculty-handbook/`, `/teach/handbook/`; print verified (42 pages) |
| F-16 | Chapter contents | ✅ | All 5 chapters follow the structure |
| F-17 | Story bible | ✅ | `00-story-bible.md` |
| F-18 | Handbook / slides / lessons / guide consistent | ✅ | Same cast, files, mission IDs and outputs across all four |

### 3.7 Global UX (§6.7)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| U-01 | Ctrl+K palette: lessons, commands, terms, missions | ✅ | Missions (title, brief, goals) load the first time the palette opens and link to `/missions/?m=M-xx` |
| U-02 | Dark/light themes | ✅ | Printing always uses the light theme |
| U-03 | Copy on code blocks; Run in terminal | ✅ | |
| U-04 | Glossary hover/tap | ✅ | Lessons and Bonus |
| U-05 | PWA: installable, offline | ✅ | `public/manifest.webmanifest`, `public/icons/`, service worker generated at build (`build/sw-template.js` → `dist/sw.js`): pages network-first with offline fallback, assets cache-first, old caches removed on update. A one-time "Saved for offline use" note. Verified by simulating install + offline fetches; **the Claude app's built-in browser does not run service workers, so check "Install app" on your phone once live.** |
| U-06 | Subtle motion; reduced motion | ✅ | |

### 3.8 Non-functional (§9)

| ID | Requirement | Status | Notes |
|---|---|---|---|
| N-01 | Mobile-first: 360 px, no sideways scroll, touch targets ≥ 44 px | ✅ | Audited 14 pages at 360 px: no sideways scroll; every control ≥ 44 px on touch screens (dense copy/try buttons get an invisible 44 px hit area). Inline links in sentences are exempt (WCAG inline exception). |
| N-02 | Performance; terminal lazy-loaded | ✅ | Home page ≈ 30 KB gzip of HTML + JS + CSS (+ self-hosted fonts). Git engine (≈ 104 KB gzip) loads only on Playground and Missions. Lighthouse on a real mid-range phone can be run once live (optional). |
| N-03 | Chrome, Edge, Firefox, Safari, Android | 🟡 | Chromium ✅ (Chrome/Edge engine). Firefox: layout of home, unit, playground and deck verified in headless Firefox. **Safari (iPhone) and interactive Firefox use need a real-device check once live.** |
| N-04 | WCAG 2.1 AA, keyboard, screen readers | ✅ | Automated contrast audit of 11 pages in both themes: light-theme teal, green and amber darkened to ≥ 4.5 : 1; terminal dim text raised; white text on green in light theme. Landmarks (`main` on every page incl. decks), skip link, labelled search box, focus styles, reduced motion. A manual screen-reader pass (NVDA/TalkBack) is still worth doing once live. |
| N-05 | No analytics, cookies or trackers | ✅ | Fonts self-hosted; only localStorage / IndexedDB / Cache Storage on the device |
| N-06 | Real Git output; no invented hashes | ✅ | All outputs generated by the Playground engine |
| N-07 | Content separate from code | ✅ | `content/` and `docs/` |
| N-08 | Licence CC BY-SA 4.0 + MIT | ✅ | `LICENSE`, footer, About |

### 3.9 Phases 2 and 3

| IDs | Status |
|---|---|
| S-01 – S-08 (Supabase) | ⏳ Not started (Phase 2). Needs a Supabase project from the college (PRD D-5). |
| A-01 – A-08 (AI) | ⏳ Not started (Phase 3). Needs a Claude API key and a monthly budget (PRD D-5). |

## 4. Open decisions (from PRD §14)

| ID | Decision | Status |
|---|---|---|
| D-1 – D-4, D-7 | Build tool, repo name, language, licence, guide visibility/format | ✅ decided |
| D-5 | Supabase project + Claude API key for Phases 2–3 | ⏳ open |
| D-6 | Faculty details for the About page | ⏳ open: send names, roles and emails; then set `FEATURES.facultySection = true` |

## 5. Changes from the original plan (all approved or recorded in the PRD)

| Change | Why |
|---|---|
| No Vercel; Phases 2–3 will use Supabase only | One service covers auth, data and the AI proxy |
| Custom DOM terminal instead of xterm.js | Native phone keyboards, IME and screen readers |
| Status and checkout safety are computed by file **content** | isomorphic-git trusts timestamps and missed same-second edits |
| Teach section (slides) and Faculty Handbook added | Approved 2026-10-22 (PRD v1.4) |
| Teach section is public | Decision D-7 |
| Mission goals can "latch"; "guard" goals start ticked | Relative revisions like `HEAD~2` change meaning; "keep main safe" goals are true until broken |
| Self-check mixes 25 own + 15 unit-quiz questions | Fresh mix each attempt without writing 40 single-use questions |
| Teach hub objectives come from the faculty guide | One source of truth instead of a second copy in code |
| Light-theme accent colours slightly darker | WCAG AA contrast (N-04) |

## 6. Known issues and limitations

- The browser storage library logs a harmless "lock stolen" notice if the same sandbox is open in two tabs.
- `git revert` in the Playground handles only non-conflicting reverts (explains the alternative otherwise).
- `rebase`, `cherry-pick`, `bisect` and similar commands are outside the course and show a polite message.
- Real `git push` to github.com from the browser is out of scope; the Playground uses a simulated GitHub.
- The service worker only runs on the built site (`npm run build` / GitHub Pages), not in `npm run dev`.
- After an update, a student who already has the site open sees new pages on the next navigation; very old tabs may need one refresh.

## 7. Milestone 6 checklist (polish & launch)

| Task | PRD | Status |
|---|---|---|
| PWA: manifest, icons, service worker, offline after first visit | U-05, F-05 | ✅ |
| Missions in the Ctrl+K palette | U-01 | ✅ |
| Objectives on the Teach hub | F-04 | ✅ |
| Plain-English hint lines for common Git errors; friendly help for unknown shell commands | T-07, T-14 | ✅ |
| Touch targets ≥ 44 px on phones; check at 360 px | N-01 | ✅ |
| Contrast and keyboard / landmark pass | N-04 | ✅ (manual screen-reader pass optional, once live) |
| Performance check | N-02 | ✅ (bundle sizes measured; Lighthouse optional once live) |
| Firefox check | N-03 | ✅ layout (headless Firefox) |
| Verify print / PDF: guide, handbook, slides, cheat sheet | F-03, F-13, P-05 | ✅ (deck print fixed) |
| Mission test harness in the repo (`npm test`), run by the deploy workflow | maintainability | ✅ |
| Commit Milestone 6 | — | ⏳ when you say "commit it" |
| Push to `github.com/sbccas`, step by step | launch | ⏳ next (needs your sign-in) |
| Enable GitHub Pages (Settings → Pages → Source: GitHub Actions) and verify the live site | launch | ⏳ |
| Real Android / iPhone test, "Install app", Safari | T-02, U-05, N-03 | ⏳ needs you (after go-live) |
| Projector test with real hardware | F-06 | ⏳ needs you |

## 8. Change log of this report

| Date | Change |
|---|---|
| 2026-10-23 | First report, after Milestone 5 |
| 2026-10-23 | Milestone 6 polish: all code gaps closed (U-01, U-05, F-03 – F-05, F-13, T-07, T-14, N-01, N-02, N-04); remaining items need real devices, a projector, or the GitHub push |
