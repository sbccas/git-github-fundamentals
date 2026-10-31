/**
 * GitHub World Records (Bonus page /records/): labels, number formatting, the snapshot check and the optional live
 * refresh. No DOM here, so npm test runs it under Node.
 *
 * Live data comes straight from GitHub's public search API in the student's browser: no token, no backend. The
 * free limit (10 searches a minute) is shared by everyone on the same network, as a whole class in the lab is, so a
 * refresh runs only when the student presses the button, and a result is kept for six hours.
 */

export const STAR_QUERY = 'stars:>100000';
export const FORK_QUERY = 'forks:>50000';
export const LIVE_TTL_MS = 6 * 60 * 60 * 1000;
export const LIVE_KINDS = ['stars', 'forks'];

/** How fresh a figure is (owner's decision): every statistic shows one of these two. */
export const FRESHNESS = {
  live: { text: 'Live data', hint: 'Retrieved from GitHub or a live source' },
  snapshot: { text: 'Historical snapshot', hint: 'Verified at a particular date' },
};

/** How strong the claim is. Nothing on the page is called a world number one unless GitHub's own ranking shows it. */
export const CLAIMS = {
  'verified-record': { text: 'Verified record', hint: 'GitHub’s own ranking of every public repository' },
  'live-ranking': { text: 'Live ranking', hint: 'GitHub’s own ranking, fetched just now' },
  'highest-verified-example': { text: 'Highest verified example', hint: 'The largest we found among the projects we checked; not a claim of world number one' },
  'popular-example': { text: 'Popular example', hint: 'A well-known example chosen for learning, not a record' },
  'official-figure': { text: 'Official figure', hint: 'Reported by GitHub itself' },
};

const nf = new Intl.NumberFormat('en-US');
export const formatNumber = (n) => (Number.isFinite(n) ? nf.format(n) : '—');

/** 557539 → "557.5K", 1855711 → "1.86M" (for chart labels). */
export function compact(n) {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e9) return `${+(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${+(n / 1e3).toFixed(1)}K`;
  return String(n);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-10-30T16:06:41Z" → "30 Oct 2026" (dates in UTC, so every reader sees the same day). */
export function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Only owner/name made of GitHub's allowed characters becomes a link, so a strange API answer cannot inject a URL. */
const REPO_NAME = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
export const isRepoName = (s) => typeof s === 'string' && REPO_NAME.test(s) && !/(^|\/)\.+(\/|$)/.test(s); // no "." or ".." parts
export const repoUrl = (fullName) => (isRepoName(fullName) ? `https://github.com/${fullName}` : null);

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** One repository from the search API, reduced to the fields the page shows (and checked). */
export function pickRepo(x) {
  if (!x || !isRepoName(x.full_name) || !Number.isFinite(x.stargazers_count) || !Number.isFinite(x.forks_count)) return null;
  return {
    full_name: x.full_name,
    stars: x.stargazers_count,
    forks: x.forks_count,
    open_issues: Number.isFinite(x.open_issues_count) ? x.open_issues_count : null,
    language: typeof x.language === 'string' ? x.language : null,
    description: typeof x.description === 'string' ? x.description.slice(0, 300) : null,
    created_at: x.created_at ?? null,
    pushed_at: x.pushed_at ?? null,
    archived: x.archived === true,
  };
}

export class LiveError extends Error {
  constructor(kind, message, resetAt = null) {
    super(message);
    this.kind = kind; // 'rate' | 'offline' | 'bad'
    this.resetAt = resetAt;
  }
}

