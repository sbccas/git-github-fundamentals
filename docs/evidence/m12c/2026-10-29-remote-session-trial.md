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
