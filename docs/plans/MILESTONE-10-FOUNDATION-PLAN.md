# Milestone 10 — Phase 2 Foundation: implementation plan

| | |
|---|---|
| **Status** | ✅ **Revision 3 — approved by the owner on 26 Oct 2026** with the decisions recorded in §9.5 (all technical recommendations, Q-1 (a)). To be built together with Milestone 11 on `gg-test` only ([Milestone 11 plan](MILESTONE-11-SYNC-PLAN.md) §2). `gg-test` was set up by the owner on 26 Oct 2026 (§3, G-2); no application code, migration or SQL exists yet. **No test in this plan has been run.** P-3 and P-8 are open for production only; the P-6 completion time is open. The account-deletion design is **not verified** (§4.9). *Pending* markers below refer to the decision now recorded in §9.5. |
| **History** | Rev 1 `04fb95d` · Rev 2 (uncommitted): consent lifecycle, deletion options, P-6, K-8 – K-10 · Rev 3 (this draft): corrections H1–H5 and M1–M9 from the review of rev 2 — abandoned-session flow, conditional Edge Function controls E1–E7, consent-version allowlist and re-consent, "If unresolved" for every decision, pending markers, deletion layers and status check, residual data, K-8 wording, all deletion options in acceptance, failure injection and negative tests, `gg-test` cleanup scope, consent-evidence decision · Rev 3 corrections (uncommitted): F1 helper functions marked *pending P-5*; F2 test-only database changes confined to `supabase/tests/` and never applied to `gg-prod` (§4.7, LC3, V3) |
| **Source baseline** | [Phase 2 plan](PHASE-2-SUPABASE-PLAN.md) revision 4 · [PRD](../PRD.md) v1.15 · [PROGRESS](../PROGRESS.md) — committed at `df45fce`, unchanged at `04fb95d` (checked against `origin/main` before this revision) |
| **Baseline approval** | K-1 decided (a) by the owner on 26 Oct 2026: revision 4 is the approved baseline, recorded in the Phase 2 plan, PRD v1.16 and PROGRESS. |
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
| 2 | Migration 1 (schema as code in `supabase/migrations/`): `profiles`, consent-version allowlist, private helper schema (`faculty_allowlist` moved to Milestone 12 — M11-D4), RLS, grants, privileged functions for this milestone | S-03, S-08, S-09, plan §4 (allowlist: P-7) |
| 3 | Sign in / sign out with GitHub (PKCE), optional, lazily loaded client | S-01 (sign-in only), plan §2, §4 |
| 4 | Consent screen shown **before** the GitHub redirect: draft wording `draft-1` on `gg-test` only; approved wording before production (D-11) | S-12, plan §5.4, §5.6 |
| 5 | Profile: display name and programme (and the stored GitHub identity) | S-03 (subset — *pending K-2*) |
| 6 | "Download my data" (data stored online at this milestone) and "Delete my account" — deletion mechanism *pending P-6* and verification (§4.9) | S-12, plan §5.4 |
| 7 | Consent-lifecycle handling and the abandoned-sign-in procedure (§4.8) — production policy *pending P-3* | S-12, plan §5.4 |
| 8 | Security suite for the criteria that apply at this milestone (§6.2) | S-09, S-11, plan §6 |
| 9 | `npm test` additions: secret scan (K1), signed-out / Supabase-unreachable path, account state logic | plan §6, §8 |
| 10 | A production switch so that sign-in stays **off on the live site** until the plan §5.6 sign-off — mechanism *pending P-2* | S-12, plan §5.6 |

### 2.2 Out of scope (later milestones or other phases)

- Progress sync, `progress` table, `save_progress`, merge prompt, sync status (Milestone 11; S-02, S-10; P1–P3).
  A combined, `gg-test`-only delivery of Milestones 10 and 11 is **proposed** in the
  [Milestone 11 plan](MILESTONE-11-SYNC-PLAN.md) §2; it changes no scope, gate or acceptance criterion of this plan.
- Batches, join codes, `join_batch`, `batch_code`, teacher dashboard, CSV, leaderboard (Milestone 12; S-04, S-06;
  R4, R5, J1–J4). Whether the profile's batch is left out of Milestone 10 is *pending K-2*.
- Live quiz, Realtime (Milestone 13; S-05; L1–L6). Certificates, `verify_certificate`, `app_settings`, D-9 policy
  switch (Milestone 14; S-07; C1–C4).
- Any real student data, any production enablement before the college sign-off (D-9 – D-12).
- Any scheduled job, Edge Function or other new component unless separately approved (P-3, P-6, K-8).
- Phase 3 / AI (D-8). Changes to course content, XP, badges or Phase 1 behaviour.

## 3. Prerequisites and gates

| Gate | What | Needed before | Owner of the step |
|---|---|---|---|
| G-0 | K-1 decided; if approved, revision 4 recorded as the approved baseline in the committed documents | Starting implementation | Owner (decision) · Claude (documentation update, when authorised) |
| G-1 | **This plan approved**, with decisions K-2, K-3, K-5, K-6, K-7, K-10, P-1, P-2, P-4, P-5, P-7, Q-1, Q-2 | Any implementation | Owner |
| G-2 | **D-5, test part:** `gg-test` created; its GitHub OAuth app connected; URL + anon key sent (no secrets) | Steps 3–9 (§5) | Owner |
| G-2a | **P-6 decided**; if the chosen option needs a new component or a baseline change (K-8, K-9), that change separately approved | Building any deletion path (step 6b) | Owner |
| G-2b | **Deletion verified** on `gg-test` for the chosen option (§4.9.3) and the result reviewed | Releasing "Delete my account" / "Remove my sign-in" | Owner reviews evidence |
| G-3 | **D-5, production part:** `gg-prod` created and its OAuth app connected; email and anonymous sign-in disabled (K3) | Step 10 (§5) | Owner |
| G-4 | **College sign-off (plan §5.6):** D-11 consent wording (inputs in §4.4), D-12 under-18 arrangements, D-10 authorised faculty, D-9 certificate policy — **plus** the P-3 production policy and the P-8 consent-evidence policy | Switching sign-in **on** for the live site; real faculty in `gg-prod` | College / owner |
| G-5 | Security and lifecycle results for this milestone all pass on `gg-test` (§7) and are reviewed | Step 10 and release | Owner reviews evidence |

