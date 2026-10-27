# Milestone 11 — Progress sync, and combined `gg-test` delivery with Milestone 10

| | |
|---|---|
| **Status** | ✅ **Approved by the owner on 26 Oct 2026** ("approve all recommendations": M11-D1 – M11-D5 all (a), §10), together with the Milestone 10 decisions. `gg-test` set up by the owner the same day (§11). **Implemented 27 Oct 2026 on `gg-test` only** (uncommitted until the owner reviews the diff): `npm test` SY1–SY7 pass; SQL suite 69/69 and 15 manual tests pass ([evidence](../evidence/m10/)); browser offline test not run. |
| **Source baseline** | [Phase 2 plan](PHASE-2-SUPABASE-PLAN.md) rev 4 (§4, §5.1 P1–P3 and X1–X6, §5.2, §6, §8) · [PRD](../PRD.md) v1.15 S-01, S-02, S-10, §12b Milestone 11 · [Milestone 10 plan](MILESTONE-10-FOUNDATION-PLAN.md) rev 3 |
| **Inspected** | `src/scripts/lib/progress.js` (`load`, `save`, `deriveXp`, `validateProgress`, award functions), `build/sw-template.js`, `vite.config.js`, `.gitignore`, `.github/workflows/deploy.yml` at `04fb95d` |

## 1. Objective (PRD §12b Milestone 11; Phase 2 plan §7)

**Sync:** first-sign-in offer, background sync, retries, account-switch guard, sync status — S-01 (merge offer),
S-02, S-10. A signed-in student's existing learning progress (units, quiz best/last/passed, missions, mini-games,
badges, self-check, passport name, last visited) is saved online and restored on any device, without changing how
quizzes are marked or how XP and badges are awarded.

## 2. Combined delivery with Milestone 10 (proposed governance resolution)

Phase 2 plan §7 requires each milestone to have its own approved plan. This document is Milestone 11's plan. It also
proposes that Milestones 10 and 11 are **built and tested together on `gg-test` only**:

1. Both plans keep their own scope, gates and acceptance criteria; neither is merged into the other, and no
   requirement is changed.
2. Combined work starts only after **G-0** (K-1), **G-1** for Milestone 10, approval of **this** plan, and **G-2**
   (`gg-test` set up).
3. Each milestone is recorded complete separately. **Milestone 10 cannot be recorded complete** until its deletion path
   passes (P-6, G-2a, G-2b); the rest of the combined work may be built and verified before that.
4. The live site keeps accounts **off** (§5) until G-4; switching them on is a separate approved release.

## 3. Scope

**In:** `progress` table and `save_progress` (Phase 2 plan §4, P1–P3); pure `mergeProgress` with Node tests; local-first
sync queue with retries; first-sign-in offer; account-switch guard and the sign-out choice for shared PCs; sync status
on the account page and the Git Passport; import while signed in (merge only); progress added to "Download my data"
(*pending K-7*); progress removed with the profile in every P-6 option.

**Out:** replacing the online copy with an older or smaller one (it would lower progress, which P3 forbids); per-attempt
quiz history or achievement tables (the site records neither today — Phase 2 plan §4 replaced `quiz_attempts`);
file storage (the Git Passport card is drawn on demand and never stored); faculty access to progress, leaderboard,
batches (Milestone 12); any Edge Function, scheduled job or other new component.

## 4. Design

### 4.1 Data

| Object | Definition | Access (RLS on; default deny) |
|---|---|---|
| `public.progress` | `user_id` (PK, references `public.profiles(id)` **on delete cascade**), `doc` jsonb (the existing version 1 document, ≤ 64 KB), `xp` integer (server-calculated), `revision` bigint, `updated_at` | `authenticated`: **select own row only**. No insert, update or delete grant or policy for any API role; `anon`: nothing. Written only by `save_progress` |
| `public.save_progress(doc jsonb, base_revision bigint)` → `{doc, xp, revision, merged_newer}` | `SECURITY DEFINER` under X1–X6 (needed to write a table the caller cannot write). Steps: caller = `auth.uid()` (signed out → error); caller must have a profile whose consent version is `current` (else "re-consent required", LC6); size ≤ 64 KB; validate like `validateProgress()` — wrong types or ranges reject the whole call and change nothing, unknown ids dropped, unjustified badges removed; lock the caller's row; merge with the stored copy (§4.2); `xp` = the `deriveXp()` rules; if the result equals the stored copy, return it **without** a new revision (idempotent); otherwise store with `revision + 1` | `authenticated` only; no user-id parameter (P1) |
| `private` helpers | `validate_progress`, `merge_progress`, `derive_xp` and the course constants (unit numbers, mission ids per unit, game ids, badge ids and rules) | No API role (X3, X4) |

