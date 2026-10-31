# Phase 2 — operations and troubleshooting guide

How student sign-in, online progress and the faculty dashboard work, how to run them day to day, how to change them
safely, and what to check when something goes wrong. Keep this file up to date with every Phase 2 change (same
commit as the change). Requirements: [PRD](PRD.md) §7 S-01 – S-12 · decisions: [Milestone 10](plans/MILESTONE-10-FOUNDATION-PLAN.md),
[Milestone 11](plans/MILESTONE-11-SYNC-PLAN.md), [Milestone 12](plans/MILESTONE-12-DASHBOARD-PLAN.md) (go-live record §6.1) ·
test evidence: [`docs/evidence/`](evidence/).

## 1. What is live (since 27 Oct 2026)

| Feature | Where | Who |
|---|---|---|
| Optional sign-in with GitHub, consent `v1`, profile (name, programme, roll no / SID) | `/account/` | Students and faculty |
| Progress saved online and restored on any device (units, quizzes, missions, mini-games, badges, XP, self-check) | Every page (background), status on the Git Passport and the account page | Signed-in students |
| Join a batch with the code shown in class | `/account/` → "Your batch" | Students (roll number required) |
| Request the course when the class has no batch yet; faculty accept or decline | `/account/` → "Your batch"; dashboard → "Requests to join" | Students · faculty |
| Participant counter (totals only; hidden below 20 students) | Home page, under "Course at a glance" | Everyone |
| "Open this page in Chrome first" note inside WhatsApp / Instagram / Facebook browsers | `/account/` (signed out) | Students on phones |
| Remote session card (Part A status, Part B project link with GitHub checklist, Part C class-wall PR) | `/account/` → Remote session | Students |
| Remote session report (active minutes, missions, project, PR; CSV) and collapsible sections | Dashboard → Remote session report | Faculty |
| Remote session timer (countdown, own active minutes) during 31 Oct 11:00 – 15:00 | Header bar on every page; account page | Students |
| Final exam marked on the server (25 questions, 30 min, pass 40%; result at once; review after close) | `/exam/`; dashboard → Final exam | Students · faculty |
| Faculty dashboard: batches, join code (projector view), student table, CSV | `/teach/dashboard/` (also More menu, faculty only) | Faculty on the allowlist |
| Download my data · Delete my account | `/account/` | Everyone signed in |

Students who never sign in use the site exactly as in Phase 1 — no Supabase code is downloaded and no request is made.

## 2. How it fits together

```
GitHub Pages (static site, built by GitHub Actions on every push to main)
  └─ browser: progress saved on the device first (localStorage gg-progress, unchanged v1 format)
       └─ signed in: lib/sync.js sends it to Supabase → save_progress() validates, merges, recalculates XP
Supabase project "git-github-fundamentals" (ref mkdvftgovsznnivvuwrn, Mumbai, free plan) — the ONLY project
  ├─ Auth: GitHub OAuth app "Git & GitHub Fundamentals" (owned by the sbccas GitHub account); email/anonymous off
  ├─ public schema: profiles, progress, batches (RLS on, default deny) + functions the site calls
  └─ private schema (never reachable from the site): consent_versions, environment, faculty_allowlist,
     batch_faculty, batch_join_codes, join_attempts, deletion_requests, helper functions
```

| Fact | Value |
|---|---|
| Environment | `private.environment` = `production` (test scripts refuse to run) |
| Consent | `v1` current (`private.consent_versions`); wording in `src/scripts/data/supabase.js` — both must match |
| Sign-in return address | Site URL and the only redirect: `https://sbccas.github.io/git-github-fundamentals/account/` |
| Faculty allowlist | `contact2hitech` (course instructor, GitHub id 115479871) · `dr-hiralpatel` (SYBCA AI coordinator, added 29 Oct 2026) · `sbccas` (temporary coordinator, 49284143 — remove when no longer needed, §4) |
| First batch | "BCA 2026 – SY AI" (BCA – AI, 2026) |
| Public values in the site | Project URL + publishable key (`sb_publishable_…`) only. **Never** a secret key, service-role key or database password |
| Rate limits (Auth → Rate Limits) | Sign-ups and sign-ins 300 / 5 min per IP · token refreshes 600 · token verifications 300 (raised for class sign-ins) |

