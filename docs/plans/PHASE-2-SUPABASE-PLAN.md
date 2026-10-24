# Phase 2 — Classroom & identity with Supabase: plan

| | |
|---|---|
| **Status** | **Revision 4 (documentation clarifications) — awaiting the owner's approval as the implementation baseline.** Phase 2 architecture and direction approved by the owner (Hitesh Patel) on 24 October 2026 with two decisions: leaderboard **opt-in**, and **no automatic deletion** after a fixed period. **No implementation has started.** Next step after approval: a separate Milestone 10 plan. Gates: D-5 (Supabase projects and OAuth apps) before any setup; the college sign-off D-9 – D-12 (§5.6) before any real student data. |
| **History** | Rev 1 `dc38c9b` · Rev 2 `0fbd084` (security, sync, test gate, data protection) · Rev 3 `50d0ccf` (certificate records, live-quiz and join-code security, verify URL, production sign-off, PRD consistency) · Rev 4, 24 Oct 2026 (C4 tied to D-9, privileged-function rules X1–X6, complete data export, verified OAuth setup, Realtime-layer tests) |
| **PRD** | §7 S-01 – S-12, §11 Architecture, §12b Phase 2 milestones, §14 D-5 and D-8 – D-12, N-05 |
| **Builds on** | Phase 1 as delivered (Milestones 1–9): local progress in `src/scripts/lib/progress.js` (version 1), validated import (G-08), Git Passport (G-04) |

## 1. In one line

Students **sign in with GitHub**, their progress is **saved online** and follows them to any phone or lab PC, and
faculty get a **class dashboard**, an **opt-in leaderboard**, **live classroom quizzes** and **certificates anyone can verify**.

## 2. Principles

1. **Sign-in stays optional.** Everything in Phase 1 keeps working without an account, offline, exactly as today.
2. **The device stays the first copy.** Progress is saved in the browser first and copied to Supabase when online.
   If Supabase is down or the free project is paused, the site still works.
3. **The static site stays on GitHub Pages.** No server of our own: the browser talks to Supabase directly and every
   table is protected by row-level security (RLS). Only the public anon key is in the site.
4. **Collect as little as possible** (N-05): GitHub identity, display name, programme, batch, progress, live-quiz
   answers, certificate records. No phone numbers, no analytics, no tracking.
5. **Grades are not automated.** Progress is a learning record. Certificates are issued by faculty after the final
   practical (S-07), never automatically.

## 3. What students and faculty will see

| Who | New | Requirement |
|---|---|---|
| Student | "Sign in with GitHub"; first sign-in shows the consent screen (§5.4), then name, programme and batch join code | S-01, S-03, S-12 |
| Student | First sign-in **offers** to add this device's progress to the account; then the same progress on every device; sync status on the passport | S-01, S-02, S-10 |
| Student | Batch leaderboard (XP) — only students who opt in are listed; **off by default** | S-04 |
| Student | "Join live quiz" with a 6-letter session code shown on the projector | S-05 |
| Student | "Download my data" (everything stored online about them, §5.4) and "Delete my account and online data" | S-12 |
| Faculty | Teacher dashboard `/teach/dashboard/`: own batches only — units, missions, quiz scores; CSV export | S-06, S-12 |
| Faculty | Live quiz host screen: start a unit quiz for a batch; the projector shows answer **counts** only | S-05 |
| Faculty | Issue a certificate after the final practical; revoke with a reason | S-07 |
| Anyone | `https://sbccas.github.io/git-github-fundamentals/verify/?id=XXXX-XXXX` shows one certificate | S-07 |

The verification link uses a query string (`/verify/?id=…`) because GitHub Pages serves static files and cannot route
`/verify/<id>` paths; the PRD uses the same format.

## 4. Architecture and data model

```
Browser (GitHub Pages site, offline-first)
  ├─ localStorage: progress v1 (unchanged) + sync metadata  ──sync──▶  Supabase Postgres (RLS on every table)
  ├─ supabase-js (separate chunk, loaded only when the student signs in or is signed in)
  ├─ Auth: GitHub OAuth (PKCE) via Supabase Auth — the only sign-in method
  └─ Live quiz: Supabase Realtime, private channels authorised by RLS
```

