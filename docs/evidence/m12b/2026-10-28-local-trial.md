# Evidence — Milestone 12b (participant counter, request to join, WhatsApp note), 28 Oct 2026

| | |
|---|---|
| **Database** | `supabase/migrations/20261028000005_m12b_counter_requests.sql` applied to the live project by the owner (additive only). A second run stopped at its first statement (`course_stats` already exists); the owner's read-only check then returned **true for all 10 objects and grants** (functions, table, updated `account_status` / `export_my_data`, signed-out access to `course_stats` only) |
| **Local database check** | `npm run sql-check`: new suite `m12b_counter_requests_test.sql` **24 / 24 PASS** (twice); Milestone 10–11 suite 69 / 69 and Milestone 12 suite 41 / 41 still pass |
| **Site checks** | `npm test` incl. CT (counter) and IA (in-app browser detection, 7 sample user agents); `npm run check:dist` (counter present, `counter-preview` absent) |
| **Trial set-up (plan §5.1)** | Local accounts on; `http://localhost:5173/git-github-fundamentals/account/` temporarily added as a redirect; owner's accounts only plus the owner's test GitHub account `hitechpatel` |

| # | Manual test (localhost against the live project) | Observed result | Result |
|---|---|---|---|
| 1 | Student without a batch sees "Your class is not in the course yet?" | Request form with Year and Division | PASS |
| 2 | Request sent | "Request sent — 2nd year, division A. Waiting for the course faculty …" | PASS |
| 3 | Faculty dashboard shows requests | "Requests to join (1)" with Accept and Decline | PASS |
| 4 | Accept into own batch | "hitechpatel added to BCA 2026 – SY AI"; appears in the Students table | PASS |
| 5 | Student side after acceptance | "You are in BCA 2026 – SY AI" | PASS |
| 6 | Counter on the home page (`?counter-preview`, local only) | Counter with sample numbers and the Request to join button; 2 × 2 at 360 px, no sideways scrolling | PASS |
| — | Counter with real data | Hidden by design (fewer than 20 students) — not observable yet | — |
| — | WhatsApp / in-app browser note | Not observable on a desktop browser; detection checked by `npm test` (IA) | Not run |

**Clean-up:** test account `hitechpatel` deleted (Authentication → Users), with its profile, batch membership and
request; localhost redirect removed; local accounts switched off again.
