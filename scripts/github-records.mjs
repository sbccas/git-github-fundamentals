/**
 * GitHub World Records (Bonus page /records/): refreshes the snapshot in content/github-records.json from the public
 * GitHub REST API. No token is needed and none is stored; the script paces itself to GitHub's free limits
 * (search: 10 requests a minute, other calls: 60 an hour), so a full run takes about 8 minutes.
 *
 *   node scripts/github-records.mjs                  refresh every API section
 *   node scripts/github-records.mjs --only=stars,forks
 *   node scripts/github-records.mjs --check          validate the file only (also run by npm test)
 *
 * Sections: stars, forks (GitHub's own ranking of all public repositories), pullRequests, person, threads (counts
 * from GitHub search), commits (commits on the default branch). The hand-checked sections (discussions,
 * communities, numbers, facts) are never touched: update them by hand from the source linked beside each one.
 * A section is replaced only when every request in it succeeded, so a failed run never leaves half-new data.
 * Optional: GITHUB_TOKEN in the environment raises the limits; it is only sent to api.github.com and never written.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRecords, STAR_QUERY, FORK_QUERY } from '../src/scripts/lib/records.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'content/github-records.json');
const API = 'https://api.github.com';
const TOKEN = process.env.GITHUB_TOKEN;
const HEADERS = { Accept: 'application/vnd.github+json', 'User-Agent': 'sbccas-git-github-fundamentals', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) };
const SEARCH_GAP = TOKEN ? 2200 : 6500;

const PR_REPOS = ['NixOS/nixpkgs', 'microsoft/winget-pkgs', 'Homebrew/homebrew-core', 'Homebrew/homebrew-cask', 'odoo/odoo', 'elastic/kibana',
  'pytorch/pytorch', 'llvm/llvm-project', 'home-assistant/core', 'rust-lang/rust', 'kubernetes/kubernetes', 'tensorflow/tensorflow',
  'flutter/flutter', 'microsoft/vscode', 'DefinitelyTyped/DefinitelyTyped', 'freeCodeCamp/freeCodeCamp'];
const COMMIT_REPOS = ['chromium/chromium', 'torvalds/linux', 'NixOS/nixpkgs', 'mozilla/gecko-dev', 'Homebrew/homebrew-core', 'llvm/llvm-project',
  'microsoft/winget-pkgs', 'rust-lang/rust', 'gcc-mirror/gcc', 'tensorflow/tensorflow', 'microsoft/vscode', 'kubernetes/kubernetes', 'python/cpython',
  'home-assistant/core', 'flutter/flutter', 'git/git', 'golang/go', 'nodejs/node', 'freeCodeCamp/freeCodeCamp', 'react/react'];
const PERSON = 'chenrui333';
const PERSON_REPO = 'Homebrew/homebrew-core'; // where most of this maintainer's pull requests go (checked 30 Oct 2026)

const pause = (ms) => new Promise((s) => setTimeout(s, ms));
const log = (...a) => console.log(...a);

async function call(url, { search = false } = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) {
      if (search) await pause(SEARCH_GAP);
      return { body: await res.json(), link: res.headers.get('link') };
    }
    const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000;
    const remaining = res.headers.get('x-ratelimit-remaining');
    if ((res.status === 403 || res.status === 429) && remaining === '0' && reset) {
      const wait = reset - Date.now() + 2000;
      if (wait > 10 * 60 * 1000) throw new Error(`rate limit reached; it resets at ${new Date(reset).toLocaleTimeString()}. Run again then (or use --only=…).`);
      log(`  … waiting ${Math.ceil(wait / 1000)} s for GitHub's limit to reset`);
      await pause(wait);
    } else if (res.status === 403 || res.status === 429 || res.status >= 500) {
      await pause(30000 * attempt);
    } else {
      throw new Error(`${res.status} for ${url}`);
    }
  }
  throw new Error(`gave up on ${url}`);
}

const searchCount = async (q) => (await call(`${API}/search/issues?q=${encodeURIComponent(q)}&per_page=1`, { search: true })).body.total_count;
const lastPage = (link) => Number(/[?&]page=(\d+)>;\s*rel="last"/.exec(link ?? '')?.[1] ?? 1);
const pickRepo = (x) => ({
  full_name: x.full_name, stars: x.stargazers_count, forks: x.forks_count, open_issues: x.open_issues_count, language: x.language,
  description: x.description, created_at: x.created_at, pushed_at: x.pushed_at, archived: x.archived,
});

const prCounts = new Map(); // filled by pullRequests, reused by threads in the same run

const SECTIONS = {
  async stars() {
    const { body } = await call(`${API}/search/repositories?q=${encodeURIComponent(STAR_QUERY)}&sort=stars&order=desc&per_page=10`, { search: true });
    return { items: body.items.map(pickRepo) };
  },
  async forks() {
    const { body } = await call(`${API}/search/repositories?q=${encodeURIComponent(FORK_QUERY)}&sort=forks&order=desc&per_page=10`, { search: true });
    return { items: body.items.map(pickRepo) };
  },
  async pullRequests() {
    const items = [];
    for (const repo of PR_REPOS) {
      const prs = await searchCount(`repo:${repo} is:pr`);
      prCounts.set(repo, prs);
      items.push({ repo, prs });
      log(`  ${repo}: ${prs} pull requests`);
    }
    items.sort((a, b) => b.prs - a.prs);
    for (const row of items.slice(0, 6)) {
      row.merged = await searchCount(`repo:${row.repo} is:pr is:merged`);
      row.closed_unmerged = await searchCount(`repo:${row.repo} is:pr is:closed is:unmerged`);
      row.open = await searchCount(`repo:${row.repo} is:pr is:open`);
      log(`  ${row.repo}: ${row.merged} merged, ${row.closed_unmerged} closed without merging, ${row.open} open`);
    }
    return { items: items.slice(0, 10) };
  },
  async person() {
    const { body: user } = await call(`${API}/users/${PERSON}`);
    const prs = await searchCount(`is:pr author:${PERSON}`);
    const merged = await searchCount(`is:pr author:${PERSON} is:merged`);
    const mainRepoPrs = await searchCount(`is:pr author:${PERSON} repo:${PERSON_REPO}`);
    log(`  @${PERSON}: ${prs} pull requests, ${merged} merged; ${mainRepoPrs} in ${PERSON_REPO}`);
    return { user: user.login, type: user.type, prs, merged, main_repo: PERSON_REPO, main_repo_prs: mainRepoPrs };
  },
  async threads() {
    const items = [];
    for (const repo of PR_REPOS) {
      const issues = await searchCount(`repo:${repo} is:issue`);
      const prs = prCounts.get(repo) ?? await searchCount(`repo:${repo} is:pr`);
      items.push({ repo, issues, prs });
      log(`  ${repo}: ${issues} issues + ${prs} pull requests`);
    }
    items.sort((a, b) => b.issues + b.prs - (a.issues + a.prs));
    return { items: items.slice(0, 10) };
  },
  async commits() {
    const items = [];
    for (const repo of COMMIT_REPOS) {
      const { link } = await call(`${API}/repos/${repo}/commits?per_page=1`);
      items.push({ repo, commits: lastPage(link) });
      log(`  ${repo}: ${lastPage(link)} commits`);
    }
    items.sort((a, b) => b.commits - a.commits);
    return { items };
  },
};

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const args = process.argv.slice(2);
if (args.includes('--check')) {
  const problems = validateRecords(data);
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  log('✓ content/github-records.json is valid');
  process.exit(0);
}
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',') ?? Object.keys(SECTIONS);
let failed = 0;
for (const name of only) {
  if (!SECTIONS[name]) { console.error(`unknown section "${name}"; choose from ${Object.keys(SECTIONS).join(', ')}`); process.exit(1); }
  log(`\n${name}`);
  try {
    const fresh = await SECTIONS[name]();
    data[name] = { ...data[name], ...fresh, retrieved_at: new Date().toISOString() };
    fs.writeFileSync(FILE, `${JSON.stringify(data, null, 2)}\n`);
    log(`  ✓ saved`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name} kept as it was: ${e.message}`);
  }
}
const problems = validateRecords(data);
if (problems.length) { console.error(`\nThe file now has problems:\n${problems.join('\n')}`); process.exit(1); }
log(failed ? `\n${failed} section(s) not refreshed; see above.` : '\n✓ Snapshot refreshed. Check the page, then update "verified_at" dates of any hand-checked sections you re-checked.');
process.exit(failed ? 1 : 0);