/** Fetch GitHub's current top 10 by stars or forks. Throws LiveError; the page then keeps the snapshot. */
export async function fetchLive(kind, { fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
  if (!LIVE_KINDS.includes(kind)) throw new LiveError('bad', `unknown list ${kind}`);
  const q = kind === 'stars' ? STAR_QUERY : FORK_QUERY;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=${kind}&order=desc&per_page=10`;
  let res;
  try {
    res = await fetchImpl(url, { headers: { Accept: 'application/vnd.github+json' }, credentials: 'omit', referrerPolicy: 'no-referrer' });
  } catch {
    throw new LiveError('offline', 'GitHub could not be reached. You may be offline.');
  }
  if (res.status === 403 || res.status === 429) {
    const reset = Number(res.headers?.get?.('x-ratelimit-reset'));
    throw new LiveError('rate', 'GitHub’s free limit for your network has been reached for now.', reset ? new Date(reset * 1000).toISOString() : null);
  }
  if (!res.ok) throw new LiveError('bad', `GitHub answered with status ${res.status}.`);
  let body;
  try { body = await res.json(); } catch { throw new LiveError('bad', 'GitHub sent an answer we could not read.'); }
  const items = Array.isArray(body?.items) ? body.items.map(pickRepo).filter(Boolean) : [];
  if (items.length < 10) throw new LiveError('bad', 'GitHub sent an incomplete list.');
  const key = kind === 'stars' ? 'stars' : 'forks';
  for (let i = 1; i < items.length; i++) if (items[i][key] > items[i - 1][key]) throw new LiveError('bad', 'GitHub sent a list out of order.');
  return { items: items.slice(0, 10), retrieved_at: now().toISOString() };
}

/** A cached live list, if it is still fresh; otherwise null. */
export function freshFromCache(cache, kind, now = new Date()) {
  const entry = cache?.[kind];
  if (!entry?.retrieved_at || !Array.isArray(entry.items) || entry.items.length !== 10) return null;
  const age = now.getTime() - new Date(entry.retrieved_at).getTime();
  if (!(age >= 0 && age < LIVE_TTL_MS)) return null;
  const items = entry.items.filter((x) => isRepoName(x?.full_name) && Number.isFinite(x.stars) && Number.isFinite(x.forks));
  return items.length === 10 ? { items, retrieved_at: entry.retrieved_at } : null;
}

/** Rank movement against the snapshot: "new", "▲2", "▼1" or "". */
export function movement(fullName, index, snapshotItems) {
  const before = snapshotItems.findIndex((x) => x.full_name === fullName);
  if (before === -1) return 'new';
  if (before === index) return '';
  return before > index ? `▲${before - index}` : `▼${index - before}`;
}

/* ---------------- Snapshot check (npm test and scripts/github-records.mjs --check) ---------------- */

const SECTION_CLAIM = {
  stars: 'verified-record', forks: 'verified-record', pullRequests: 'highest-verified-example', person: 'highest-verified-example',
  threads: 'highest-verified-example', discussions: 'popular-example', commits: 'highest-verified-example', communities: 'official-figure',
  numbers: 'official-figure',
};
const isDate = (s) => typeof s === 'string' && !Number.isNaN(new Date(s).getTime());
const isSource = (s) => typeof s === 'string' && /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}\//i.test(s);

export function validateRecords(d) {
  const p = [];
  const need = (cond, msg) => { if (!cond) p.push(msg); };
  need(d && typeof d === 'object', 'not an object');
  if (!d || typeof d !== 'object') return p;
  for (const [name, claim] of Object.entries(SECTION_CLAIM)) {
    const s = d[name];
    need(s && typeof s === 'object', `${name}: missing`);
    if (!s) continue;
    need(s.claim === claim, `${name}: claim should be "${claim}"`);
    need(isDate(s.retrieved_at ?? s.verified_at), `${name}: needs retrieved_at or verified_at`);
    need(isSource(s.source), `${name}: needs an https source link`);
    need(typeof s.method === 'string' && s.method.length > 20, `${name}: needs a method note`);
  }
  for (const key of ['stars', 'forks']) {
    const items = d[key]?.items ?? [];
    need(items.length === 10, `${key}: needs exactly 10 repositories`);
    items.forEach((x, i) => {
      need(isRepoName(x.full_name), `${key}[${i}]: bad full_name`);
      for (const f of ['stars', 'forks']) need(Number.isInteger(x[f]) && x[f] > 0, `${key}[${i}]: ${f} must be a positive whole number`);
      need(isDate(x.created_at) && isDate(x.pushed_at), `${key}[${i}]: needs created_at and pushed_at`);
      if (i) need(x[key] <= items[i - 1][key], `${key}: not in descending order at ${i + 1}`);
    });
  }
  const prs = d.pullRequests?.items ?? [];
  need(prs.length >= 5, 'pullRequests: needs at least 5 repositories');
  prs.forEach((x, i) => {
    need(isRepoName(x.repo) && Number.isInteger(x.prs), `pullRequests[${i}]: needs repo and prs`);
    if (i) need(x.prs <= prs[i - 1].prs, `pullRequests: not in descending order at ${i + 1}`);
    if (x.merged != null) {
      const sum = x.merged + x.closed_unmerged + x.open;
      need(Math.abs(sum - x.prs) <= Math.max(50, x.prs * 0.002), `pullRequests[${i}]: merged + closed + open (${sum}) does not match the total (${x.prs})`);
    }
  });
  const person = d.person ?? {};
  need(/^[A-Za-z0-9-]{1,39}$/.test(person.user ?? '') && Number.isInteger(person.prs) && Number.isInteger(person.merged) && person.merged <= person.prs, 'person: needs user, prs and merged (merged ≤ prs)');
  (d.threads?.items ?? []).forEach((x, i) => need(isRepoName(x.repo) && Number.isInteger(x.issues) && Number.isInteger(x.prs), `threads[${i}]: needs repo, issues and prs`));
  (d.discussions?.items ?? []).forEach((x, i) => {
    need(isRepoName(x.repo) && Number.isInteger(x.number) && ['issue', 'pr'].includes(x.kind), `discussions[${i}]: needs repo, number and kind`);
    need(Number.isInteger(x.comments) && ['people', 'automation'].includes(x.by), `discussions[${i}]: needs comments and by`);
  });
  const commits = d.commits?.items ?? [];
  need(commits.length >= 10, 'commits: needs at least 10 repositories');
  commits.forEach((x, i) => {
    need(isRepoName(x.repo) && Number.isInteger(x.commits) && x.commits > 0, `commits[${i}]: needs repo and commits`);
    if (i) need(x.commits <= commits[i - 1].commits, `commits: not in descending order at ${i + 1}`);
  });
  const n = d.numbers ?? {};
  need(isDate(n.period?.from) && isDate(n.period?.to), 'numbers: needs period.from and period.to');
  for (const group of ['annual', 'totals']) {
    need(Array.isArray(n[group]) && n[group].length > 0, `numbers: needs ${group}`);
    (n[group] ?? []).forEach((x, i) => {
      need(typeof x.value === 'string' && typeof x.label === 'string', `numbers.${group}[${i}]: needs value and label`);
      need(x.kind === group, `numbers.${group}[${i}]: kind must be "${group}" (annual and all-time figures are never mixed)`);
      need(isSource(x.source ?? n.source), `numbers.${group}[${i}]: needs a source`);
      if (group === 'totals') need(isDate(x.as_of), `numbers.totals[${i}]: needs as_of`);
    });
  }
  (d.facts ?? []).forEach((x, i) => need(typeof x.title === 'string' && typeof x.text === 'string' && isSource(x.source), `facts[${i}]: needs title, text and source`));
  need(!/gh[pousr]_[A-Za-z0-9]{20,}|github_pat_|Bearer\s/i.test(JSON.stringify(d)), 'contains something that looks like a token');
  return p;
}