- **Projects:** `gg-test` and `gg-prod`, region Mumbai (`ap-south-1`) (§5.3). **Config:** `src/scripts/data/supabase.js`.
- **Schema as code:** `supabase/migrations/*.sql`; security tests in `supabase/tests/*.sql`.
- **Service worker:** never caches Supabase requests (it only handles same-origin requests).

| Table / function | Holds | Access (RLS; default deny) |
|---|---|---|
| `profiles` | user id, GitHub numeric id and username, display name, programme, batch id, `leaderboard_opt_in` (default false), `leaderboard_hidden` (set by faculty), consent version and date | Own row: read; update only display name, programme, opt-in. Faculty: read rows in their batches |
| `faculty_allowlist` | GitHub numeric user ids allowed the faculty role | No browser access (owner edits in the Supabase dashboard) |
| `batches` | name, programme, year, owning faculty | Owning faculty: manage. Students: read **only their own batch's name and year** |
| `batch_join_codes` | batch id, join code, enabled, created | **No browser read access** for anyone; faculty get their own batches' codes only via `batch_code(batch)` |
| `join_attempts` | user id, time, success | Written only by `join_batch`; used for the attempt limit |
| `progress` | per student: version 1 document (`jsonb`), server XP, `revision`, updated time | Read own row; faculty read rows in their batches. Written only by `save_progress` |
| `live_sessions` | session code, batch, quiz id, current question, state (`waiting`/`open`/`closed`/`ended`), faculty | Faculty: own sessions. Students: read only active sessions of **their own** batch |
| `live_answers` | session, question, student, option, time; **unique (session, question, student)** | Student: insert own answer once while the question is open; read **only their own**. Faculty of the session: read all of that session |
| `certificates` | id, `student_id` (nullable), **snapshot** of recipient name, course, college and issue date, batch, issued by, status, revoked by/at/reason | Faculty of the batch: issue/revoke. No public table access; public reads only through `verify_certificate` |
| `save_progress(doc, base_revision)` | validate, merge, recalculate XP, store | Signed-in users; always the caller's own row |
| `join_batch(code)` | adds the caller to the matching batch | Signed-in students; attempt-limited (§5.1 J3) |
| `leaderboard()` | display name + XP of opted-in, not-hidden students in the caller's batch | Students and faculty of that batch |
| `live_results(session, question)` | answer counts per option | Faculty of the session (for the projector) |
| `verify_certificate(id)` | recipient name, course, college, issue date, status | Anyone, including signed out |
| `export_my_data()` | the caller's profile, progress, live-quiz answers, batch name, consent record and certificates (§5.4) | Signed-in users, own data only |
| `delete_my_account()` | removes the caller's data (§5.4) and applies the certificate policy (§5.5) | Signed-in users, own account only |
| `app_settings` | `certificate_policy` = `keep` or `anonymise` (set from D-9; §5.5) | No browser access; owner sets it in the dashboard |

The PRD's earlier indicative `quiz_attempts` and `mission_runs` tables are replaced by the single validated `progress`
document, which already holds quiz scores and mission completions.

## 5. Security, sync, data-protection and release rules

### 5.1 Security acceptance criteria (S-09) — each must pass on `gg-test` (§6) before release

**Faculty role** — F1 the role comes only from `faculty_allowlist`, which no browser request can read or write ·
F2 the allowlist uses GitHub **numeric ids**, so renaming an account grants nothing · F3 students cannot change their
role (not an updatable column; RLS checks the allowlist on every request) · F4 removal from the allowlist takes
effect on the next request.

**Isolation** — R1 RLS on every table, default deny, including for signed-out users · R2 student A cannot read,
insert, update or delete student B's profile, progress, answers or certificates, even by guessing ids · R3 faculty see
only their own batches and cannot change progress · R4 the leaderboard returns only opted-in, not-hidden students of
the caller's batch, with display name and XP only · R5 students cannot list batches other than their own.

