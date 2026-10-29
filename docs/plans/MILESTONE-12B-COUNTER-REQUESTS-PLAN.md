# Milestone 12b — participant counter and "Request to join"

| | |
|---|---|
| **Status** | ✅ **Approved by the owner on 27 Oct 2026** ("approve all": M12B-D1 – M12B-D9 as recommended), with a local trial first (§5.1). **Built, tried locally against the live project and released on 29 Oct 2026** ([evidence](../evidence/m12b/2026-10-28-local-trial.md)); WhatsApp / in-app browser note added at the owner's request (28 Oct). |
| **Owner request (27 Oct 2026)** | Show how many students take part, so students of other classes are encouraged to join; let them request the course (a waitlist) |
| **Builds on** | Milestones 10–12 as live since 27 Oct 2026 ([operations guide](../PHASE-2-OPERATIONS.md)) · [Milestone 12 plan](MILESTONE-12-DASHBOARD-PLAN.md) §6.1 go-live decisions · [PRD](../PRD.md) S-03, S-06, S-08, S-12 |
| **Programmes** | Owner: the course is for BCA, B.Sc. Data Science and M.Sc. IT students. The site already offers BCA, BCA – AI, B.Sc. Data Science and M.Sc. IT, so **no programme change is needed** (M12B-D9) |

## 1. Objective

1. **Participant counter** on the home page — totals only, never names: for example
   "🎓 312 students learning · 9 classes · 1,450 quizzes passed · 2,980 missions completed".
2. **Request to join** — a student whose class has no batch yet signs in with GitHub, chooses programme, year and
   division, and taps **Request this course**. Faculty see the requests on the dashboard and **accept** (the student is
   added to one of their batches straight away) or **decline**. The student sees the result on their account page.

## 2. Scope

**In:** one public totals function; the counter on the home page; join requests (database, account page, dashboard);
requests in "Download my data" and removed with the account; tests; operations guide update.

**Out:** email or WhatsApp notifications; requests from people who do not sign in; free-text messages; any list of
names outside the faculty dashboard; leaderboard (S-04, later).

## 3. Design

### 3.1 Participant counter

| Item | Design |
|---|---|
| Numbers | Students signed in (profiles not on the faculty list) · classes (batches with at least one student) · quizzes passed (unit quizzes passed, summed) · missions completed (summed). Certificates are added in Milestone 14 |
| Database | `public.course_stats()` — returns those four numbers only; `SECURITY DEFINER` (reads all profiles and progress to count them); the **only** function a signed-out visitor may call (X3 exception, like the planned `verify_certificate`) |
| Small numbers | Hidden until at least **20** students have signed in (M12B-D2), so a total never points to one person |
| Home page | A strip under the hero with the four numbers and a **"Want this course for your class? Request to join →"** link to the account page. Counts animate once; respects reduced motion |
| Network | The home page makes **one small request** (plain `fetch` to the database function with the public key — no Supabase library), remembered for 10 minutes on the device. Offline, blocked or failed: the strip is simply not shown; nothing else changes (M12B-D3 — an exception to "signed out: no network calls", Phase 2 plan §8) |
| Privacy | Totals are not personal data; no consent change for the counter |

### 3.2 Request to join

| Object | Design | Access |
|---|---|---|
| `private.join_requests` | `id`, `user_id` (references `profiles`, on delete cascade), `programme`, `year` (1st / 2nd / 3rd year), `division` (optional, up to 10 characters), `status` (`pending` / `accepted` / `declined` / `withdrawn`), `created_at`, `handled_by` (faculty GitHub id), `handled_at`, `batch_id` (when accepted) | No API role |
| `request_to_join(year, division)` | Signed-in student with current consent and a roll number, **not** in a batch, without a pending request → creates one (programme from the profile) | Students |
| `withdraw_request()` | The student's pending request → `withdrawn` | Students |
| `account_status()` | + `request` (status, programme, year, division, date) | As before |
| `faculty_join_requests()` | Pending requests: display name, roll no, GitHub username, programme, year, division, date — no email | All faculty on the allowlist (M12B-D6) |
| `faculty_handle_request(request_id, action, batch)` | `accept` → the student joins `batch`, which must be one of the caller's batches; `decline` → declined. Uses the request id, never a user id (X5) | Faculty |
| Export / deletion | Requests included in "Download my data"; removed with the profile (cascade) | — |

