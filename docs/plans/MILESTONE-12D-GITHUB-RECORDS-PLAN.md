# Milestone 12d — GitHub World Records (bonus page)

| | |
|---|---|
| **Status** | Built 2026-10-30 at the owner's request (brief: "implement the complete feature"); awaiting the owner's local check before commit |
| **Page** | `/records/` — PRD P-13 · More menu "🏆 GitHub World Records", phone menu tile, Ctrl+K search, link on the Bonus page |
| **Scope rule** | Bonus learning resource only. No change to course content, missions, quizzes, the exam, the remote session, accounts or the dashboard |

## 1. What the page shows

| Section | Data | Claim label | How it was measured |
|---|---|---|---|
| Most-starred top 10 + top-5 chart + "what makes a repository popular" | rank, owner/name, stars, forks, open issues + PRs, language, description, created, last push, link | Verified record (snapshot) · Live ranking (after a refresh) | `GET /search/repositories?q=stars:>100000&sort=stars` |
| Most-forked top 10 + fork diagram | same fields | as above | `…q=forks:>50000&sort=forks` |
| Most pull requests: 10 repositories, merged / closed / open split for the top 6, one developer (@chenrui333), PR workflow diagram | counts | Highest verified example | search counts `repo:X is:pr` (+ `is:merged`, `is:closed is:unmerged`, `is:open`); `is:pr author:chenrui333` |
| Most comments: comment-type table, repositories with most conversations, most-discussed issues and PRs (people vs bots) | counts | Highest verified example · Popular example | search counts `repo:X is:issue` and `is:pr` kept separate (no double counting); comment and reaction counts from search |
| Most commits: 20 repositories with notes on mirrors | counts | Highest verified example | `GET /repos/X/commits?per_page=1` → number of the last page |
| Largest communities | Octoverse 2026 "most engaged" and "fastest-growing by contributors" lists | Official figure | GitHub Octoverse 2026 (published 28 Oct 2026) |
| GitHub by the numbers | "In one year" (1 Oct 2025 – 30 Sep 2026) and "All-time totals" (with as-of dates) in separate boxes; developers by country | Official figure | Octoverse 2026; github.com/about (30 Oct 2026) |
| Did you know? | 9 fact cards, each with a source link | — | hand-checked |
| Sources and method | every section's method, source and date, drawn from the data file | — | — |

**Labels (owner's decision).** Every figure carries one of two freshness labels: **Live data**, retrieved from GitHub or a live source, or **Historical snapshot**, verified at a particular date. It also carries a claim label: verified record, live ranking, highest verified example, popular example or official figure. Nothing is called a world number one unless GitHub's own ranking shows it.

## 2. Findings that shaped the page

- **Pull requests per person.** GitHub publishes no ranking of people. @chenrui333 is shown as the highest count we verified (58,746 PRs, 25,185 merged; 37,114 in Homebrew/homebrew-core), not as a world record.
- **Comments.** A global "sort by comments" search is topped by bot-filled issues showing exactly 2,500 comments, so the page separates human conversations from bot ones.
  - The free API stops listing comments after 30,000 pages, so a comment total for a whole repository cannot be measured. The page counts conversations instead (issues and pull requests, each counted once) and says why.
- **"Merged" depends on workflow.** odoo/odoo's merge bot pushes the commits itself and then closes the pull request (verified on #294756), so GitHub shows most of its PRs as "closed".
- **Stars can be faked.** He et al. (ICSE 2026) found about six million suspected fake stars. Several top-10 repositories are less than a year old, so the page carries a caution.
- **Repository moved.** facebook/react is now react/react.

## 3. How it works

- `content/github-records.json` holds the snapshot. `scripts/github-records.mjs` refreshes its API sections without a token:
  - It paces itself to 10 searches a minute and 60 other calls an hour.
  - `--only=` refreshes one section at a time.
  - A section is replaced only when every request in it succeeds.
  - `--check` validates the file.
  - Optional `GITHUB_TOKEN` (environment only, never written).
- The hand-checked sections (discussions, communities, numbers, facts) are edited by hand from the linked sources.
- **Live refresh.** It runs only when the student presses "Check live numbers": 2 public search requests, with no token and no cookies.
  - The result is kept for 6 hours in the browser. A second press within 15 minutes reuses it.
  - On a rate limit, an offline connection or an odd answer, the page keeps the snapshot and says why ("try again after hh:mm").
  - A class on one network shares GitHub's free limit of 10 searches a minute, so the refresh is never automatic.
- **Safety.** All text from GitHub is escaped. Links are built only from a valid owner/name. The service worker never caches GitHub API calls (cross-origin).
- **Tests** (`npm test`, section 8, RC1–RC12):
  - the snapshot is complete, sorted, dated and sourced;
  - the check rejects mixed annual and all-time figures, and token-like text;
  - the live parser handles rate limits, offline, bad data and spoofed names;
  - the cache expires correctly;
  - escaping works;
  - the menu, phone menu and search are wired;
  - the browser code sends no token.

## 4. Keeping it up to date

Faculty or the owner can refresh the snapshot, for example once a term:

1. Run `node scripts/github-records.mjs`, which takes about 8 minutes.
2. Re-check the hand-checked sections against the next Octoverse report.
3. Run `npm test`.
4. Commit.
