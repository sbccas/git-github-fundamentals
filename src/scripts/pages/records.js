// GitHub World Records (Bonus page /records/): draws every section from the snapshot, and swaps in live top-10
// lists when the student asks (lib/records.js). Text from GitHub is always escaped; links are built from owner/name.
import '../main.js';
import DATA from '../../../content/github-records.json';
import { read, write } from '../lib/storage.js';
import {
  FRESHNESS, CLAIMS, LIVE_KINDS, formatNumber, compact, formatDate, repoUrl, esc, fetchLive, freshFromCache, movement, LiveError,
} from '../lib/records.js';

const CACHE_KEY = 'records-live';
const RECHECK_MS = 15 * 60 * 1000; // a second press within 15 minutes reuses the last answer
const $ = (sel) => document.querySelector(sel);
const block = (name) => document.querySelector(`[data-block="${name}"]`);
const chart = (name) => document.querySelector(`[data-chart="${name}"]`);
const pct = (n, max) => `${Math.max(1.5, (n / max) * 100).toFixed(1)}%`;

const timeFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const localTime = (iso) => timeFmt.format(new Date(iso));

function repoLink(fullName, { short = false } = {}) {
  const url = repoUrl(fullName);
  const [owner, name] = String(fullName).split('/');
  const label = short ? esc(fullName) : `<span class="rec-owner">${esc(owner)}/</span><strong>${esc(name)}</strong>`;
  return url ? `<a href="${url}" target="_blank" rel="noopener">${label}</a>` : esc(fullName);
}

/** The two labels every figure carries: how fresh, and how strong the claim. */
function badges({ live = false, at, claim, source }) {
  const f = live ? FRESHNESS.live : FRESHNESS.snapshot;
  const when = live ? `retrieved ${localTime(at)}` : `verified ${formatDate(at)}`;
  const c = CLAIMS[claim];
  return `<p class="rec-badges">
    <span class="rec-pill ${live ? 'rec-live' : 'rec-snap'}" title="${esc(f.hint)}">${live ? '●' : '◷'} ${esc(f.text)} · ${esc(when)}</span>
    <span class="rec-pill rec-claim" title="${esc(c.hint)}">${esc(c.text)}</span>
    ${source ? `<a class="rec-source" href="${esc(source)}" target="_blank" rel="noopener">Source ↗</a>` : ''}
  </p>`;
}

/* ---------------- Stars and forks (snapshot or live) ---------------- */

function rankingTable(kind, list, { live }) {
  const snapshot = DATA[kind].items;
  const rows = list.items.map((r, i) => {
    const move = live ? movement(r.full_name, i, snapshot) : '';
    return `<tr>
      <td class="rec-rank" data-label="Rank">${i + 1}${move ? ` <small class="rec-move" title="Change since the snapshot of ${formatDate(DATA[kind].retrieved_at)}">${move}</small>` : ''}</td>
      <td class="rec-repo" data-label="Repository">${repoLink(r.full_name)}${r.description ? `<small>${esc(r.description)}</small>` : ''}
        <span class="rec-meta"><span>Language: <b>${esc(r.language ?? '—')}</b></span><span>Created: <b>${formatDate(r.created_at)}</b></span><span>Last push: <b>${formatDate(r.pushed_at)}</b></span></span></td>
      <td class="rec-num${kind === 'stars' ? ' rec-key' : ''}" data-label="Stars">${formatNumber(r.stars)}</td>
      <td class="rec-num${kind === 'forks' ? ' rec-key' : ''}" data-label="Forks">${formatNumber(r.forks)}</td>
      <td class="rec-num" data-label="Open issues + PRs">${formatNumber(r.open_issues)}</td>
    </tr>`;
  }).join('');
  return `${badges({ live, at: list.retrieved_at, claim: live ? 'live-ranking' : 'verified-record', source: DATA[kind].source })}
    <div class="table-wrap rec-table-wrap"><table class="rec-table">
      <caption class="visually-hidden">Top 10 public repositories by ${kind}</caption>
      <thead><tr><th scope="col">#</th><th scope="col">Repository</th><th scope="col">Stars</th><th scope="col">Forks</th>
        <th scope="col" title="GitHub’s open-issue count includes open pull requests">Open issues + PRs</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p class="rec-small">“Open issues + PRs” is GitHub’s own count, which adds open pull requests to open issues. “Last push” is the last time code was pushed.</p>`;
}

