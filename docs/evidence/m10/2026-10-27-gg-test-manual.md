# Evidence — manual tests on `gg-test` with GitHub test accounts, 27 Oct 2026

| | |
|---|---|
| **Environment** | `gg-test` · local development server `http://localhost:5173/git-github-fundamentals/` (accounts enabled only in the git-ignored `.env.development.local`) |
| **Browsers** | Chrome Incognito ("device 1") and Edge InPrivate ("device 2 / shared PC"), Windows, via the owner's remote desktop |
| **Test identities** | Two dedicated GitHub test accounts created by the owner (Q-1 (a)): "student A", "student B" — no real student data |
| **Run by** | Owner, guided step by step; results as reported by the owner. Ids truncated to 8 characters |

| # | Test (plan reference) | Observed result | Result |
|---|---|---|---|
| 1 | Signed out: account page shows the draft consent first; no request to Supabase before "I agree" (§4.1, LC1) | Consent screen shown; the browser pane check found no request to `*.supabase.co` | PASS |
| 2 | Consent → GitHub sign-in (PKCE) → back on the site (§4.1 steps 2–3) | Returned to the profile form | PASS |
| 3 | Profile saved through `accept_consent`; first online save (§4.1 step 4) | "Signed in as Student A · saved online" | PASS |
| 4 | Background sync after a progress change (M11 §4.3) | Passport 50 XP; line "Student A · Progress saved online" | PASS |
| 5 | Restore on a second device (S-02) | Edge, signed in as student A: 50 XP restored | PASS |
| 6 | Progress from two devices combined (S-10) | Unit 2 quiz on device 2 → both devices 100 XP | PASS |
| 7 | Quiz retried — no duplicate XP (P3, SY2) | Retook the Unit 2 quiz → both still 100 XP | PASS |
| 8 | Sign out → "Remove my progress from this PC" (plan §5.2) | Device 2: 0 XP, "Sign in to save your progress online"; data still online | PASS |
| 9 | First sign-in on a device with guest progress → asked, "Add" (S-01, M11 §4.3) | "This device already has progress" with Add; after Add both devices 150 XP | PASS |
| 10 | Shared PC: another account signs in → asked, never merged silently; "Keep separate" (S-10) | Student B saw the prompt; after Keep separate: 0 XP, "Student B · Progress saved online" | PASS |
| 11 | Student B cannot see student A's progress (R2, P1 — UI level) | Student B's passport 0 XP | PASS |
| 12 | Sign-out restores the set-aside progress (M11-D2) | After B signed out: 150 XP (student A's copy) back | PASS |
| 13 | Download my data (S12-E) | JSON: `display_name` Student A, `xp` 150 | PASS |
| 14 | Delete my account, option (c) (§4.9) | Student B deleted; signed out; device's earlier progress (150 XP) restored | PASS |
| 15 | Owner completion of deletion (V9, procedure) | Request listed (`c77506d2`, 15:23 UTC); owner deleted the Auth user in the dashboard; afterwards 0 pending requests, 1 Auth user, profiles "Student A 150" | PASS |
| — | Offline in the browser (§4.6) | **Not run**: disconnecting would end the remote-desktop session, and DevTools "Offline" also blocks the local development server. Covered only by `npm test` SY3 (offline, retry, lost response) | Not run |

**Not covered yet (manual):** offline/airplane mode on a phone; Android/iPhone and 360 px on a real device; LC8 (start sign-in
in one browser, finish in another); 6a/6c (close the tab before saving the profile and return); re-consent after a
wording change in the browser (covered in SQL by LC6); expired session; two simultaneous saves against the real database
(covered by the row lock design and the fake-server test, not measured); V3/V7 (residual data review).
The agreed completion time for the owner's deletion step (P-6 (c)) is still to be set.
