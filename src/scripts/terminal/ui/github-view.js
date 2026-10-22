/**
 * Simulated GitHub panel (PRD T-05): create repositories, browse files and commits,
 * copy clone URLs, and make a teammate push a commit.
 */
import { listRepos, createRepo, deleteRepo, repoSnapshot, readRemoteBlob, teammatePush, repoUrl, webUrl } from '../git/github.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ago = (ts) => {
  const s = Math.max(1, Math.floor(Date.now() / 1000 - ts));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export class GithubView {
  constructor(root, { getUser, setUser, insertCommand, notify }) {
    this.root = root;
    this.getUser = getUser;
    this.setUser = setUser;
    this.insertCommand = insertCommand;
    this.notify = notify;
    this.selected = null; // { owner, name }
    this.branch = null;
    this.preview = null;
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('submit', (e) => this.onSubmit(e));
    this.root.addEventListener('change', (e) => this.onChange(e));
  }

  async refresh(sh) {
    this.sh = sh;
    const user = this.getUser();
    const repos = await listRepos(sh);
    if (this.selected && !repos.some((r) => r.owner.toLowerCase() === this.selected.owner.toLowerCase() && r.name.toLowerCase() === this.selected.name.toLowerCase())) this.selected = null;

    if (this.selected) {
      this.root.innerHTML = await this.renderRepo(sh, this.selected);
      return;
    }
    this.root.innerHTML = `
      <div class="gh-top">
        <span class="gh-logo" aria-hidden="true">◎</span>
        <span class="gh-title">GitHub <span class="gh-sim">simulated</span></span>
      </div>
      <form class="gh-user" data-user-form>
        <label for="gh-user-input">Your username</label>
        <div class="gh-user-row"><span class="muted">github.com/</span><input id="gh-user-input" name="user" value="${esc(user)}" autocomplete="off" autocapitalize="off" spellcheck="false" pattern="[A-Za-z0-9\-]+" required><button class="mini-btn" type="submit">Save</button></div>
      </form>
      <details class="gh-new" ${repos.length ? '' : 'open'}>
        <summary class="mini-btn mini-btn-primary">+ New repository</summary>
        <form data-new-repo class="gh-form">
          <label>Repository name <input name="name" required placeholder="amroli-canteen" pattern="[A-Za-z0-9._\-]+" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
          <label>Description <span class="muted">(optional)</span> <input name="description" placeholder="Canteen pre-order app" autocomplete="off"></label>
          <label class="gh-check"><input type="checkbox" name="readme"> Add a README file <span class="muted">— leave this off when you will push an existing project</span></label>
          <button class="mini-btn mini-btn-primary" type="submit">Create repository</button>
        </form>
      </details>
      <p class="gh-section">Repositories</p>
      ${repos.length ? `<ul class="gh-list">${repos.map((r) => `<li><button type="button" class="gh-repo" data-select="${esc(r.owner)}/${esc(r.name)}"><span class="gh-repo-name">${esc(r.owner)}/<strong>${esc(r.name)}</strong></span>${r.description ? `<span class="muted">${esc(r.description)}</span>` : ''}</button></li>`).join('')}</ul>` : '<p class="panel-empty">No repositories yet. Create one above — it lives only in this browser.</p>'}
      <p class="panel-note">This is a practice GitHub inside your browser. Nothing is sent to the real github.com.</p>`;
  }

  async renderRepo(sh, id) {
    const snap = await repoSnapshot(sh, id, this.branch);
    this.branch = snap.branch;
    const url = repoUrl(id);
    const branches = Object.keys(snap.refs.branches);
    const tags = Object.keys(snap.refs.tags);
    const empty = !snap.branch;
    let previewHtml = '';
    if (this.preview && snap.files.some((f) => f.oid === this.preview.oid)) {
      const text = await readRemoteBlob(sh, id, this.preview.oid);
      previewHtml = `<div class="gh-preview"><div class="gh-preview-head"><span>${esc(this.preview.path)}</span><button class="mini-btn" type="button" data-close-preview>Close</button></div><pre>${esc(text)}</pre></div>`;
    }
    return `
      <div class="gh-top">
        <button type="button" class="mini-btn" data-back>← All repos</button>
        <span class="gh-title">${esc(id.owner)}/<strong>${esc(id.name)}</strong></span>
      </div>
      <div class="gh-clone">
        <span class="muted">HTTPS</span>
        <code title="${esc(url)}">${esc(url)}</code>
        <button class="mini-btn" type="button" data-copy="${esc(url)}">Copy</button>
      </div>
      <div class="gh-actions">
        ${empty
          ? `<button class="mini-btn mini-btn-primary" type="button" data-insert="git remote add origin ${esc(url)}">Insert: git remote add origin …</button>`
          : `<button class="mini-btn mini-btn-primary" type="button" data-insert="git clone ${esc(url)}">Insert: git clone …</button>
             <button class="mini-btn" type="button" data-teammate>👥 A teammate pushes a commit</button>`}
      </div>
      ${empty ? `<div class="panel-empty"><p><strong>This repository is empty.</strong></p><p>Push an existing project:</p><pre class="gh-snippet">git remote add origin ${esc(url)}\ngit branch -M main\ngit push -u origin main</pre></div>` : `
      <div class="gh-bar">
        <label class="gh-branch">⎇ <select data-branch aria-label="Branch">${branches.map((b) => `<option ${b === snap.branch ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></label>
        <span class="muted">${branches.length} branch${branches.length === 1 ? '' : 'es'} · ${tags.length} tag${tags.length === 1 ? '' : 's'}</span>
      </div>
      <div class="gh-latest">
        <span class="gh-avatar">${esc(snap.commits[0].author[0])}</span>
        <span><strong>${esc(snap.commits[0].author)}</strong> ${esc(snap.commits[0].message)}</span>
        <span class="muted">${snap.commits[0].short} · ${ago(snap.commits[0].timestamp)}</span>
      </div>
      <ul class="gh-files">${snap.files.map((f) => `<li><button type="button" data-preview="${esc(f.path)}" data-oid="${f.oid}">📄 ${esc(f.path)}</button></li>`).join('')}</ul>
      ${previewHtml}
      <p class="gh-section">Commits on ${esc(snap.branch)}</p>
      <ol class="gh-commits">${snap.commits.map((c) => `<li><span class="gh-avatar sm">${esc(c.author[0])}</span><span class="gh-cmsg">${esc(c.message)}</span><span class="muted">${esc(c.author.split(' ')[0])} · <code>${c.short}</code> · ${ago(c.timestamp)}</span></li>`).join('')}</ol>
      ${tags.length ? `<p class="gh-section">Tags</p><p>${tags.map((t) => `<span class="ref ref-tag">🏷 ${esc(t)}</span>`).join(' ')}</p>` : ''}`}
      <details class="gh-danger"><summary>Danger zone</summary><button class="mini-btn mini-btn-danger" type="button" data-delete-repo>Delete this repository</button></details>
      <p class="panel-note">${esc(webUrl(id))} · simulated in your browser</p>`;
  }

  async onClick(e) {
    const t = e.target;
    const sel = t.closest('[data-select]');
    if (sel) { const [owner, name] = sel.dataset.select.split('/'); this.selected = { owner, name }; this.branch = null; this.preview = null; return this.refresh(this.sh); }
    if (t.closest('[data-back]')) { this.selected = null; this.preview = null; return this.refresh(this.sh); }
    const copy = t.closest('[data-copy]');
    if (copy) {
      try { await navigator.clipboard.writeText(copy.dataset.copy); this.notify('Copied clone URL'); } catch { this.notify('Copy failed — select the URL and copy it'); }
      return undefined;
    }
    const ins = t.closest('[data-insert]');
    if (ins) { this.insertCommand(ins.dataset.insert); return undefined; }
    const pv = t.closest('[data-preview]');
    if (pv) { this.preview = { path: pv.dataset.preview, oid: pv.dataset.oid }; return this.refresh(this.sh); }
    if (t.closest('[data-close-preview]')) { this.preview = null; return this.refresh(this.sh); }
    if (t.closest('[data-teammate]')) {
      const res = await teammatePush(this.sh, this.selected, this.branch);
      this.notify(`${res.author} pushed “${res.message}” to ${res.branch}. Try git fetch or git pull.`);
      return this.refresh(this.sh);
    }
    if (t.closest('[data-delete-repo]')) {
      if (!window.confirm(`Delete ${this.selected.owner}/${this.selected.name} from the simulated GitHub? Your local copies are not affected.`)) return undefined;
      await deleteRepo(this.sh, this.selected);
      this.selected = null;
      return this.refresh(this.sh);
    }
    return undefined;
  }

  async onSubmit(e) {
    e.preventDefault();
    const form = e.target;
    if (form.matches('[data-user-form]')) {
      const v = form.elements.namedItem('user').value.trim();
      if (/^[A-Za-z0-9-]+$/.test(v)) { this.setUser(v); this.notify(`Username set to ${v}`); }
      return this.refresh(this.sh);
    }
    if (form.matches('[data-new-repo]')) {
      const name = form.elements.namedItem('name').value.trim();
      const owner = this.getUser();
      try {
        await createRepo(this.sh, { owner, name, description: form.elements.namedItem('description').value.trim(), readme: form.elements.namedItem('readme').checked });
      } catch (err) {
        this.notify(err.message);
        return undefined;
      }
      this.selected = { owner, name };
      this.branch = null;
      this.notify(`Created ${owner}/${name}`);
      return this.refresh(this.sh);
    }
    return undefined;
  }

  onChange(e) {
    if (e.target.matches('[data-branch]')) { this.branch = e.target.value; this.preview = null; this.refresh(this.sh); }
  }
}