function starsChart(list) {
  const top = list.items.slice(0, 5);
  const max = Math.max(...top.map((r) => r.stars));
  return `<div class="rec-bars" role="img" aria-label="Stars and forks of the top 5 repositories">
    ${top.map((r) => `<div class="rec-bar-row">
      <span class="rec-bar-name">${esc(r.full_name.split('/')[1])}</span>
      <span class="rec-bar-track"><span class="rec-bar rec-bar-stars" style="width:${pct(r.stars, max)}"></span><b>${compact(r.stars)} ★</b></span>
      <span class="rec-bar-track"><span class="rec-bar rec-bar-forks" style="width:${pct(r.forks, max)}"></span><b>${compact(r.forks)} forks</b></span>
    </div>`).join('')}
  </div>
  <p class="rec-legend-inline"><span class="rec-key-dot rec-bar-stars"></span>Stars <span class="rec-key-dot rec-bar-forks"></span>Forks (same scale)</p>`;
}

function renderRankings(live) {
  for (const kind of LIVE_KINDS) {
    const list = live?.[kind] ?? DATA[kind];
    block(kind).innerHTML = rankingTable(kind, list, { live: Boolean(live?.[kind]) });
    if (kind === 'stars') chart('stars').innerHTML = starsChart(list);
  }
}

/* ---------------- Pull requests ---------------- */

function renderPullRequests() {
  const s = DATA.pullRequests;
  const max = s.items[0].prs;
  block('pullRequests').innerHTML = `${badges({ at: s.retrieved_at, claim: s.claim, source: s.source })}
    <div class="table-wrap"><table class="rec-table rec-compact">
      <thead><tr><th scope="col">#</th><th scope="col">Repository</th><th scope="col">Pull requests (all time)</th></tr></thead>
      <tbody>${s.items.map((r, i) => `<tr><td class="rec-rank" data-label="Rank">${i + 1}</td><td data-label="Repository">${repoLink(r.repo, { short: true })}</td>
        <td class="rec-num rec-key" data-label="Pull requests"><span class="rec-inline-bar" style="--w:${pct(r.prs, max)}"></span>${formatNumber(r.prs)}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="rec-small">Most of the top entries are <em>package collections</em> (nixpkgs, winget, Homebrew): every new app version arrives as its own pull request, often opened by a bot.</p>`;

  const split = s.items.filter((r) => r.merged != null);
  chart('prSplit').innerHTML = `<div class="rec-bars" role="img" aria-label="Merged, closed and open pull requests">
    ${split.map((r) => `<div class="rec-bar-row rec-split-row">
      <span class="rec-bar-name">${esc(r.repo)}</span>
      <span class="rec-stack" title="${formatNumber(r.merged)} merged · ${formatNumber(r.closed_unmerged)} closed without merging · ${formatNumber(r.open)} open">
        <span class="rec-seg rec-seg-merged" style="width:${(r.merged / r.prs) * 100}%"></span><span class="rec-seg rec-seg-closed" style="width:${(r.closed_unmerged / r.prs) * 100}%"></span><span class="rec-seg rec-seg-open" style="width:${(r.open / r.prs) * 100}%"></span>
      </span>
      <span class="rec-split-nums">${compact(r.merged)} merged · ${compact(r.closed_unmerged)} closed · ${compact(r.open)} open</span>
    </div>`).join('')}
  </div>
  <p class="rec-legend-inline"><span class="rec-key-dot rec-seg-merged"></span>Merged <span class="rec-key-dot rec-seg-closed"></span>Closed without merging <span class="rec-key-dot rec-seg-open"></span>Open</p>`;

  const p = DATA.person;
  const url = `https://github.com/${encodeURIComponent(p.user)}`;
  block('person').innerHTML = `${badges({ at: p.retrieved_at, claim: p.claim, source: p.source })}
    <div class="rec-person">
      <p class="rec-person-name"><a href="${url}" target="_blank" rel="noopener">@${esc(p.user)}</a></p>
      <div class="rec-stat"><b>${formatNumber(p.prs)}</b><span>pull requests opened</span></div>
      <div class="rec-stat"><b>${formatNumber(p.merged)}</b><span>shown as merged</span></div>
      <p>${formatNumber(p.main_repo_prs)} of them are in ${repoLink(p.main_repo, { short: true })}${p.main_repo === 'Homebrew/homebrew-core' ? ', the package list behind the Homebrew installer, where this maintainer keeps app versions up to date every day' : ''}.
        Not every pull request is merged: many are closed when a newer one replaces them (for example <a href="https://github.com/Homebrew/homebrew-core/pull/312160" target="_blank" rel="noopener">this one, labelled “superseded”</a>).</p>
      <p class="rec-small">This is the highest count we verified for one person; GitHub publishes no leaderboard of people, so we do not call it a world record.</p>
    </div>`;
}

