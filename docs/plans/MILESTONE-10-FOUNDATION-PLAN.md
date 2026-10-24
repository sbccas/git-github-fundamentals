# Milestone 10 — Phase 2 Foundation: implementation plan

| | |
|---|---|
| **Status** | 📝 **Draft — awaiting owner review.** Planning only: no application code, migrations, SQL, Supabase projects, OAuth apps or secrets have been created. **Implementation has not started.** Decisions K-1, P-1 – P-5, Q-1 and Q-2 are **unresolved** — see the decision register (§9.5); nothing in this plan assumes their outcome. |
| **Source baseline** | [Phase 2 plan](PHASE-2-SUPABASE-PLAN.md) revision 4 · [PRD](../PRD.md) v1.15 · [PROGRESS](../PROGRESS.md) — all as committed at `df45fce` (checked identical to `origin/main` on 24 Oct 2026) |
| **Baseline approval** | The owner's instruction of 24 Oct 2026 calls revision 4 "the currently approved documentation baseline". The committed plan, PRD and PROGRESS still say revision 4 is **awaiting** approval — see conflict K-1 (§9.1) and its options (§9.5). |
| **PRD** | §7 S-01 (sign-in only), S-03, S-08, S-09, S-11, S-12 · §12b Milestone 10 · §14 D-5, D-9 – D-12 · N-05 |

## 1. Title and objective (from the source documents)

- **PRD §12b, Milestone 10:** "Foundation: test + production projects, schema and RLS, security suite, sign-in,
  consent, profile, download/delete" — requirements S-01, S-03, S-08, S-09, S-11, S-12; "Not started — needs its own
  approved plan and D-5".
- **Phase 2 plan §7, Milestone 10:** "**Foundation:** `gg-test`/`gg-prod`, schema + RLS, security suite, sign-in,
  consent screen, profile, download/delete" — S-01 (sign-in), S-03, S-08, S-09, S-11, S-12 — needs D-5 setup (§9),
  D-10 faculty list, D-11 consent wording, D-12.

**Objective.** Lay the secure foundation that every later Phase 2 milestone builds on: the two Supabase projects, the
first schema with row-level security, the security test suite, optional sign-in with GitHub, the consent screen, the
student profile, and "Download my data" / "Delete my account" — all verified on `gg-test`, with the Phase 1 site
unchanged for everyone who does not sign in.

## 2. Scope

### 2.1 In scope

| # | Item | Source |
|---|---|---|
| 1 | Two Supabase projects (`gg-test`, `gg-prod`) and two organisation-owned GitHub OAuth apps, created **by the owner** | D-5, plan §9 |
| 2 | Migration 1 (schema as code in `supabase/migrations/`): `profiles`, `faculty_allowlist`, private helper schema, RLS, grants, privileged functions for this milestone | S-03, S-08, S-09, plan §4 |
| 3 | Sign in / sign out with GitHub (PKCE), optional, lazily loaded client | S-01 (sign-in only), plan §2, §4 |
| 4 | Consent screen with a **draft** wording (version `draft-1`, test only) | S-12, plan §5.4, D-11 |
| 5 | Profile: display name and programme (and the stored GitHub identity) | S-03 (subset, see §9.1 K-2) |
| 6 | "Download my data" (everything stored online at this milestone) and "Delete my account" | S-12, plan §5.4 |
| 7 | Security suite for the criteria that apply at this milestone (§6.2) | S-09, S-11, plan §6 |
| 8 | `npm test` additions: secret scan (K1), signed-out / Supabase-unreachable path, account state logic | plan §6, §8 |
| 9 | A production switch so that sign-in stays **off on the live site** until the §5.6 sign-off | S-12, plan §5.6 (see §3 G-4) |

### 2.2 Out of scope (later milestones or other phases)

- Progress sync, `progress` table, `save_progress`, merge prompt, sync status (Milestone 11; S-02, S-10; P1–P3).
- Batches, join codes, `join_batch`, `batch_code`, teacher dashboard, CSV, leaderboard (Milestone 12; S-04, S-06;
  R4, R5, J1–J4). The profile's batch is therefore not collected in Milestone 10 (§9.1 K-2).