## 3. Where things are

| Area | Files |
|---|---|
| Database (applied to the live project in order) | `supabase/migrations/20261027000001…` – `20261028000005…` (5: counter and requests) |
| Counter · in-app browser note | `src/scripts/lib/counter.js`, `src/styles/counter.css` · `src/scripts/lib/inapp.js` |
| Remote session (dates, class-wall repository) · GitHub checklist and report CSV | `src/scripts/data/session.js` · `src/scripts/lib/session.js`; database: migration 6 |
| One-time go-live switch (already run) | `supabase/live/switch_to_live.sql` |
| Database tests (local only now) | `supabase/tests/*.sql`, run by `npm run sql-check` |
| Account settings, consent wording, programmes | `src/scripts/data/supabase.js` |
| Supabase client and calls | `src/scripts/lib/account.js` |
| Sync engine (pending, retries, merge, device choices) | `src/scripts/lib/sync.js`; merge rules also in `lib/progress.js` (`mergeProgress`) |
| Header button, Passport line, faculty menu link | `src/scripts/lib/account-boot.js`, `src/styles/account.css` |
| Account page | `src/account/index.html`, `src/scripts/pages/account.js` |
| Faculty dashboard | `src/teach/dashboard/index.html`, `src/scripts/pages/dashboard.js`, `src/scripts/lib/dashboard.js`, `src/styles/dashboard.css` |
| Live on/off switch | `ACCOUNTS_IN_PRODUCTION` in `vite.config.js` |
| Service worker (never stores sign-in return pages) | `build/sw-template.js` |
| Checks | `npm test` (site, sync, CSV, secret scan) · `npm run sql-check` (database) · `npm run check:dist` (after `npm run build`) |

## 4. Everyday tasks

All SQL runs in Supabase → **SQL Editor** → New query. Never paste a secret into chat, email or the repository.

**Add a faculty member** — they sign in once on `/account/` (consent and profile), then:

```sql
insert into private.faculty_allowlist (github_id, note)
select github_id, 'Faculty — <name / role>' from public.profiles where lower(github_username) = lower('<github-username>')
returning github_id, note;
```

Then, on the dashboard, an existing faculty member opens **Faculty with access** and adds the username.

**Replace the coordinator (sbccas → new account)** — add the new account as above and give it access on the dashboard;
then remove the old one (access ends at once):

```sql
delete from private.faculty_allowlist where github_id = 49284143 returning github_id;
delete from private.batch_faculty where github_id = 49284143 returning batch_id;
```

**New batch for another class** — faculty dashboard → **Create a batch** (name with year and division, e.g.
"TYBSc IT 2026 – A") → show the code in class. **New code** makes the old one stop working; **Disable code** stops new
joins. Students who already joined stay.

**Add a programme (e.g. B.Sc. IT)** — needs a small change: a new migration that widens the programme checks on
`profiles` and `batches`, the same value in `PROGRAMMES` (`src/scripts/data/supabase.js`) and in the functions that
validate it (`accept_consent`, `faculty_create_batch`), then `npm run sql-check`, apply the migration, push.

**Keep a record after each class** — dashboard → **Download CSV** (the free plan has no downloadable backups).
CSV files contain names, roll numbers and progress: store them under the college's data policy.

**Deletion requests** (a student used "Delete my account"; their profile and progress are already gone):

```sql
select left(user_id::text, 8) as user_id, requested_at from private.deletion_requests order by requested_at;
```

Remove the sign-in record when the college decides to: Authentication → Users → the user with that id → Delete.
(No time limit has been decided yet — Milestone 12 plan §6.1.)

**Sign-ins without a profile** (signed in, never saved the profile) — kept for now (P-3):

```sql
select left(u.id::text, 8) as id, u.created_at from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id) order by u.created_at;
```

**Change the consent wording** — new version id (e.g. `v2`): change `CONSENT` in `src/scripts/data/supabase.js`, push,
then immediately:

