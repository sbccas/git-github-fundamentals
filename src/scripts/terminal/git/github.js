/**
 * Simulated GitHub (PRD T-05). Repositories live in the sandbox file system under /.github/<owner>/<name>.git
 * as bare Git repositories. push/fetch/clone copy real Git objects between repositories.
 */
import { git, readTreeFlat, writeTreeFlat, short } from './repo.js';
import { GITHUB_ROOT } from '../vfs.js';
import { join } from '../path.js';

const URL_RE = /^(?:https?:\/\/(?:www\.)?github\.com\/|git@github\.com:)([A-Za-z0-9-_.]+)\/([A-Za-z0-9-_.]+?)(?:\.git)?\/?$/;

export function parseGithubUrl(url) {
  const m = URL_RE.exec(url ?? '');
  return m ? { owner: m[1], name: m[2] } : null;
}

export const repoUrl = ({ owner, name }) => `https://github.com/${owner}/${name}.git`;
export const webUrl = ({ owner, name }) => `https://github.com/${owner}/${name}`;
export const gitdirOf = ({ owner, name }) => `${GITHUB_ROOT}/${owner.toLowerCase()}/${name.toLowerCase()}.git`;

export async function exists(sh, id) {
  return sh.h.isDir(gitdirOf(id));
}

export async function listRepos(sh) {
  const out = [];
  if (!(await sh.h.isDir(GITHUB_ROOT))) return out;
  for (const owner of await sh.h.readdir(GITHUB_ROOT)) {
    const dir = join(GITHUB_ROOT, owner);
    if (!(await sh.h.isDir(dir))) continue;
    for (const n of await sh.h.readdir(dir)) {
      if (!n.endsWith('.git')) continue;
      const metaPath = join(dir, n, 'sim-meta.json');
      const meta = (await sh.h.isFile(metaPath)) ? JSON.parse(await sh.h.readText(metaPath)) : {};
      out.push({ owner: meta.owner ?? owner, name: meta.name ?? n.slice(0, -4), description: meta.description ?? '', created: meta.created ?? 0 });
    }
  }
  return out.sort((a, b) => b.created - a.created);
}

const person = (name, email) => ({ name, email, timestamp: Math.floor(Date.now() / 1000), timezoneOffset: new Date().getTimezoneOffset() });

export async function createRepo(sh, { owner, name, description = '', readme = false, ownerName = owner }) {
  const id = { owner, name };
  const gitdir = gitdirOf(id);
  if (await sh.h.isDir(gitdir)) throw new Error(`${owner}/${name} already exists`);
  await sh.h.mkdirp(gitdir);
  await git.init({ fs: sh.fs, gitdir, bare: true, defaultBranch: 'main' });
  await sh.h.writeText(join(gitdir, 'sim-meta.json'), JSON.stringify({ owner, name, description, created: Date.now() }));
  if (readme) {
    const base = { fs: sh.fs, gitdir };
    const text = `# ${name}\n${description ? `\n${description}\n` : ''}`;
    const blob = await git.writeBlob({ ...base, blob: new TextEncoder().encode(text) });
    const tree = await writeTreeFlat(base, new Map([['README.md', { oid: blob, mode: '100644' }]]));
    const who = person(ownerName, `${owner}@users.noreply.github.com`);
    const commit = await git.writeCommit({ ...base, commit: { message: 'Initial commit\n', tree, parent: [], author: who, committer: who } });
    await git.writeRef({ ...base, ref: 'refs/heads/main', value: commit, force: true });
  }
  return id;
}

export async function deleteRepo(sh, id) {
  await sh.h.rmrf(gitdirOf(id));
}

/** All loose object ids in a git dir. */
async function objectIds(sh, gitdir) {
  const root = join(gitdir, 'objects');
  const ids = [];
  if (!(await sh.h.isDir(root))) return ids;
  for (const d of await sh.h.readdir(root)) {
    if (!/^[0-9a-f]{2}$/.test(d)) continue;
    for (const f of await sh.h.readdir(join(root, d))) ids.push(d + f);
  }
  return ids;
}

/** Copy objects missing in `to`. Returns the number copied. */
export async function copyObjects(sh, fromGitdir, toGitdir) {
  const have = new Set(await objectIds(sh, toGitdir));
  let n = 0;
  for (const oid of await objectIds(sh, fromGitdir)) {
    if (have.has(oid)) continue;
    const src = join(fromGitdir, 'objects', oid.slice(0, 2), oid.slice(2));
    const dst = join(toGitdir, 'objects', oid.slice(0, 2), oid.slice(2));
    await sh.h.mkdirp(join(toGitdir, 'objects', oid.slice(0, 2)));
    await sh.h.pfs.writeFile(dst, await sh.h.pfs.readFile(src));
    n++;
  }
  return n;
}