**Status (26 Oct 2026):** G-0 and G-1 decided by the owner (closed when these documents are committed); G-2 met —
the owner created the test project **`git-github-fundamentals-test`** (this plan's `gg-test`; region Mumbai), its GitHub
OAuth app under the `sbccas` **personal** account, GitHub as the only provider (email and anonymous sign-in off) and
one redirect address, `http://localhost:5173/git-github-fundamentals/account/` (also the Site URL). G-2a met by P-6 (c)
and K-9, except the agreed completion time; G-2b, G-3, G-4 and G-5 open.

**Originally blocking:** G-0, G-1 and G-2. Any deletion path is additionally blocked by G-2a and G-2b. Nothing in §5 can
start before G-1 and G-2. Approving this plan as a document does **not** authorise implementation.

## 4. Design for this milestone

### 4.1 Student flow

1. A signed-out student sees **"Sign in"** in the header (all pages) and on the Git Passport. Nothing else changes.
2. Choosing it opens the **consent screen first** — before any request to Supabase Auth or GitHub: what is stored
   (including the sign-in record Supabase Auth keeps and the residual data in §4.4), who sees it, where, for how long,
   how to delete it (plan §5.4). "I agree — continue with GitHub" or "Not now".
3. Only after "I agree" does the site start GitHub sign-in (PKCE) → back to the page they started from.
4. A short profile form: display name (prefilled from GitHub, editable), programme (BCA · BCA – AI · B.Sc. Data
   Science · M.Sc. IT). Saving calls `accept_consent(...)` (*pending P-5*), which validates the consent version against
   the server's allowlist (§4.8.3) and records consent and creates the profile in one database transaction — the
   **first application-table write**.
5. Signed in, the header shows the display name; the account features (edit profile, Download my data, Delete my
   account, Sign out) live where P-1 decides.
6. **Leaving before the profile is saved** — three distinct cases:
   - **6a. Closing the tab or browser:** nothing is signed out. The Supabase session may remain in browser storage
     until it expires or the student signs out; the Auth record remains (§4.8 scenario 2).
   - **6b. Choosing "Not now" on the profile form:** the student is offered:
     - **"Sign out and keep for later"** — always available: clears the session on this device; the Auth record
       remains and is handled by the §4.8 lifecycle (P-3).
     - **"Remove my sign-in"** — shown **only** if the approved P-6 option supports self-service removal and it has
       passed G-2b. Until then (and for P-6 options (c) or (d)) the screen instead explains how removal is requested
       (P-6 (c) records a request; (d) gives the college contact).
   - **6c. Returning with an existing session but no profile:** the site shows "Finish setting up your account" with
     the **current** consent wording (shown again, not assumed), then the profile form, with the same choices as 6b.
     Returning **without** a session (signed out earlier): "Sign in" shows the consent screen first again; after
     GitHub sign-in the same Auth user is expected to be reused *(verify, A-5)* and the profile form appears.
7. A signed-in student whose recorded consent version is no longer current (wording changed) must re-consent before
   any further online write (§4.8.3, LC6). "Download my data", "Delete my account" and "Sign out" stay available
   without re-consent.

### 4.2 Environments and the production switch

- `src/scripts/data/supabase.js` (plan §4) holds the project URL and anon key per build: development and test builds
  use `gg-test`; the production build uses `gg-prod` **only after G-4**.
- Until G-4, the production build has accounts **switched off** (no sign-in button, Supabase client never loaded), so
  the live site cannot collect real student data. Mechanism *pending P-2*.

### 4.3 Data model at this milestone (a subset of plan §4; later columns and tables arrive in their own migrations)

| Object | Columns / behaviour | Access (RLS, default deny) |
|---|---|---|
| `public.profiles` | `id` (= auth user id, PK, **references `auth.users` on delete cascade**), `github_id` (numeric), `github_username`, `display_name` (1–60 chars, plain text), `programme` (one of four values), `leaderboard_opt_in` (default false), `leaderboard_hidden` (default false), `consent_version`, `consent_at`, `created_at`, `updated_at`. **No batch column** — *pending K-2* | RLS enabled. **Select:** own row. **Update:** own row, only `display_name`, `programme` (column-level `GRANT UPDATE`); update of `leaderboard_opt_in` deferred to Milestone 12 — *pending K-6*. **No insert / delete policy** (created by `accept_consent`; removed when the auth user is deleted, via the cascade). `anon`: nothing |
| `private.consent_versions` | `version` (PK, e.g. `draft-1`, `v1`), `status` (`current` / `retired`), `environment` (`test` / `production`), `approved_by`, `approved_at` — *pending P-7* | Not exposed by the API; edited by the owner in the dashboard; read only by `accept_consent` and the re-consent check |
| `public.faculty_allowlist` — **moved to Milestone 12 (M11-D4)** | `github_id` (numeric, PK), `note`, `added_at` | RLS enabled, **no policies**, all privileges revoked from `anon` and `authenticated` (F1); edited by the owner in the dashboard |
| `private` schema | not exposed by the API (X4) | — |
| `private.current_github_id()` — **moved to Milestone 12 (M11-D4)**; `accept_consent` reads the identity itself | GitHub numeric id of the caller, read from Supabase Auth's identity record (never from the browser) | Internal (X3: no API role) |
| `private.is_faculty()` — **moved to Milestone 12 (M11-D4)** | `true` if the caller's GitHub id is in the allowlist; evaluated on every call (F3, F4) | Internal |
| `public.accept_consent(consent_version, display_name, programme)` — *pending P-5* | In **one transaction**: rejects the call unless `consent_version` is the `current` version for this environment in `private.consent_versions`; validates name and programme; inserts the caller's profile or, for a returning user, updates consent version and date. A repeat call with the same current version and values returns the existing record unchanged (idempotent; `consent_at` not moved). Identity fields come from the auth identity | `authenticated` only |
| `public.export_my_data()` | Returns the caller's data as JSON (§4.5; Auth fields *pending K-10*) | `authenticated` only |
| Account deletion | **Mechanism not yet chosen — P-6 (§4.9).** Whatever the mechanism, the profile is removed by the `on delete cascade` when the caller's `auth.users` row is deleted | Per P-6 |

**No profile-creating sign-up trigger** — *pending K-3*: the profile is created only by `accept_consent`, after
consent. The public functions and the helpers are `SECURITY DEFINER` where they must read the allowlists or the auth
identity, and follow **X1–X6**: a comment stating why definer rights are needed (X1); `search_path = ''` and
schema-qualified names, no dynamic SQL (X2); `EXECUTE` revoked from `PUBLIC` and granted only as listed (X3); helpers
and allowlists in `private` (X4); the caller is identified only by `auth.uid()` and the auth identity (X5); covered by
the metadata, grant and call tests in §6.2 (X6). If P-6 selects a database function, it is subject to X1–X6 as well;
if it selects an Edge Function, controls E1–E7 (§4.9.2) apply instead.

Faculty (M11-D4, 26 Oct 2026): the allowlist, `is_faculty()`, F1–F4, R3 and LC9 move to Milestone 12, where faculty first read
data. The paragraph below describes the original rev 3 design. Faculty at this milestone: the role exists (allowlist + `is_faculty()`), but there are no batches yet, so faculty can
read **no** student profiles; R3 ("own batches only") is fully exercised in Milestone 12. A faculty member who signs
in goes through the same consent and profile steps as a student (LC9).

### 4.4 Authentication, privacy and residual data

- GitHub is the only provider in `gg-prod` (K3); redirect URLs exact (K2); only the anon key in the site (K1).
- **When the GitHub sign-in completes, Supabase Auth creates its own user record** (user id, GitHub identity, email
  address supplied by GitHub, profile metadata, sign-in timestamps, sessions/refresh tokens, audit-log entries)
  **before** the application can record consent or create a profile — whether or not the student later completes the
  profile form. Declining on our consent screen **before** sign-in starts sends no request to Supabase Auth, so it is
  expected to create no Auth record *(verify, LC1)*.
- Stored in application tables at this milestone: GitHub numeric id and username, display name, programme, consent
  version and date (`profiles`) — only after `accept_consent` succeeds.
- **Retention:** the owner decided "no automatic deletion" for Phase 2 data (S-12). Whether that decision also covers
  Auth records **without** application consent is **not decided** — it is asked in P-3.
- **Data outside the application's control (residual data)** — the application cannot promise to delete these:
  - the student's **authorisation of the GitHub OAuth app** in their own GitHub account (GitHub → Settings →
    Applications → Authorized OAuth Apps), which stays until the student revokes it;
  - **Supabase platform logs** (API/Auth request logs) and Auth **audit-log entries**, retained by Supabase according
    to its platform and plan settings *(verify, V7)*;
  - **owner-held exports** made before production migrations (plan §5.3), until the owner deletes them.
- **Inputs for the consent wording (D-11, college decision):** the Auth record and its email address; that abandoned
  sign-ins are handled per P-3; the residual data above and how to revoke the GitHub authorisation; what deletion
  removes and what it cannot; the consent-evidence policy (P-8); export contents (§4.5).
- After deletion, an access token already issued stays valid until it expires (Supabase documentation); deleting the
  user ends sessions and refresh tokens. The client signs out locally at once, and the design must make an orphaned
  token useless (V6).

### 4.5 "Download my data" at this milestone

One JSON file with: profile fields, `github_id`, `github_username`, consent version and date — and, *pending K-10*, the
basic fields of the caller's Supabase Auth record (email address supplied by GitHub, sign-in provider, account created
date, last sign-in date). The download screen states what is **not** included: other students' data; Supabase Auth's
audit/security logs (available from the college on request); the residual data in §4.4; and that progress, batch,
live-quiz answers and certificates are not stored online yet (added to the export in Milestones 11–14, *pending K-7*).
Signed out, the existing local progress export is unchanged. Export does not require current consent (§4.1 step 7).

### 4.6 Error handling

| Case | Behaviour |
|---|---|
| Supabase unreachable / project paused | Sign-in button shows "Sign-in is unavailable right now"; Phase 1 unaffected |
| Consent declined before sign-in | Nothing sent to Supabase or GitHub; Phase 1 continues (§4.8 scenario 1) |
| OAuth cancelled at GitHub, or callback/code exchange fails (incl. started in one browser, finished in another) | Back on the starting page, signed out, short message; an Auth record **may** already exist (§4.8 scenario 3, LC8) |
| Profile form left (tab closed, "Not now", return later) | §4.1 step 6 |
| `accept_consent` fails (network, validation, unknown version, server) | Specific message; retry allowed; no partial profile (single transaction); consent counts as recorded only when the call succeeds (§4.8 scenario 3, LC3) |
| Double submission / two tabs | Exactly one profile; the second call returns the existing record (LC7) |
| Invalid profile input | Inline message; server re-validates in `accept_consent` (NV3, NV4) |
| Recorded consent version no longer current | Re-consent screen before any further online write (LC6) |
| Session expired | Treated as signed out; Phase 1 continues; "Sign in again" shown |
| Export fails | Message and retry; nothing changes |
| Delete fails, or the response is lost | "Deletion not confirmed" → the status check (§4.9.1) classifies the outcome; retry only when the status is "account still exists"; local progress untouched in every case |
| Supabase client fails to load (offline, old cache) | Signed-out behaviour; no error loop |

### 4.7 Rollback and recovery

