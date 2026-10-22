import '../polyfill.js';
import git from 'isomorphic-git';
import { join, dirname, relative } from '../path.js';
import { parseIni, serializeIni, normalizeKey } from './ini.js';

export { git };

/** An error whose message is printed exactly as Git would print it. */
export class GitError extends Error {
  constructor(message, code = 128) {
    super(message);
    this.exitCode = code;
  }
}

export const short = (oid) => oid.slice(0, 7);
export const subject = (message) => message.split('\n')[0];
export const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

export const NOT_A_REPO = 'fatal: not a git repository (or any of the parent directories): .git';

/* ---------------- Global config (~/.gitconfig) ---------------- */

export async function readGlobalConfig(sh) {
  const p = join(sh.home, '.gitconfig');
  return (await sh.h.isFile(p)) ? parseIni(await sh.h.readText(p)) : [];
}

export async function writeGlobalConfig(sh, entries) {
  await sh.h.writeText(join(sh.home, '.gitconfig'), serializeIni(entries));
}

/* ---------------- Repository discovery ---------------- */

export async function findRepo(sh, from = sh.cwd) {
  let dir = from;
  for (;;) {
    if (await sh.h.isDir(join(dir, '.git'))) return new Repo(sh, dir);
    if (dir === '/') return null;
    dir = dirname(dir);
  }
}

export async function requireRepo(sh) {
  const repo = await findRepo(sh);
  if (!repo) throw new GitError(NOT_A_REPO);
  return repo;
}

/* ---------------- Repo ---------------- */

export class Repo {
  constructor(sh, dir) {
    this.sh = sh;
    this.fs = sh.fs;
    this.h = sh.h;
    this.dir = dir;
    this.gitdir = join(dir, '.git');
    this.cache = sh.cache;
    this._commits = new Map();
    this._trees = new Map();
  }

  get base() { return { fs: this.fs, dir: this.dir, gitdir: this.gitdir, cache: this.cache }; }

  /** cwd relative to the repo root ('' at the root). */
  get prefix() { return relative(this.dir, this.sh.cwd) ?? ''; }

  /** A path typed by the user → path relative to the repo root (null if outside). */
  repoPath(userPath) {
    return relative(this.dir, this.sh.abs(userPath));
  }

  /** A repo-relative path → path relative to the current folder (how Git prints paths). */
  displayPath(repoPath) {
    const from = this.prefix ? this.prefix.split('/') : [];
    const to = repoPath.split('/');
    let i = 0;
    while (i < from.length && i < to.length - 1 && from[i] === to[i]) i++;
    return [...Array(from.length - i).fill('..'), ...to.slice(i)].join('/');
  }

  /* ----- HEAD & refs ----- */

  async headRef() {
    const raw = (await this.h.readText(join(this.gitdir, 'HEAD'))).trim();
    return raw.startsWith('ref: ') ? raw.slice(5) : null; // null = detached
  }