**Batch join codes** — J1 join codes live only in `batch_join_codes`, which has no browser read policy; reading
`batches` never returns a code · J2 `join_batch(code)` returns only the joined batch's name, and the same "code not
valid" message for every failure, so codes cannot be probed for other batches · J3 at most 10 failed join attempts per
student per hour; codes are 8 random characters from a 32-letter alphabet; faculty can disable or regenerate a code ·
J4 faculty can read codes only for batches they own (`batch_code`).

**`save_progress`** — P1 no user-id parameter: always the caller's own row; signed-out calls fail · P2 fixed
`search_path`; validates like `validateProgress()` (version, ids, ranges, 64 KB limit); invalid documents change
nothing · P3 merges with the stored copy and recalculates XP on the server; a client can never lower progress or set XP.

**Live quiz** — L1 Realtime channels are private (Realtime Authorization, with RLS policies on Realtime's message
table): only students in the session's batch and the session's faculty can subscribe, and only the session's faculty
can broadcast question changes · L2 students see a session only while it is active and only for their own batch ·
L3 answers are accepted only while that question is open · L4 one answer per student per question (unique
constraint); a second insert or any update is rejected · L5 students can read only their own answers; no student can
read, change or delete another student's answer · L6 only the session's faculty can open/close questions, read
answers or `live_results`; the projector view shows counts, never names.

**Certificates** — C1 random ids (`XXXX-XXXX`, about 10¹² values), never sequential · C2 `verify_certificate(id)`
returns exactly one certificate's recipient name, course, college, issue date and status — no email, GitHub details,
progress or batch; certificates cannot be listed · C3 only faculty of the student's batch can issue or revoke; every
issue/revoke records who, when and (for revocation) why · C4 account deletion follows the **approved D-9 policy** (§5.5): with `keep`, the certificate snapshot stays
verifiable and its link to the account is removed; with `anonymise`, the certificate is revoked and the name replaced
by "Name removed". Until D-9 is decided, `gg-test` tests **both** policies; production runs only the approved one.

**Privileged database functions** — applies to every `SECURITY DEFINER` function and trigger (`save_progress`,
`join_batch`, `batch_code`, `leaderboard`, `live_results`, `verify_certificate`, `export_my_data`, `delete_my_account`,
the faculty-role check and the sign-up trigger):
X1 functions are `SECURITY INVOKER` unless listed here; each listed function states in a comment why it needs definer
rights · X2 every privileged function sets `search_path = ''` and uses schema-qualified names; no dynamic SQL built from
input · X3 `EXECUTE` is revoked from `PUBLIC`, then granted only to the roles that need it (`anon` only for
`verify_certificate`; `authenticated` for the others; triggers and internal helpers to no API role) · X4 internal
helpers live in a schema that the API does not expose · X5 each function checks the caller itself (`auth.uid()`, batch
ownership, allowlist) and never trusts ids passed from the browser for authorisation · X6 the test suite checks, for
every function: its definer/invoker setting and `search_path` (from `pg_proc`), its grants (`has_function_privilege`
for `anon`, `authenticated`), and calls as signed-out, student, other student, faculty and other faculty with the
expected allow/deny result.

**Keys and sign-in** — K1 only the anon key is in the site; `npm test` fails on service-role keys or other secret
patterns · K2 auth redirects only to the production site (and to the local development address in `gg-test` only) ·
K3 GitHub is the only sign-in provider; email/password and anonymous sign-in are disabled in production.

### 5.2 Sync behaviour (S-10)

| Situation | Behaviour |
|---|---|
| First sign-in on a device with progress | The site **asks** "Add this device's progress to *name*?" (Add / Keep separate). Never merged silently |
| Normal change | Saved locally first, marked *pending*, sent to `save_progress` with the `revision` it was based on |
| Two devices change at the same time | If the stored copy is newer, the server merges both and returns the result with a new revision; nothing is lost, XP is not doubled |
| Stale copy | Merge only adds or raises values, so a stale copy cannot remove progress |
| Network failure or project paused | Change stays *pending*; retried on reconnect, page load and every few minutes with back-off; passport shows "Offline — will sync" / "Sync problem — retry" |
| Repeated retries | Idempotent: the same document twice gives the same result |
| Account switching / shared lab PC | Local progress is tagged with the account it was synced to; another account signing in is asked before anything is merged; sign-out offers "Remove my progress from this PC" (data stays online) |
| Session expired | Keeps working locally; asks to sign in again; pending changes sync afterwards |
| Import while signed in | Merged into the account; replacing the online copy needs an explicit confirmation |
| Signed out | Phase 1 behaviour, no network calls |