**Account page:** students without a batch see two options — "Have a code? **Join**" (as now) and "Your class is not
in the course yet? **Request this course**" (year, division) → "Request sent — waiting for faculty". Pending: **Withdraw
request**. Accepted: "You joined *batch*". Declined: "Not accepted this time — ask your teacher".

**Dashboard:** a **Requests (n)** section above the batches: one row per request with **Accept into…** (a list of the
faculty member's own batches, or "Create a batch first") and **Decline**. Accepting several students of the same class
is one click each.

### 3.3 Security and privacy

- Anonymous visitors can call `course_stats()` only; it returns four numbers. Every other function and table stays
  closed to them (X3 test updated to allow exactly this one).
- Requests need GitHub sign-in, current consent and a roll number, so there is no anonymous waitlist and no spam form;
  one pending request per student.
- Request data is limited to programme, year and division — no free text (M12B-D5). It fits the "batch" data already
  named in consent `v1` (M12B-D8).
- Faculty can accept only into their own batches; they cannot see emails; they cannot edit a student's profile or
  progress.

## 4. Tests (proposed — none run)

**SQL (`supabase/tests/`, run locally by `npm run sql-check` only):** counter returns only the four numbers, excludes
faculty, hides itself below 20 students, and is callable signed out (and nothing else is) · student creates, cannot
duplicate, withdraws, cannot request while in a batch or without a roll number · student cannot read others'
requests · faculty list shows pending requests without email · accept puts the student in the faculty member's own
batch only (another faculty member's batch refused) · decline · non-faculty cannot list or handle · export includes
the request · deletion removes it · X1–X6 for the new functions.

**`npm test`:** counter formatting and the 10-minute cache; the home page shows no strip when the request fails; the
production build check still passes.

**Manual (live, with the owner's accounts):** counter hidden below 20 then visible; a test request from a second
GitHub account appears on the dashboard; accept → the student is in the batch; decline; withdraw. The test account
and its request are deleted afterwards.

## 5. Rollout

1. Owner approves this plan → branch → build → `npm test`, `npm run sql-check`.
2. Owner applies `supabase/migrations/…000005_m12b_counter_requests.sql` in the SQL Editor (migration only).
3. Build, `npm run check:dist`, owner review, push. Update the operations guide, PROGRESS and PRD in the same commit.

### 5.1 Local trial without disturbing live students (owner request, 27 Oct 2026)

- **Website:** built and tried only on the owner's computer (`npm run dev`); the live site changes only after the
  owner's separate "push".
- **Database:** migration 5 is **additive only** — a new table, new functions, one extra field in `account_status()`,
  and execute on `course_stats()` for signed-out visitors. The live site never calls the new functions and ignores the
  extra field, so applying it to the one live project changes nothing for students. Checked first with
  `npm run sql-check`, which also re-runs every existing test.
- **Sign-in on localhost:** the owner temporarily adds `http://localhost:5173/git-github-fundamentals/account/` as an
  allowed redirect (Site URL unchanged) and sets `VITE_ACCOUNTS_ENABLED=true` locally; only the owner's own accounts
  are used; the address is removed again after the trial.
- **Counter preview:** below 20 students the counter is hidden by design; for the trial, a development-only switch
  (`?counter-preview` on localhost) shows sample numbers. It is compiled out of the live build.
- **Test request:** made with a separate GitHub test account, deleted afterwards (Authentication → Users), as before.

## 6. Decisions for the owner (all approved 27 Oct 2026)

| ID | Question | Technical recommendation |
|---|---|---|
| M12B-D1 | Counter numbers and place: students, classes, quizzes passed, missions completed — on the home page | Approve |
| M12B-D2 | Hide the counter until 20 students have signed in | Approve |
| M12B-D3 | Allow the home page one small request to Supabase for every visitor (cached 10 minutes; hidden on failure) | Approve |
| M12B-D4 | Requests only from students signed in with GitHub (no anonymous waitlist form) | Approve |
| M12B-D5 | Request fields: programme (from profile), year, division — no free-text message | Approve |
| M12B-D6 | Every faculty member on the allowlist sees all pending requests | Approve |
| M12B-D7 | "Accept" adds the student directly to one of the accepting faculty member's batches (no code needed) | Approve |
| M12B-D8 | No new consent wording: requests are "batch" data already named in `v1` | Approve (otherwise everyone re-agrees to a `v2`) |
| M12B-D9 | Programme list stays: BCA, BCA – AI, B.Sc. Data Science, M.Sc. IT | Approve |
