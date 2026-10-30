# Evidence — Milestone 12c part 1 (remote session), local trial, 29 Oct 2026

| | |
|---|---|
| **Database** | `supabase/migrations/20261029000006_m12c_remote_session.sql` applied to the live project by the owner ("Success. No rows returned"); additive only |
| **Local database check** | `npm run sql-check`: `m12c_remote_session_test.sql` **23 / 23 PASS** (twice), all earlier suites still pass (69, 41, 24) |
| **Site checks** | `npm test` RS (8 checks: link parsing, Part A, GitHub checklist with recorded responses incl. `.env`, private repository and rate limit, CSV); `npm run check:dist` |
| **GitHub API** | Checked live from a browser against `sbccas/git-github-fundamentals`: repository, README, `.gitignore`, `.env` (404), commit count from the paging header (38), commits in a window, pull requests and tags all readable without sign-in. Limit: 60 requests per hour per internet address (about 7 project checks) — a refusal is saved as "check again later" |
| **Trial set-up** | Dev server on port 5174 (5173 used by another project), redirect `http://localhost:5174/git-github-fundamentals/account/` added temporarily; owner's test account `hitechpatel` and faculty account `contact2hitech` |

| # | Manual test | Observed result | Result |
|---|---|---|---|
| 1 | Student in the batch sees the remote session card | "Remote session — Saturday 31 October" card | PASS |
| 2 | Part B check and submit (test repository `sbccas/git-github-fundamentals`) | "Checklist: 4 of 6 · 0 commits during the session"; public, README, .gitignore, 5+ commits ✓; merged PR and v1.0 tag ○ with hints | PASS (matches the repository) |
| 3 | Activity is recorded | Unit 4 lessons and quiz → report shows 5 min active, 10:50 – 10:54 | PASS |
| 4 | Faculty report | Row TEST-1 · hitechpatel · 5 min · repo 4/6 | PASS |
| 5 | Window over 24 hours (first attempt, 28 → 31 Oct) | Nothing shown — error only in the top message bar → **fixed**: the report now explains the problem inside the section and checks the window before asking the server | Fixed |
| 6 | Owner request: collapsible dashboard | Requests, join code, Students and Remote session report fold and unfold; state remembered | Added |

**Not tested yet:** Part C (needs the class-wall repository `sbccas/sy-ai-2026-wall` on GitHub); a full 2-hour session.
**Clean-up:** test account deleted again; port-5174 redirect removed; local accounts off.

## Student timer (owner approval 30 Oct 2026) — local trial, 30 Oct 2026

| | |
|---|---|
| **Database** | `supabase/migrations/20261030000007_m12c_student_timer.sql` applied by the owner ("Success. No rows returned"); `npm run sql-check` TM1–TM4 pass (suite 27 / 27) |
| **Site checks** | `npm test` TM (window and phases, countdown format, active minutes); `npm run check:dist` (no `session-preview` in the live build); bar design checked at desktop width and 360 px |

| # | Manual test (localhost:5174, `?session-preview`, test account) | Observed result | Result |
|---|---|---|---|
| 7 | Remote session card while "live" | "0:59:42 left · Active 0 / 120 min" | PASS |
| 8 | Activity reaches the timer | After reading Unit 1 lessons, the header bar showed "Active 5 / 120 min · 115 to go" within about 10 s | PASS |

**Clean-up:** test account deleted; port-5174 redirect removed; local accounts off.

## Final exam (Milestone 12c part 2) — local trial, 30 Oct 2026

| | |
|---|---|
| **Database** | `supabase/migrations/20261030000008_m12c_exam.sql` applied by the owner; question bank (75 questions, approved by the owner 30 Oct 2026, kept in the git-ignored `exam-bank/`) loaded with `exam-bank/load-questions.sql` → 15 active questions per unit |
| **Local database check** | `npm run sql-check`: `m12c_exam_test.sql` **36 / 36 PASS** (twice); all earlier suites pass |
| **Site checks** | `npm test` EXM (5) and the secret scan (fails on `exam-bank/` or `local-reports/` files); `npm run check:dist` |
| **Trial set-up** | Separate batch "TRIAL — exam test …" so real students could never see the trial exam; owner's faculty account and test student account |

| # | Manual test | Observed result | Result |
|---|---|---|---|
| 9 | Draft exam invisible to students | "No exam is open right now" | PASS |
| 10 | Faculty opens the exam | The student page switched to the rules and Start button by itself (15-second check) | PASS |
| 11 | Reload during the exam | Answers kept (grid and count), timer kept counting | PASS |
| 12 | Leaving the page | Warning shown; faculty results "Left page 1" | PASS |
| 13 | Submit and result | "4 / 25 · 16% · NOT PASSED", marked on the server | PASS |
| 14 | Faculty results | TEST-1 · Submitted · 9 answered · 4/25 · 16% · FAIL · 1.5 min · left page 1 | PASS |
| 15 | Close the exam, then review | Student review shows answers with green ✓ and red ✗ | PASS |
| 16 | **Found during the trial:** the trial batch name was typed into the open "Create an exam" form of the real batch → a **draft** exam in BCA 2026 – SY AI (never opened, 0 attempts, invisible to students) | Deleted; **fixed**: the form now starts collapsed, names the batch, and asks to confirm the batch before creating | Fixed |

**Clean-up:** trial batch (with its exam, paper and code) and the stray draft deleted — afterwards no exam exists; test
account deleted; port-5174 redirect removed; local accounts off.