```sql
update private.consent_versions set status = 'retired' where status = 'current';
insert into private.consent_versions (version, status, environment, approved_by, approved_at)
values ('v2', 'current', 'production', '<who approved, date>', now());
```

Everyone signed in is asked to agree again before anything new is saved online (download, delete and sign-out keep
working). Between the push and the SQL, sign-in shows "Please reload" — do both together.

### Exam day (final exam, Milestone 12c part 2)

The question bank (75 questions with answers) lives only in the git-ignored folder `exam-bank/` on the owner's
computer and in the database — **never in the repository or a chat**. To change questions: edit
`exam-bank/questions.json` → `node scripts/exam-bank.mjs` (checks it and writes `question-bank-review.html` and
`load-questions.sql`) → run `load-questions.sql` in the SQL Editor (older questions are retired; papers already started
keep working).

1. **Before class:** dashboard → select **BCA 2026 – SY AI** → Final exam → check "Question bank … ✓" →
   **Create an exam for BCA 2026 – SY AI** → confirm the batch name. It stays closed.
2. **In class:** students open **More → Final exam** (or `/exam/`) and wait on "No exam is open right now".
   Tap **Open the exam** → their pages show the rules within 15 seconds → they tap **Start**.
3. **During:** the Final exam section refreshes every 20 seconds (started · submitted · passed). **Show results** lists
   every student: not started / in progress / submitted, answers, score, minutes, how often they left the page.
4. **After 30 minutes** papers submit themselves; then tap **Close the exam** — unfinished papers are marked with the
   answers saved so far, and students can now see the correct answers. **Download CSV** for the records.
5. A student whose phone died: they open `/exam/` again on any device, signed in — the paper resumes with the same
   questions, answers and deadline.

## 5. Making a change safely

1. Plan → owner approval → a branch (not `main`) — the project's normal workflow.
2. Code change → `npm test`. Database change → a **new** file in `supabase/migrations/` (never edit an applied one) and
   new tests in `supabase/tests/` → `npm run sql-check` until it passes.
3. Owner applies the **new migration only** in the SQL Editor of the live project. **Never run anything from
   `supabase/tests/` on the live project** (they stop themselves, but do not try).
4. `npm run build` → `npm run check:dist` → review → merge to `main` → push. GitHub Actions runs `npm test` and deploys
   in about 2 minutes; a failing test stops the deploy and the old site stays up.
5. Record evidence in `docs/evidence/`, update this guide, PROGRESS and the PRD in the same commit.

**Local development:** `.env.development.local` (git-ignored) keeps accounts **off**, because the only Supabase project
holds real student data and `localhost` is no longer an allowed sign-in address. To try account features locally,
temporarily add `http://localhost:5173/git-github-fundamentals/account/` under Authentication → URL Configuration, set
`VITE_ACCOUNTS_ENABLED=true`, use only your own accounts, and remove the address again afterwards.

## 6. Rollback

- **Switch accounts off on the live site:** set `ACCOUNTS_IN_PRODUCTION = false` in `vite.config.js`, push. The site is
  back to Phase 1 for everyone; all data stays in Supabase; device progress is untouched.