- **Live site:** accounts stay switched off in production until G-4; if anything goes wrong after enabling, the
  switch is turned off and the site redeployed — Phase 1 behaviour returns immediately.
- **`gg-test`:** may be reset at any time (it never holds real data): re-apply the migrations from scratch.
- **`gg-prod`:** migrations are append-only; a fix is a new migration. Before each production migration the owner
  exports the data (plan §5.3); those exports are residual data (§4.4). At this milestone production holds no student
  data until G-4.
- **Abandoned sign-ins and incomplete deletions:** handled by the §4.8 / §4.9 procedures.
- **Test-only database changes** (the forced failures in LC3 (ii) and V3 (a), and any test seeding) live under
  `supabase/tests/`, never under `supabase/migrations/`. They are applied only to `gg-test`, removed after the test,
  and are **never** applied to `gg-prod`; the production migration path contains only `supabase/migrations/`.

### 4.8 Consent lifecycle and abandoned sign-ins (K-4, P-3, P-7, P-8)

"Auth record" means the rows Supabase Auth manages for a user (user, GitHub identity, sessions/refresh tokens,
audit-log entries). Statements marked *(verify)* are confirmed on `gg-test` before release.

| | 1. Declines consent before OAuth | 2. Completes OAuth, does not save the profile | 3. OAuth succeeds, then callback / consent recording / profile creation fails | 4. Deletes the account later |
|---|---|---|---|---|
| **Browser** | Nothing new (no Supabase session; nothing stored) | 6a: session remains until expiry or sign-out · 6b "Sign out and keep for later": session cleared · 6c: session reused on return | Callback failure: usually no session (exchange failed), possibly a PKCE leftover; consent/profile failure: a session exists | Before: session, local Phase 1 progress. After: session cleared; **local progress stays** |
| **Supabase Auth** | **None** expected — no Auth request is made *(verify, LC1)* | Auth record exists (incl. email from GitHub, timestamps, session, audit entries) | Auth record **exists** if GitHub's response reached Supabase *(verify, A-5)*; none if the student cancelled at GitHub | Removed by the P-6 mechanism; audit-log and platform-log entries may remain *(verify, V7)* |
| **Application tables** | None | **None** (no `profiles` row) | **None** — `accept_consent` is one transaction | `profiles` removed by cascade with the auth user; consent evidence per P-8 |
| **Consent recorded?** | No (declining is not stored online) | **No** — the on-screen agreement before OAuth is not durable until `accept_consent` succeeds | **No** until `accept_consent` returns success | Yes until deletion; afterwards per P-8 |
| **Must be retained / deleted** | Nothing | Auth record holds personal data **without recorded consent** → handled per P-3 (not decided); not to be kept indefinitely without a justified policy | Same as 2 | Application data and the Auth user; residual data (§4.4) disclosed, not promised deleted |
| **Responsible** | — | Student: 6b choices; owner: per P-3 (on `gg-test`: test accounts only, §4.8.2) | Student retries; if they give up, as 2 | Student initiates; mechanism per P-6; owner completes for (c)/(d) and handles incomplete deletions |
| **Cleanup verified by** | LC1 | LC2 and the §4.8.2 procedure | LC3, LC7, LC8 | §4.9.3 V-tests |
| **Errors / retry** | — | Return path 6c; "Remove my sign-in" only once P-6 allows it | Specific messages; idempotent retry; repeat sign-in reuses the Auth user *(verify, A-5)* | §4.9.1 status check |
| **Security** | The consent screen must not pre-load or start OAuth | A profile-less authenticated user can read and write **nothing** except `accept_consent`, `export_my_data`, the deletion path and sign-out (LC2); faculty status only from the allowlist (LC9) | Errors reveal no internal details; consent never inferred from a partial success | Caller-only deletion; other users untouched (V2); orphaned tokens useless (V6) |

#### 4.8.1 Policy for Auth records without application consent (P-3)

| Option | Assessment |
|---|---|
| (a) **Manual** owner cleanup on a fixed routine, using the §4.8.2 query and deletion through the Supabase dashboard (a documented mechanism) | No new infrastructure; relies on the owner's routine |
| (b) **Automatic** cleanup after an approved period by a scheduled database job | Needs a scheduled-job facility (free-plan availability **not verified**) and a privileged job under X1–X6 — **new infrastructure, requires explicit approval**; not built in Milestone 10 |
| (c) **Retain** abandoned Auth records | Keeps personal data without application consent; would need an explicit, justified policy |

**Technical recommendation:** (a), plus the 6b choices to reduce orphans. **Not decided:** whether these records count
as retained personal data under the owner's retention decision, the justified maximum age, and who performs cleanup
how often — all asked in P-3 and settled before production (G-4). No legal conclusion is drawn here.

#### 4.8.2 `gg-test` verification procedure (owner-run)

**Scope:** applies only to dedicated test accounts and test data in `gg-test`; it does not approve or imply a
production policy (P-3 stays open).

1. Produce one record per scenario with test accounts (LC1 decline; LC2 abandon; LC3 forced failure).
2. Owner runs a **read-only** query in the `gg-test` SQL editor listing Auth users with no `profiles` row and their
   creation time (ids truncated to 8 characters in any shared output).
3. Owner removes the listed **test** users through the dashboard (or through the P-6 mechanism once verified).
4. Owner re-runs the query: no test Auth user without a profile remains; other test users' profiles are unchanged
   (row count and `updated_at` before/after).
5. Evidence per §6.6.

#### 4.8.3 Consent versions and re-consent (P-7)

- **Allowlist:** `private.consent_versions` holds every wording version with a status. Exactly one version is
  `current` per environment. `accept_consent` accepts only that version; unknown, retired or other-environment versions
  are rejected (NV2).
- **Draft vs approved:** `gg-test` uses `draft-1` (environment `test`). `gg-prod` contains **no** draft version; `v1`
  is added as `current` only after the college approves the wording (D-11, G-4).
- **Wording change:** when a new version becomes `current`, users whose recorded `consent_version` differs must
  re-consent before any further online write; until they do, only download, delete and sign-out work (LC6). Declining
  re-consent leaves them signed out with their data intact until they delete it (consistent with the owner's retention
  decision; the declined state itself is not stored).
- **History:** this milestone stores only the latest version and date on the profile. Whether a consent history (and
  evidence of withdrawal) is kept — including after deletion — is **P-8**, not decided here.

### 4.9 Account deletion: mechanism and verification (P-6)

Revision 1 assumed a database function could delete the caller's Supabase Auth user atomically with the application
data. **That is not established**, and the earlier "one transaction" criterion is withdrawn (K-9).

**What the Supabase documentation states** (checked 24 Oct 2026): `auth.admin.deleteUser()` is the recommended way to
delete a user; it "requires a `service_role` key" and "should only be called on a server"; with the default (no soft
delete) it removes the `auth.users` row, which cascades to sessions and invalidates refresh tokens; tables that
reference `auth.users` with `on delete cascade` are removed with the user; users can also be deleted in the dashboard
(Authentication → Users); an access token already issued stays valid until it expires; objects managed by Supabase
"may change at any time". Deleting rows from `auth.users` directly with SQL is **not documented**.

**Three layers, kept distinct:**
1. **Application rows in a database transaction.** Rows linked to `auth.users` by `on delete cascade` are deleted in
   the same statement as the `auth.users` row — PostgreSQL behaviour, all-or-nothing for those rows.
2. **The Supabase Auth administrative deletion** (option b) or the dashboard deletion (options c, d). Whether the
   Admin API performs its whole deletion as one database transaction is **not documented** *(verify, V3)*.
3. **The end-to-end outcome** seen by the student: the response can be lost after the deletion committed; a later step
   (option c) can be left undone; residual data (§4.4) is outside every transaction. **No option gives end-to-end
   atomic deletion.**

| Option | How | Permissions | Guarantee | Limitations / burden | S-12 self-service |
|---|---|---|---|---|---|
| (a) Database function | A `SECURITY DEFINER` function deletes the caller's `auth.users` row; `profiles` by cascade | Function owner must be allowed to delete from `auth.users` *(not documented; verify)* | Layer 1 all-or-nothing **if** permitted | Undocumented use of a Supabase-managed schema; may break on platform changes | Yes, if permitted |
| (b) Edge Function + Admin API | An Edge Function validates the caller's token (E1–E7) and calls `auth.admin.deleteUser(<id from the validated token>)` with the service-role key held in the function's secret settings | Service-role key, server side only | Layer 1 by cascade; layer 2 single-transaction behaviour *(verify)*; HTTP response can be lost | Documented path; adds a server-side component Phase 2 does not include — **K-8**; owner holds a powerful secret | Yes |
| (c) Two-step with owner completion | A database function deletes the caller's application data and records a deletion request (a minimal request record — design detail for P-6); the owner deletes the Auth user in the dashboard within an agreed time | Function: X1–X6; owner: dashboard | Layer 1 only; **not atomic** overall | Half state until the owner acts; owner workload | Partly — K-9 |
| (d) Request only | The student asks the college; the owner deletes in the dashboard | Owner | Owner action | Slow; owner workload | No — K-9 |