- Live quiz, Realtime (Milestone 13; S-05; L1–L6). Certificates, `verify_certificate`, `app_settings`, D-9 policy
  switch (Milestone 14; S-07; C1–C4).
- Any real student data, any production enablement before the college sign-off (D-9 – D-12).
- Phase 3 / AI (D-8). Changes to course content, XP, badges or Phase 1 behaviour.

## 3. Prerequisites and gates

| Gate | What | Needed before | Owner of the step |
|---|---|---|---|
| G-0 | Revision 4 recorded as the approved baseline in the committed documents (K-1) | Starting implementation | Owner (decision) · Claude (documentation update, when authorised) |
| G-1 | **This plan approved** | Any implementation | Owner |
| G-2 | **D-5, test part:** `gg-test` created; its GitHub OAuth app connected; URL + anon key sent (no secrets) | Steps 3–9 (§5) | Owner |
| G-3 | **D-5, production part:** `gg-prod` created and its OAuth app connected; email and anonymous sign-in disabled (K3) | Step 10 (§5) | Owner |
| G-4 | **College sign-off (plan §5.6):** D-11 consent wording, D-12 under-18 arrangements, D-10 authorised faculty, D-9 certificate policy | Applying migrations to `gg-prod` with real faculty, and switching sign-in **on** for the live site | College / owner |
| G-5 | Security suite results for this milestone all pass on `gg-test` (§7) and are reviewed | Step 10 and release | Owner reviews evidence |

**Blocking now:** G-0 and G-1 (documentation/approval) and G-2 (D-5). Nothing in §5 can start before G-1 and G-2.

## 4. Design for this milestone

### 4.1 Student flow

1. A signed-out student sees **"Sign in"** in the header (all pages) and on the Git Passport. Nothing else changes.
2. Choosing it opens the **consent screen first** (before any redirect to GitHub): what is stored, who sees it, where,
   for how long, how to delete it (plan §5.4). "I agree — continue with GitHub" or "Not now".
3. GitHub sign-in (PKCE) → back to the page they started from.
4. A short profile form: display name (prefilled from GitHub, editable), programme (BCA · BCA – AI · B.Sc. Data
   Science · M.Sc. IT). Saving calls `accept_consent(...)`, which creates the profile with the consent version and date.
5. Signed in, the header shows the display name; an **account page** offers: edit profile, Download my data, Delete my
   account, Sign out. (Location of that page: proposal P-1, §9.5.)
6. Declining consent, or closing the form, signs the student out again; Phase 1 continues unchanged.

### 4.2 Environments and the production switch

- `src/scripts/data/supabase.js` (plan §4) holds the project URL and anon key per build: development and test builds
  use `gg-test`; the production build uses `gg-prod` **only after G-4**.
- Until G-4, the production build has accounts **switched off** (no sign-in button, Supabase client never loaded), so
  the live site cannot collect real student data. Proposal P-2 (§9.5): a build-time flag, read by the header and passport.

### 4.3 Data model at this milestone (a subset of plan §4; later columns and tables arrive in their own migrations)

| Object | Columns / behaviour | Access (RLS, default deny) |
|---|---|---|
| `public.profiles` | `id` (= auth user id, PK, references `auth.users` on delete cascade), `github_id` (numeric), `github_username`, `display_name` (1–60 chars), `programme` (one of four values), `leaderboard_opt_in` (default false), `leaderboard_hidden` (default false), `consent_version`, `consent_at`, `created_at`, `updated_at` | RLS enabled. **Select:** own row. **Update:** own row, and only `display_name`, `programme` (column-level `GRANT UPDATE`); `leaderboard_opt_in` is granted in Milestone 12. **No insert / delete policy** (created by `accept_consent`, removed by `delete_my_account`). `anon`: nothing |
| `public.faculty_allowlist` | `github_id` (numeric, PK), `note`, `added_at` | RLS enabled, **no policies**, all privileges revoked from `anon` and `authenticated` (F1); edited by the owner in the dashboard |
| `private` schema | not exposed by the API (X4) | — |
| `private.current_github_id()` | GitHub numeric id of the caller, read from Supabase Auth's identity record (never from the browser) | Internal (X3: no API role) |
| `private.is_faculty()` | `true` if the caller's GitHub id is in the allowlist; evaluated on every call (F3, F4) | Internal |
| `public.accept_consent(consent_version, display_name, programme)` | Creates (or re-consents) the caller's profile; stores `github_id`/`github_username` from the auth identity; validates inputs | `authenticated` only |
| `public.export_my_data()` | Returns the caller's profile and consent record as JSON; lists what is not included (§4.5) | `authenticated` only |
| `public.delete_my_account()` | Deletes the caller's profile and auth user | `authenticated` only |