Because the merge only adds or raises values, a stale copy cannot remove progress, so `base_revision` is used to tell
the client whether the stored copy was newer (`merged_newer`), not to reject the save. Concurrent calls are serialised
by the row lock (first save: insert-if-absent, then lock).

### 4.2 Merge rules mapped to the actual version 1 document

| Field | Rule | Source |
|---|---|---|
| `units[n].sections` | union, duplicates removed, at most 100 | Plan §5.2 |
| `units[n].total` | maximum | (content-defined count) |
| `units[n].quiz.best` / `.passed` | maximum / either | Plan §5.2 |
| `units[n].quiz.last` | value from the incoming document — *pending M11-D3* (no timestamp in v1) | Gap |
| `units[n].complete` | either | Plan §5.2 |
| `missions`, `games`, `badges` | union, earliest date kept; badges then re-justified by the existing rules | Plan §5.2 |
| `selfCheck` | `best` = maximum; `last`, `byUnit`, `at` from the entry with the newer `at` | Plan §5.2 |
| `lastVisited`, `profile.name` | plan §5.2 says "newer (time-stamped)", but v1 stores **no timestamp** for them → latest save wins when present — *pending M11-D3* | Gap |
| `xp` | recalculated: missions × 75 + first quiz passes × 100 + units complete × 50 + games × 50; the client's value is ignored | `deriveXp()` |
| `version` | must be 1; the document format is unchanged | — |

A retried quiz cannot add XP: `passed` stays true and XP is derived from facts, so repeating a sync or a quiz gives the
same total.

### 4.3 Client sync (local-first; Phase 2 plan §5.2)

- **No change to the award functions.** `progress.js` already dispatches `gg:progress` on every `save()`; the sync
  module listens to it. `progress.js` gains only the pure `mergeProgress(a, b)` export (same rules as §4.2).
- **Sync state** lives in a separate key `gg-sync` — `{ account, revision, pending, lastSyncAt, lastError }` — so
  `gg-progress` keeps its exact format.
- **Normal change:** saved locally first → `pending` → sent after a short delay with the last known revision → on
  success the local document is replaced by the returned merged document (a superset of it) and the revision stored.
  "Saved" is shown **only** after a successful response.
- **Failures:** network, paused project or server error → stays `pending`, retried on reconnect, page load and with
  back-off (30 s up to 5 min) while the page is open; status "Offline — will sync" / "Sync problem — retry". Expired
  session → keeps working locally, "Sign in again"; pending changes sync afterwards. Lost response → the retry is
  harmless (idempotent).
- **First sign-in on a device** (after the Milestone 10 consent and profile steps):

  | Device state | Behaviour |
  |---|---|
  | Synced to this account | Normal sync |
  | No local progress | Online copy loaded and tagged to this account |
  | Guest progress, or progress tagged to **another** account | Asked "Add this device's progress to *name*?" — **Add** merges it; **Keep separate** sets the local copy aside unchanged (`gg-progress-guest`), shows the online copy while signed in and restores the set-aside copy at sign-out — *pending M11-D2*. Never merged without the answer |

- **Sign-out:** "Remove my progress from this PC" (local copy and `gg-sync` cleared; online copy kept) or "Keep it on
  this PC". If changes are still pending, the student is told before signing out.
- **Import while signed in:** validated as today, then merged and synced (adds only).
- **Signed out:** exactly Phase 1 — no Supabase code loaded, no network calls.

### 4.4 Export, deletion and trust model