export async function remoteRefs(sh, id) {
  const gitdir = gitdirOf(id);
  const base = { fs: sh.fs, gitdir };
  const branches = {};
  for (const b of await git.listBranches(base)) branches[b] = await git.resolveRef({ ...base, ref: `refs/heads/${b}` });
  const tags = {};
  for (const t of await git.listTags(base)) tags[t] = await git.resolveRef({ ...base, ref: `refs/tags/${t}` });
  let head = null;
  try {
    const raw = (await sh.h.readText(join(gitdir, 'HEAD'))).trim();
    head = raw.startsWith('ref: refs/heads/') ? raw.slice('ref: refs/heads/'.length) : null;
  } catch { head = null; }
  return { branches, tags, head };
}

export async function setRemoteRef(sh, id, ref, oid) {
  const base = { fs: sh.fs, gitdir: gitdirOf(id) };
  if (oid === null) await git.deleteRef({ ...base, ref });
  else await git.writeRef({ ...base, ref, value: oid, force: true });
}

/* ---------------- Browsing (for the GitHub panel) ---------------- */

export async function repoSnapshot(sh, id, branch = null) {
  const gitdir = gitdirOf(id);
  const base = { fs: sh.fs, gitdir };
  const refs = await remoteRefs(sh, id);
  const names = Object.keys(refs.branches);
  const current = branch && refs.branches[branch] ? branch : refs.head && refs.branches[refs.head] ? refs.head : names[0] ?? null;
  if (!current) return { id, refs, branch: null, files: [], commits: [] };
  // Every commit reachable from the branch (like GitHub's commits page), newest first.
  const commits = [];
  const seen = new Set();
  const queue = [refs.branches[current]];
  while (queue.length && seen.size < 200) {
    const oid = queue.shift();
    if (!oid || seen.has(oid)) continue;
    seen.add(oid);
    const { commit } = await git.readCommit({ ...base, oid });
    commits.push({ oid, short: short(oid), message: commit.message.split('\n')[0], author: commit.author.name, timestamp: commit.committer.timestamp, parents: commit.parent.length, order: commits.length });
    queue.push(...commit.parent);
  }
  commits.sort((a, b) => b.timestamp - a.timestamp || a.order - b.order);
  commits.length = Math.min(commits.length, 30);
  const { commit } = await git.readCommit({ ...base, oid: refs.branches[current] });
  const files = [...(await readTreeFlat(base, commit.tree)).entries()].map(([path, e]) => ({ path, oid: e.oid })).sort((a, b) => a.path.localeCompare(b.path));
  return { id, refs, branch: current, files, commits };
}

export async function readRemoteBlob(sh, id, oid) {
  const { blob } = await git.readBlob({ fs: sh.fs, gitdir: gitdirOf(id), oid });
  return new TextDecoder().decode(blob);
}

/* ---------------- Teammate activity ---------------- */

const TEAMMATES = [
  { name: 'Dhruvi Patel', email: 'dhruvi@example.com', file: 'orders.py', line: (n) => `# Dhruvi: order API update #${n}` },
  { name: 'Meet Shah', email: 'meet@example.com', file: 'schema.sql', line: (n) => `-- Meet: added table change #${n}` },
  { name: 'Hetvi Desai', email: 'hetvi@example.com', file: 'README.md', line: (n) => `- Hetvi: updated project notes (${n})` },
];

/**
 * A teammate pushes one commit to `branch` on the simulated GitHub repo.
 * Optional `edit` = { path, content, message, who } for missions that need a specific change.
 */
export async function teammatePush(sh, id, branch = null, edit = null) {
  const gitdir = gitdirOf(id);
  const base = { fs: sh.fs, gitdir };
  const refs = await remoteRefs(sh, id);
  const target = branch ?? refs.head ?? Object.keys(refs.branches)[0] ?? 'main';
  const parentOid = refs.branches[target] ?? null;
  const files = parentOid ? await readTreeFlat(base, (await git.readCommit({ ...base, oid: parentOid })).commit.tree) : new Map();
  const mate = edit?.who ?? TEAMMATES[Math.floor(Math.random() * TEAMMATES.length)];
  let path = edit?.path ?? mate.file;
  let content = edit?.content;
  if (content === undefined) {
    const prev = files.has(path) ? new TextDecoder().decode((await git.readBlob({ ...base, oid: files.get(path).oid })).blob) : '';
    const count = prev.split('\n').filter(Boolean).length + 1;
    content = `${prev}${prev && !prev.endsWith('\n') ? '\n' : ''}${mate.line(count)}\n`;
  }
  const blob = await git.writeBlob({ ...base, blob: new TextEncoder().encode(content) });
  files.set(path, { oid: blob, mode: '100644' });
  const tree = await writeTreeFlat(base, files);
  const who = person(mate.name, mate.email);
  const message = edit?.message ?? `Update ${path}`;
  const commit = await git.writeCommit({ ...base, commit: { message: `${message}\n`, tree, parent: parentOid ? [parentOid] : [], author: who, committer: who } });
  await git.writeRef({ ...base, ref: `refs/heads/${target}`, value: commit, force: true });
  return { branch: target, oid: commit, author: mate.name, message, path };
}