All three public functions and both helpers are `SECURITY DEFINER` (they read the allowlist or the auth identity, or
delete the auth user) and follow **X1–X6**: a comment stating why definer rights are needed (X1); `search_path = ''`
and schema-qualified names, no dynamic SQL (X2); `EXECUTE` revoked from `PUBLIC` and granted only as listed (X3);
helpers in `private` (X4); the caller is identified only by `auth.uid()` and the auth identity (X5); covered by the
metadata, grant and call tests in §6.2 (X6). No profile-creating sign-up trigger is used (§9.1 K-3; P-5 in §9.5).

Faculty at this milestone: the role exists (allowlist + `is_faculty()`), but there are no batches yet, so faculty can
read **no** student profiles; R3 ("own batches only") is fully exercised in Milestone 12.

### 4.4 Authentication and privacy

- GitHub is the only provider in `gg-prod` (K3); redirect URLs exact (K2); only the anon key in the site (K1).
- Stored online at this milestone: GitHub numeric id and username, display name, programme, consent version and date
  (in `profiles`), plus what Supabase Auth itself keeps for sign-in (including the email address GitHub provides and
  sign-in logs). The consent draft must mention the Auth record (§9.1 K-4).
- Retention as decided by the owner: no automatic deletion; data stays until the student deletes their account
  (S-12). Faculty cannot see student profiles at this milestone.

### 4.5 "Download my data" at this milestone

One JSON file with: profile fields, `github_id`, `github_username`, consent version and date. The download screen states
what is **not** included: other students' data; Supabase Auth's sign-in records (available from the college on
request); and that progress, batch, live-quiz answers and certificates are not stored online yet (they are added to the
export in Milestones 11–14 as those features arrive). Signed out, the existing local progress export is unchanged.

### 4.6 Error handling

| Case | Behaviour |
|---|---|
| Supabase unreachable / project paused | Sign-in button shows "Sign-in is unavailable right now"; Phase 1 unaffected |
| OAuth cancelled or returns an error | Back on the starting page, signed out, with a short message; nothing stored |
| Consent declined or profile form abandoned | Signed out; no profile row (a Supabase Auth user may exist — see §9.1 K-4 and the cleanup in §4.7) |
| Invalid profile input | Inline message; server re-validates in `accept_consent` |
| Session expired | Treated as signed out; Phase 1 continues; "Sign in again" shown |
| Export or delete fails | Error message, retry; delete is all-or-nothing (one transaction); local progress untouched in every case |
| Supabase client fails to load (offline, old cache) | Signed-out behaviour; no error loop |

### 4.7 Rollback and recovery

- **Live site:** accounts stay switched off in production until G-4; if anything goes wrong after enabling, the
  switch is turned off and the site redeployed — Phase 1 behaviour returns immediately.
- **`gg-test`:** may be reset at any time (it never holds real data): re-apply the migrations from scratch.
- **`gg-prod`:** migrations are append-only; a fix is a new migration. Before each production migration the owner
  exports the data (plan §5.3). At this milestone production holds no student data until G-4.
- **Abandoned sign-ins:** Supabase Auth users without a profile (consent not completed) are listed by a documented
  owner query on `gg-test`/`gg-prod` and can be removed by the owner; whether to automate this is proposal P-3 (§9.5).

## 5. Ordered implementation steps (after G-1)

