/** Named sandboxes (PRD T-13): each is its own IndexedDB-backed file system. */
import { openFs, helpers, HOME } from './vfs.js';
import { read, write } from '../lib/storage.js';
import { join } from './path.js';

const KEY = 'sandboxes';
const DEFAULT = { current: 'playground', items: [{ id: 'playground', name: 'Playground' }] };

export function listSandboxes() {
  const data = read(KEY, DEFAULT);
  if (!data.items?.length) return structuredClone(DEFAULT);
  return data;
}

export function setCurrent(id) {
  const data = listSandboxes();
  data.current = id;
  write(KEY, data);
}

export function addSandbox(name) {
  const data = listSandboxes();
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sandbox';
  let id = base;
  for (let i = 2; data.items.some((s) => s.id === id); i++) id = `${base}-${i}`;
  data.items.push({ id, name });
  data.current = id;
  write(KEY, data);
  return id;
}

export function removeSandbox(id) {
  const data = listSandboxes();
  data.items = data.items.filter((s) => s.id !== id);
  if (!data.items.length) data.items = structuredClone(DEFAULT.items);
  if (data.current === id) data.current = data.items[0].id;
  write(KEY, data);
}

export const historyKey = (id) => `history-${id}`;
export const settingsKey = (id) => `sandbox-settings-${id}`;

export function loadHistory(id) { return read(historyKey(id), []); }
export function saveHistory(id, list) { write(historyKey(id), list.slice(-300)); }

export function loadSettings(id) { return { githubUser: 'student', ...read(settingsKey(id), {}) }; }
export function saveSettings(id, s) { write(settingsKey(id), s); }

/**
 * Open (and on first use, seed) a sandbox file system.
 * The seed matches a lab PC where Git for Windows was installed with "Override the default branch name: main".
 */
export async function openSandbox(id, { wipe = false } = {}) {
  const fs = openFs(id, { wipe });
  const h = helpers(fs);
  const seeded = await h.isFile(join(HOME, '.gitconfig'));
  if (!seeded) {
    await h.mkdirp(HOME);
    await h.writeText(join(HOME, '.gitconfig'), '[init]\n\tdefaultBranch = main\n');
  }
  return fs;
}