- **A bad database change:** write a new migration that reverses it (migrations are append-only), check with
  `npm run sql-check`, apply.

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| GitHub sign-in ends on an error page or the Supabase site | Return address not allowed | Authentication → URL Configuration: Site URL and redirect exactly `https://sbccas.github.io/git-github-fundamentals/account/` |
| "Sign-in could not be completed in this browser" | Started in one browser or app, finished in another (e.g. GitHub app opened the link) | Start again and finish in the same browser |
| "This consent version is not accepted. Please reload" / "Please reload" page | Site and database consent versions differ | `CONSENT.version` in `supabase.js` must equal the `current` row in `private.consent_versions` |
| Many students in one room cannot sign in for a few minutes | Rate limit per internet address | Authentication → Rate Limits (see §2); wait 5 minutes |
| Header dot amber, "Offline — will be saved online later" | No internet or Supabase unreachable | Nothing to do; it retries and saves when online. Progress is safe on the device |
| Header dot red, "Please sign in again" | Session ended | Sign in again on `/account/`; pending progress is then sent |
| "Please review the updated consent" | New consent version | Agree on `/account/` |
| "Sync problem — open your account page" | The server rejected the progress document (very rare: damaged browser data) | Account page → Save now; if it persists, export progress (About page) and inspect |
| Student: "Please add your roll number / SID first" | Roll number missing | Account page → Edit profile → Roll no |
| Student: "This code is not valid" | Wrong, old (regenerated) or disabled code | Check the code on the dashboard; enable it or make a new one |
| Student: "Too many attempts" | 10 wrong codes within an hour | Wait an hour |
| Faculty: "This page is for course faculty" | Not on the allowlist, or signed in with a different GitHub account | §4 Add a faculty member; check the signed-in account on `/account/` |
| Faculty: batch missing on the dashboard | Not linked to that batch | Another faculty member adds the username under **Faculty with access** |
| A student's XP looks lower than expected | Progress made on a device that never signed in, or "Keep separate" chosen | Sign in on that device and choose **Add**; XP is always recalculated from the work done |
| A badge earned through two devices is not shown yet | Badges are awarded on the device when the next mission or quiz is completed | Complete any mission or quiz |
| Student: "This exam is not for your batch" | Student not in the exam's batch | Account page → Your batch (join with the class code); then start |
| Student: "The question bank is not ready" | Fewer than 5 active questions in a unit | Load `exam-bank/load-questions.sql` |
| An exam was created in the wrong batch | It stays a draft (invisible) until opened | Delete it: `delete from private.exams where status = 'draft' and title = '…' returning title;` |
| Supabase project paused | Free projects pause after a long time without use | Supabase dashboard → Restore project |
| Counter not on the home page | Fewer than 20 students signed in (by design), or the request failed | Nothing to fix; it appears from 20 students. Locally, `?counter-preview` shows sample numbers |
| Session report shows nothing / an error | Window longer than 24 hours, or "To" before "From" | Use 31 Oct 11:00 → 15:00 (or any window up to 24 h) |
| Project checklist says "GitHub is busy" | GitHub allows about 7 checks per hour per internet address | The link is saved; tap Check again later, or open the repository from the report |
| A student's request does not appear | Student not signed in fully (no profile / roll number), already in a batch, or request withdrawn | Account page → Your batch; dashboard → Refresh |

## 8. Limits and known limitations

- Quizzes are marked in the browser: saved progress is a learning record, not a tamper-proof score; certificates
  depend on the faculty-run final practical (S-07).
- Free plan: no downloadable backups (keep CSVs), projects pause when unused for a long time; capacity is ample for
  several hundred students.
- Keep-alive (31 Oct 2026): `.github/workflows/keep-alive.yml` asks the database for the public student counter once a
  day (read-only, publishable key only) so the free project is not paused, and commits `.github/keep-alive.txt` once a
  month so GitHub does not switch the schedule off after 60 quiet days. A failed run emails the repository owner.
  If the project is paused anyway: Supabase dashboard → the project → **Resume project** (possible for up to a year).
  The course pages keep working while it is paused; only sign-in, sync, the dashboard, the exam and the counter stop.
- One Supabase project for everything (M12-D8): no separate test project, so database changes are checked locally
  with `npm run sql-check` only.
- Not yet tested on real phones for the account pages; offline sync was tested by automated tests only.

## 9. Remaining features and open decisions

| Item | Status |
|---|---|
| Participant counter and "Request to join" | ✅ Live 29 Oct 2026 (Milestone 12b) |
| Remote session tracking (31 Oct) and server-marked final exam (2 Nov) | Approved 29 Oct 2026 — [Milestone 12c plan](plans/MILESTONE-12C-SESSION-EXAM-PLAN.md) |
| More programmes (B.Sc. IT, TY classes, …) | Needs the programme list from the owner (§4) |
| Opt-in batch leaderboard (S-04) | Later (M12-D1) |
| Live classroom quiz (S-05, Milestone 13) · certificates and `/verify/` (S-07, Milestone 14) | Not started |
| Time limit for removing deleted students' sign-in records (P-6) · clean-up of sign-ins without a profile (P-3) | Not decided (kept aside) |
| Phase 3 AI tutor (D-8) | Not started |
