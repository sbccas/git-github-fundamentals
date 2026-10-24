# Phase 2 — Classroom & identity with Supabase: plan

| | |
|---|---|
| **Status** | 📝 Plan published 24 October 2026 — **awaiting the course owner's approval**, and decision D-5 (the college creates a Supabase project) |
| **PRD** | §7 S-01 – S-08 (Phase 2), §4 Phases, §11 Architecture, N-05 Privacy, D-5 |
| **Builds on** | Phase 1 as delivered (Milestones 1–9): local progress in `src/scripts/lib/progress.js` (version 1), validated import (G-08), Git Passport (G-04) |

## 1. In one line

Students **sign in with GitHub**, their progress is **saved online** and follows them to any phone or lab PC, and
faculty get a **class dashboard**, a **leaderboard**, **live classroom quizzes** and **certificates anyone can verify**.

## 2. Principles

1. **Sign-in stays optional.** Everything in Phase 1 keeps working without an account, offline, exactly as today.
   Signing in only adds sync and class features.
2. **The device stays the first copy.** Progress is still saved in the browser first; it is copied to Supabase when
   online. If Supabase is down or the free project is paused, the site still works.
3. **The static site stays on GitHub Pages.** No server of our own: the browser talks to Supabase directly, and every
   table is protected by row-level security (RLS). The public "anon" key in the site is safe by design; the secret
   "service role" key is never put in the site, the repo or this chat.
4. **Collect as little as possible** (N-05): GitHub username, display name, programme, batch, progress. No phone
   numbers, no analytics, no tracking.
5. **Grades are not automated.** Missions run in the student's browser, so progress is a learning record. Certificates
   are issued by faculty after the final practical (S-07), never automatically.

## 3. What students and faculty will see

| Who | New | Requirement |
|---|---|---|
| Student | "Sign in with GitHub" button (header and Git Passport); first sign-in asks for name, programme and batch | S-01, S-03 |
| Student | Progress merged from this device on first sign-in; same progress on every device; "Synced ✓" on the passport | S-01, S-02 |
| Student | Batch leaderboard (XP) — **only students who opt in are listed** | S-04 |
| Student | "Join live quiz" with a 6-letter code shown on the projector | S-05 |
| Student | "Delete my account and online data" (local progress stays on the device) | N-05 |
| Faculty | Teacher dashboard `/teach/dashboard/`: per-batch units, missions, quiz scores; CSV export | S-06 |
| Faculty | Live quiz host screen: pick a unit quiz, start, see answers arrive as a chart (counts only, no names on the projector) | S-05 |
| Faculty | Issue a certificate after the final practical; revoke if issued by mistake | S-07 |
| Anyone | `/verify/?id=XXXX-XXXX` shows name, course, date, college and status of a certificate | S-07 |

## 4. Architecture

```
Browser (GitHub Pages site, offline-first)
  ├─ localStorage: progress v1 (unchanged)  ──sync──▶  Supabase Postgres (RLS on every table)
  ├─ supabase-js (loaded only when the student signs in or is signed in)
  ├─ Auth: GitHub OAuth (PKCE) via Supabase Auth
  └─ Live quiz: Supabase Realtime (channel per session)
```

- **Region:** Mumbai (`ap-south-1`), closest to Surat.
- **Library:** `@supabase/supabase-js`, loaded lazily (a separate chunk), so pages for signed-out students do not grow.
- **Config:** `src/scripts/data/supabase.js` holds the project URL and the public anon key (both public by design).
- **Schema as code:** `supabase/migrations/*.sql` in the repo (tables, RLS policies, functions), applied by the
  owner in the Supabase SQL editor or with the Supabase CLI. Reviewed in pull requests like any code.

## 5. Data model

| Table | Holds | Who can read / write (RLS) |
|---|---|---|
| `profiles` | user id, GitHub username, display name, programme, batch, `leaderboard_opt_in` (default **false**), role (`student`/`faculty`) | Own row: read/update (not role). Faculty: read profiles in their batches |
| `faculty` | GitHub usernames allowed the faculty role | Read: none from the browser; set by the owner in the dashboard. A trigger gives matching users the faculty role |
| `batches` | name (e.g. "BCA Sem 3 Div A 2026-27"), programme, year, join code, owning faculty | Faculty: create/manage their own; students: read the one they belong to |
| `progress` | one row per student: the version 1 progress document (`jsonb`), XP, units passed, missions done, updated time | Own row via the `save_progress` function only; faculty read rows in their batches |
| `live_sessions` | code, batch, quiz id, current question, state, faculty | Faculty own; students in the batch read active sessions |
| `live_answers` | session, question, student, chosen option, time | Student inserts own answer once per question; faculty of the session read |
| `certificates` | id (`XXXX-XXXX`), student, batch, issued by, issued date, status (`valid`/`revoked`) | Faculty issue/revoke for their batches; public read only through the `verify_certificate(id)` function (name, course, date, college, status) |

The PRD's indicative `quiz_attempts` and `mission_runs` tables are folded into the `progress` document: it already
holds quiz best/last scores and mission completions, so one validated document avoids two copies drifting apart.

