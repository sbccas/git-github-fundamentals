# Phase 2 — Classroom & identity with Supabase: plan

| | |
|---|---|
| **Status** | **Revision 2 — awaiting the owner's review.** Direction approved by the owner (Hitesh Patel) on 24 October 2026 with two decisions: leaderboard **opt-in**, and **no automatic deletion** of accounts after one year. Revision 2 adds security acceptance criteria, sync rules, a test-project gate and data-protection rules (from review). **No implementation has started.** Each milestone still needs its own approved plan, and decision D-5 (Supabase project) must be done first. |
| **History** | Rev 1 published 24 Oct 2026 (`dc38c9b`) · Rev 2 24 Oct 2026 (this version) |
| **PRD** | §7 S-01 – S-12 (Phase 2), §4 Phases, §11 Architecture, N-05 Privacy, D-5 |
| **Builds on** | Phase 1 as delivered (Milestones 1–9): local progress in `src/scripts/lib/progress.js` (version 1), validated import (G-08), Git Passport (G-04) |

## 1. In one line

Students **sign in with GitHub**, their progress is **saved online** and follows them to any phone or lab PC, and
faculty get a **class dashboard**, an **opt-in leaderboard**, **live classroom quizzes** and **certificates anyone can verify**.

## 2. Principles

1. **Sign-in stays optional.** Everything in Phase 1 keeps working without an account, offline, exactly as today.
   Signing in only adds sync and class features.
2. **The device stays the first copy.** Progress is saved in the browser first and copied to Supabase when online.
   If Supabase is down or the free project is paused, the site still works.
3. **The static site stays on GitHub Pages.** No server of our own: the browser talks to Supabase directly and every
   table is protected by row-level security (RLS). The public anon key in the site is safe by design; the secret
   service-role key is never put in the site, the repository or a chat.
4. **Collect as little as possible** (N-05): GitHub identity, display name, programme, batch, progress. No phone
   numbers, no analytics, no tracking.
5. **Grades are not automated.** Missions run in the student's browser, so progress is a learning record. Certificates
   are issued by faculty after the final practical (S-07), never automatically.

## 3. What students and faculty will see

| Who | New | Requirement |
|---|---|---|
| Student | "Sign in with GitHub" (header and Git Passport); first sign-in shows the consent screen (§5.4), then asks for name, programme and batch | S-01, S-03, S-12 |
| Student | Progress merged from this device on first sign-in; same progress on every device; sync status on the passport | S-01, S-02, S-10 |
| Student | Batch leaderboard (XP) — **only students who opt in are listed; off by default** | S-04 |
| Student | "Join live quiz" with a 6-letter code shown on the projector | S-05 |
| Student | "Delete my account and online data" (local progress stays on the device) | S-12 |
| Faculty | Teacher dashboard `/teach/dashboard/`: own batches only — units, missions, quiz scores; CSV export | S-06, S-12 |
| Faculty | Live quiz host screen: pick a unit quiz, start, see answer counts as a chart (no names on the projector) | S-05 |
| Faculty | Issue a certificate after the final practical; revoke if issued by mistake | S-07 |
| Anyone | `/verify/?id=XXXX-XXXX` shows name, course, date, college and status of one certificate | S-07 |

## 4. Architecture and data model

```
Browser (GitHub Pages site, offline-first)
  ├─ localStorage: progress v1 (unchanged) + sync metadata  ──sync──▶  Supabase Postgres (RLS on every table)
  ├─ supabase-js (separate chunk, loaded only when the student signs in or is signed in)
  ├─ Auth: GitHub OAuth (PKCE) via Supabase Auth
  └─ Live quiz: Supabase Realtime (channel per session)
```

- **Region:** Mumbai (`ap-south-1`). **Config:** `src/scripts/data/supabase.js` (project URL + anon key, public by design).
- **Schema as code:** `supabase/migrations/*.sql` (tables, RLS, functions, triggers), reviewed like any code;
  `supabase/tests/*.sql` for the security tests (§6).
