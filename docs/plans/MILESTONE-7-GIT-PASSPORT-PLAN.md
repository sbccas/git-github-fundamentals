# Milestone 7 — Git Passport: implementation plan

| | |
|---|---|
| **Status** | ✅ Approved by the course owner (Hitesh Patel) on **23 October 2026** · ✅ **Delivered 23 October 2026** in commit `69a17e0` (results: [PROGRESS.md §7a](../PROGRESS.md)) |
| **PRD** | Adds G-04 – G-08 to §6.5 Progress & gamification ([PRD.md](../PRD.md)) |
| **Progress report** | [PROGRESS.md](../PROGRESS.md) (updated when the milestone is delivered) |
| **Scope** | Enhancement of the existing Phase 1 site. Not a rebuild. No backend, login, analytics, Supabase or GitHub OAuth. |

## 1. Objective

A dedicated student page, **Git Passport** (`/passport/`), that shows a student's learning progress, achievements
and next step in one place. It reads the existing progress store (`src/scripts/lib/progress.js`), which stays the
single source of truth.

## 2. Findings from the inspection (current behaviour, unchanged by this milestone)

**Progress store** — `localStorage` key `gg-progress`, `version: 1`:
`units` (sections read, section total, quiz `{best, last, passed}`, `complete`), `missions` (`{done, at}`),
`badges` (`id → ISO date`), `games`, `xp`, `lastVisited` (`{href, title}`), `selfCheck` (`{best, last, byUnit, at}`).
Every save dispatches the `gg:progress` window event.

**XP** — mission 75 · first pass of a unit quiz 100 · "mark unit complete" 50 · conflict game 50; each awarded once.
Level = `floor(xp / 250) + 1`, 250 XP per level.

**Badges (9, existing IDs — no new or duplicate badges):**

| ID | Badge | Earned when |
|---|---|---|
| `first-commit` | First Commit | Mission M-03 done |
| `unit-1` | Version Control Explorer | M-01 – M-02 done + Unit 1 quiz passed |
| `unit-2` | Repository Launcher | M-03 – M-07 done + Unit 2 quiz passed |
| `unit-3` | Branch Master | M-08 – M-11 done + Unit 3 quiz passed |
| `unit-4` | History Detective | M-12 – M-15 done + Unit 4 quiz passed |
| `unit-5` | Open Source Collaborator | Unit 5 quiz passed (Unit 5 has no browser missions; its labs happen on real GitHub and cannot be verified by the site) |
| `conflict-crusher` | Conflict Crusher | Mission M-10 done |
| `time-traveller` | Time Traveller | First use of the time-travel slider |
| `course-complete` | Course Complete | All five unit badges |

Badges are awarded only by `completeMission`, `recordQuiz`, `completeUnit` (via `checkBadges`) and `earnBadge`
(time travel). Reading a lesson or opening a page never awards a badge.

**Import weaknesses found** (About → Import progress): only the `version` is checked; malformed fields can break
pages; a file can claim any badge or XP; `lastVisited.href` is not checked (a `javascript:` link would run in the
"Continue" link). Import replaces progress (no merge), so repeated imports cannot duplicate XP or badges.

## 3. Requirements (to be added to the PRD as G-04 – G-08)