**Owner decision (26 Oct 2026): (c).** The agreed completion time for the owner's step is still to be set.

**Technical recommendation (as reviewed):** (b) as the only documented, self-service path, **only** after the owner approves it and
the baseline change (K-8); otherwise (c), with its half state treated like scenario 2. (a) only as a `gg-test`
experiment with explicit risk acceptance. **Owner decision:** P-6.

#### 4.9.1 Account-status check and retry (all options)

After "Delete my account" the client never assumes success from a missing response. It runs a status check and acts
on the classification (exact Supabase error codes *verify, V10*):

| Status | How it is determined | Client action |
|---|---|---|
| **Deleted** | (a)/(b): the documented "get current user" call with the still-valid access token reports that the user no longer exists *(verify)*; (c)/(d): not applicable | Treat as success; clear the local session; show what remains (§4.4) |
| **Pending completion** | (c): no profile, deletion request recorded, Auth user still present; (d): request acknowledged | Show "Removal requested — completed by the college by <agreed time>"; no retry |
| **Still exists** | The user is returned and the profile is present | Offer retry (safe: the operation targets only the caller) |
| **Session not valid** | Token expired or rejected for a reason other than "user not found" | Not treated as deleted; ask the student to sign in again, then re-check |
| **Unknown** | Network failure, server error, timeout | No retry loop; show "Status unknown — check again later"; nothing assumed |

Retries are idempotent: a retry against an already-deleted user ends in **Deleted** without touching other data (V5).

#### 4.9.2 Edge Function security controls E1–E7 (proposed; apply only if the owner approves P-6 (b))

None of these is implemented or tested.

| ID | Control |
|---|---|
| E1 | The function requires a Supabase access token; it validates it **on the server** with Supabase's documented method and rejects missing, malformed, expired or invalid tokens (401). Whether the platform's own token check is also enabled for the function is decided in implementation *(verify)* |
| E2 | The account to delete is taken **only** from the validated token; any account id in the body, query or headers is ignored |
| E3 | The service-role key lives only in the function's server-side secret storage, set by the owner; it never appears in the browser, the repository, the build, logs, evidence or chat (K1 scan covers the repository and build) |
| E4 | CORS allows only the approved application origins (production site; local development address for `gg-test`); only the needed methods (POST and the pre-flight). CORS is **not** treated as authentication |
| E5 | Logs record only an outcome code, time and an id truncated to 8 characters — never tokens, secrets, email addresses or other personal data |
| E6 | Responses are classified as in §4.9.1 (deleted / not authorised / failed); internal errors are not exposed; a call for an already-deleted user does not delete anything else |
| E7 | Tests (on `gg-test`, after G-2a): no token, expired token, tampered token, student B's token with student A's id in the body, a call from a non-allowed origin, retry after success, an induced Admin API failure, and inspection of the function logs for the E5 rule |

#### 4.9.3 Verification on `gg-test` (G-2b) — all proposed, none run

| ID | Applies to | Verify | Pass condition |
|---|---|---|---|
| V1 | all | Mechanism and permissions | The executing role is documented; the browser holds only the anon key and the user's own token; no service-role key in the repository or build (K1) |
| V2 | a, b, c | Caller only, others untouched | Student A's deletion leaves student B's `profiles` row and Auth user identical (row count, `updated_at`, ids before/after); passing B's id anywhere has no effect |
| V3 | a, b | Inside the database | (a): with a forced failure (a test-only blocking reference on `gg-test`, from `supabase/tests/`, never applied to `gg-prod`; §4.7), **nothing** is deleted; (b): with an induced Admin API failure, the database state is unchanged *(verify — documents whether the Admin API is single-transaction)* |
| V4 | a, b, c | Lost response | Request aborted after sending: the §4.9.1 check returns **Deleted** or **Still exists** (or **Pending completion** for c) — never an unclassified state |
| V5 | a, b, c | Retry | A retry after success ends in **Deleted** (or **Pending completion** for c) and affects nothing else; for (c) no duplicate request is created |
| V6 | a, b, c | Authentication afterwards | Refresh token rejected; the old access token cannot read or create data (`accept_consent` fails, `export_my_data` returns nothing); a new GitHub sign-in creates a **new** user and starts at consent; for (c) during the half state, sign-in leads to scenario 2 behaviour |
| V7 | all | Residual data | Lists what remains in Supabase-managed tables and logs after deletion, and their retention, as input to D-11; GitHub app authorisation noted as outside the application |
| V8 | all | Evidence safety | Reports contain test-account labels, truncated ids, counts, status codes and timestamps only |
| V9 | c, d | Owner completion | Requests are visible to the owner; the owner completes within the agreed time; the student is told what happens and when; for (d) the request channel and its record are defined |
| V10 | a, b, c | Status classification | Each §4.9.1 status is produced by a controlled case (deleted user, existing user, expired token, network cut, pending request) and classified correctly |
| E7 | b | Edge Function controls | As in §4.9.2 |

Option (d) has no self-service code to test; V9 is a procedural check of the owner's process.

## 5. Ordered implementation steps (after G-1)

