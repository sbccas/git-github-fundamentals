# Project status: start here when you come back

| | |
|---|---|
| **Last updated** | 2 November 2026, after the course ended (final exam held 2 Nov 2026) |
| **Live site** | https://sbccas.github.io/git-github-fundamentals/ |
| **Repository** | [github.com/sbccas/git-github-fundamentals](https://github.com/sbccas/git-github-fundamentals) · local copy `D:\Future Projects\git-github-fundamentals` · branch `main` |
| **Source of truth** | [PRD.md](PRD.md) (v1.21) · requirement cross-check [PROGRESS.md](PROGRESS.md) · operations and troubleshooting [PHASE-2-OPERATIONS.md](PHASE-2-OPERATIONS.md) · plans in [`plans/`](plans/) |
| **State** | First batch (BCA 2026 – SY AI, 80 students) **completed**. The site stays online for self-study, with the database kept awake automatically. |

**How we work.** Write a plan in `docs/plans/`, the owner approves it, then build, try it locally and test. The owner then says "commit locally" or "push". Pushing to `main` deploys the live site.

---

## 1. Resume checklist

1. `git pull` and `npm ci`.
2. Run `npm test`: everything should pass, including the mission, records and account sections.
3. Read §6 (open items) below and the PRD backlog (§15).
4. Check the latest **Keep Supabase awake** run is green: GitHub → Actions.
5. For database work: `npm run sql-check`, which runs a local copy of the database only.
   - **Never** run `supabase/tests/*` on the live project.
6. Before a release: `npm run build` then `npm run check:dist`.

## 2. What is live: features

| Area | What | Where |
|---|---|---|
| **Course (Phase 1)** | 5 unit lessons; real Git terminal in the browser (Playground); 15 story missions; labs; quizzes; cheat sheet; glossary; Bonus; 40-question self-check; Git Passport; student and faculty ebooks (web + PDF); Teach hub (slides, guide, handbook); offline use (PWA); share previews | `src/`, `content/`, `docs/faculty-*` |
| **Accounts (M10–M11)** | Sign-in with GitHub (Supabase), consent v1, profile with roll number, online progress sync, download/delete my data | `/account/`, `src/scripts/lib/account.js`, `sync.js` |
| **Faculty (M12)** | Dashboard: batches, join codes, class progress, CSV, collapsible sections; faculty allowlist | `/teach/dashboard/` |
| **M12b** | Participant counter on the home page; "request to join" for other classes; WhatsApp in-app browser note | `counter.js`, home page |
| **M12c: remote session** | Session card and checklist, GitHub project check (6 points), class wall (`sbccas/sy-ai-2026-wall`), student timer, faculty session report, task sheet page and PDF | `/remote-session/`, account page, dashboard |
| **M12c: exam** | Server-marked MCQ exam: 25 questions (5 per unit), 30 minutes, 40% pass; random paper per student; review after faculty close it; results CSV | `/exam/`, dashboard |
| **M12d: GitHub World Records** | Bonus page: stars, forks, pull requests, comments, commits, communities, Octoverse 2026 numbers. "Live data" / "Historical snapshot" labels | `/records/`, `content/github-records.json`, `scripts/github-records.mjs` |
| **Mission fixes (31 Oct)** | M-09 – M-12 accept real-Git variants: `commit -am` to finish a merge, `--ours/--theirs`, merging several branches, "8 am", `git branch -av` | `src/scripts/terminal/git/`, `content/missions/missions.js` |
| **Keep-alive (31 Oct, improved 2 Nov)** | Twice a day: read-only database request and a website check. Monthly heartbeat commit. Plain shell, no marketplace actions | `.github/workflows/keep-alive.yml`, `.github/keep-alive.txt` |

Database: Supabase project `mkdvftgovsznnivvuwrn` (Mumbai, free plan), migrations 1–8 in `supabase/migrations/`, all applied.

## 3. First batch: outcome (aggregate only)

Per-student sheets are kept **only** in the git-ignored `local-reports/` folder.

- **Sign-ups:** 76 of 80 students joined the class batch.
- **Remote session, Sat 31 Oct, 11:00–15:00 IST:**
  - 64 of 80 took part (51 full, 13 finished all work early or mostly on GitHub), 10 partly, 6 not at all.
  - 59 uploaded their project; 40 reached a 6/6 checklist; 38 opened a class-wall pull request.
- **Final exam, Mon 2 Nov:**
  - 65 present, 15 absent. Online submissions by students absent from class were **not counted**, by the owner's decision.
  - 61 of 65 passed (94%). Average 19.4/25 (78%).

## 4. Keeping it running

| Part | Risk | Protection | If it fails |
|---|---|---|---|
| Website (GitHub Pages) | None from inactivity | Stays up while the repository is public and Pages is on | Settings → Pages; re-run "Deploy to GitHub Pages" |
| Supabase (free plan) | Paused after about 7 days without activity | `keep-alive.yml` calls `course_stats` twice a day | Dashboard → project → **Resume project** (possible for up to 1 year). The course pages keep working meanwhile |
| The keep-alive schedule | GitHub disables schedules after 60 days with no repository activity | Monthly heartbeat commit through the GitHub API (`[skip ci]`) | Actions → Keep Supabase awake → **Enable workflow** |
| Failure alerts | — | GitHub emails the account that last changed the workflow schedule. Turn on Settings → Notifications → Actions → failed workflows | — |

**Optional extra safety, not set up:**
- an external pinger such as cron-job.org, calling `POST https://mkdvftgovsznnivvuwrn.supabase.co/rest/v1/rpc/course_stats` with the `apikey` header set to the public publishable key;
- or Supabase Pro (about $25 a month): never paused.

## 5. Where things are

| What | Path |
|---|---|
| Read-only report queries (run in the Supabase SQL Editor) | `supabase/live/remote_session_full_report.sql`, `supabase/live/remote_session_final_report.sql` |
| One-time go-live script (already run) | `supabase/live/switch_to_live.sql` |
| Local database tests and seeds (never on live) | `supabase/tests/`, `npm run sql-check` |
| Exam question bank: answers, **never commit** | `exam-bank/` (git-ignored; `node scripts/exam-bank.mjs` checks it) |
| Student reports with names, **never commit** | `local-reports/` (git-ignored; sign-in status, remote session report, exam result sheet) |
| Print a page to PDF | `node scripts/print-page.mjs <page>/ <out.pdf>` |
| Refresh the World Records snapshot (about 8 minutes, no token) | `node scripts/github-records.mjs`, then `npm test` |
| Session settings (dates, missions, wall repository) | `src/scripts/data/session.js` |
| Supabase URL and publishable key (public by design) | `src/scripts/data/supabase.js` |
| Faculty allowlist, batches, operations | [PHASE-2-OPERATIONS.md](PHASE-2-OPERATIONS.md) |

The secret scan in `npm test` (SY7) fails if `exam-bank/`, `local-reports/`, an `.env` file or a secret key is ever tracked.

## 6. Open items: resume here

**Housekeeping (small)**
- [ ] Close the class-wall demo pull request #1 (from `amroli-classroom`) without merging.
- [ ] Remove the owner's test account `hitechpatel` and the demo account `599` from the class batch. The test account also submitted an exam paper, so remove it from the results.
- [ ] Two students have duplicate GitHub accounts; details are in `local-reports/`. Ask them to delete the unused one.
- [ ] Decide whether to remove the 7 online exam submissions by students absent from class. They are still in the database; only the result sheet marks them absent.
- [ ] Re-test or next steps for the 4 who failed and the 15 absent. A new exam can be created from the dashboard; the bank is in `exam-bank/`.
- [ ] Optional: delete or archive the `/remote-session/` page. It was removed from the menus on 2 Nov but still works by direct link.

**Improvements suggested during the course (not built; need a plan and approval)**
- [ ] **Exam eligibility list.** Only selected roll numbers may start an exam. Design discussed 2 Nov: a `private.exam_eligible` table, checked in `start_exam`.
- [ ] **Presence-based session timer.** Count "still active here" signals, not only progress saves. Today, work on GitHub and typing inside a mission do not count as active minutes.
- [ ] **Session report: include work before the session.** A dashboard option. Today this is done with the SQL in `supabase/live/`.
- [ ] **Exam integrity.** Optionally restrict exam start to the class network or a room code, because 7 students marked absent in class still submitted a paper online.
- [ ] Teach students to sign in with one GitHub account, and show "signed in as" more prominently on the timer.

**PRD backlog / later milestones**
- [ ] S-04 opt-in leaderboard.
- [ ] Milestone 13: live classroom quiz.
- [ ] Milestone 14: certificates and `/verify/`.
- [ ] Phase 3: AI tutor.
- [ ] Real-device and projector checks (PROGRESS.md §6).
- [ ] Next batch: create a new batch and join code in the dashboard. Update `src/scripts/data/session.js` and the exam settings for new dates.
- [ ] Each term: refresh `content/github-records.json`. Update Octoverse figures when the next report comes out (usually late October).

## 7. Change log of this file

| Date | Change |
|---|---|
| 2026-11-02 | First version, written after the course ended: features, outcome, keep-alive, file map, open items |
