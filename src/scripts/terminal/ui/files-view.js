/**
 * File explorer (PRD T-10): the home folder as a tree, with Git status colours for files
 * in the current repository. Tap a file to open it in the editor.
 */
import { findRepo } from '../git/repo.js';
import { join, relative } from '../path.js';

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const LEGEND = [
  ['untracked', 'U', 'Untracked'],
  ['modified', 'M', 'Modified'],
  ['staged', 'S', 'Staged'],
  ['conflict', '!', 'Conflict'],
];

export class FilesView {
  constructor(root, { openFile, insertCommand }) {
    this.root = root;
    this.openFile = openFile;
    this.insertCommand = insertCommand;
    this.collapsed = new Set();
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('submit', (e) => this.onSubmit(e));
  }

  async refresh(sh) {
    this.sh = sh;
    const repo = await findRepo(sh);
    const marks = new Map();
    if (repo) {
      const s = await repo.status();
      const abs = (p) => join(repo.dir, p);
      for (const c of s.staged) marks.set(abs(c.path), 'staged');
      for (const c of s.unstaged) marks.set(abs(c.path), marks.get(abs(c.path)) === 'staged' ? 'staged modified' : 'modified');
      for (const p of s.untracked) marks.set(abs(p), 'untracked');
      for (const p of s.conflicts) marks.set(abs(p), 'conflict');
    }
    const tree = await this.renderDir(sh, sh.home, 0, marks);
    this.root.innerHTML = `
      <div class="files-head">
        <span class="files-cwd" title="Current folder"><span class="muted">in</span> ${esc(sh.display(sh.cwd))}</span>
        <button class="mini-btn" type="button" data-new-file>+ New file</button>
      </div>
      <form class="new-file" data-new-form hidden>
        <input type="text" name="name" placeholder="file name, e.g. menu.txt" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="New file name">
        <button class="mini-btn" type="submit">Create</button>
      </form>
      <ul class="tree" role="tree" aria-label="Files in your home folder">${tree || '<li class="panel-empty">Your home folder is empty. Try <code>mkdir amroli-canteen</code>.</li>'}</ul>
      <div class="legend">${LEGEND.map(([k, l, t]) => `<span class="lg lg-${k}"><b>${l}</b> ${t}</span>`).join('')}</div>`;
  }

  async renderDir(sh, dir, depth, marks) {
    const names = await sh.h.readdir(dir);
    const dirs = [];
    const files = [];
    for (const n of names) (await sh.h.isDir(join(dir, n)) ? dirs : files).push(n);
    const items = [];
    for (const n of dirs) {
      const full = join(dir, n);
      if (n === '.git') {
        items.push(`<li class="t-item t-git" style="--d:${depth}" role="treeitem"><span class="t-icon">◆</span><span class="t-name">.git</span><span class="t-note">Git's database</span></li>`);
        continue;
      }
      const open = !this.collapsed.has(full);
      const isCwd = full === sh.cwd;
      const children = open ? await this.renderDir(sh, full, depth + 1, marks) : '';
      const dirty = [...marks.keys()].some((k) => k.startsWith(`${full}/`));
      items.push(`<li class="t-item t-dir${isCwd ? ' is-cwd' : ''}" style="--d:${depth}" role="treeitem" aria-expanded="${open}">
        <button type="button" class="t-toggle" data-toggle="${esc(full)}"><span class="t-icon">${open ? '▾' : '▸'}</span><span class="t-name">${esc(n)}/</span>${dirty ? '<span class="t-dot"></span>' : ''}${isCwd ? '<span class="t-note">you are here</span>' : ''}</button>
        ${open && children ? `<ul role="group">${children}</ul>` : ''}
      </li>`);
    }
    for (const n of files) {
      const full = join(dir, n);
      const mark = marks.get(full) ?? '';
      const badge = mark.includes('conflict') ? '!' : mark.includes('staged') ? 'S' : mark.includes('modified') ? 'M' : mark.includes('untracked') ? 'U' : '';
      items.push(`<li class="t-item t-file ${mark.split(' ').map((m) => `is-${m}`).join(' ')}" style="--d:${depth}" role="treeitem">
        <button type="button" class="t-open" data-open="${esc(full)}"><span class="t-icon">·</span><span class="t-name">${esc(n)}</span>${badge ? `<span class="t-badge">${badge}</span>` : ''}</button>
      </li>`);
    }
    return items.join('');
  }

  onClick(e) {
    const t = e.target.closest('[data-toggle]');
    if (t) {
      const p = t.dataset.toggle;
      if (this.collapsed.has(p)) this.collapsed.delete(p); else this.collapsed.add(p);
      this.refresh(this.sh);
      return;
    }
    const o = e.target.closest('[data-open]');
    if (o) { this.openFile(o.dataset.open); return; }
    if (e.target.closest('[data-new-file]')) {
      const form = this.root.querySelector('[data-new-form]');
      form.hidden = !form.hidden;
      if (!form.hidden) form.querySelector('input').focus();
    }
  }

  onSubmit(e) {
    const form = e.target.closest('[data-new-form]');
    if (!form) return;
    e.preventDefault();
    const name = form.querySelector('input').value.trim();
    if (!name) return;
    const rel = relative(this.sh.cwd, this.sh.abs(name)) ?? name;
    this.insertCommand(`touch ${/\s/.test(rel) ? `"${rel}"` : rel} && edit ${/\s/.test(rel) ? `"${rel}"` : rel}`, true);
  }
}