| # | Step | Gate | Output |
|---|---|---|---|
| 1 | Record K-1 outcome and this plan's approval (and the decisions taken) in PRD/PROGRESS | G-0, G-1 | Docs commit |
| 2 | Owner sets up `gg-test` and its OAuth app (plan §9 steps 1–6, test part), sends URL + anon key only | G-2 | Values in `src/scripts/data/supabase.js` (test build) |
| 3 | Write migration 1 per §4.3 as decided at G-1 — no deletion function until P-6 | G-2 | SQL file, reviewed in the repo |
| 4 | Write the security, validation and lifecycle tests (§6.2, §6.3) and the API-level test script | — | Test files |
| 5 | Owner applies migration 1 to `gg-test` (SQL editor or CLI with their own credentials) and seeds `draft-1`; owner runs the suite (Q-2) | G-2 | Evidence (§6.6) |
| 6a | Front end: lazy Supabase client, consent-first sign-in, profile form, 6a–6c flows (with "Remove my sign-in" hidden), account page, export, re-consent, production switch | — | Code + `npm test` additions |
| 6b | Deletion path and "Remove my sign-in" per the approved P-6 option; run §4.9.3 on `gg-test` | **G-2a**, then **G-2b** | Code/migration + evidence |
| 7 | `npm test`, `npm run build`, 360 px and offline checks; signed-out path with Supabase blocked | — | Results |
| 8 | Manual tests on `gg-test` with test accounts (§6.5), including the §4.8.2 procedure | — | Checklist |
| 9 | Owner review of evidence; fixes as new migrations/commits | G-5 | Review note |
| 10 | Owner sets up `gg-prod` (G-3); migrations applied there **without real faculty or student data and without a draft consent version**; accounts stay off on the live site | G-3, G-5 | Production schema ready, dormant |
| 11 | After G-4: owner adds authorised faculty ids, adds the approved consent version `v1`, applies the P-3 and P-8 policies; the switch is turned on in a separate, approved release | G-4 | — (not part of this milestone's coding) |

## 6. Tests (proposed — **none have been run**)

Status key: **Proposed** = specified, not run · **Blocked** = cannot run until the named gate/decision · no test is
reported as passed.

### 6.1 Offline (`npm test`, no network, no Supabase) — Proposed

- Secret scan (K1): fails if a service-role key, JWT secret or database URL pattern appears in the repository or the build.
- Signed-out path: with accounts switched off, and with accounts on but Supabase unreachable, every existing Phase 1
  check still passes (115 checks today) and no page imports the Supabase client.
- Production switch (*pending P-2*): a production build with the switch off contains no Supabase client code and no
  sign-in UI.
- Account state logic (pure functions): signed-out → consent → OAuth → profile → signed-in; declined consent (no OAuth
  call); 6a/6b/6c paths; failed `accept_consent` with retry; re-consent required; expired session; the §4.9.1 status
  classification from recorded responses.
- Client-side input validation mirrors the server rules (display name length and plain text, programme values).

### 6.2 Security suite (`gg-test`) — Blocked by G-2 (and Q-1, Q-2)

| ID | Test (expected result) |
|---|---|
| F1 — *moved to Milestone 12 (M11-D4)* | `faculty_allowlist` cannot be read, inserted, updated or deleted as `anon` or `authenticated` (denied) |
| F2 — *moved to Milestone 12 (M11-D4)* | A user whose GitHub **username** matches an allowlisted user but whose numeric id differs is not faculty |
| F3 — *moved to Milestone 12 (M11-D4)* | A student cannot set any role-like value: no role column is updatable; `is_faculty()` reflects only the allowlist |
| F4 — *moved to Milestone 12 (M11-D4)* | Removing an id from the allowlist makes the next `is_faculty()` call return false |
| R1 | RLS is enabled on every table in `public`; signed-out requests read and write nothing; `private` objects are not reachable through the API |
| R2 | Student A cannot read, insert, update or delete student B's profile, including by guessing B's id |
| R3 (partial) — *moved to Milestone 12 (M11-D4)* | A faculty user reads no student profiles at this milestone (no batches) and can update nothing but their own profile |
| X1–X6 | For `accept_consent`, `export_my_data`, `private.current_github_id`, `private.is_faculty`, the consent-version reader (and a deletion function if P-6 chooses one): security definer and `search_path = ''` (from `pg_proc`); grants via `has_function_privilege` (`anon`: none; `authenticated`: public functions only; helpers: no API role); `private` schema not exposed; calls as signed-out (denied), student A, student B, faculty and removed faculty with the expected results; no function accepts a user id from the caller |
| K2 | Redirects to a non-allowed URL are refused (gg-test: production + local dev only) |
| K3 | In `gg-prod` (after G-3): email and anonymous sign-up refused — Blocked by G-3 |

### 6.3 Validation and lifecycle tests

| ID | Environment | Steps → expected outcome | Depends on | Status |
|---|---|---|---|---|
| LC1 | `gg-test` + browser | Decline consent → no request to Supabase Auth or GitHub (network log); Auth user count unchanged (owner query) | G-2, Q-2 | Blocked (G-2) |
| LC2 | `gg-test` | Complete OAuth, do not save the profile → Auth user exists, no `profiles` row; that user can call only `accept_consent`, `export_my_data`, the deletion path and sign-out; everything else denied; the §4.8.2 query lists it | G-2, Q-1 | Blocked (G-2) |
| LC3 | `gg-test` | **Controlled failures**, each run separately: (i) validation — test script sends an invalid programme → error message, no row, consent not recorded, retry with valid data creates one row; (ii) server error — owner applies a **test-only** change (a script under `supabase/tests/`, never `supabase/migrations/`; §4.7) on `gg-test` that makes `accept_consent` fail (e.g. a temporary check that raises an error for a marked test account), then removes it → no row, consent not recorded, user sees "could not save — try again", retry after removal creates one row; (iii) network — client offline before the call → nothing sent, form keeps its values; (iv) lost response — request aborted after sending → retry returns the existing record, still one row. Evidence: row counts and `consent_at` before/after | G-2, Q-1, Q-2 | Blocked (G-2) |
| LC4 | `gg-test` | `consent_version`/`consent_at` are set exactly when the profile is created; a failed call leaves them absent | G-2 | Blocked (G-2) |
| LC5 | `gg-test` + two browsers/devices | A consented user signs in on a second device → no new profile; the existing profile is used; no consent prompt unless the version changed | G-2, Q-1 | Blocked (G-2) |
| LC6 | `gg-test` | Owner marks `draft-1` retired and a test version `draft-2` current → a user with `draft-1` sees the re-consent screen; before re-consent, profile update is denied while export, delete and sign-out work; after re-consent `consent_version` = `draft-2`; declining leaves them signed out with data intact | G-2, P-7 | Blocked (G-2, P-7) |
| LC7 | `gg-test` + two tabs | Submit the profile form twice / from two tabs at once → exactly one profile; the second call returns the existing record; `consent_at` unchanged by the second call | G-2 | Blocked (G-2) |
| LC8 | `gg-test` + two browsers | Start GitHub sign-in in browser A, complete the redirect in browser B → the exchange fails safely (no session in B, no profile); a clear message; starting again works; any Auth record created is handled as scenario 3 | G-2 | Blocked (G-2) |
| LC9 — *moved to Milestone 12 (M11-D4)* | `gg-test` | An allowlisted faculty test account signs in without a profile → goes through consent and the profile form like a student; before that it can read nothing; `is_faculty()` true only via the allowlist | G-2, Q-1 | Blocked (G-2) |
| NV1 | `gg-test` | Signed-out call to `accept_consent` → denied | G-2 | Blocked (G-2) |
| NV2 | `gg-test` | `accept_consent` with an unknown, retired or other-environment version (e.g. `v1` on `gg-test`, `draft-1` after retirement) → rejected; no row | G-2, P-7 | Blocked (G-2) |
| NV3 | `gg-test` | Display name of 61+ characters, empty, or containing HTML/script → rejected or stored as plain text and always rendered as text, never as HTML | G-2 | Blocked (G-2) |
| NV4 | `gg-test` | Programme value outside the four allowed values → rejected; no row | G-2 | Blocked (G-2) |
| S12-E | `gg-test` | `export_my_data` returns the caller's §4.5 fields only, never another user's; works without current consent | G-2, K-10 | Blocked (G-2) |

### 6.4 Deletion tests

V1–V10 and E7 as in §4.9.3 — **Blocked by G-2, G-2a**; E7 applies only if P-6 = (b); V9 applies to (c) and (d).

### 6.5 Manual tests (`gg-test`, test accounts) — Blocked by G-2

Sign in on Android, iPhone and a lab PC; decline consent; close the tab mid-flow and return (6a, 6c); "Not now" with
each available choice (6b); force a failed profile save and retry; complete consent and profile; second device; edit
profile; download data and compare with §4.5; re-consent after a wording change; delete the account (after G-2a) and
confirm a new sign-in starts at consent; the §4.8.2 owner procedure; sign out on a shared PC; Supabase blocked
(airplane mode) — Phase 1 works; 360 px layout and 44 px targets for the new controls.

### 6.6 Evidence (for G-2b and G-5)

For each test: the test id, the test-account label, environment, expected and actual result, date and migration
version — stored where P-4 decides. Evidence contains only test-account labels, ids truncated to 8 characters, counts,
status codes and timestamps — no secrets, tokens, emails, passwords or real student data.

## 7. Acceptance criteria (measurable)

1. Every test in §6.2 and §6.3 (except those moved to Milestone 12 by M11-D4) passes on `gg-test`, with evidence reviewed by the owner (G-5); the §4.9.3 tests that
   apply to the approved P-6 option pass (G-2b).
2. `npm test` passes, including the §6.1 checks; `npm run build` passes.
3. With accounts switched off, the production build contains no Supabase client code and no sign-in UI, and its pages
   behave exactly as before (same Phase 1 checks).
4. Signed out — and after declining consent — no network requests to Supabase or GitHub are made (LC1).
5. Consent is shown before any redirect to GitHub; no `profiles` row exists for a user who has not completed
   `accept_consent`; only the `current` consent version is accepted (LC2–LC4, NV2).
6. "Download my data" returns exactly the §4.5 fields (as decided under K-10) for the caller and nothing about anyone else.
7. Account deletion meets the guarantee of the approved P-6 option — and no stronger claim is made:
   - **(a)** V3 shows nothing is deleted on a forced failure; V2, V4–V7, V10 pass.
   - **(b)** E7 passes; V3 records whether the Admin API deletion is single-transaction; V2, V4–V7, V10 pass.
   - **(c)** application data is removed in one transaction; the half state is visible to the owner, classified as
     **Pending completion**, behaves like scenario 2 and is completed within the agreed time (V9); V2, V4–V7, V10 pass.
   - **(d)** the request channel and record exist; the owner completes deletions within the agreed time; the student is
     told what remains (V7, V9).
   - In every case: another user's data is untouched, retries are safe, a new sign-in starts at consent, and the
     residual data in §4.4 is disclosed rather than promised deleted.
8. The §4.8.2 procedure leaves no **test** Auth user without a profile and changes no other test account.
9. The new UI works at 360 px with 44 px touch targets, and offline behaviour is unchanged.
10. No secret appears in the repository, the build, or any chat or evidence file.

## 8. Requirement traceability

| Requirement | Where in this plan | Verified by |
|---|---|---|
| S-01 (sign-in only) | §4.1, §4.2, §4.4 | §6.2 K2–K3, LC1, LC5, LC8; §7.4 |
| S-03 (profile subset) | §4.3 | §6.2 R2, LC3–LC5, LC7, NV3, NV4 |
| S-08 | §4.3 | §6.2 R1, R2 |
| S-09 (F1–F4, R1–R3, X1–X6, K1–K3; E1–E7 if P-6 b) | §4.3, §4.4, §4.9.2 | §6.1, §6.2, E7 |
| S-11 | §3, §5 steps 5, 6b, 9, 10 | §6.6 evidence, G-2b, G-5 |
| S-12 (consent, export, delete, retention) | §4.1, §4.4, §4.5, §4.8, §4.9 | LC1–LC9, NV1–NV4, S12-E, V1–V10; §7.4 – §7.8 |
| N-05 | §4.4, §4.5 | §6.5, consent inputs (D-11) |
| Plan §5.4 (consent before the first online save) | §4.1, §4.8 | LC1, LC4 |
| Plan §5.6 (production sign-off) | §3 G-4, §4.2, §4.8.3, §5 steps 10–11 | §7.3 |
| Plan §8 (signed-out/offline guarantee) | §4.2, §4.6 | §6.1, §7.3, §7.4 |

Not applicable at this milestone (and why): R4, R5, J1–J4 (Milestone 12) · P1–P3 (Milestone 11) · L1–L6 (Milestone 13)
· C1–C4 and D-9 policy paths (Milestone 14; `app_settings` is created then).

## 9. Cross-check with the PRD and the Phase 2 plan

### 9.1 Conflicts and gaps (recorded, not resolved — decisions in §9.5)

| ID | Finding | Source |
|---|---|---|
| K-1 | The owner's instructions call revision 4 "approved"; the committed plan (§11), PRD (§7 note, status) and PROGRESS (§3.9) say "awaiting approval"; no explicit approval record exists. | Plan §11, PRD §7, PROGRESS §3.9 |
| K-2 | Plan §3 says the first sign-in asks for "name, programme and batch join code", but join codes are Milestone 12; S-03 lists batch as part of the profile. | Plan §3 vs §7; PRD S-03 vs §12b |
| K-3 | Plan §5.1 lists "the sign-up trigger" among privileged functions, while §5.4 requires consent **before the first online save**. | Plan §5.1 vs §5.4 |
| K-4 | Supabase Auth creates its own user record (incl. the email from GitHub) when the GitHub sign-in completes — before application consent can be recorded; plan §5.4 and PRD N-05 do not mention this record or the residual data in §4.4. | Plan §5.4, PRD N-05 |
| K-5 | PRD §12b and plan §7 list D-10, D-11, D-12 as needs for Milestone 10; plan §5.6 makes them production gates. | PRD §12b, plan §7 vs §5.6 |
| K-6 | Plan §4 lists `leaderboard_opt_in` among the columns a student may update; the leaderboard is Milestone 12. | Plan §4 vs §7 |
| K-7 | "Download my data" and "Delete my account" are defined for all Phase 2 data, most of which does not exist yet. | Plan §5.4 |
| K-8 | The documented self-service deletion path needs the service-role key on a server (P-6 b). The PRD already includes Supabase Edge Functions in the approved stack ("Supabase Edge Functions host the AI proxy, so the stack stays GitHub Pages + Supabase", PRD §4) — but only for Phase 3 (PRD §4 Phase 3 row, §8 A-06, §11 Phase 3 row), and the Phase 2 plan's principle 3 says "No server of our own: the browser talks to Supabase directly". Using an Edge Function in Phase 2 conflicts with that principle and that phase scoping, not with the stack as a whole. | PRD §4, §8, §11; plan §2 principle 3 |
| K-9 | Revision 1 claimed deletion "in one transaction" (not established, withdrawn). Options (c)/(d) are not fully self-service while S-12 says "self-service account deletion". The Phase 2 plan §4 names a database function `delete_my_account()` (and lists it in §5.1), whose form now depends on P-6. | This plan rev 1; PRD S-12; plan §4, §5.1 |
| K-10 | Plan §5.4's export list does not mention the Auth record's personal fields (email, sign-in dates), although S-12 says the export covers "everything stored online"; it excludes only the security sign-in records. | Plan §5.4; PRD S-12 |

### 9.2 Proposals needing approval (options and recommendations in §9.5)

P-1 account page location · P-2 production switch · P-3 Auth records without consent · P-4 evidence location ·
P-5 new function names · P-6 deletion mechanism · P-7 consent-version allowlist and re-consent · P-8 consent evidence
and its retention.

### 9.3 Open questions (options and recommendations in §9.5)

Q-1 test identities on `gg-test` · Q-2 who runs the SQL suite.

### 9.4 Assumptions (all to be verified on `gg-test`; none verified yet)

- A-1: Supabase's free plan allows two projects and the features used here (Auth with GitHub, Postgres RLS, column
  privileges, `SECURITY DEFINER` functions reading the caller's auth identity).
- A-2: The Supabase CLI or SQL editor can run the SQL test scripts against `gg-test`.
- A-3: The GitHub identity record available to database functions contains the numeric GitHub user id.
- A-4: Adding `@supabase/supabase-js` as a lazily loaded dependency keeps signed-out pages at today's size.
- A-5: Supabase creates the Auth user when it processes GitHub's response, before redirecting to the site; a repeat
  sign-in with the same GitHub account reuses that user.
- A-6: The access-token lifetime configured in each project (bounds the post-deletion window, V6).
- A-7: Which Supabase-managed records and platform logs remain after a user is deleted, and for how long (V7).
- A-8: The exact Supabase error returned by the "get current user" call for a deleted user, used by §4.9.1 (V10).

### 9.5 Decision register (decided by the owner on 26 Oct 2026 — "approve all recommendations", with Q-1 (a))

Every entry separates the **owner decision** from Claude's **technical recommendation**. A recommendation does not
resolve an entry; every entry stays ⏳ until the owner decides explicitly. D-5 and D-9 – D-12 are not in this register
and keep their existing approval and college sign-off requirements. K-4 has no separate decision: it is resolved
through P-3 (abandoned records), P-6 (deletion), P-8 (consent evidence) and the college's D-11 wording.

**K-1 — Revision 4 as the approved baseline** · ✅ Owner, 26 Oct 2026: (a) approve as is

| | |
|---|---|
| Question | Does the owner explicitly approve revision 4 of the Phase 2 plan as the baseline, to be recorded in the committed documents? |
| Evidence | Owner instructions (24 Oct 2026) call it "the currently approved documentation baseline"; committed plan §11, PRD §7/status and PROGRESS §3.9 say "awaiting approval" (`df45fce`, unchanged at `04fb95d`); no explicit approval statement exists. |
| Options | (a) approve as is · (b) approve after a revision 5 (e.g. for K-8, K-9, K-10) · (c) not yet |
| Dependencies | G-0; P-6 (option b needs baseline changes) |
| Risks | (a) baseline still says "no server of our own" if P-6 (b) is later chosen; (b) small delay; (c) implementation cannot start |
| Technical recommendation | Decide P-6 first; then (a) if no baseline change is needed, otherwise (b) |
| If unresolved | G-0 stays closed: no implementation step (§5) can start, and the documents remain inconsistent with the instructions |
| Decision authority | **Owner** |

**K-2 — Batch in the Milestone 10 profile** · ✅ Owner, 26 Oct 2026: (a)

| | |
|---|---|
| Question | Is the batch left out of the Milestone 10 profile and added with `join_batch` in Milestone 12? |
| Evidence | Plan §3 asks for a batch join code at first sign-in; join codes and `join_batch` are Milestone 12 (plan §7, PRD §12b); S-03 lists batch. |
| Options | (a) defer batch to Milestone 12 · (b) collect a free-text batch now (no join code) · (c) move join codes into Milestone 10 |
| Dependencies | Milestone 12 plan; S-03 |
| Risks | (a) profile incomplete until Milestone 12; (b) unverified free text, duplicate data later; (c) scope growth, J1–J4 must move too |
| Technical recommendation | (a) |
| If unresolved | §4.3 `profiles` columns and the profile form cannot be finalised; migration 1 (step 3) is blocked |
| Decision authority | **Owner** |

**K-3 — No profile-creating sign-up trigger** · ✅ Owner, 26 Oct 2026: (a)

| | |
|---|---|
| Question | Is the profile created only by `accept_consent` after consent, with no trigger at sign-up? |
| Evidence | Plan §5.1 lists "the sign-up trigger"; plan §5.4 requires consent before the first online save. |
| Options | (a) no trigger; `accept_consent` creates the profile · (b) keep a trigger (requires changing plan §5.4) |
| Dependencies | P-5; X1–X6 |
| Risks | (a) the Phase 2 plan's function list needs a documentation update later; (b) identity data stored in application tables before consent |
| Technical recommendation | (a) |
| If unresolved | §4.3 creation path and LC4 cannot be finalised; migration 1 is blocked |
| Decision authority | **Owner** |

**K-5 — D-10 – D-12 as production gates** · ✅ Owner, 26 Oct 2026: (a)

| | |
|---|---|
| Question | May Milestone 10 be built and tested on `gg-test` with a draft consent and test faculty, with D-9 – D-12 gating only production (G-4)? |
| Evidence | PRD §12b and plan §7 list D-10 – D-12 as needs; plan §5.6 makes them production gates ("Until then, Phase 2 runs only on `gg-test` with test accounts"). |
| Options | (a) production gates only · (b) required before Milestone 10 starts |
| Dependencies | D-9 – D-12 (college); G-4 |
| Risks | (a) consent wording may change after build (LC6 covers re-consent); (b) Milestone 10 waits for the college |
| Technical recommendation | (a) |
| If unresolved | Milestone 10 cannot start until the college decides D-10 – D-12, or the owner confirms (a) |
| Decision authority | **Owner** (D-9 – D-12 themselves remain college decisions) |

**K-6 — `leaderboard_opt_in` permission** · ✅ Owner, 26 Oct 2026: (a)

| | |
|---|---|
| Question | Is the column created now (default false) with student update permission granted only in Milestone 12? |
| Evidence | Plan §4 lists it as student-updatable; the leaderboard is Milestone 12. |
| Options | (a) create now, grant in Milestone 12 · (b) create and grant now · (c) create in Milestone 12 |
| Dependencies | Milestone 12 plan; S-04 opt-in default |
| Risks | (a) none specific; (b) a setting with no effect; (c) an extra migration later |
| Technical recommendation | (a) |
| If unresolved | §4.3 grants cannot be finalised; migration 1 is blocked |
| Decision authority | **Owner** |

**K-7 — Export and delete scope per milestone** · ✅ Owner, 26 Oct 2026: (a)

| | |
|---|---|
| Question | Does Milestone 10 implement export and delete for the data that exists now (profile, consent, Auth user), with each later milestone extending them for its own data? |
| Evidence | Plan §5.4 defines export/delete for all Phase 2 data; most of it arrives in Milestones 11–14. |
| Options | (a) incremental per milestone, each milestone plan stating its extension · (b) design the full export/delete now |
| Dependencies | Milestones 11–14 plans; S-12 |
| Risks | (a) a later milestone could forget its extension — mitigated by stating it in each plan; (b) designs for tables that do not exist |
| Technical recommendation | (a), without weakening S-12 for later data |
| If unresolved | §4.5 scope and acceptance criterion 6 cannot be finalised |
| Decision authority | **Owner** |

**K-8 — Edge Function in Phase 2** · ✅ Owner, 26 Oct 2026: not needed — P-6 is (c), so no Edge Function is used

| | |
|---|---|
| Question | If P-6 (b) is chosen, does the owner approve using a Supabase Edge Function in Phase 2, with the documentation changes it needs? |
| Evidence | PRD §4: Edge Functions are in the approved stack for the AI proxy (Phase 3); Phase 2 plan principle 3: "No server of our own". |
| Options | (a) approve, with a documentation update to plan §2/§4/§5.1 and PRD §11 (Phase 2 row) · (b) do not use an Edge Function in Phase 2 (P-6 must then be a, c or d) |
| Dependencies | P-6; K-1 |
| Risks | (a) a server-side component and a service-role secret to protect (E1–E7); (b) self-service deletion only via undocumented (a) or not at all |
| Technical recommendation | Decide together with P-6 |
| If unresolved | P-6 option (b) cannot be chosen; G-2a stays closed if the owner prefers (b) |
| Decision authority | **Owner** |

**K-9 — Deletion guarantee and S-12 wording** · ✅ Owner, 26 Oct 2026: S-12 clarified for P-6 (c) (PRD v1.16); Phase 2 plan `delete_my_account()` row updated

| | |
|---|---|
| Question | If P-6 is (c) or (d), how is S-12's "self-service account deletion" clarified, and how are the baseline's `delete_my_account()` references updated? |
| Evidence | PRD S-12; plan §4, §5.1 name `delete_my_account()`; §4.9 shows no option is end-to-end atomic. |
| Options | (a) clarify S-12 to "self-service request, completed by the college within N days" for (c)/(d) · (b) keep S-12 and require (a)/(b) |
| Dependencies | P-6; K-1 |
| Risks | (a) weaker than the current requirement; (b) requires (b)'s approval or (a)'s undocumented path |
| Technical recommendation | Decide with P-6; any wording change is a separate PRD documentation change |
| If unresolved | Acceptance criterion 7 cannot be fixed for (c)/(d); G-2a stays closed for those options |
| Decision authority | **Owner** |

**K-10 — Auth record fields in the export** · ✅ Owner, 26 Oct 2026: (a)

| | |
|---|---|
| Question | Does "Download my data" include the basic fields of the caller's Supabase Auth record (email, provider, created, last sign-in)? |
| Evidence | S-12: export covers "everything stored online"; plan §5.4 excludes only "the sign-in records Supabase Auth keeps for security". |
| Options | (a) include the basic fields · (b) exclude them and say so on the download screen |
| Dependencies | S-12; X1–X6 (the export reads the caller's own Auth record) |
| Risks | (a) one more read of a Supabase-managed table (own row only); (b) export incomplete against S-12 |
| Technical recommendation | (a) |
| If unresolved | §4.5 and test S12-E cannot be finalised; export implementation blocked |
| Decision authority | **Owner** |

**P-1 — Location of account features** · ✅ Owner, 26 Oct 2026: (a) `/account/`

| | |
|---|---|
| Question | Where do edit profile, Download my data, Delete my account and Sign out live? |
| Evidence | Plan §3 lists the features, no page; About has the local export/import; the Git Passport is the student's dashboard. |
| Options | (a) new page `/account/` · (b) About page section · (c) Git Passport section |
| Dependencies | P-2 (hidden while accounts are off) |
| Risks | (a) one more page; (b) mixes college information with personal actions; (c) passport depends on Supabase |
| Technical recommendation | (a) |
| If unresolved | Front-end step 6a cannot place the account features; manual tests §6.5 incomplete |
| Decision authority | **Owner** |

**P-2 — Production switch** · ✅ Owner, 26 Oct 2026: (a) build-time switch (detail: Milestone 11 plan §5)

| | |
|---|---|
| Question | How is sign-in kept off on the live site until G-4? |
| Evidence | Plan §5.6; every push to `main` deploys the live site (`.github/workflows/deploy.yml`). |
| Options | (a) build-time switch · (b) separate branch until G-4 · (c) runtime switch read from Supabase |
| Dependencies | G-4; §7.3 |
| Risks | (a) mistaken switch change — mitigated by the §6.1 check; (b) branch drift; (c) live site contacts Supabase while off |
| Technical recommendation | (a) |
| If unresolved | No Phase 2 code can be merged to `main` safely; step 6a blocked |
| Decision authority | **Owner** |

**P-3 — Auth records without application consent** · ◐ Owner, 26 Oct 2026: approach (a) approved; maximum age, who and how often still open — needed before G-4 only

| | |
|---|---|
| Question | (1) Do Supabase Auth records created by a completed GitHub sign-in **without** application consent count as retained personal data under the owner's "no automatic deletion" decision, or are they outside it? (2) What justified maximum age applies? (3) Which cleanup procedure (option), by whom, how often? |
| Evidence | §4.4: the record is created before consent can be recorded *(verify, A-5)*; plan §5.4: consent before the first online save; the owner's retention decision (24 Oct 2026) concerns Phase 2 data. |
| Options | (a) manual owner cleanup on a routine · (b) automatic cleanup by a scheduled job (new infrastructure, needs separate approval) · (c) retain (needs an explicit, justified policy) |
| Dependencies | P-6 (6b "Remove my sign-in"); D-11 (wording); V7; G-4 |
| Risks | (a) depends on the owner's routine; (b) another privileged component; (c) personal data kept without application consent |
| Technical recommendation | (a) with the 6b choices; (c) not recommended. No legal conclusion is drawn |
| If unresolved | Production enablement (G-4) is blocked; on `gg-test` only test accounts are cleaned (§4.8.2) |
| Decision authority | **Owner** (with the college for the consent wording, D-11) |

**P-4 — Where test evidence is kept** · ✅ Owner, 26 Oct 2026: (a) `docs/evidence/m10/`

| | |
|---|---|
| Question | Where are the security, lifecycle and deletion results stored for review (G-2b, G-5)? |
| Evidence | Plan §5.3 and §6 require results; ChatGPT reviews through the repository; the handoff convention uses `docs/plans/`, `docs/PRD.md`, `docs/PROGRESS.md`, `docs/decisions/`. |
| Options | (a) `docs/evidence/m10/` · (b) a section in PROGRESS · (c) outside the repository |
| Dependencies | §6.6 evidence rule |
| Risks | (a) public repository — only §6.6 fields; (b) long PROGRESS; (c) not visible to the reviewer |
| Technical recommendation | (a) |
| If unresolved | Evidence cannot be filed for G-2b/G-5; those gates cannot close |
| Decision authority | **Owner** |

**P-5 — New function names** · ✅ Owner, 26 Oct 2026: (a); `private.current_github_id()` and `private.is_faculty()` move to Milestone 12 with the allowlist (Milestone 11 plan M11-D4)

| | |
|---|---|
| Question | Approve `public.accept_consent(consent_version, display_name, programme)`, `private.current_github_id()`, `private.is_faculty()`? |
| Evidence | Plan §5.1 names "the faculty-role check" and "the sign-up trigger" but gives no names; K-3. |
| Options | (a) approve · (b) keep a sign-up trigger (K-3 b) · (c) other names or split responsibilities |
| Dependencies | K-3, P-7; X1–X6 |
| Risks | (a) `accept_consent` is a privileged entry point — covered by X6, LC3–LC7, NV1–NV4; (b) data before consent; (c) none specific |
| Technical recommendation | (a) |
| If unresolved | Migration 1 and the X6/LC tests cannot be written |
| Decision authority | **Owner** |

**P-6 — Account-deletion mechanism** · ✅ Owner, 26 Oct 2026: (c) two-step with owner completion; the agreed completion time is still to be set (needed for V9, before G-2b)

| | |
|---|---|
| Question | Which mechanism deletes a student's Supabase Auth user and application data: (a), (b), (c) or (d) (§4.9)? |
| Evidence | Supabase documentation (§4.9); Phase 2 principle 3; PRD §4/§8/§11 (Edge Functions in Phase 3); S-12 self-service. |
| Options | (a) database function · (b) Edge Function + Admin API (with K-8) · (c) two-step with owner completion (with K-9) · (d) request only (with K-9) |
| Dependencies | K-8 for (b); K-9 for (c)/(d); §4.9.3 on `gg-test` (G-2b) |
| Risks | (a) undocumented, may break; (b) new component and a powerful secret; (c) half state, owner workload; (d) slow, not self-service |
| Technical recommendation | (b) subject to K-8; otherwise (c). (a) only as a `gg-test` experiment with explicit risk acceptance. No option is verified |
| If unresolved | G-2a stays closed: no deletion path and no "Remove my sign-in" can be built; acceptance criterion 7 cannot be met; Milestone 10 cannot complete (S-12) |
| Decision authority | **Owner** |

**P-7 — Consent-version allowlist and re-consent** · ✅ Owner, 26 Oct 2026: (a) (new in rev 3)

| | |
|---|---|
| Question | Approve the server-controlled `private.consent_versions` allowlist, the environment rule (draft only on `gg-test`, `v1` only after D-11) and the re-consent behaviour in §4.8.3? |
| Evidence | Rev 2 review H3: the client-supplied version was not validated; plan §5.4/§5.6: consent wording approved before production. |
| Options | (a) approve as in §4.8.3 · (b) a single fixed version in code (no allowlist; re-consent by migration) · (c) no re-consent (version recorded only) |
| Dependencies | D-11 (approved wording); P-5; X1–X6 |
| Risks | (a) one more private table; (b) wording changes need a code/migration release; (c) students not asked again when the wording changes |
| Technical recommendation | (a) |
| If unresolved | `accept_consent` cannot be finalised; NV2 and LC6 cannot be written; migration 1 blocked |
| Decision authority | **Owner** |

**P-8 — Consent evidence and its retention** · ◐ Owner, 26 Oct 2026: `gg-test` uses (a); the production choice goes to the college with G-4 (new in rev 3)

| | |
|---|---|
| Question | Is any record of a student's consent (and of its withdrawal) kept — and, if so, what, for how long, and after account deletion? |
| Evidence | §4.8.3 stores only the latest version and date on the profile, which is deleted with the account; the college's accountability for consent and the owner's retention decision both bear on this; no source document decides it. |
| Options | (a) no history: consent evidence is deleted with the profile · (b) append-only consent history while the account exists, deleted with it · (c) minimal evidence kept after deletion (e.g. pseudonymous id, version, dates) for an approved period |
| Dependencies | D-11, D-12 (college); G-4; K-7 (export would include the history) |
| Risks | (a) the college cannot show that consent was given once the account is gone; (b) more data held, still lost at deletion; (c) retains personal data after the student asked for deletion — needs a justified, approved policy |
| Technical recommendation | Bring to the college with the G-4 questions; (a) is the simplest and is the minimal model in this plan until decided. No legal conclusion is drawn |
| If unresolved | Production enablement (G-4) is blocked; `gg-test` uses the minimal model (a) with test accounts only |
| Decision authority | **Owner, with the college** (institutional retention policy) |

**Q-1 — Test identities on `gg-test`** · ✅ Owner, 26 Oct 2026: (a) dedicated GitHub test accounts only — no email/password users (differs from the earlier recommendation (b))

| | |
|---|---|
| Question | Which accounts are used to test students, faculty and removed faculty on `gg-test`? |
| Evidence | K3: GitHub only in production; F2: numeric GitHub ids; tests need student A, B, faculty X, removed faculty Z, signed-out, and GitHub sign-ins for LC2/LC3/LC5/LC8/LC9. |
| Options | (a) dedicated GitHub test accounts owned by the owner · (b) email-and-password test users **only on `gg-test`** plus GitHub test accounts for F2 and the LC tests · (c) real personal accounts |
| Dependencies | G-2; for (b) `gg-test` settings differ from `gg-prod` |
| Risks | (a) account management; (b) a test-only allowlist path to document; (c) personal data in tests — not recommended |
| Technical recommendation | (b) |
| If unresolved | §6.2 and §6.3 tests cannot run; G-5 cannot close |
| Decision authority | **Owner** |

**Q-2 — Who runs the SQL suite** · ✅ Owner, 26 Oct 2026: (a), falling back to (b)

| | |
|---|---|
| Question | Who runs the SQL tests and the §4.8.2 queries that need database access to `gg-test`? |
| Evidence | Database access uses the `gg-test` password, a secret; plan §9: secrets never shared in chat, email or the repository. |
| Options | (a) owner on their own machine, sharing only results · (b) owner pastes scripts into the SQL editor and shares output · (c) a CI job with the password as a secret |
| Dependencies | G-2; A-2; (c) a new CI job not in the baseline |
| Risks | (a) manual step; (b) slower; (c) a database credential in CI — outside the approved scope |
| Technical recommendation | (a), falling back to (b) |
| If unresolved | The SQL suite, LC1 counts and the §4.8.2 procedure cannot run; G-5 cannot close |
| Decision authority | **Owner** |

### 9.6 Risks

| Risk | Mitigation |
|---|---|
| Personal data in Auth records without application consent (K-4) | Consent before redirect; 6b choices; P-3 policy; §4.8.2 procedure on test data; disclosure in D-11 |
| Deletion leaves a half state or deletes the wrong data | P-6 decided explicitly; §4.9.1 status check; V2–V6, V10 on `gg-test`; no deletion path before G-2a/G-2b |
| Overstated guarantees | Three-layer description (§4.9); "(verify)" markers; acceptance criterion 7 per option |
| Reliance on undocumented Supabase internals | Prefer documented mechanisms; A-5 – A-8 verified on `gg-test` |
| Service-role key exposure (if P-6 b) | E3, E5, K1 scan; key only in the function's secret storage, entered by the owner |
| Consent recorded for wording the student never saw | Server-side version allowlist (P-7, NV2); draft never in production |
| Residual data outside the application | Disclosed (§4.4), not promised deleted; GitHub authorisation revocation explained |
| Orphaned access token after deletion | Client signs out at once; V6; short token lifetime (A-6) |
| Misconfigured grants expose a table | Default deny; explicit revokes; X6 grant tests; R1 test on every table |
| Secrets leak into the repo or chat | K1 scan; owner enters secrets only in GitHub/Supabase; evidence rule §6.6 |
| Live site accidentally enables accounts | Production switch (P-2) and §6.1/§7.3 checks |
| Free project paused during testing | Owner restores; `gg-test` holds no real data |
| Lab PCs left signed in | Visible signed-in name, sign-out on the account page; account-switch guard in Milestone 11 |

## 10. Completion checklist (Milestone 10)

- [ ] G-0 K-1 decided and recorded · [ ] G-1 this plan approved, with the G-1 decisions taken
- [ ] G-2 `gg-test` ready (URL + anon key only shared)
- [ ] Migration 1 written, reviewed, applied to `gg-test`; `draft-1` seeded
- [ ] §6.2 and §6.3 tests pass on `gg-test`; evidence saved (§6.6)
- [ ] G-2a P-6 decided (with K-8/K-9 as needed) · [ ] G-2b applicable §4.9.3 tests pass; evidence reviewed
- [ ] Front end: consent-first sign-in, 6a–6c flows, profile, account page, export, re-consent, deletion per P-6, production switch
- [ ] `npm test` and `npm run build` pass; signed-out, offline and 360 px checks pass
- [ ] Manual tests (§6.5) and the §4.8.2 procedure done on `gg-test`
- [ ] G-3 `gg-prod` ready; migrations applied with no real data and no draft consent version; accounts still off on the live site
- [ ] PRD §12b and PROGRESS updated; Milestone 10 marked delivered **(not "in production")**
- [ ] **Owner review gate:** the owner reviews the evidence and approves the milestone as complete. Turning accounts on
  for real students is a separate, later decision after G-4 (D-9 – D-12, P-3, P-8).

## 11. Out of scope (summary)

Sync, batches, dashboard, leaderboard, live quiz, certificates, AI, scheduled jobs or Edge Functions without separate
approval, production enablement for real students, course content changes, and any change to Phase 1 behaviour for
signed-out users.