  async branch() {
    const ref = await this.headRef();
    return ref ? ref.replace(/^refs\/heads\//, '') : null;
  }

  async headOid() {
    try { return await git.resolveRef({ ...this.base, ref: 'HEAD' }); } catch { return null; }
  }

  async refOid(ref) {
    try { return await git.resolveRef({ ...this.base, ref }); } catch { return null; }
  }

  async branches() { return git.listBranches({ ...this.base }); }
  async remoteBranches(remote) { return git.listBranches({ ...this.base, remote }); }
  async remotes() { return git.listRemotes({ ...this.base }); }
  async tags() { return git.listTags({ ...this.base }); }

  /** Resolve a revision like HEAD, main, origin/main, v1.0, a1b2c3d, HEAD~2, main^ to a commit oid. */
  async resolve(rev) {
    const m = /^(.*?)((?:[~^]\d*)*)$/.exec(rev);
    const baseName = m[1] || 'HEAD';
    let oid = null;
    if (baseName === '@') oid = await this.headOid();
    else oid = await this.refOid(baseName);
    if (!oid && /^[0-9a-f]{4,40}$/i.test(baseName)) {
      try { oid = await git.expandOid({ ...this.base, oid: baseName.toLowerCase() }); } catch { oid = null; }
    }
    if (!oid) {
      if (baseName === 'HEAD') throw new GitError("fatal: ambiguous argument 'HEAD': unknown revision or path not in the working tree.\nUse '--' to separate paths from revisions, like this:\n'git <command> [<revision>...] -- [<file>...]'");
      throw new GitError(`fatal: ambiguous argument '${rev}': unknown revision or path not in the working tree.\nUse '--' to separate paths from revisions, like this:\n'git <command> [<revision>...] -- [<file>...]'`);
    }
    oid = await this.peel(oid);
    for (const step of m[2].match(/[~^]\d*/g) ?? []) {
      const n = step.length > 1 ? Number(step.slice(1)) : 1;
      const c = await this.commit(oid);
      if (step[0] === '~') {
        for (let i = 0; i < n; i++) {
          const cc = await this.commit(oid);
          if (!cc.parent.length) throw new GitError(`fatal: ambiguous argument '${rev}': unknown revision or path not in the working tree.`);
          oid = cc.parent[0];
        }
      } else {
        if (n === 0) continue;
        if (!c.parent[n - 1]) throw new GitError(`fatal: ambiguous argument '${rev}': unknown revision or path not in the working tree.`);
        oid = c.parent[n - 1];
      }
    }
    return oid;
  }

  /** Follow annotated tags to the commit they point at. */
  async peel(oid) {
    for (let i = 0; i < 5; i++) {
      const { type, object } = await git.readObject({ ...this.base, oid, format: 'parsed' });
      if (type !== 'tag') return oid;
      oid = object.object;
    }
    return oid;
  }

  async commit(oid) {
    if (!this._commits.has(oid)) {
      const { commit } = await git.readCommit({ ...this.base, oid });
      this._commits.set(oid, commit);
    }
    return this._commits.get(oid);
  }

  /** Map of path → { oid, mode } for a commit's tree. */
  async treeMap(commitOid) {
    if (!commitOid) return new Map();
    const { tree } = await this.commit(commitOid);
    return this.treeMapOf(tree);
  }

  async treeMapOf(treeOid) {
    if (this._trees.has(treeOid)) return this._trees.get(treeOid);
    const out = new Map();
    const walk = async (oid, prefix) => {
      const { tree } = await git.readTree({ ...this.base, oid });
      for (const e of tree) {
        const p = prefix ? `${prefix}/${e.path}` : e.path;
        if (e.type === 'tree') await walk(e.oid, p);
        else if (e.type === 'blob') out.set(p, { oid: e.oid, mode: e.mode });
      }
    };
    if (treeOid !== EMPTY_TREE) await walk(treeOid, '');
    this._trees.set(treeOid, out);
    return out;
  }

  /** Map of path → oid for the index (staging area). */
  async indexMap() {
    const rows = await git.walk({
      ...this.base,
      trees: [git.STAGE()],
      map: async (fp, [e]) => {
        if (fp === '.' || !e) return undefined;
        if ((await e.type()) === 'tree') return undefined;
        return [fp, await e.oid()];
      },
    });
    return new Map(rows);
  }

  async blobText(oid) {
    const { blob } = await git.readBlob({ ...this.base, oid });
    return new TextDecoder().decode(blob);
  }

  async workText(repoPath) {
    const p = join(this.dir, repoPath);
    return (await this.h.isFile(p)) ? this.h.readText(p) : null;
  }

  /* ----- Config ----- */

  async localConfig() {
    const p = join(this.gitdir, 'config');
    return (await this.h.isFile(p)) ? parseIni(await this.h.readText(p)) : [];
  }

  async getConfig(key) {
    const k = normalizeKey(key);
    const local = (await this.localConfig()).filter((e) => e.key === k).pop();
    if (local) return local.value;
    const global = (await readGlobalConfig(this.sh)).filter((e) => e.key === k).pop();
    return global ? global.value : undefined;
  }

  async setConfig(key, value) {
    await git.setConfig({ ...this.base, path: key, value });
  }

  async identity() {
    const name = await this.getConfig('user.name');
    const email = await this.getConfig('user.email');
    return name && email ? { name, email } : null;
  }

  async requireIdentity() {
    const id = await this.identity();
    if (id) return id;
    throw new GitError(`Author identity unknown

*** Please tell me who you are.

Run

  git config --global user.email "you@example.com"
  git config --global user.name "Your Name"

to set your account's default identity.
Omit --global to set the identity only in this repository.

fatal: unable to auto-detect email address (got 'student@SBCCAS.(none)')`);
  }

  /** Run fn with user.name/email present in the local config (isomorphic-git only reads local config). */
  async withLocalIdentity(fn) {
    const id = await this.requireIdentity();
    const local = await this.localConfig();
    const hadName = local.some((e) => e.key === 'user.name');
    const hadEmail = local.some((e) => e.key === 'user.email');
    if (!hadName) await this.setConfig('user.name', id.name);
    if (!hadEmail) await this.setConfig('user.email', id.email);
    try {
      return await fn();
    } finally {
      if (!hadName) await this.setConfig('user.name', undefined);
      if (!hadEmail) await this.setConfig('user.email', undefined);
    }
  }

  /* ----- Merge state ----- */

  async mergeState() {
    const p = join(this.gitdir, 'MERGE_HEAD');
    if (!(await this.h.isFile(p))) return null;
    const oid = (await this.h.readText(p)).trim();
    const msgPath = join(this.gitdir, 'MERGE_MSG');
    const message = (await this.h.isFile(msgPath)) ? await this.h.readText(msgPath) : '';
    const confPath = join(this.gitdir, 'SIM_CONFLICTS');
    const conflicts = (await this.h.isFile(confPath)) ? JSON.parse(await this.h.readText(confPath)) : [];
    return { oid, message, conflicts };
  }

  async writeMergeState(oid, message, conflicts) {
    await this.h.writeText(join(this.gitdir, 'MERGE_HEAD'), `${oid}\n`);
    await this.h.writeText(join(this.gitdir, 'MERGE_MSG'), message);
    await this.h.writeText(join(this.gitdir, 'SIM_CONFLICTS'), JSON.stringify(conflicts));
  }

  async resolveConflict(repoPath) {
    const st = await this.mergeState();
    if (!st) return;
    await this.h.writeText(join(this.gitdir, 'SIM_CONFLICTS'), JSON.stringify(st.conflicts.filter((c) => c !== repoPath)));
  }

  async clearMergeState() {
    for (const f of ['MERGE_HEAD', 'MERGE_MSG', 'SIM_CONFLICTS']) {
      const p = join(this.gitdir, f);
      if (await this.h.isFile(p)) await this.h.pfs.unlink(p);
    }
  }

  /* ----- Status ----- */

  /**
   * Same shape as isomorphic-git's statusMatrix ([path, head, workdir, stage]) but decided by file
   * *content*. isomorphic-git trusts file timestamps, which misses same-size edits made within the
   * same second — common in a fast in-browser terminal.
   */
  async statusMatrix() {
    const headMap = await this.treeMap(await this.headOid());
    const index = await this.indexMap();
    const work = new Map();
    for (const p of await this.h.walkFiles(this.dir)) work.set(p, null);
    const rows = [];
    for (const p of [...new Set([...headMap.keys(), ...index.keys(), ...work.keys()])].sort()) {
      const headOid = headMap.get(p)?.oid ?? null;
      const indexOid = index.get(p) ?? null;
      if (!headOid && !indexOid && (await git.isIgnored({ ...this.base, filepath: p }))) continue;
      let workOid = null;
      if (work.has(p)) {
        const { oid } = await git.hashBlob({ object: await this.h.pfs.readFile(join(this.dir, p)) });
        workOid = oid;
      }
      const head = headOid ? 1 : 0;
      const workdir = !workOid ? 0 : workOid === headOid ? 1 : 2;
      const stage = !indexOid ? 0 : indexOid === headOid ? 1 : indexOid === workOid ? 2 : 3;
      rows.push([p, head, workdir, stage]);
    }
    return rows;
  }

  /** Classified status: { staged: [{path, kind}], unstaged: [{path, kind}], untracked: [path], conflicts: [path] } */
  async status() {
    const matrix = await this.statusMatrix();
    const merge = await this.mergeState();
    const conflicts = merge?.conflicts ?? [];
    const staged = [];
    const unstaged = [];
    const untracked = [];
    for (const [path, head, work, stage] of matrix) {
      if (conflicts.includes(path)) continue;
      if (head === 0 && stage === 0) { if (work === 2) untracked.push(path); continue; }
      if (head === 0 && (stage === 2 || stage === 3)) staged.push({ path, kind: 'new file' });
      else if (head === 1 && (stage === 2 || stage === 3)) staged.push({ path, kind: 'modified' });
      else if (head === 1 && stage === 0) {
        staged.push({ path, kind: 'deleted' });
        if (work !== 0) untracked.push(path);
      }
      if (stage === 1 && work === 2) unstaged.push({ path, kind: 'modified' });
      else if ((stage === 1 || stage === 3 || stage === 2) && work === 0) unstaged.push({ path, kind: 'deleted' });
      else if (stage === 3 && work !== 0) unstaged.push({ path, kind: 'modified' });
    }
    return { staged, unstaged, untracked, conflicts };
  }

  /* ----- Working tree sync ----- */

  /** Paths whose blob differs between two commits (either may be null). */
  async changedPaths(fromOid, toOid) {
    const a = await this.treeMap(fromOid);
    const b = await this.treeMap(toOid);
    const out = [];
    for (const p of new Set([...a.keys(), ...b.keys()])) {
      if (a.get(p)?.oid !== b.get(p)?.oid) out.push(p);
    }
    return out.sort();
  }

  /** Make the working tree and index match `toOid` for every path that differs from `fromOid`. */
  async syncTo(fromOid, toOid) {
    const target = await this.treeMap(toOid);
    for (const p of await this.changedPaths(fromOid, toOid)) {
      const full = join(this.dir, p);
      const entry = target.get(p);
      if (entry) {
        const { blob } = await git.readBlob({ ...this.base, oid: entry.oid });
        await this.h.mkdirp(dirname(full));
        await this.h.pfs.writeFile(full, blob);
        await git.add({ ...this.base, filepath: p, force: true });
      } else {
        if (await this.h.isFile(full)) await this.h.pfs.unlink(full);
        await git.remove({ ...this.base, filepath: p });
        await this.removeEmptyDirs(dirname(full));
      }
    }
  }

  async removeEmptyDirs(dir) {
    while (dir !== this.dir && dir.startsWith(this.dir)) {
      if (!(await this.h.isDir(dir)) || (await this.h.readdir(dir)).length) return;
      await this.h.pfs.rmdir(dir);
      dir = dirname(dir);
    }
  }

  /** Tracked paths with uncommitted changes (staged or not). */
  async dirtyPaths() {
    const s = await this.status();
    return [...new Set([...s.staged.map((x) => x.path), ...s.unstaged.map((x) => x.path), ...s.conflicts])];
  }

  /** Commits reachable from `oid` (inclusive), as a Set. */
  async ancestors(oid, limit = 5000) {
    const seen = new Set();
    const stack = [oid];
    while (stack.length && seen.size < limit) {
      const o = stack.pop();
      if (!o || seen.has(o)) continue;
      seen.add(o);
      try { stack.push(...(await this.commit(o)).parent); } catch { /* missing object (shallow) */ }
    }
    return seen;
  }

  async isAncestor(ancestor, of) {
    if (ancestor === of) return true;
    return (await this.ancestors(of)).has(ancestor);
  }
}

/* ---------------- Tree helpers (work with any { fs, gitdir }) ---------------- */

/** Flat Map(path → { oid, mode }) of a tree. */
export async function readTreeFlat(base, treeOid) {
  const out = new Map();
  const walk = async (oid, prefix) => {
    const { tree } = await git.readTree({ ...base, oid });
    for (const e of tree) {
      const p = prefix ? `${prefix}/${e.path}` : e.path;
      if (e.type === 'tree') await walk(e.oid, p);
      else if (e.type === 'blob') out.set(p, { oid: e.oid, mode: e.mode });
    }
  };
  if (treeOid && treeOid !== EMPTY_TREE) await walk(treeOid, '');
  return out;
}

/** Write nested tree objects for a flat Map(path → { oid, mode }); returns the root tree oid. */
export async function writeTreeFlat(base, files) {
  const root = new Map();
  for (const [p, e] of files) {
    const parts = p.split('/');
    let node = root;
    for (const d of parts.slice(0, -1)) {
      if (!node.has(d)) node.set(d, new Map());
      node = node.get(d);
    }
    node.set(parts[parts.length - 1], e);
  }
  const write = async (node) => {
    const tree = [];
    for (const [name, v] of node) {
      if (v instanceof Map) tree.push({ mode: '040000', path: name, oid: await write(v), type: 'tree' });
      else tree.push({ mode: typeof v.mode === 'number' ? v.mode.toString(8).padStart(6, '0') : (v.mode ?? '100644'), path: name, oid: v.oid, type: 'blob' });
    }
    return git.writeTree({ ...base, tree });
  };
  return write(root);
}

/* ---------------- Formatting ---------------- */

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Git's default date format: "Thu Oct 22 21:45:00 2026 +0530" in the author's time zone. */
export function formatDate(timestamp, timezoneOffset) {
  const offsetMin = -timezoneOffset; // isomorphic-git stores getTimezoneOffset() style values
  const d = new Date((timestamp + offsetMin * 60) * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  return `${DAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} ${d.getUTCFullYear()} ${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`;
}

export const plural = (n, word, pluralWord = `${word}s`) => `${n} ${n === 1 ? word : pluralWord}`;