| ID | Requirement |
|---|---|
| G-04 | **Git Passport page** `/passport/`: course title and passport identity; total XP, level and XP to the next level; overall progress across the five units; five unit achievement cards; all nine badges (earned with date, locked with how to earn); mission statistics; best unit-quiz scores and self-check best; a "next step" recommendation; links to the units and dashboard pages. Empty state for a new student. |
| G-05 | **Next activity** chosen from recorded progress only, in this order: (1) finish an incomplete mission of the earliest unit that has been started, (2) take an unpassed quiz of a started unit, (3) revise a unit whose best quiz score is below 75 %, (4) resume the last visited page, (5) start the next unstarted unit, (6) take the final self-check. New student: "Start Unit 1". Never claims work that is not recorded. |
| G-06 | **Exportable passport**: one-page A4 print layout (Print / Save as PDF) and a browser-generated PNG achievement card (canvas, no new libraries). Both are labelled *"Learning-progress record — saved on this device. Not an official college certificate."* |
| G-07 | **Optional passport name**: typed by the student, stored only on the device, shown as "self-entered"; default "Student". No other identity data. |
| G-08 | **Safer import**: validate every field and type; keep only known badge IDs; remove mission/unit/course badges whose conditions are not met by the imported data; recalculate XP from recorded work (identical to today's value for honest data); accept only in-site "Continue" links; reject malformed files without touching current progress. Progress format stays version 1 (no migration). |

## 4. Implementation (smallest safe set of changes)

1. **PRD first** — add G-04 – G-08 to §6.5, Milestone 7 to §12, a change-log entry.
2. **`src/scripts/lib/passport.js`** (new) — pure functions over a progress object (no storage writes):
   `unitStatus(data, unit)` (sections read, quiz best, missions done / total, badge earned, what is still missing),
   `overallPercent(data)`, `nextActivity(data)`, `passportSummary(data)`. Testable under Node.
3. **`src/scripts/lib/progress.js`** — add `validateProgress(obj)` (pure; returns sanitised data or throws),
   `deriveXp(data)`, and the optional `profile: { name }` field (additive, still version 1). `importJson` uses
   `validateProgress`; on failure it throws before saving anything.
4. **`src/passport/index.html`** + **`src/scripts/pages/passport.js`** + passport styles — uses the existing page
   template, partials, design tokens and unit colours; re-renders on the `gg:progress` event.
5. **Print / PNG** — print stylesheet for one A4 page (light, as all printing); "Download card" draws a
   1200 × 630 PNG on a `<canvas>`.
6. **Navigation** — "Git Passport" in the header **More** menu and as a mobile-menu tile; a "Your passport →" link
   beside "Continue where you left off" on the home page (shown only when progress exists); a link beside the
   stats on the Missions hub; the page in `PAGES` (so Ctrl+K finds it).
7. **Docs** — PROGRESS.md (requirements, tests, limitations) and phone checks added to the trial checklist.

## 5. Acceptance criteria

- The passport shows only recorded progress; opening it changes nothing in storage.
- XP, level and "XP to next level" match the Missions hub and About page for the same data.
- Earned badges show their earned date; locked badges are visibly different and state how to earn them.
- The next-activity card follows the G-05 order and links to the right page/mission.
- New student: empty state with "Start Unit 1"; no badges earned; 0 XP; level 1.
- Print preview is one A4 page with the "not an official certificate" label; the PNG card downloads with the same label.
- An invalid import shows an error and leaves the existing progress exactly as it was; a valid export → import round trip reproduces the same passport.
- Works at 360 px with no sideways scroll and ≥ 44 px touch targets; works offline after the first visit (page precached by the service worker).

## 6. Safety rules and exclusions

- **Unchanged:** XP values, badge IDs and conditions (including Unit 5 = quiz passed), mission and course content,
  progress format version 1, offline/PWA behaviour, Vite multi-page architecture, `/git-github-fundamentals/` base.
- **No** new badges, backend, login, analytics, paid service, Supabase, GitHub OAuth, framework or heavy dependency.
- **No** claims of cross-device sync, verified identity or official certificate status.
- **Excluded:** self-reported Unit 5 lab checkboxes (outside the approved scope).

## 7. Tests

**Automated (`npm test`, Node):**

1. New student with no progress (summary, empty state, next activity = Start Unit 1).
2. Partial progress across several units (unit status and overall percent).
3. Earned and locked achievements (including "what is missing").
4. Quiz completion and mission completion counts.
5. XP and level display (level boundaries, XP to next level).
6. Next-activity recommendations (each rule in G-05 order).
7. Invalid imports: not JSON, wrong version, wrong types, unknown badge IDs, unearned badges, inflated XP,
   `javascript:` / external "Continue" links — all rejected or sanitised; a failed import leaves stored progress intact;
   a valid round trip is unchanged.

**Build and automated browser checks:** `npm run build` passes; `dist/sw.js` precaches `passport/`; print/PDF of the
passport is one A4 page (headless Chrome); 360 px layout has no sideways scroll and ≥ 44 px targets.

**Manual checks on a real phone (added to the trial checklist):** open the passport from the menu; it matches the
Missions page; Download card saves a PNG; Print → Save as PDF gives one page; works in airplane mode.

## 8. Delivery

Implementation commit pushed to `sbccas/git-github-fundamentals`, PROGRESS.md updated, report with changed files,
test and build results, remaining manual checks and any deviations from this plan.
