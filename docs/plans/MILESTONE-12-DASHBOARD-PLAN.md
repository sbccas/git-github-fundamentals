# Milestone 12 — Faculty dashboard, batches and join codes (`gg-test` first)

| | |
|---|---|
| **Status** | ✅ **Approved by the owner on 27 Oct 2026** ("approve all": M12-D1 – M12-D6 as recommended) with three owner additions recorded in §5: two faculty share one batch (M12-D7), one Supabase project for test and live use (M12-D8), first batch "BCA 2026 – SY AI". Builds on Milestones 10 + 11 as implemented and tested on `gg-test` on 27 Oct 2026. No test in this plan has been run. |
| **Source baseline** | [Phase 2 plan](PHASE-2-SUPABASE-PLAN.md) rev 4 §3 (faculty row), §4 (`faculty_allowlist`, `batches`, `batch_join_codes`, `join_attempts`, `join_batch`, `batch_code`), §5.1 F1–F4, R3–R5, J1–J4, X1–X6, §5.4 faculty access · [PRD](../PRD.md) S-03 (batch), S-06, S-08, S-12 · [Milestone 11 plan](MILESTONE-11-SYNC-PLAN.md) M11-D4 (allowlist moved here) |
| **Owner request (27 Oct 2026)** | A faculty page showing the class list and each student's current progress; build and test locally first, then go live once fully satisfied |

## 1. Objective

Faculty on the allowlist sign in with GitHub and open **`/teach/dashboard/`** (Phase 2 plan §3): their own batches,
each batch's join code, and a table of the students who joined — display name, GitHub username, programme, XP and level,
per-unit progress (lessons read, quiz best / passed, unit complete), missions, badges, self-check best, last synced —
with CSV export. Students join a batch by typing the code the teacher shows in class. Faculty cannot edit progress and
cannot see other batches (S-06, S-08, §5.4).

## 2. Scope

**In:** faculty allowlist and role check (F1–F4); batches created by faculty on the dashboard; join codes (J1–J4);
"Join your batch" on the student account page; the dashboard and CSV; batch name in "Download my data" and removal of
join attempts on account deletion (§5.4); consent wording `draft-2` saying faculty of the student's batch can see their
progress (test project only).

**Out (proposed for later — M12-D1):** the opt-in leaderboard and faculty moderation (S-04, R4); live quiz (M13);
certificates (M14); editing or resetting a student's progress; email addresses anywhere in the dashboard.

## 3. Design

### 3.1 Database (migration 3, `supabase/migrations/…_m12_dashboard.sql`)

| Object | Definition | Access |
|---|---|---|
| `private.faculty_allowlist` | `github_id` (PK, numeric), `note`, `added_at` — edited by the owner in the SQL editor | No API role (F1, X4) |
| `private.current_github_id()`, `private.is_faculty()` | GitHub numeric id from the caller's Auth identity; allowlist checked on every call (F2–F4) | No API role |
| `public.batches` | `id`, `name`, `programme`, `year`, `created_by`, `created_at` | No direct access for API roles; read through the faculty functions (R3, R5) |
| `private.batch_faculty` | `batch_id`, `github_id` — the faculty who can see a batch (M12-D7); the creator is added automatically | No API role; "own batches" (R3, J4) means batches linked to the caller here |
| `private.batch_join_codes` | `batch_id` (PK), `code` (8 characters from a 32-letter alphabet, unique), `enabled` | No API role (J1) |
| `private.join_attempts` | `user_id`, `at`, `success` | No API role; used for J3 |
| `profiles.batch_id` | references `batches` (on delete set null); **not** updatable by students | Set only by `join_batch` |
| `join_batch(code)` | Caller with current consent joins the batch; returns its name only; one message for every failure; at most 10 failed attempts per hour (J2, J3) | Students |
| `faculty_create_batch(name, programme, year)` | Creates a batch owned by the caller with a new code | Faculty only |
| `faculty_batches()` | Caller's batches with code, enabled flag, student count (J4) | Faculty only |
| `faculty_set_code(batch, regenerate, enabled)` | Regenerate or disable a code of an own batch (J3) | Faculty only |
| `faculty_add_colleague(batch, github_username)` | Gives another **allowlisted** faculty member who has signed in once access to an own batch (M12-D7) | Faculty only |
| `faculty_batch_progress(batch)` | One row per student of an **own** batch: the §1 fields from `profiles` and `progress` — nothing else (no email, no Auth data) | Faculty only, read-only |
| `account_status()`, `export_my_data()`, `delete_my_account()` | + `is_faculty` and `batch_name`; batch name in the export; join attempts removed on deletion | As before |

All new functions follow X1–X6. Removing a faculty member from the allowlist ends their dashboard access on the next
request (F4); their batches stay, visible to the other faculty linked to them; a batch with nobody linked is visible
to nobody until the owner links someone (M12-D6).

### 3.2 Front end

- **Student account page:** "Your batch" — enter the code shown in class → "You joined *BCA 2026 – Div A*". Joining
  another code moves the student (the latest code wins).