- `export_my_data()` adds `progress` (`doc`, `xp`, `revision`, `updated_at`) — *pending K-7*.
- `progress` is removed by the cascade from `profiles` in every P-6 option; local progress on the device is never
  touched by deletion (Milestone 10 §4.8).
- **Trust model (unchanged from Phase 1):** quizzes are marked in the browser. The server checks shape and ranges,
  keeps only justified badges and recalculates XP, but cannot verify that answers were correct; a student who edits
  their own browser data can still claim a pass, as with the Phase 1 import (G-08). Online progress is a learning
  record, **not** a tamper-proof assessment; certificates depend on the faculty-run final practical (S-07).

## 5. Production switch and service worker (Milestone 10 P-2 option (a), detailed)

- Settings come from git-ignored env files (`.env.*` is already ignored): `VITE_ACCOUNTS_ENABLED`,
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (the public key) — read in `src/scripts/data/supabase.js`.
- **Switch off (default):** `main.js` loads the account code through `import.meta.env.VITE_ACCOUNTS_ENABLED === 'true'`,
  which Vite removes at build time; `/account/` is left out of the build; the header is unchanged (the sign-in entry is
  added at run time only when enabled).
- **Guard:** `vite.config.js` fails a `production`-mode build (the GitHub Actions build) when the switch is on, until
  a separate approved release after G-4 changes that rule. Development and local test builds may use it with
  `gg-test` only.
- **Check:** a post-build script confirms the production build has no Supabase client code, no `/account/` page and
  the same page list as before.
- **Callback redirect:** one exact address per environment (K2). `gg-test`: only
  `http://localhost:5173/git-github-fundamentals/account/` (dev server on a fixed port), and its Site URL is the same
  local address — a narrowing of Phase 2 plan §9 step 5, because the live site never uses `gg-test`. `gg-prod`:
  `https://sbccas.github.io/git-github-fundamentals/account/`, configured only after G-4. The account page returns
  the student to the page they started from.
- **Service worker fix:** page navigations whose address carries `code`, `error`, `error_description` or `state` are
  fetched from the network and **not stored**; offline fallback and all other caching unchanged. Supabase requests
  are cross-origin and already bypass the service worker.

## 6. Tests (proposed — none run)

**Node (`npm test`):** SY1 merge rules — commutative, idempotent, never lowers anything, stale and simultaneous copies,
imported files · SY2 XP equals the `deriveXp()` rules; a quiz retry or repeated sync adds no XP · SY3 sync states
(pending, success, offline, server error, lost response, expired session, account switch, Keep separate restore) ·
SY4 SQL constants (units, missions, games, badges) match `site.js` and `progress.js` · SY5 the service worker does
not store `?code=` / `?error=` navigations · SY6 production build: switch off, no Supabase code, no `/account/`, same
pages; switch on in production mode fails the build · SY7 secret scan (K1) · all existing checks (115 today).

**`gg-test` SQL suite (`supabase/tests/`, owner-run per Q-2):** P1 no user-id parameter, signed-out denied, student B
cannot write A's row · P2 fixed `search_path`; invalid, oversized or wrong-version documents change nothing · P3 a
lower or older document never lowers stored values; a client `xp` is ignored · R1/R2 for `progress`: own row only,
no direct insert/update/delete, `anon` nothing · X1–X6 for `save_progress` and the helpers · no profile or retired
consent → denied · two concurrent calls → both facts kept · same document twice → revision unchanged the second time.

**Manual (`gg-test`, GitHub test accounts):** two devices (save, restore, merge); a shared PC with two accounts
(guard, sign-out choices); airplane mode (pending → synced); quiz retry; Phase 1 with Supabase blocked; 360 px.

## 7. Acceptance criteria

1. SY1–SY7 and every existing `npm test` check pass; `npm run build` passes.
2. The `gg-test` suite passes, evidence reviewed by the owner (Milestone 10 G-5 rules, P-4 location).
3. No local or online progress is lost in any SY3 or manual case; "Saved" never appears without a successful response.
4. XP always equals the `deriveXp()` rules; no repeated action or sync changes it.
5. No device's progress is merged into an account without the student's answer.
6. Production build unchanged with the switch off (SY6); the live site makes no Supabase requests.

## 8. Files expected to change (combined Milestones 10 + 11)