- **Service worker:** requests to the Supabase domain are never cached (it only handles same-origin requests).

| Table / function | Holds | Access (RLS; default deny) |
|---|---|---|
| `profiles` | user id, GitHub numeric id and username, display name, programme, batch, `leaderboard_opt_in` (default **false**), consent version and date | Own row: read; update only name, programme, opt-in. Faculty: read rows in batches they own |
| `faculty_allowlist` | **GitHub numeric user ids** allowed the faculty role | No browser access at all (owner edits it in the Supabase dashboard) |
| `batches` | name, programme, year, join code, owning faculty | Owning faculty: manage. Students: read their own batch. Joining only through `join_batch(code)` |
| `progress` | per student: version 1 document (`jsonb`), server XP, `revision`, updated time | No direct writes. Read own row; faculty read rows in their batches. Written only by `save_progress` |
| `live_sessions`, `live_answers` | session code, quiz, state; one answer per student per question | Faculty: own sessions. Students: active sessions of their batch; insert own answer once |
| `certificates` | id, student, batch, issued by, issued/revoked time, status | Faculty of the batch: issue/revoke. No public table access |
| `save_progress(doc, base_revision)` | validate, merge, recalculate XP, store | Signed-in users only; always the caller's own row |
| `leaderboard(batch)` | display name + XP of **opted-in** students in the caller's batch | Students and faculty of that batch |
| `verify_certificate(id)` | name, course, issue date, college, status | Anyone (including signed out) |
| `delete_my_account()` | removes the caller's data (§5.4) | Signed-in users, own account only |

The PRD's indicative `quiz_attempts` and `mission_runs` are folded into the `progress` document, which already holds
quiz scores and mission completions; one validated document avoids two copies drifting apart.

## 5. Security, sync and data-protection rules

### 5.1 Security acceptance criteria (S-09) — every item must pass in the test project (§6) before release

**Faculty role assignment**
- F1. The faculty role comes **only** from `faculty_allowlist`, which no browser request can read or write.
- F2. The allowlist stores **GitHub numeric user ids**, not usernames: renaming a GitHub account to a faculty member's
  username grants nothing.
- F3. A student cannot become faculty by editing their profile: role is not a column students can update, and role
  checks in RLS read the allowlist on every request (not a value cached in the browser or the token).
- F4. Removing someone from the allowlist removes faculty access on their next request.

**RLS isolation**
- R1. RLS is enabled on every table; anything not explicitly allowed is denied, including to signed-out (anon) users.
- R2. Student A cannot read, insert, update or delete student B's profile, progress, answers or certificates —
  including by guessing ids.
- R3. Faculty see only students in batches they own; they cannot change any student's progress.
- R4. The leaderboard returns only opted-in students of the caller's own batch, and only display name and XP.
- R5. Joining a batch requires its join code (`join_batch`); students cannot list or join other batches.

**`save_progress` ownership and integrity**
- P1. Takes no user-id parameter: it always writes the row of the signed-in caller (`auth.uid()`); signed-out calls fail.
- P2. Runs with a fixed `search_path` and validates the document like `validateProgress()` (G-08): known version,
  known ids, value ranges, size limit (64 KB). Invalid documents are rejected and nothing is stored.
- P3. Recalculates XP on the server (`deriveXp()` rules) and merges with the stored copy (§5.2); a client can never
  lower stored progress or set XP/leaderboard values directly.

**Public certificate verification**
- C1. Certificate ids are random (`XXXX-XXXX` from a 32-letter alphabet, about 10¹² values), never sequential.
- C2. `verify_certificate(id)` returns exactly one certificate's name, course, issue date, college and status
  (`valid` / `revoked`) — no email, GitHub details, progress or batch; there is no way to list certificates.
- C3. Only faculty of the student's batch can issue or revoke; each issue/revoke records who and when.

**Keys and sign-in**
- K1. Only the anon key is in the site; `npm test` fails if a service-role key or other secret pattern appears in the repository.
- K2. Auth redirects are allowed only to `https://sbccas.github.io/git-github-fundamentals/` (production) and to
  the local development address in the **test** project only.

