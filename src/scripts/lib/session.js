/**
 * Remote session helpers (Milestone 12c plan §2): Part A status from local progress, GitHub project checklist from
 * GitHub's public API (run in the student's browser when they submit), link parsing, and the faculty report CSV.
 * Pure functions except checkRepo(), which takes fetch as a parameter so npm test can use recorded responses.
 */
import { REMOTE_SESSION } from '../data/session.js';
import { csvCell } from './dashboard.js';

/** "https://github.com/owner/repo(.git)(/…)" or "github.com/owner/repo" → { owner, repo, url }, else null. */
export function parseRepoUrl(input) {
  const m = /^\s*(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?(?:[/?#].*)?\s*$/i.exec(input ?? '');
  if (!m || m[2] === '.' || m[2] === '..') return null;
  return { owner: m[1], repo: m[2], url: `https://github.com/${m[1]}/${m[2]}` };
}

/** A pull request on the class-wall repository → its clean URL, else null. */
export function parseWallPr(input, wallRepo = REMOTE_SESSION.wallRepo) {
  const [owner, repo] = wallRepo.split('/');
  const re = new RegExp(`^\\s*(?:https?://)?(?:www\\.)?github\\.com/${owner}/${repo}/pull/(\\d{1,7})(?:[/?#].*)?\\s*$`, 'i');
  const m = re.exec(input ?? '');
  return m ? `https://github.com/${owner}/${repo}/pull/${m[1]}` : null;
}

/** Part A: what the student has done on the course site (from the local progress document). */
export function partAItems(doc, s = REMOTE_SESSION) {
  return [
    ...s.missions.map((id) => ({ label: `Mission ${id}`, ok: !!doc?.missions?.[id]?.done })),
    ...s.quizzes.map((n) => ({ label: `Unit ${n} quiz passed`, ok: !!doc?.units?.[String(n)]?.quiz?.passed })),
    { label: 'Self-check taken', ok: !!doc?.selfCheck },
  ];
}

/** Number of commits from a "per_page=1" list response: the page number in rel="last", else the array length. */
export function countFromLink(link, arrayLength) {
  const m = /[?&]page=(\d+)>;\s*rel="last"/.exec(link ?? '');
  return m ? Number(m[1]) : arrayLength;
}

/**
 * Check a public repository with GitHub's API (no sign-in; about 8 requests). Returns a small object that is stored
 * with the link. Never throws: problems are reported in `error`.
 */
export async function checkRepo({ owner, repo }, { fetchFn = globalThis.fetch, from = REMOTE_SESSION.from, to = REMOTE_SESSION.to } = {}) {
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const get = (path) => fetchFn(base + path, { headers: { Accept: 'application/vnd.github+json' } });
  const out = { checked_at: new Date().toISOString() };
  try {
    const r = await get('');
    if (r.status === 403 || r.status === 429) return { ...out, error: 'rate_limited' };
    if (r.status === 404) return { ...out, public: false };
    if (!r.ok) return { ...out, error: `github_${r.status}` };
    const info = await r.json();
    out.public = !info.private;
    out.pushed_at = info.pushed_at ?? null;
    const exists = async (path) => (await get(path)).status === 200;
    [out.readme, out.gitignore, out.env_file] = await Promise.all([exists('/readme'), exists('/contents/.gitignore'), exists('/contents/.env')]);
    const c = await get('/commits?per_page=1');
    out.commits = c.status === 409 ? 0 : countFromLink(c.headers.get('link'), c.ok ? (await c.json()).length : 0);
    const w = await get(`/commits?per_page=100&since=${encodeURIComponent(new Date(from).toISOString())}&until=${encodeURIComponent(new Date(to).toISOString())}`);
    out.commits_in_session = w.ok ? (await w.json()).length : 0;
    const p = await get('/pulls?state=closed&per_page=50');
    out.merged_prs = p.ok ? (await p.json()).filter((x) => x.merged_at).length : 0;
    const t = await get('/tags?per_page=100');
    out.tag_v1 = t.ok ? (await t.json()).some((x) => /^v?1(\.0){0,2}$/i.test(x.name)) : false;
  } catch {
    out.error = out.error ?? 'network';
  }
  return out;
}

/** The project checklist (plan §2) from a stored check result. */
export function checklist(check) {
  if (!check) return { items: [], score: 0, total: 6 };
  const items = [
    { label: 'Repository is public', ok: check.public === true, hint: 'GitHub → Settings → General → Change visibility → Public' },
    { label: 'README.md', ok: !!check.readme, hint: 'Add a README: project name, what it does, how to run it, team' },
    { label: '.gitignore', ok: !!check.gitignore, hint: 'Add a .gitignore (include .env, venv/, node_modules/)' },
    { label: 'At least 5 commits', ok: (check.commits ?? 0) >= 5, hint: `Now ${check.commits ?? 0} — commit your work in small steps` },
    { label: 'A pull request merged from a branch', ok: (check.merged_prs ?? 0) >= 1, hint: 'Create a branch, push it, open a pull request, merge it' },
    { label: 'Tag or release v1.0', ok: !!check.tag_v1, hint: 'git tag v1.0 && git push origin v1.0 (or Releases → Draft a new release)' },
  ];
  return { items, score: items.filter((i) => i.ok).length, total: items.length, envWarning: !!check.env_file };
}

/** Faculty report row → CSV (formula-safe cells from dashboard.js). */
export function sessionCsv(rows, batchName, window) {
  const header = ['Batch', 'Window', 'Roll no / SID', 'Display name', 'GitHub username', 'Active minutes', 'First activity', 'Last activity',
    'Missions in window', 'Self-check in window', 'Project link', 'Checklist (of 6)', 'Commits in session', '.env in repo', 'Project submitted', 'Class wall PR', 'XP'];
  const lines = rows.map((r) => {
    const c = checklist(r.project_check);
    return [batchName, window, r.roll_no ?? '', r.display_name, r.github_username, (r.active_periods ?? 0) * 5,
      r.first_activity ?? '', r.last_activity ?? '', (r.missions_in_window ?? []).join(' '), r.self_check_in_window ? 'yes' : 'no',
      r.project_url ?? '', r.project_url ? c.score : '', r.project_check?.commits_in_session ?? '', r.project_check?.env_file ? 'YES — remove' : '',
      r.project_submitted_at ?? '', r.wall_pr_url ?? '', r.xp ?? 0].map(csvCell).join(',');
  });
  return `﻿${[header.map(csvCell).join(','), ...lines].join('\r\n')}\r\n`;
}