| # | Step | Gate | Output |
|---|---|---|---|
| 1 | Record baseline approval (K-1) and this plan's approval in PRD/PROGRESS | G-0, G-1 | Docs commit |
| 2 | Owner sets up `gg-test` and its OAuth app (plan §9 steps 1–6, test part), sends URL + anon key only | G-2 | Values in `src/scripts/data/supabase.js` (test build) |
| 3 | Write migration 1 (`supabase/migrations/…_m10_foundation.sql`) per §4.3 | G-2 | SQL file, reviewed in the repo |
| 4 | Write the security suite for this milestone (`supabase/tests/m10_*.sql`) and the API-level test script (§6.2) | — | Test files |
| 5 | Owner applies migration 1 to `gg-test` (SQL editor or CLI with their own credentials); owner runs the suite | G-2 | Evidence (§6.4) |
| 6 | Front end: lazy Supabase client, sign-in/out, consent screen, profile form, account page, export, delete, production switch | — | Code + `npm test` additions |
| 7 | `npm test`, `npm run build`, 360 px and offline checks; signed-out path with Supabase blocked | — | Results |
| 8 | Manual tests on `gg-test` with test accounts (§6.3) | — | Checklist |
| 9 | Owner review of evidence; fixes as new migrations/commits | G-5 | Review note |
| 10 | Owner sets up `gg-prod` (G-3); migration 1 applied there **without real faculty or student data**; accounts stay off on the live site | G-3, G-5 | Production schema ready, dormant |
| 11 | After the college sign-off (G-4): owner adds authorised faculty ids, consent text updated to the approved wording (`v1`), switch turned on in a separate, approved release | G-4 | — (not part of this milestone's coding) |

## 6. Tests (proposed — **none have been run**)

### 6.1 Node (`npm test`, no network)

- Secret scan (K1): fails if a service-role key, JWT secret or database URL pattern appears in the repository or the build.
- Signed-out path: with accounts switched off, and with accounts on but Supabase unreachable, every existing Phase 1
  check still passes (115 checks today) and no page imports the Supabase client.
- Account state logic (pure functions): signed-out → consent → signed-in → profile; declined consent; expired session;
  error mapping for OAuth errors.
- Profile input validation mirrors the server rules (display name length, programme values).

### 6.2 Security suite (`gg-test` only) — criteria that apply at this milestone

| Criterion | Test (expected result) |
|---|---|
| F1 | `faculty_allowlist` cannot be read, inserted, updated or deleted as `anon` or `authenticated` (denied) |
| F2 | A user whose GitHub **username** matches an allowlisted user but whose numeric id differs is not faculty |
| F3 | A student cannot set any role-like value: no role column is updatable; `is_faculty()` reflects only the allowlist |
| F4 | Removing an id from the allowlist makes the next `is_faculty()` call return false |
| R1 | RLS is enabled on every table in `public`; signed-out requests read and write nothing |
| R2 | Student A cannot read, insert, update or delete student B's profile, including by guessing B's id |
| R3 (partial) | A faculty user reads no student profiles at this milestone (no batches) and can update nothing but their own profile |
| X1–X6 | For `accept_consent`, `export_my_data`, `delete_my_account`, `private.current_github_id`, `private.is_faculty`: security definer and `search_path = ''` (from `pg_proc`); grants via `has_function_privilege` (`anon`: none; `authenticated`: the three public functions only; helpers: no API role); `private` schema not exposed; calls as signed-out (denied), student A, student B, faculty and removed faculty with the expected results; no function accepts a user id from the caller |
| K2 | Redirects to a non-allowed URL are refused (gg-test: production + local dev only) |
| K3 | In `gg-prod` (after G-3): email and anonymous sign-up refused |
| S-12 | `accept_consent` stores version and date; `export_my_data` returns only the caller's data; `delete_my_account` removes the profile and auth user and leaves other users untouched |

**Test identities** (no real student data): student A, student B, faculty X, removed faculty Z, signed-out. How these
accounts are created on `gg-test` is open question Q-1 (§9.5).

### 6.3 Manual tests (`gg-test`, test accounts)

Sign in on Android, iPhone and a lab PC; decline consent; complete consent and profile; edit profile; download data and
check its contents against §4.5; delete account and confirm sign-in creates a fresh consent flow; sign out on a shared
PC; Supabase blocked (airplane mode) — Phase 1 works; 360 px layout and 44 px targets for the new controls.

### 6.4 Evidence (for G-5)

For each criterion in §6.2: the test name, the account used, expected and actual result, date, and the migration
version tested — saved as a Markdown report in the repository (location: proposal P-4, §9.5). Screens or exports must
not contain secrets or real student data.

## 7. Acceptance criteria (measurable)

1. Every test in §6.2 passes on `gg-test`, with evidence reviewed by the owner (G-5).
2. `npm test` passes, including the new checks; `npm run build` passes.
3. With accounts switched off, the production build contains no Supabase client code and no sign-in UI, and its pages
   behave exactly as before (same Phase 1 checks).
4. Signed out, no network requests to Supabase are made (checked in the browser's network log).
5. Consent is shown before any redirect to GitHub; no `profiles` row exists for a user who has not accepted.
6. "Download my data" returns exactly the §4.5 fields for the caller and nothing about anyone else.
7. "Delete my account" removes the caller's profile and auth user in one transaction; a repeat sign-in starts at consent.
8. The new UI works at 360 px with 44 px touch targets, and offline behaviour is unchanged.
9. No secret appears in the repository, the build, or any chat or evidence file.

## 8. Requirement traceability

| Requirement | Where in this plan | Verified by |
|---|---|---|
| S-01 (sign-in only) | §4.1, §4.2, §4.4 | §6.2 K2–K3, §6.3, §7.4 |
| S-03 (profile subset) | §4.3 | §6.2 R2, S-12 rows; §6.3 |
| S-08 | §4.3 | §6.2 R1, R2 |
| S-09 (F1–F4, R1–R3, X1–X6, K1–K3) | §4.3, §4.4 | §6.1, §6.2 |
| S-11 | §3, §5 steps 5, 9, 10 | §6.4 evidence, G-5 |
| S-12 (consent, export, delete, retention) | §4.1, §4.4, §4.5 | §6.2 S-12 row, §7.5 – §7.7 |
| N-05 | §4.4 | §6.3, consent draft |
| Plan §5.6 (production sign-off) | §3 G-4, §4.2, §5 step 11 | §7.3 |
| Plan §8 (signed-out/offline guarantee) | §4.2, §4.6 | §6.1, §7.3, §7.4 |

Not applicable at this milestone (and why): R4, R5, J1–J4 (Milestone 12) · P1–P3 (Milestone 11) · L1–L6 (Milestone 13)
· C1–C4 and D-9 policy paths (Milestone 14; `app_settings` is created then).

## 9. Cross-check with the PRD and the Phase 2 plan

### 9.1 Conflicts and gaps (recorded, not resolved)

| ID | Finding | Source | Proposed handling — owner to decide |
|---|---|---|---|
| K-1 | The owner's instruction calls revision 4 "approved"; the committed plan (§11), PRD (§7 note, status) and PROGRESS (§3.9) still say "awaiting approval". | Plan §11, PRD §7, PROGRESS §3.9 | Owner decision — options in §9.5 (G-0) |
| K-2 | Plan §3 says the first sign-in asks for "name, programme and batch join code", but join codes are Milestone 12 and S-03 lists batch as part of the profile. | Plan §3 vs §7; PRD S-03 vs §12b | Milestone 10 collects display name and programme only; batch is added with `join_batch` in Milestone 12 |
| K-3 | Plan §5.1 lists "the sign-up trigger" among privileged functions, while §5.4 requires consent **before the first online save**. A trigger that creates a profile at sign-in would store data before consent. | Plan §5.1 vs §5.4 | No profile-creating trigger; the profile is created by `accept_consent` after consent. Any trigger used later still follows X1–X6 |
| K-4 | Supabase Auth creates its own user record (including the email address supplied by GitHub, and sign-in logs) when the GitHub sign-in completes — before our consent can be recorded in `profiles`. The plan's list of stored data does not mention the email address. | Plan §5.4, PRD N-05 | Show consent **before** the GitHub redirect (§4.1); mention the Auth record and email in the consent draft; owner cleanup of abandoned sign-ins (§4.7, P-3). Consent wording itself remains D-11 |
| K-5 | PRD §12b and plan §7 list D-10, D-11, D-12 as needs for Milestone 10; plan §5.6 makes them production gates. | PRD §12b, plan §7 vs §5.6 | Build and test on `gg-test` with a draft consent and test faculty; D-10 – D-12 (and D-9) gate production enablement (G-4) only |
| K-6 | Plan §4 lists `leaderboard_opt_in` among the columns a student may update; the leaderboard is Milestone 12. | Plan §4 vs §7 | Column created now (default false); update permission granted in Milestone 12 |
| K-7 | "Download my data" and "Delete my account" are defined for all Phase 2 data, most of which does not exist yet. | Plan §5.4 | Milestone 10 covers profile, consent and the auth user; each later milestone extends export and delete for its own data (stated in each milestone plan) |

### 9.2 Proposals needing approval (not in the source documents; options and recommendations in §9.5)

| ID | Proposal | Why |
|---|---|---|
| P-1 | An account page at `/account/` (profile, download, delete, sign out), linked from the header when signed in | The plan names the features but not where they live |
| P-2 | A build-time switch that keeps accounts off in production until G-4 | Enforces plan §5.6 on the live site |
| P-3 | Whether to automate removal of Auth users who never completed consent (manual owner query by default) | K-4 |
| P-4 | Evidence reports in `docs/evidence/m10/` | §6.4 needs a reviewable location |
| P-5 | New function names: `public.accept_consent(...)` (creates the profile after consent, replacing the sign-up trigger — K-3), and `private.current_github_id()` / `private.is_faculty()` (the "faculty-role check" named in plan §5.1) | The Phase 2 plan names the checks but not these functions |

### 9.3 Open questions (options and recommendations in §9.5)

- **Q-1 — test identities.** `gg-prod` allows GitHub sign-in only (K3) and the allowlist uses GitHub numeric ids (F2).
  Tests need several student and faculty identities on `gg-test`. Options: (a) a few dedicated GitHub test accounts
  created by the owner; (b) email-password test users enabled **only on `gg-test`**, with the test allowlist keyed on
  the auth identity of those users (the F2 test then still needs one GitHub test account). Owner to choose.
- **Q-2 — running the SQL suite.** The SQL tests need a database connection to `gg-test`, which uses the database
  password (a secret). Proposal: the owner runs them on their own machine (Supabase CLI or SQL editor), with the
  password kept in their own environment; Claude prepares the scripts and reads only the results. Exact CLI options to
  be confirmed during implementation (assumption A-2).

### 9.4 Assumptions

- A-1: Supabase's free plan allows two projects and the features used here (Auth with GitHub, Postgres RLS, column
  privileges, `SECURITY DEFINER` functions able to delete the caller's auth user). To be confirmed on `gg-test` in step 5.
- A-2: The Supabase CLI or SQL editor can run the SQL test scripts against `gg-test` (pgTAP-style or plain assertions).
- A-3: The GitHub identity record available to database functions contains the numeric GitHub user id.
- A-4: Adding `@supabase/supabase-js` as a lazily loaded dependency keeps signed-out pages at today's size (verified in step 7).

### 9.5 Decision register (unresolved — awaiting the owner)

Each entry separates the **owner decision** (scope, policy, people, accounts) from Claude's **technical
recommendation** (how to build or test it safely). A recommendation is not a decision; implementation waits for the
owner's explicit choice on every entry marked ⏳.

**K-1 — Record revision 4 as the approved baseline** · ⏳ Owner decision

| | |
|---|---|
| Question | Should the committed documents record that revision 4 of the Phase 2 plan is approved? |
| Evidence | The owner's Milestone 10 instruction (24 Oct 2026) calls revision 4 "the currently approved documentation baseline"; the committed plan §11 ("⏳ Owner approval"), PRD §7 note and status line, and PROGRESS §3.9 say "awaiting approval" (`df45fce`). |
| Options | (a) Approve revision 4 as is and record it in a documentation commit · (b) approve with changes (new revision first) · (c) keep it unapproved for now |
| Dependencies | Gate G-0; must be settled before G-1 (approval of this plan) is meaningful |
| Risks | (a) none beyond normal; (b) delays Milestone 10 until the revision; (c) implementation cannot start, and the documents and the instruction stay inconsistent |
| Technical recommendation | (a), recorded in a documentation-only commit that changes the status lines in the plan, PRD and PROGRESS and nothing else |

**P-1 — Location of account features** · ⏳ Owner decision (scope/UI), with a technical recommendation

| | |
|---|---|
| Question | Where do "edit profile", "Download my data", "Delete my account" and "Sign out" live? |
| Evidence | Plan §3 lists the features but no page; the About page already has the local progress export/import (`src/about/index.html` §"Your progress"); the Git Passport is the student's dashboard (`/passport/`). |
| Options | (a) new page `/account/`, linked from the header when signed in · (b) a section on the About page · (c) a section on the Git Passport page |
| Dependencies | P-2 (the page must be hidden while accounts are off); adds one page to the precached site (new page entry in `PAGES` and the header) |
| Risks | (a) one more page to maintain; (b) mixes college information with personal data actions; (c) crowds the passport and makes it depend on Supabase |
| Technical recommendation | (a): keeps account actions in one place, easy to switch off, and keeps About and Passport working signed out |

**P-2 — Production switch** · ⏳ Owner decision (release policy), with a technical recommendation

| | |
|---|---|
| Question | How is sign-in kept off on the live site until the college sign-off (plan §5.6)? |
| Evidence | Plan §5.6: "Until then, Phase 2 runs only on `gg-test` with test accounts"; every push to `main` deploys the live site (`.github/workflows/deploy.yml`). |
| Options | (a) build-time switch (off in production builds until G-4; on in development/test builds) · (b) keep all Phase 2 code on a separate branch until G-4 · (c) runtime switch read from Supabase |
| Dependencies | G-4 (college sign-off) to turn it on; §7.3 acceptance check |
| Risks | (a) a mistaken switch change could enable sign-in early — mitigated by the §7.3 build check; (b) long-lived branch drifts from `main`, harder to review; (c) the live site would contact Supabase even while switched off, and a database change could enable sign-in without a site release |
| Technical recommendation | (a), with `npm test` failing if a production build contains the Supabase client while the switch is off |

**P-3 — Abandoned sign-ins (Auth users without consent)** · ⏳ Owner decision (data policy)

| | |
|---|---|
| Question | What happens to Supabase Auth users who completed GitHub sign-in but never accepted consent? |
| Evidence | K-4: Supabase Auth creates its user record (including the email address from GitHub) when the GitHub sign-in completes; our `profiles` row is created only by `accept_consent`. |
| Options | (a) manual: the owner periodically runs a documented query and deletes them · (b) automatic: a scheduled database job deletes them after a set time (e.g. 24 hours) · (c) keep them |
| Dependencies | D-11 (consent wording should describe this); D-12; for (b), whether scheduled jobs are available and approved on the free plan (assumption, to verify on `gg-test`) |
| Risks | (a) depends on the owner remembering; (b) one more privileged job to secure and test under X1–X6; (c) keeps personal data without consent — conflicts with S-12 |
| Technical recommendation | (a) for Milestone 10 (no real students until G-4, so volume is nil), with (b) reconsidered before production; (c) not recommended |

**P-4 — Where test evidence is kept** · ⏳ Owner decision (repository convention)

| | |
|---|---|
| Question | Where are the security-suite results and manual-test records stored for review (G-5)? |
| Evidence | Plan §5.3 and §6 require results before production; ChatGPT reviews through the repository; the repository convention has `docs/plans/`, `docs/PRD.md`, `docs/PROGRESS.md` and `docs/decisions/` (handoff convention). |
| Options | (a) `docs/evidence/m10/` Markdown reports · (b) a section in `docs/PROGRESS.md` · (c) outside the repository (e.g. a private drive) |
| Dependencies | The evidence rule in §6.4 (no secrets, no real student data) |
| Risks | (a) the repository is public — reports must be scrubbed of project references that are not public; (b) makes PROGRESS long; (c) not visible to the reviewer, weaker audit trail |
| Technical recommendation | (a), containing only test names, test-account labels, expected/actual results, dates and migration versions |

**P-5 — New function names** · ⏳ Owner approval of a technical design

| | |
|---|---|
| Question | Approve `public.accept_consent(consent_version, display_name, programme)`, `private.current_github_id()` and `private.is_faculty()`? |
| Evidence | Plan §5.1 names "the faculty-role check" and "the sign-up trigger" among privileged functions but gives no names; K-3 shows a profile-creating trigger would store data before consent. |
| Options | (a) approve these three functions · (b) keep a sign-up trigger (requires changing the consent rule in plan §5.4) · (c) other names or split responsibilities |
| Dependencies | K-3, K-4; X1–X6 apply to all three |
| Risks | (a) `accept_consent` is a new privileged entry point — covered by the X6 tests; (b) stores identity data before consent; (c) none specific |
| Technical recommendation | (a) |

**Q-1 — Test identities on `gg-test`** · ⏳ Owner decision (accounts), with a technical recommendation

| | |
|---|---|
| Question | Which accounts are used to test students, faculty and removed faculty on `gg-test`? |
| Evidence | K3: GitHub is the only provider in production; F2: the allowlist uses GitHub numeric ids; the suite needs at least student A, student B, faculty X, removed faculty Z and a signed-out user (§6.2). |
| Options | (a) dedicated GitHub test accounts created and owned by the owner (at least four) · (b) email-and-password test users enabled **only on `gg-test`**, plus at least one GitHub test account for the F2 and GitHub sign-in tests · (c) the owner's and colleagues' real GitHub accounts |
| Dependencies | D-5 test part (G-2); for (b), `gg-test` settings differ from `gg-prod` (K3 applies to production only); for (a) and (c), GitHub's terms on multiple accounts are the owner's responsibility |
| Risks | (a) account management effort; (b) the test allowlist path for email users differs slightly from production and must be documented; (c) mixes personal accounts into test data — not recommended |
| Technical recommendation | (b): repeatable automated tests, with the GitHub-specific checks (F2, real sign-in) done with one or two GitHub test accounts |

**Q-2 — Who runs the SQL security suite** · ⏳ Owner decision (credentials), with a technical recommendation

| | |
|---|---|
| Question | Who runs the SQL tests that need a database connection to `gg-test`? |
| Evidence | The connection uses the `gg-test` database password, a secret; plan §9: secrets are never shared in chat, email or the repository. |
| Options | (a) the owner runs the scripts on their own machine (Supabase CLI or SQL editor), password kept in their own environment, and shares only the results · (b) the owner pastes each script into the `gg-test` SQL editor and shares the output · (c) store the password in a CI secret and run the suite in GitHub Actions against `gg-test` |
| Dependencies | G-2; assumption A-2 (exact CLI options to be confirmed); for (c), a new CI job (not in the approved baseline) |
| Risks | (a) manual step each run; (b) slower, more copy-and-paste; (c) a database credential stored in the public repository's CI settings and a workflow that can reach the database — larger attack surface and outside the approved scope |
| Technical recommendation | (a), falling back to (b); (c) not recommended without a separate approved plan |

### 9.6 Risks

| Risk | Mitigation |
|---|---|
| Data collected before consent (K-4) | Consent before redirect; consent text covers the Auth record; cleanup procedure |
| Misconfigured grants expose a table | Default deny; explicit revokes; X6 grant tests; R1 test on every table |
| Secrets leak into the repo or chat | K1 scan; owner enters secrets only in GitHub/Supabase; evidence rule §6.4 |
| Live site accidentally enables accounts | Production switch (P-2) and §7.3 build check |
| Free project paused during testing | Owner restores; `gg-test` holds no real data |
| Lab PCs left signed in | Visible signed-in name, sign-out on the account page; full account-switch guard arrives in Milestone 11 |

## 10. Completion checklist (Milestone 10)

- [ ] G-0 baseline approval recorded · [ ] G-1 this plan approved
- [ ] G-2 `gg-test` ready (URL + anon key only shared) · [ ] Q-1 and Q-2 answered
- [ ] Migration 1 written, reviewed, applied to `gg-test`
- [ ] Security suite for F1–F4, R1–R3, X1–X6, K2, S-12 rows — all pass; evidence saved (§6.4)
- [ ] Front end: sign-in/out, consent, profile, account page, export, delete, production switch
- [ ] `npm test` and `npm run build` pass; signed-out and offline checks pass; 360 px checks pass
- [ ] Manual tests (§6.3) done on `gg-test`
- [ ] G-3 `gg-prod` ready; migration 1 applied with no real data; accounts still off on the live site
- [ ] PRD §12b and PROGRESS updated; Milestone 10 marked delivered **(not "in production")**
- [ ] **Owner review gate:** the owner reviews the evidence and approves the milestone as complete. Turning accounts on
  for real students is a separate, later decision after G-4.

## 11. Out of scope (summary)

Sync, batches, dashboard, leaderboard, live quiz, certificates, AI, production enablement for real students, course
content changes, and any change to Phase 1 behaviour for signed-out users.
