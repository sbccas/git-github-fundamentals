/**
 * Virtual file system for one sandbox, backed by LightningFS (IndexedDB).
 * `fs` is passed to isomorphic-git; `pfs` (promises) is used by the shell.
 */
import FS from '@isomorphic-git/lightning-fs';
import { join, dirname } from './path.js';

export const HOME = '/home/student';
export const GITHUB_ROOT = '/.github';

const instances = new Map();

/**
 * One LightningFS instance per sandbox for the life of the page. Re-opening with `wipe`
 * re-initialises the same instance, which releases its storage lock first (opening a
 * second instance on the same database makes the library "steal" the lock and throw).
 */
export async function openFs(sandboxId, { wipe = false } = {}) {
  const name = `gg-sandbox-${sandboxId}`;
  let fs = instances.get(name);
  if (!fs) {
    fs = new FS(name, { wipe });
    instances.set(name, fs);
  } else if (wipe) {
    await fs.init(name, { wipe: true });
  }
  return fs;
}

export function helpers(fs) {
  const pfs = fs.promises;

  async function stat(p) {
    try { return await pfs.stat(p); } catch { return null; }
  }

  const api = {
    pfs,
    stat,
    async exists(p) { return (await stat(p)) !== null; },
    async isDir(p) { const s = await stat(p); return !!s && s.type === 'dir'; },
    async isFile(p) { const s = await stat(p); return !!s && s.type === 'file'; },
    async readText(p) { return pfs.readFile(p, { encoding: 'utf8' }); },
    async writeText(p, text) {
      await api.mkdirp(dirname(p));
      await pfs.writeFile(p, text, { encoding: 'utf8', mode: 0o644 });
    },
    async mkdirp(p) {
      if (p === '/' || (await api.isDir(p))) return;
      await api.mkdirp(dirname(p));
      try { await pfs.mkdir(p); } catch (e) { if (e.code !== 'EEXIST') throw e; }
    },
    async readdir(p) {
      const names = await pfs.readdir(p);
      return names.sort((a, b) => a.localeCompare(b));
    },
    async rmrf(p) {
      const s = await stat(p);
      if (!s) return;
      if (s.type === 'dir') {
        for (const name of await pfs.readdir(p)) await api.rmrf(join(p, name));
        await pfs.rmdir(p);
      } else {
        await pfs.unlink(p);
      }
    },
    async copy(src, dest) {
      const s = await stat(src);
      if (s.type === 'dir') {
        await api.mkdirp(dest);
        for (const name of await pfs.readdir(src)) await api.copy(join(src, name), join(dest, name));
      } else {
        await api.mkdirp(dirname(dest));
        await pfs.writeFile(dest, await pfs.readFile(src));
      }
    },
    /** All files under `dir` (relative paths), skipping .git. */
    async walkFiles(dir, prefix = '') {
      const out = [];
      for (const name of await api.readdir(dir)) {
        if (name === '.git') continue;
        const full = join(dir, name);
        const rel = prefix ? `${prefix}/${name}` : name;
        if (await api.isDir(full)) out.push(...(await api.walkFiles(full, rel)));
        else out.push(rel);
      }
      return out;
    },
  };
  return api;
}