### 5.2 Sync behaviour (S-10)

| Situation | Behaviour |
|---|---|
| Normal change | Saved locally first (as today), then marked *pending*; sent to `save_progress` with the `revision` it was based on |
| Two devices change at the same time | The server compares revisions. If the stored copy is newer, it **merges** both (rules below) and returns the result with a new revision; the device keeps the merged copy. No change is lost, and XP is not doubled |
| Stale copy (an old phone comes back) | Merge rules only add or raise values, so a stale copy cannot remove progress |
| Network failure or Supabase paused | Nothing is lost: the change stays *pending*; retried on reconnect, page load and every few minutes with back-off; the passport shows "Offline — will sync" or "Sync problem — retry" |
| Repeated retries | Idempotent: sending the same document twice gives the same result |
| Signed-out use | Phase 1 behaviour, no network calls |
| Account switching / shared lab PC | Local progress is tagged with the account it was synced to. If another account signs in, or the device has untagged progress, the site **asks**: "Add this device's progress to *name*?" (Add / Keep separate). Never merged silently. On sign-out, "Remove my progress from this PC" is offered (data stays online) |
| Session expired | Keeps working locally; asks to sign in again; pending changes sync afterwards |
| Import while signed in | Merged into the account (never replaces it silently); replacing the online copy needs an explicit confirmation |

**Merge rules** (`mergeProgress(a, b)`, a pure function with Node tests): missions done, badges and lesson sections =
union (earliest date kept); quiz best = maximum, passed = either; unit complete = either; self-check best = maximum;
last visited and passport name = the newer one (time-stamped); XP recalculated. The same rules run in the browser
and in `save_progress`.

### 5.3 Test-project gate (S-11)

1. Two Supabase projects: **test** (`gg-test`) and **production** (`gg-prod`). The test project never holds real student data.
2. Every migration is applied to the test project first; then the security suite (§6) runs; then the manual checks.
3. A migration reaches production only after the suite passes and the owner approves the release in the milestone plan.
4. Before each production migration the owner exports the data (Supabase dashboard or `supabase db dump`), because
   the free plan does not provide restorable backups.
5. Production migrations are append-only (new files, never edits to applied ones).

### 5.4 Consent, deletion, retention and faculty access (S-12)

- **Consent** — before the first online save, a screen says what is stored (GitHub identity, display name, programme,
  batch, progress), who can see it (the student; faculty of their batch; the batch leaderboard only if they opt in;
  certificate details to anyone who has the certificate id), where (Supabase, Mumbai) and how to delete it. The student
  must agree to continue; the consent version and date are stored. Declining keeps the site in signed-out mode.
- **Deletion** — "Delete my account" removes the profile, progress, live-quiz answers and the sign-in account.
  Local progress on the device stays. **Issued certificates are college records**: their name, course and date stay
  verifiable after account deletion unless the college revokes or removes them (stated in the consent text).
- **Retention** (owner decision, 24 Oct 2026) — **no automatic deletion after a fixed period.** Data is kept until the
  student deletes their account or the college asks for deletion or closes the project.
- **Faculty access to individual records** — faculty see only students in batches they own: display name, GitHub
  username, programme, batch, and progress (units, missions, quiz scores, self-check). They cannot see other batches,
  edit progress, or see students' answers outside their own live sessions. CSV exports contain only these fields and
  are handled under college policy. Certificate issue/revoke is logged with faculty and time.

## 6. Testing

- **Node (`npm test`):** merge rules (simultaneous, stale, repeated, imported), server XP rules mirrored from
  `deriveXp()`, sync state machine (pending, retry, offline, expired session, account switch), the signed-out path
  (Phase 1 unchanged with Supabase unreachable), and the secret scan (K1).
- **Security suite (`supabase/tests/`), test project only:** one check per criterion F1–F4, R1–R5, P1–P3, C1–C3, K2,
  run as different signed-in users (student A, student B, faculty X of batch 1, faculty Y of batch 2, signed-out).