**Merge rules** (`mergeProgress(a, b)`, pure, with Node tests; same rules in `save_progress`): missions done, badges,
lesson sections = union (earliest date kept); quiz best = maximum, passed = either; unit complete = either; self-check
best = maximum; last visited and passport name = newer (time-stamped); XP recalculated.

### 5.3 Test-project gate (S-11)

1. Two projects: `gg-test` (never holds real student data) and `gg-prod`.
2. Every migration goes to `gg-test` first; the security suite (§6) and manual checks run there.
3. A migration reaches `gg-prod` only after the suite passes and the owner approves it in the milestone plan.
4. Before each production migration the owner exports the data (no restorable backups on the free plan).
5. Production migrations are append-only.

### 5.4 Consent, deletion, retention and faculty access (S-12)

- **Consent** — before the first online save the student sees what is stored (GitHub identity, display name,
  programme, batch, progress, live-quiz answers), who can see it (the student; faculty of their batch; the batch
  leaderboard only if they opt in; a certificate's public fields to anyone with its id), where (Supabase, Mumbai), how
  long (until deletion — no fixed period), and how to delete it. Agreeing is required to sign in; the version and date
  are stored. The wording is confirmed by the college before production (§5.6).
- **Access to your data** — signed in, "Download my data" (`export_my_data`) gives one JSON file with everything
  stored online about the student: profile fields, consent version and date, batch name, the progress document,
  their live-quiz answers (session, quiz, question, option, time) and certificates issued to them (id, date, status).
  **Not included**, and said so on the download screen: other students' data, aggregate class results, and the
  sign-in records Supabase Auth keeps for security (available from the college on request). Signed out, the existing
  local progress export is unchanged.
- **Deletion** — "Delete my account" removes the profile, progress, live-quiz answers, join attempts and the sign-in
  account. Local progress on the device stays. Certificates are handled as in §5.5.
- **Retention** (owner, 24 Oct 2026) — **no automatic deletion after a fixed period**: data is kept until the student
  deletes their account or the college asks for deletion or closes the project.
- **Faculty access** — only faculty on the allowlist, and only for batches they own: display name, GitHub username,
  programme, batch, progress (units, missions, quiz and self-check scores) and their own sessions' live answers. No
  editing of progress; no other batches. Faculty may hide a student's display name from the leaderboard (moderation).
  CSV exports contain only these fields and are handled under college policy. The list of authorised faculty is
  confirmed by the college before production (§5.6).

### 5.5 Certificate records, deletion and revocation (S-07, S-12)

- At issue, the certificate stores a **snapshot**: recipient name (as confirmed by faculty), course, college and issue
  date, plus `student_id` linking to the account.
- `student_id` is a nullable foreign key with **`ON DELETE SET NULL`**: when a student deletes their account, the
  certificate row stays, without any link to the account, profile or progress. `verify_certificate` keeps showing the
  snapshot (name, course, college, date, status).
- **Revocation** sets status `revoked` with who, when and why; verification then shows "Revoked" with the date (not
  the reason).
- **Removal**: if the college decides a certificate record must be removed (for example at the recipient's request),
  the owner deletes the row in the dashboard; verification then shows "Not found". This is a college decision, logged
  outside the site.
- **Policy switch (D-9):** `app_settings.certificate_policy` is `keep` (recommended: the snapshot stays verifiable,
  unlinked from the account) or `anonymise` (deletion revokes the certificate and replaces the name with "Name removed";
  verification shows "Revoked"). Both paths are implemented and tested on `gg-test` (C4); production is set to the
  policy the college approves, and the consent text (D-11) states it.

### 5.6 Production sign-off (S-12) — before any real student data is collected

The college confirms in writing (recorded in this plan and the PRD):

1. the **consent wording** shown to students (D-11);
2. **certificate-record retention** after account deletion (D-9);
3. **who is authorised** to access student progress — the faculty allowlist and each person's batches (D-10);
4. that students under 18, if any, are covered by the college's existing consent arrangements (D-12).

Until then, Phase 2 runs only on `gg-test` with test accounts.

## 6. Testing

- **Node (`npm test`):** merge rules (simultaneous, stale, repeated, imported), server XP rules mirrored from
  `deriveXp()`, sync states (pending, retry, offline, expired session, account switch), the signed-out path with
  Supabase unreachable, and the secret scan (K1).
- **Security suite (`supabase/tests/`, `gg-test` only):** one test per criterion — F1–F4, R1–R5, J1–J4, P1–P3,
  L1–L6, C1–C4 (both D-9 policies), X1–X6, K2–K3 — run as student A and B (batch 1), student C (batch 2), faculty X (batch 1), faculty Y
  (batch 2), a removed faculty member and a signed-out user. Live-quiz tests cover: joining a session of another batch
  (denied), an ended session (denied), answering a closed question (denied), a second answer (denied), reading or
  updating another student's answer (denied), subscribing to another batch's channel (denied).
- **Realtime layer (not only table policies):** a Node script (`supabase/tests/realtime.test.mjs`) signs in test users
  on `gg-test` with supabase-js and opens real private channels: same-batch student (subscribe allowed, broadcast
  denied), other-batch student and signed-out user (subscribe denied), session faculty (subscribe and broadcast allowed),
  other faculty (denied), and a student after the session ends (denied).
- **Manual (`gg-test`):** two phones and a lab PC with real GitHub test accounts — sync, account switching,
  leaderboard opt-in, a classroom live quiz, certificate issue/revoke/verify, account deletion with a certificate.

## 7. Milestones (PRD §12b)

| # | Milestone | Requirements | Needs from the owner / college |
|---|---|---|---|
| 10 | **Foundation:** `gg-test`/`gg-prod`, schema + RLS, security suite, sign-in, consent screen, profile, download/delete | S-01 (sign-in), S-03, S-08, S-09, S-11, S-12 | D-5 setup (§9); D-10 faculty list; D-11 consent wording; D-12 |
| 11 | **Sync:** first-sign-in offer, background sync, retries, account-switch guard, sync status | S-01, S-02, S-10 | — |
| 12 | **Batches, dashboard, leaderboard:** join codes, dashboard + CSV, opt-in leaderboard with moderation | S-04, S-06 | Batch list |
| 13 | **Live classroom quiz** (private Realtime) | S-05, S-09 (L1–L6) | A classroom test on `gg-test` |
| 14 | **Certificates:** issue/revoke, `/verify/?id=` page, certificate number on the passport | S-07, S-09 (C1–C4) | D-9; certificate wording, signatory, PDF or not |

Each milestone has its own plan in `docs/plans/`, approved before it is built. Production use starts only after §5.6.

## 8. Signed-out and offline guarantee

Phase 1 keeps working with no account, no network and Supabase unavailable: lessons, Playground, missions, quizzes,
Git Passport, ebooks, offline install. `npm test` keeps all Phase 1 checks and adds a "Supabase unreachable" run.

## 9. Setup the owner does (D-5), step by step when Milestone 10 starts

Checked against GitHub's and Supabase's documentation on 24 Oct 2026; menu names are confirmed on screen during the
Milestone 10 walk-through. **Secrets (database passwords, OAuth client secrets, service-role keys) are entered only by
the owner, directly in GitHub and Supabase — never shared in chat, email or the repository.**

1. **Supabase projects** — create a free account and two projects, `gg-test` and `gg-prod`, region Mumbai. Keep each
   database password in a password manager.
2. **Callback URL** — in each project: Authentication → Sign In / Providers → GitHub, copy the callback URL
   (`https://<project-ref>.supabase.co/auth/v1/callback`).
3. **GitHub OAuth Apps, owned by the `sbccas` organisation** (an organisation owner does this: organisation Settings →
   Developer settings → OAuth Apps → New OAuth App). One app per project, so test and production never share a secret:
   - Application name: "Git & GitHub Fundamentals (test)" / "Git & GitHub Fundamentals"
   - Homepage URL: `https://sbccas.github.io/git-github-fundamentals/`
   - Authorization callback URL: that project's Supabase callback URL from step 2
   - Enable Device Flow: **off**; other options left at GitHub's defaults
   - Register, copy the **Client ID**, generate a **client secret**.
   Apps owned by the organisation are not blocked by its OAuth app access restrictions.
4. **Connect** — in the matching Supabase project (Authentication → Sign In / Providers → GitHub): enable GitHub, paste
   the Client ID and client secret yourself, save.
5. **Sign-in settings** — Authentication → URL Configuration: Site URL `https://sbccas.github.io/git-github-fundamentals/`;
   redirect URLs exact (no `**` wildcards); `gg-test` may also allow the local development address (K2). Disable email
   and anonymous sign-in in `gg-prod` (K3).
6. **Send me only** each project's **URL** and **anon (publishable) key** — both public by design.
7. **Migrations** — applied to `gg-test`, security suite run; `gg-prod` only after approval and the §5.6 sign-off.

## 10. Cost, limits and risks

| Topic | Note |
|---|---|
| Cost | Free plan; two free projects are allowed. |
| Free projects pause | After about a week without activity; the site keeps working locally; the owner presses "Restore", or the college moves to a paid plan. |
| No free backups | Export before each production migration and at the end of each term. |
| Shared lab PCs | Account-switch guard; signed-in name shown on every page; sign-out offers to remove local progress. |
| Cheating | Browser-based missions can be faked; leaderboard and dashboard are learning signals; certificates depend on the faculty-run final practical. |

## 11. Decisions (same IDs as PRD §14)

| ID | Decision | Status |
|---|---|---|
| — | Phase 2 direction (Milestones 10–14) | ✅ Approved by the owner, 24 Oct 2026 |
| — | Leaderboard opt-in, off by default | ✅ Owner, 24 Oct 2026 (S-04) |
| — | No automatic deletion after a fixed period | ✅ Owner, 24 Oct 2026 (S-12) |
| — | Revision 4 of this plan as the implementation baseline | ⏳ Owner approval |
| D-5 | Create `gg-test` and `gg-prod` + GitHub OAuth apps | ⏳ When Milestone 10 starts |
| D-9 | Certificate policy on account deletion: `keep` (recommended) or `anonymise` (§5.5) | ⏳ College to confirm; both paths tested meanwhile |
| D-10 | Faculty authorised to access student progress, and their batches | ⏳ College, before production |
| D-11 | Consent wording | ⏳ College, before production |
| D-12 | Consent arrangements for any students under 18 | ⏳ College, before production |
| — | Certificate wording, signatory, printable PDF | ⏳ Before Milestone 14 |

## 12. PRD consistency (checked 24 Oct 2026, revision 4)

| PRD | Plan | Status |
|---|---|---|
| S-01 merge on first sign-in | §5.2: offered, never silent | ✅ PRD wording aligned |
| S-03 profile fields | §4 `profiles` | ✅ PRD lists the same fields |
| S-04 opt-in leaderboard | §4 `leaderboard()`, R4 | ✅ |
| S-05 live quiz | §5.1 L1–L6 | ✅ PRD references the criteria |
| S-06 dashboard | §5.4 faculty access | ✅ |
| S-07 verification URL | `/verify/?id=XXXX-XXXX` | ✅ PRD aligned |
| S-08 – S-12 | §5.1 – §5.6 | ✅ |
| N-05 privacy | §2, §5.4 | ✅ PRD lists the Phase 2 data |
| §11 architecture | §4 (two projects, private Realtime, GitHub-only sign-in) | ✅ PRD aligned |
| Data tables | §4 (replaces `quiz_attempts`, `mission_runs`) | ✅ PRD aligned |
| §14 D-5, D-8 – D-12 | §11 | ✅ same IDs |
| S-09 criteria list (incl. X1–X6) | §5.1 | ✅ |
| S-12 data export contents | §5.4 | ✅ |

## 13. Exclusions

No changes to course content, missions, quizzes, XP values or badge rules. No analytics, ads or third-party
trackers. No paid services in Phase 2. No AI features (Phase 3, PRD §8; its Claude key and budget are D-8).