/* ---------------- Comments and conversations ---------------- */

function renderDiscussions() {
  const t = DATA.threads;
  const max = Math.max(...t.items.map((r) => r.issues + r.prs));
  block('threads').innerHTML = `${badges({ at: t.retrieved_at, claim: t.claim, source: t.source })}
    <div class="rec-bars" role="img" aria-label="Issues and pull requests per repository">
      ${t.items.map((r) => `<div class="rec-bar-row rec-split-row">
        <span class="rec-bar-name">${repoLink(r.repo, { short: true })}</span>
        <span class="rec-stack rec-stack-scaled" style="--w:${pct(r.issues + r.prs, max)}"><span class="rec-seg rec-seg-issues" style="width:${(r.issues / (r.issues + r.prs)) * 100}%"></span><span class="rec-seg rec-seg-prs" style="width:${(r.prs / (r.issues + r.prs)) * 100}%"></span></span>
        <span class="rec-split-nums">${formatNumber(r.issues + r.prs)} = ${compact(r.issues)} issues + ${compact(r.prs)} PRs</span>
      </div>`).join('')}
    </div>
    <p class="rec-legend-inline"><span class="rec-key-dot rec-seg-issues"></span>Issues <span class="rec-key-dot rec-seg-prs"></span>Pull requests</p>`;

  const d = DATA.discussions;
  const rows = (items) => items.map((x) => `<tr>
      <td data-label="Conversation"><a href="https://github.com/${x.repo}/${x.kind === 'pr' ? 'pull' : 'issues'}/${x.number}" target="_blank" rel="noopener">${esc(x.title)}</a>
        <small>${esc(x.repo)} · ${x.kind === 'pr' ? 'pull request' : 'issue'} #${x.number} · ${x.year} · ${x.state}</small><small class="rec-note">${esc(x.note)}</small></td>
      <td class="rec-num rec-key" data-label="Comments">${formatNumber(x.comments)}</td>
      <td class="rec-num" data-label="Reactions">${formatNumber(x.reactions)}</td>
    </tr>`).join('');
  const people = d.items.filter((x) => x.by === 'people').sort((a, b) => b.comments - a.comments);
  const bots = d.items.filter((x) => x.by === 'automation').sort((a, b) => b.comments - a.comments);
  block('discussions').innerHTML = `${badges({ at: d.verified_at, claim: d.claim, source: d.source })}
    <div class="table-wrap"><table class="rec-table rec-compact">
      <thead><tr><th scope="col">Conversation (written by people)</th><th scope="col">Comments</th><th scope="col">Reactions</th></tr></thead>
      <tbody>${rows(people)}</tbody>
      <tbody class="rec-bot-rows"><tr><th scope="rowgroup" colspan="3">Filled mostly by bots</th></tr>${rows(bots)}</tbody>
    </table></div>`;
}

/* ---------------- Commits ---------------- */