| New | Changed (smallest edits) |
|---|---|
| `supabase/migrations/…_m10_foundation.sql`, `…_m11_progress.sql` | `package.json`, `package-lock.json` (`@supabase/supabase-js`, lazily loaded) |
| `supabase/tests/*.sql` (incl. test-only failure scripts — never in `migrations/`) | `vite.config.js` (switch guard; `/account/` only when enabled) |
| `src/scripts/data/supabase.js` | `src/scripts/main.js` (load account code only when enabled) |
| `src/scripts/lib/account.js` (sign-in, consent, profile, sign-out) | `src/scripts/lib/progress.js` (adds pure `mergeProgress`; award rules untouched) |
| `src/scripts/lib/sync.js` (queue, device offer, status) | `src/scripts/pages/passport.js` (sync status line) |
| `src/account/index.html`, `src/scripts/pages/account.js` | `build/sw-template.js` (§5 fix) |
| `scripts/check-dist.mjs` | `tests/run-tests.mjs`; `docs/PRD.md`, `docs/PROGRESS.md` at delivery |

Not changed: routes and pages that exist today, lessons, quizzes, `src/partials/header.html`, styles except a small
account-page section, `.github/workflows/deploy.yml`.

## 9. Gates

Same as Milestone 10 (G-0, G-1, G-2; deletion G-2a/G-2b; production G-3, G-4, G-5), plus approval of this plan and
the §10 decisions. No production project, live redirect address or live switch before G-4.

## 10. Decisions for this plan (decided by the owner on 26 Oct 2026: all (a))

| ID | Question | Options | Technical recommendation | If unresolved | Decision |
|---|---|---|---|---|---|
| M11-D1 | Approve the combined `gg-test`-only delivery in §2? | (a) yes · (b) build Milestone 10 first, then 11 | (a) | Work follows the separate milestone order | ✅ (a) |
| M11-D2 | "Keep separate" behaviour (§4.3)? | (a) set the local copy aside and restore it at sign-out · (b) leave the device signed in with local progress unsynced | (a) — nothing is lost and nothing merged silently | First-sign-in offer cannot be finished | ✅ (a) |
| M11-D3 | Fields with no timestamp in v1 (`lastVisited`, `profile.name`, `quiz.last`)? | (a) latest save wins · (b) add optional timestamps (format change) | (a) — keeps the v1 format; these fields award nothing | Merge function cannot be finalised | ✅ (a) |
| M11-D4 | Defer the faculty allowlist (`faculty_allowlist`, `is_faculty()`, `current_github_id()`, F1–F4, R3 partial, LC9) to Milestone 12, where faculty first read data? | (a) defer · (b) keep in Milestone 10 | (a) — faculty can read nothing before batches exist; removes faculty test accounts. A scope change to Milestone 10 and S-09 timing, so it needs explicit approval | Milestone 10 keeps them | ✅ (a) |
| M11-D5 | Add the §5 post-build check to the deploy workflow? | (a) run locally before each Phase 2 merge · (b) add one step to `deploy.yml` | (a) now; the `vite.config.js` guard already stops a production build with the switch on | (a) applies | ✅ (a) |

## 11. `gg-test` setup record (owner, 26 Oct 2026)

| Item | Value |
|---|---|
| Supabase project | `git-github-fundamentals-test` (this plan's `gg-test`), region Mumbai, default security options |
| Project URL | `https://mkdvftgovsznnivvuwrn.supabase.co` (public) |
| Public key | publishable key (`sb_publishable_…`, public by design); kept in the git-ignored `.env.development.local` from Stage 4 |
| GitHub OAuth app | "Git & GitHub Fundamentals (test)" under the `sbccas` **personal** account (not an organisation); callback `https://mkdvftgovsznnivvuwrn.supabase.co/auth/v1/callback`; Device Flow off; "Expire user access tokens" on (GitHub's default). The site never stores or uses GitHub's token |
| Providers | GitHub on; email off; anonymous off |
| Site URL and redirect | `http://localhost:5173/git-github-fundamentals/account/` only (§5) |
| Secrets | Database password and OAuth client secret entered only by the owner; never shared with Claude or committed |