**`save_progress(doc)`** (Postgres function, runs as the database owner): checks the document's shape like
`validateProgress()` (G-08), **recalculates XP on the server** from recorded work (`deriveXp()` rules), and stores it.
A student editing the browser cannot set an arbitrary XP or leaderboard score.

## 6. Sync and merge rules (S-01, S-02)

On sign-in and then whenever progress changes (debounced) or the device comes back online:

1. Fetch the server copy; merge it with the device copy; save the result to both.
2. Merge is **union, never loss**: missions done = union (earliest date kept); badges = union (earliest date); lesson
   sections read = union; quiz best = maximum, quiz passed = either; unit complete = either; self-check best = maximum;
   last visited = the newer one; passport name = the device's if set. XP is recalculated, so merging never doubles XP.
3. Merge is a pure function (`mergeProgress(a, b)`) with Node tests, like the passport logic.
4. Signing out keeps the device copy; signing in on a shared lab PC shows "This PC has progress from someone else —
   keep it separate?" so two students never merge into one account.

## 7. Milestones

| # | Milestone | Requirements | Needs from the owner |
|---|---|---|---|
| 10 | **Foundation:** Supabase project, schema + RLS migrations, sign in / sign out with GitHub, profile form, delete-account | S-01 (sign-in), S-03, S-08, N-05 | D-5 setup (step-by-step, §9); faculty GitHub usernames |
| 11 | **Sync:** merge on first sign-in, background sync, "Synced ✓" on the passport, shared-PC guard | S-01, S-02 | — |
| 12 | **Batches, teacher dashboard, leaderboard:** batch join codes, dashboard with CSV export, opt-in batch leaderboard | S-04, S-06 | Batch list (names, divisions) |
| 13 | **Live classroom quiz** (Realtime) | S-05 | A classroom test with a few students |
| 14 | **Certificates:** issue/revoke by faculty, public `/verify/` page, certificate number on the student's passport | S-07 | Certificate wording and who signs; whether a printable PDF certificate is wanted |

Each milestone gets its own short plan in `docs/plans/`, approved before it is built, as in Milestones 7–9.

## 8. Testing

- **Node (`npm test`):** merge rules, server-side XP rules mirrored from `deriveXp()`, sign-in state handling,
  the "signed out = Phase 1 unchanged" path.
- **Database:** RLS tests as SQL scripts (`supabase/tests/`) run against a **separate free test project**, never the
  real one: a student cannot read another student's progress, cannot set XP, cannot give themselves the faculty role;
  faculty see only their batches; `verify_certificate` reveals only the public fields.
- **Manual:** two phones and a lab PC with real GitHub accounts (sync, shared-PC guard, leaderboard opt-in, live quiz
  in a classroom, certificate verify link on WhatsApp).

## 9. Setup the owner does (D-5), step by step when Milestone 10 starts

1. Create a free Supabase account and project "git-github-fundamentals" (region Mumbai). Keep the database password safe.
2. On GitHub, create an **OAuth App** under the `sbccas` organisation; paste its client ID and secret into Supabase
   (Authentication → Providers → GitHub). **You do this yourself; secrets are never shared in chat.**
3. In Supabase, set the site URL and redirect URL to `https://sbccas.github.io/git-github-fundamentals/`.
4. Send me only the **project URL** and the **anon (publishable) key** — both are public by design.
5. Apply the migrations I prepare (paste into the SQL editor, or `supabase db push`), then add faculty GitHub usernames.

## 10. Cost, limits and risks

| Topic | Note |
|---|---|
| Cost | Free plan is enough for a few hundred students (database, auth and realtime well within free limits for class sizes). |
| Free projects pause | Supabase pauses free projects after about a week without activity (e.g. vacations). The site keeps working locally; the owner presses "Restore" in the dashboard, or the college moves to a paid plan later. |
| Privacy | Consent text on first sign-in; delete-account button; data region Mumbai; retention: delete accounts one year after the batch ends (owner to confirm). |
| Shared lab PCs | Students must sign out; the site shows who is signed in on every page; automatic sign-out after inactivity on lab PCs is an option. |
| Cheating | Missions and quizzes run in the browser, so a determined student could fake progress. Leaderboard and dashboard are learning signals; the **certificate depends on the faculty-run final practical**. |
| Offline | Unchanged. Sync waits for a connection; nothing is lost. |

## 11. Decisions needed from the owner

1. **Approve this plan** (Phase 2 as Milestones 10–14).
2. **D-5:** create the Supabase project (free plan, Mumbai) and the GitHub OAuth app when Milestone 10 starts.
3. **Faculty list:** GitHub usernames of faculty who need dashboard access.
4. **Leaderboard default:** opt-in (recommended) or opt-out.
5. **Data retention:** delete accounts one year after a batch ends (recommended) or another period.
6. **Certificates (Milestone 14):** wording, signatory, and whether a printable PDF certificate is needed.

## 12. Exclusions

No changes to course content, missions, quizzes, XP values or badge rules. No analytics, ads or third-party
trackers. No paid services in Phase 2. No AI features (Phase 3, PRD §8, separate plan).
