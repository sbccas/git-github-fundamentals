# Evidence — `gg-test` SQL security suite, 27 Oct 2026

| | |
|---|---|
| **Environment** | `gg-test` (Supabase project `git-github-fundamentals-test`, Mumbai) |
| **Applied by** | Owner, Supabase SQL Editor (Q-2 (b)) |
| **Migrations** | `supabase/migrations/20261027000001_m10_foundation.sql`, `20261027000002_m11_progress.sql` |
| **Seed** | `supabase/tests/seed_gg_test.sql` → environment `test`, current consent version `draft-1` |
| **Suite** | `supabase/tests/m10_m11_security_test.sql` |
| **Test identities** | Two fake users created and removed by the suite (ids `a0000000…`, `b0000000…`; fake GitHub ids 990000001/2; no real accounts) |
| **Result** | **69 of 69 PASS** (owner-reported output; the suite's CLEAN check confirms the test users and their data were removed) |
| **Not covered by this suite** | Concurrent saves from two sessions, real GitHub OAuth, the browser client and service worker, deletion completion by the owner in the dashboard (V9), V3/V7 — Stage 5 |

| Area | Tests | Result |
|---|---|---|
| Environment | T0 | PASS |
| RLS, table and column grants (R1) | R1a–R1e | PASS |
| Private schema and privileged functions (X1–X5) | X4, X1-X2, X2, X3a–X3c, X5 | PASS |
| Before consent (LC2) | LC2a–LC2c | PASS |
| Consent and profile validation (NV1–NV4, LC4, LC7) | NV1, NV2a–c, NV3a–c, NV4, LC4a–c, LC7 | PASS |
| Profile isolation (R2) | R2a–R2i | PASS |
| Progress ownership, server XP, merge, validation (P1–P3, SY) | P1a–f, P3a–b, SY-idem, SY-stale, SY-retry, P2a–f | PASS |
| Re-consent (LC6) | LC6a–e | PASS |
| Download my data (S12-E) | S12-E | PASS |
| Deletion option (c) (V2, V5, V6, V10) | Vc1–Vc3, V2, V5, V6, V10 | PASS |
| Run completeness and clean-up | DONE, CLEAN | PASS |

Before giving the scripts to the owner, the same migrations, seed and suite also passed (69/69, twice) in a local
PGlite database with a stand-in for Supabase's auth schema. That local run is a pre-check only, not evidence for G-5.