- **Manual:** two phones and a lab PC with real GitHub accounts (sync, account switching, leaderboard opt-in, live quiz
  in a classroom, certificate link on WhatsApp).

## 7. Milestones

| # | Milestone | Requirements | Needs from the owner |
|---|---|---|---|
| 10 | **Foundation:** test + production projects, schema and RLS migrations, security suite, sign in / out with GitHub, consent screen, profile form, delete account | S-01 (sign-in), S-03, S-08, S-09, S-11, S-12 | D-5 setup (§9); faculty GitHub usernames (we record their numeric ids) |
| 11 | **Sync:** merge on first sign-in, background sync with retries, account-switch guard, sync status on the passport | S-01, S-02, S-10 | — |
| 12 | **Batches, teacher dashboard, leaderboard:** join codes, dashboard + CSV, opt-in leaderboard | S-04, S-06 | Batch list |
| 13 | **Live classroom quiz** (Realtime) | S-05 | A classroom test |
| 14 | **Certificates:** issue/revoke, public `/verify/` page, certificate number on the passport | S-07 | Wording, signatory, printable PDF or not |

Each milestone gets its own short plan in `docs/plans/`, approved before it is built; none starts before D-5.

## 8. Signed-out and offline guarantee

Phase 1 keeps working with no account, no network and Supabase unavailable: lessons, Playground, missions, quizzes,
Git Passport, ebooks, offline install. `npm test` keeps all Phase 1 checks and adds a "Supabase unreachable" run.

## 9. Setup the owner does (D-5), step by step when Milestone 10 starts

1. Create a free Supabase account and **two** projects: `gg-test` and `gg-prod` (region Mumbai). Keep the database passwords safe.
2. On GitHub, create **OAuth Apps** under the `sbccas` organisation (one per project); paste each client ID and secret
   into the matching Supabase project. **You do this yourself; secrets are never shared in chat.**
3. Set redirect URLs (§5.1 K2).
4. Send me only each project's **URL** and **anon (publishable) key** — both are public by design.
5. Apply the migrations to `gg-test`, run the security suite, then to `gg-prod` after approval (§5.3); add faculty GitHub usernames.

## 10. Cost, limits and risks

| Topic | Note |
|---|---|
| Cost | Free plan is enough for class sizes (two free projects are allowed). |
| Free projects pause | After about a week without activity; the site keeps working locally; the owner presses "Restore", or the college moves to a paid plan later. |
| No free backups | Owner exports data before each production migration (§5.3) and at the end of each term. |
| Shared lab PCs | Account-switch guard (§5.2); signed-in name shown on every page; sign-out offers to remove local progress. |
| Cheating | Browser-based missions can be faked by a determined student; leaderboard and dashboard are learning signals; certificates depend on the faculty-run final practical. |
| Offline | Unchanged (§8). |

## 11. Decisions

| Decision | Status |
|---|---|
| Phase 2 direction (Milestones 10–14) | ✅ Approved by the owner, 24 Oct 2026 |
| Leaderboard | ✅ **Opt-in**, off by default (owner, 24 Oct 2026) |
| Retention | ✅ **No automatic deletion** after a fixed period (owner, 24 Oct 2026) |
| Revision 2 (§5 security, sync, test gate, data protection) | ⏳ Owner review |
| Certificates after account deletion stay verifiable as college records (§5.4) | ⏳ Owner to confirm |
| D-5: create `gg-test` and `gg-prod` + GitHub OAuth apps | ⏳ When Milestone 10 starts |
| Faculty list (GitHub usernames) | ⏳ Before Milestone 10 |
| Certificate wording, signatory, PDF | ⏳ Before Milestone 14 |

## 12. Exclusions

No changes to course content, missions, quizzes, XP values or badge rules. No analytics, ads or third-party
trackers. No paid services in Phase 2. No AI features (Phase 3, PRD §8, separate plan).