- **`/teach/dashboard/`** (built only when accounts are enabled, like `/account/`): signed-out or non-faculty visitors
  see "Faculty only — sign in on the account page"; faculty see their batches, a "Create batch" form, the join code
  with **Show on projector** (large text), Regenerate / Disable, and the student table (sort by name, XP or last
  synced; filter by name) with **Download CSV**. The account page shows "Open faculty dashboard" for faculty.
- **CSV:** the same fields; every cell that starts with `=`, `+`, `-` or `@` is prefixed with `'` so spreadsheets never
  run it as a formula.
- **Consent `draft-2`** (test only): adds "Faculty of the batch you join can see your display name, GitHub username,
  programme and progress — not your email". Existing test accounts are asked to re-consent (exercises §4.8.3 in the
  browser).

## 4. Tests (proposed — none run)

**SQL suite (`supabase/tests/`, gg-test):** F1–F4 (allowlist hidden; username look-alike not faculty; no self-promotion;
removal effective at once) · R3 (faculty X sees only own batch; cannot update progress or profiles) · R5 (students
cannot list batches) · J1 (codes unreadable through any table) · J2 (same message for wrong, disabled and other-batch
codes) · J3 (11th failed attempt in an hour refused; regenerate/disable work) · J4 (faculty Y cannot read X's code) ·
X1–X6 for every new function · export includes batch name · deletion removes join attempts.

**`npm test`:** dashboard row summary (units, missions, level from a progress document), CSV escaping including
formula prefixes, `/teach/dashboard/` left out of the production build.

**Manual (GitHub test accounts):** faculty X (a third test account on the allowlist) creates a batch → students A and B
join with the code → their progress appears in the dashboard → CSV opens correctly → faculty X removed from the
allowlist loses access → a non-faculty student opening the dashboard sees nothing.

## 5. Decisions for the owner

| ID | Question | Technical recommendation |
|---|---|---|
| M12-D1 | Build the dashboard, batches and join codes now; leaderboard and moderation (S-04, R4) later? | Yes — the leaderboard is opt-in and not needed for the class to start |
| M12-D2 | Who creates batches? (a) faculty on the dashboard · (b) the owner in Supabase | (a) |
| M12-D3 | Faculty allowlist entries are added by the owner in the SQL editor (GitHub numeric ids). Test: a third test account "faculty X". Production: the list the college approves (D-10) | Approve |
| M12-D4 | Dashboard and CSV fields as in §1 (no email, no Auth data) | Approve |
| M12-D5 | Consent `draft-2` (test project) with the faculty-access sentence; test users re-consent | Approve |
| M12-D6 | When a faculty member is removed or deletes their account, their batches stay and are visible to nobody until the owner reassigns them | Approve |

All six approved by the owner on 27 Oct 2026. Owner additions the same day:

| ID | Owner decision (27 Oct 2026) | Consequences recorded |
|---|---|---|
| M12-D7 | Two faculty accounts — the course instructor (account 1) and the SYBCA AI coordinator (account 2) — see the same dashboard | Batches can have several faculty (`private.batch_faculty`); "own batches" in R3/J4/S-06 means batches the caller is linked to. Both GitHub ids go on the allowlist |
| M12-D8 | **One Supabase project** (`git-github-fundamentals-test`) for testing and for live use; no second project | Changes PRD S-11 and Phase 2 plan §5.3 (separate test and production projects) — PRD update at the next documentation commit. Before go-live: remove all test accounts and test data; switch `private.environment` to `production`; retire the draft consent versions and add the approved `v1`; set the Site URL and redirect to the live account page and decide whether the local address stays (§6); export the data before every later migration. After go-live: **never run the test suite or the test seed on this project**; later changes are tested by reading the SQL, by the local PGlite pre-check and by careful manual checks |
| — | First batch name: **"BCA 2026 – SY AI"** (programme BCA – AI) | Created by faculty on the dashboard during testing |

## 6. Going live (separate from this plan — production gate G-4, unchanged)

Nothing reaches students until all of these are done and the owner approves the release:

1. **College sign-off:** consent wording (D-11), faculty allowed to see progress (D-10), under-18 arrangements (D-12);
   D-9 (certificate records) can be recorded as "not applicable until Milestone 14" if the college agrees.
2. **Owner policies:** P-3 (abandoned sign-ins), P-8 (consent evidence), P-6 completion time for deletions.
3. **The same Supabase project, switched to live use (M12-D8):** test accounts and their data removed (owner, with a
   listed SQL clean-up); `private.environment` = `production`; draft consent versions retired and the approved `v1`
   added; Site URL and redirect `https://sbccas.github.io/git-github-fundamentals/account/` (the local address removed
   or kept by owner decision); email and anonymous sign-in stay off; the real faculty GitHub ids on the allowlist.
4. **Release:** a separately approved change that allows accounts in the production build with the `gg-prod` URL and
   key, then `npm test`, `npm run check:dist` (adapted), push to `main`.

**No progress is lost meanwhile:** students who use the site as guests now keep their progress on their device; on
their first sign-in after go-live the site offers "Add this device's progress to your account" (tested on 27 Oct 2026).