function renderCommits() {
  const s = DATA.commits;
  const max = s.items[0].commits;
  block('commits').innerHTML = `${badges({ at: s.retrieved_at, claim: s.claim, source: s.source })}
    <div class="table-wrap"><table class="rec-table rec-compact">
      <thead><tr><th scope="col">#</th><th scope="col">Repository</th><th scope="col">Commits</th></tr></thead>
      <tbody>${s.items.map((r, i) => `<tr><td class="rec-rank" data-label="Rank">${i + 1}</td>
        <td data-label="Repository">${repoLink(r.repo, { short: true })}${r.note ? `<small class="rec-note">${esc(r.note)}</small>` : ''}</td>
        <td class="rec-num rec-key" data-label="Commits"><span class="rec-inline-bar" style="--w:${pct(r.commits, max)}"></span>${formatNumber(r.commits)}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="rec-small">Commits on each repository’s main branch. ${s.items.length} large repositories were checked; GitHub publishes no all-repository ranking of commits.</p>`;
}

/* ---------------- Communities, numbers, facts, sources ---------------- */

function renderCommunities() {
  const c = DATA.communities;
  const list = (items) => `<ol class="rec-rank-list">${items.map((r) => `<li>${repoLink(r, { short: true })}</li>`).join('')}</ol>`;
  const pair = (title, help, lists) => `<div class="rec-pair-block"><h3>${title}</h3><p class="rec-small">${help}</p>
    <div class="rec-pair"><div><p class="rec-pair-head">Community or individual</p>${list(lists.community)}</div>
    <div><p class="rec-pair-head">Run by one company</p>${list(lists.vendor)}</div></div></div>`;
  block('communities').innerHTML = `${badges({ at: c.verified_at, claim: c.claim, source: c.source })}
    <p class="rec-period">Octoverse year: ${formatDate(c.period.from)} – ${formatDate(c.period.to)}</p>
    ${pair('Most engaged', 'A blend of each repository’s rank for stars, forks and the number of different people opening pull requests and issues.', c.most_engaged)}
    ${pair('Fastest-growing by contributors', 'The biggest rise in the number of different people contributing during the year.', c.fastest_growing)}
    <p class="rec-small">Many of this year’s names are AI tools, which shows where developers’ attention went in 2026. <a href="https://github.com/firstcontributions/first-contributions" target="_blank" rel="noopener">first-contributions</a> is there because it helps beginners make their first pull request: you can try it too.</p>`;
}

function renderNumbers() {
  const n = DATA.numbers;
  const card = (x) => `<div class="rec-num-card"><b>${esc(x.value)}</b><span>${esc(x.label)}</span>${x.detail ? `<small>${esc(x.detail)}</small>` : ''}${x.period ? `<small class="rec-period">Period: ${esc(x.period)}</small>` : ''}</div>`;
  const countries = n.countries.map(([name, value]) => `<li${name === 'India' ? ' class="rec-india"' : ''}><span>${esc(name)}</span><b>${esc(value)}</b></li>`).join('');
  block('numbers').innerHTML = `${badges({ at: n.verified_at, claim: n.claim, source: n.source })}
    <div class="rec-num-box">
      <h3>In one year <span class="rec-period">${formatDate(n.period.from)} – ${formatDate(n.period.to)} · Octoverse 2026, published ${formatDate(n.published)}</span></h3>
      <div class="rec-num-grid">${n.annual.map(card).join('')}</div>
    </div>
    <div class="rec-num-box rec-num-box-total">
      <h3>All-time totals <span class="rec-period">as of the date under each figure</span></h3>
      <div class="rec-num-grid">${n.totals.map((x) => card({ ...x, period: `as of ${formatDate(x.as_of)}` })).join('')}</div>
      <h4>Developers on GitHub by country <span class="rec-period">as of September 2026</span></h4>
      <ol class="rec-countries">${countries}</ol>
    </div>`;
}

function renderFacts() {
  block('facts').innerHTML = DATA.facts.map((f) => `<div class="rec-fact">
    <p class="rec-fact-title"><span aria-hidden="true">${esc(f.icon)}</span> ${esc(f.title)}</p>
    <p>${esc(f.text)}</p>
    <a class="rec-source" href="${esc(f.source)}" target="_blank" rel="noopener">Source ↗</a>
  </div>`).join('');
}

const SECTION_NAMES = { stars: 'Most-starred', forks: 'Most-forked', pullRequests: 'Pull requests', person: 'One person’s pull requests', threads: 'Conversations', discussions: 'Most comments', commits: 'Commits', communities: 'Communities', numbers: 'GitHub by the numbers' };
function renderSources() {
  block('sources').innerHTML = `<div class="table-wrap"><table class="rec-table rec-compact rec-sources">
    <thead><tr><th scope="col">Section</th><th scope="col">How it was measured</th><th scope="col">Checked</th></tr></thead>
    <tbody>${Object.entries(SECTION_NAMES).map(([k, name]) => `<tr><td data-label="Section"><a href="${esc(DATA[k].source)}" target="_blank" rel="noopener">${name}</a></td>
      <td data-label="Method">${esc(DATA[k].method)}</td><td class="rec-date" data-label="Checked">${formatDate(DATA[k].retrieved_at ?? DATA[k].verified_at)}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

function renderClaims() {
  $('[data-claims]').innerHTML = Object.values(CLAIMS).map((c) => `<div><dt><span class="rec-pill rec-claim">${esc(c.text)}</span></dt><dd>${esc(c.hint)}.</dd></div>`).join('');
  const dates = Object.keys(SECTION_NAMES).map((k) => DATA[k].retrieved_at ?? DATA[k].verified_at).sort();
  $('[data-snapshot-date]').textContent = `Snapshot checked ${formatDate(dates[dates.length - 1])}`;
}

/* ---------------- Live refresh ---------------- */

const status = (html) => { $('[data-live-status]').innerHTML = html; };

function liveFromCache() {
  const cache = read(CACHE_KEY, {});
  const out = {};
  for (const kind of LIVE_KINDS) { const fresh = freshFromCache(cache, kind); if (fresh) out[kind] = fresh; }
  return Object.keys(out).length ? out : null;
}

async function checkLive() {
  const btn = $('[data-live-btn]');
  const cached = liveFromCache();
  const newest = cached ? Math.min(...LIVE_KINDS.map((k) => (cached[k] ? Date.now() - new Date(cached[k].retrieved_at).getTime() : Infinity))) : Infinity;
  if (cached && LIVE_KINDS.every((k) => cached[k]) && newest < RECHECK_MS) {
    status(`Already up to date: live numbers retrieved ${esc(localTime(cached.stars.retrieved_at))}. You can check again 15 minutes after that.`);
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Checking GitHub…';
  const live = { ...(cached ?? {}) };
  const errors = [];
  for (const kind of LIVE_KINDS) {
    try { live[kind] = await fetchLive(kind); } catch (e) { errors.push(e instanceof LiveError ? e : new LiveError('bad', 'Something went wrong.')); }
  }
  write(CACHE_KEY, live);
  renderRankings(Object.keys(live).length ? live : null);
  btn.disabled = false;
  btn.textContent = 'Check live numbers';
  if (!errors.length) {
    status(`✓ Live numbers retrieved ${esc(localTime(live.stars.retrieved_at))}. Arrows show moves since the snapshot.`);
  } else {
    const e = errors[0];
    const when = e.resetAt ? ` Try again after ${esc(new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(e.resetAt)))}.` : '';
    const kept = LIVE_KINDS.filter((k) => !live[k]).length === LIVE_KINDS.length ? 'Showing the snapshot instead.' : 'Lists that could not be refreshed show the snapshot.';
    status(`<span class="rec-warn">${esc(e.message)}</span> ${kept}${when}`);
  }
}

renderClaims();
renderRankings(liveFromCache());
renderPullRequests();
renderDiscussions();
renderCommits();
renderCommunities();
renderNumbers();
renderFacts();
renderSources();
const cachedNow = liveFromCache();
if (cachedNow?.stars) status(`Showing live numbers retrieved ${esc(localTime(cachedNow.stars.retrieved_at))}. They are kept for 6 hours.`);
$('[data-live-btn]').addEventListener('click', checkLive);

// Contents highlighting (same behaviour as the other long pages).
const links = new Map([...document.querySelectorAll('[data-toc]')].map((a) => [a.dataset.toc, a]));
const heads = [...document.querySelectorAll('.rec-section[id]')];
let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    let active = heads[0]?.id;
    for (const h of heads) if (h.getBoundingClientRect().top < window.innerHeight * 0.3) active = h.id;
    for (const [id, a] of links) a.classList.toggle('is-active', id === active);
  });
}, { passive: true });
// The sections were empty at first paint, so re-apply the #anchor once everything has been drawn and laid out.
const jump = () => { if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView(); };
if (document.readyState === 'complete') jump(); else window.addEventListener('load', jump, { once: true });
