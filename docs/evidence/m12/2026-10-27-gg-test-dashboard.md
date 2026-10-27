# Evidence — Milestone 12 (faculty dashboard) on `gg-test`, 27 Oct 2026

| | |
|---|---|
| **Environment** | `gg-test` (`git-github-fundamentals-test`) · local development server, accounts enabled only in the git-ignored env file |
| **Applied by the owner** | `supabase/migrations/20261027000003_m12_dashboard.sql`; `supabase/tests/seed_gg_test_m12.sql` (consent `draft-2` current, `draft-1` retired) |
| **Faculty accounts (M12-D7)** | `contact2hitech` — course instructor (GitHub id 115479871); `sbccas` — SYBCA AI coordinator for now (GitHub id 49284143; to be replaced later). Added to `private.faculty_allowlist` by the owner after each signed in once |
| **Students** | GitHub test account "student A" (Q-1 (a)); fake users inside the SQL suites only |

## SQL suites (owner-run in the SQL Editor; output reported by the owner)

| Suite | Result |
|---|---|
| `supabase/tests/m12_dashboard_test.sql` — F1–F4, R3, R5, J1–J4, X1–X3, dashboard fields, colleague access, export, deletion | **36 / 36 PASS** (CLEAN confirms test users, batches and allowlist entries removed) |
| `supabase/tests/m10_m11_security_test.sql` re-run after migration 3 (X5 and R1d updated for `batch_id`) | **69 / 69 PASS** |

Pre-check: both suites also passed twice in the local PGlite stand-in before they were given to the owner.

## Manual tests (owner, guided)

| # | Test | Observed result | Result |
|---|---|---|---|
| 1 | Faculty accounts sign in through consent and profile like students (LC9) | contact2hitech: "Signed in as Hitesh Patel, saved online"; sbccas: "Signed in as SYBCA AI Coordinator, saved online" (device progress kept separate) | PASS |
| 2 | Allowlist by GitHub numeric id (F1, M12-D3) | Owner's SQL returned both ids with their notes | PASS |
| 3 | Account page shows the dashboard link to faculty; batch created on the dashboard (M12-D2) | "BCA 2026 – SY AI" created; join code shown | PASS |
| 4 | Second faculty given access (M12-D7) | "sbccas can now see this batch" | PASS |
| 5 | Re-consent after a wording change, in the browser (§4.8.3, LC6) | Student A saw the updated consent with "I agree" | PASS |
| 6 | Student joins with the join code (S-03) | "You joined BCA 2026 – SY AI" | PASS |
| 7 | Dashboard shows the student's progress (S-06) | Instructor: Student A, 150 XP | PASS |
| 8 | Both faculty see the same batch (M12-D7) | Coordinator (sbccas): BCA 2026 – SY AI with Student A, 150 XP | PASS |
| 9 | New progress reaches the dashboard | After a Unit 4 activity and Refresh: 200 XP, U4 ✓ | PASS |
| 10 | Non-faculty account cannot use the dashboard (R3, F1) | Student A: "This page is for course faculty …" | PASS |
| 11 | CSV export (S-06, plan §3.2) | One row for Student A, 200 XP, no email column; opens in Excel | PASS |
| 12 | Projector view | Code fills the screen, readable; Esc closes | PASS |

**Not covered manually:** the dashboard on a phone at 360 px (table scrolls inside its card by design); a wrong or
disabled code typed in the browser, code regeneration and removal of a faculty member in the browser (all covered by
the SQL suite: J2, J3, F4); more than one batch per faculty member.

## Additions M12-D9 (roll number / SID) and M12-D10 (faculty menu link), same day

| | |
|---|---|
| **Applied by the owner** | `supabase/migrations/20261027000004_m12_roll_number.sql`; `supabase/tests/seed_gg_test_draft3.sql` (consent `draft-3` current) |
| **SQL suite** | `m12_dashboard_test.sql` with RN1–RN5 (join refused without a roll number; invalid value rejected; students set their own; nobody else — student or faculty — can change it; shown in dashboard rows): **41 / 41 PASS** on `gg-test` (and twice in the local pre-check, with the Milestone 10–11 suite 69 / 69) |

| # | Manual test | Observed result | Result |
|---|---|---|---|
| 13 | Re-consent to `draft-3`, then set roll number in "Edit profile" (student A) | "Profile saved" | PASS |
| 14 | Dashboard shows the roll number | Instructor: Student A, roll no 23BCA-AI-001 | PASS |
| 15 | "Faculty dashboard" in the More menu for faculty | Appears for contact2hitech | PASS |
| 16 | No faculty link for students | Not shown for student A | PASS |

Not covered manually: a new student joining without a roll number in the browser (covered by RN1), CSV with the roll column
opened in Excel after this change (covered by `npm test` DB2).
