/**
 * Live commit graph (PRD T-08): every branch, remote-tracking branch, tag and HEAD,
 * newest at the top. Redrawn after each command; new commits pop in.
 */
import { findRepo, short, subject } from '../git/repo.js';
import { walkCommits, decorations } from '../git/cmd-history.js';
import { earnBadge } from '../../lib/progress.js';

const ROW = 40;
const LANE = 18;
const PAD = 14;
const LIMIT = 80;
const LANE_VARS = ['--u1', '--u2', '--u3', '--u4', '--u5'];
const laneColor = (i) => `var(${LANE_VARS[i % LANE_VARS.length]})`;
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Assign each commit a column, the way `git log --graph` does. */
function layout(commits) {
  const index = new Map(commits.map((c, i) => [c.oid, i]));
  const cols = [];
  const rows = [];
  for (const { oid, commit } of commits) {
    let col = cols.indexOf(oid);
    if (col === -1) { col = cols.indexOf(null); if (col === -1) { col = cols.length; cols.push(oid); } else cols[col] = oid; }
    for (let j = 0; j < cols.length; j++) if (j !== col && cols[j] === oid) cols[j] = null;
    const parents = commit.parent.filter((p) => index.has(p));
    rows.push({ oid, commit, col, parents, missingParent: commit.parent.length > parents.length });
    if (!parents.length) cols[col] = null;
    else {
      cols[col] = parents[0];
      for (const p of parents.slice(1)) {
        if (cols.includes(p)) continue;
        const free = cols.indexOf(null);
        if (free !== -1 && free > col) cols[free] = p; else cols.push(p);
      }
    }
    while (cols.length && cols[cols.length - 1] === null) cols.pop();
  }
  return { rows, index, width: Math.max(1, ...rows.map((r) => r.col + 1), ...rows.flatMap((r) => r.parents.map((p) => rows[index.get(p)]?.col ?? 0).map((c) => c + 1))) };
}

export class GraphView {
  constructor(root) {
    this.root = root;
    this.known = new Set();
    this.lastRepoDir = null;
    // Time travel (PRD T-09): read-only view of the files at any commit.
    this.travel = { on: false, index: 0, file: null };
    this.commits = [];
    this.repo = null;
    root.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('input', (e) => {
      if (!e.target.matches('[data-travel-range]')) return;
      this.travel.index = Number(e.target.value);
      this.travel.file = null;
      if (earnBadge('time-traveller')) this.badgeJustEarned = true;
      this.renderTravel();
    });
  }

  onClick(e) {
    if (e.target.closest('[data-travel-toggle]')) {
      this.travel.on = !this.travel.on;
      this.travel.index = Math.max(0, this.commits.length - 1);
      this.travel.file = null;
      this.root.classList.toggle('is-travelling', this.travel.on);
      this.renderTravel();
      return;
    }
    const f = e.target.closest('[data-travel-file]');
    if (f) { this.travel.file = this.travel.file === f.dataset.travelFile ? null : f.dataset.travelFile; this.renderTravel(); }
    const row = e.target.closest('.g-row[data-oid]');
    if (row && this.travel.on) {
      const i = this.chrono().findIndex((c) => c.oid === row.dataset.oid);
      if (i >= 0) { this.travel.index = i; this.travel.file = null; this.renderTravel(); }
    }
  }

  /** Commits oldest → newest for the slider. */
  chrono() { return [...this.commits].reverse(); }

  async renderTravel() {
    const box = this.root.querySelector('[data-travel]');
    const toggle = this.root.querySelector('[data-travel-toggle]');
    toggle?.setAttribute('aria-pressed', String(this.travel.on));
    this.root.querySelectorAll('.g-row.is-travel').forEach((r) => r.classList.remove('is-travel'));
    if (!box) return;
    if (!this.travel.on || !this.commits.length) { box.hidden = true; box.innerHTML = ''; return; }
    const list = this.chrono();
    const i = Math.min(this.travel.index, list.length - 1);
    const { oid, commit } = list[i];
    this.root.querySelector(`.g-row[data-oid="${oid}"]`)?.classList.add('is-travel');
    const files = await this.repo.treeMap(oid);
    let viewer = '';
    if (this.travel.file && files.has(this.travel.file)) {
      viewer = `<pre class="tt-view" aria-label="${esc(this.travel.file)} at ${short(oid)}">${esc(await this.repo.blobText(files.get(this.travel.file).oid))}</pre>`;
    }
    const when = new Date(commit.author.timestamp * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    box.hidden = false;
    // Build the slider once; while dragging, only the details below it change.
    let range = box.querySelector('[data-travel-range]');
    if (!range || Number(range.max) !== list.length - 1) {
      box.innerHTML = `<label class="tt-slider"><span class="visually-hidden">Choose a commit</span>
          <input type="range" min="0" max="${list.length - 1}" step="1" data-travel-range></label>
        <div class="tt-scale"><span>oldest</span><span data-travel-pos></span><span>newest</span></div>
        <div data-travel-detail></div>`;
      range = box.querySelector('[data-travel-range]');
    }
    if (Number(range.value) !== i) range.value = String(i);
    range.setAttribute('aria-valuetext', `${short(oid)} ${subject(commit.message)}`);
    box.querySelector('[data-travel-pos]').textContent = `${i + 1} / ${list.length}`;
    box.querySelector('[data-travel-detail]').innerHTML = `
      <p class="tt-commit"><code>${short(oid)}</code> <strong>${esc(subject(commit.message))}</strong><br><span class="muted">${esc(commit.author.name)} · ${esc(when)}</span></p>
      <p class="tt-label">Files at this commit <span class="muted">(read-only; your work is untouched)</span></p>
      <ul class="tt-files">${[...files.keys()].sort().map((f) => `<li><button type="button" data-travel-file="${esc(f)}" aria-pressed="${f === this.travel.file}">📄 ${esc(f)}</button></li>`).join('') || '<li class="muted">(no files)</li>'}</ul>
      ${viewer}
      ${this.badgeJustEarned ? '<p class="tt-badge">⏳ Badge earned: <strong>Time Traveller</strong></p>' : ''}
      <p class="panel-note">Tip: <code>git show ${short(oid)}:&lt;file&gt;</code> prints a file from any commit, and <code>git checkout ${short(oid)}</code> really travels there (detached HEAD).</p>`;
  }

  async refresh(sh) {
    const repo = await findRepo(sh);
    if (!repo) {
      this.known.clear();
      this.root.innerHTML = `<div class="panel-empty"><p><strong>No repository here yet.</strong></p><p>Make a folder and run <code>git init</code>, or <code>cd</code> into a project.</p></div>`;
      return;
    }
    if (repo.dir !== this.lastRepoDir) { this.known.clear(); this.lastRepoDir = repo.dir; }
    const head = await repo.headOid();
    const branch = await repo.branch();
    const status = await repo.status();
    const merge = await repo.mergeState();

    const starts = [];
    if (head) starts.push(head);
    for (const b of await repo.branches()) starts.push(await repo.refOid(`refs/heads/${b}`));
    for (const r of await repo.remotes()) for (const b of await repo.remoteBranches(r.remote)) if (b !== 'HEAD') starts.push(await repo.refOid(`refs/remotes/${r.remote}/${b}`));
    for (const t of await repo.tags()) starts.push(await repo.peel(await repo.refOid(`refs/tags/${t}`)));
    if (merge) starts.push(merge.oid);
    const commits = (await walkCommits(repo, [...new Set(starts.filter(Boolean))])).slice(0, LIMIT);
    this.commits = commits;
    this.repo = repo;
    const decor = await decorations(repo);

    const chips = [];
    if (status.staged.length) chips.push(`<span class="st st-staged">${status.staged.length} staged</span>`);
    if (status.unstaged.length) chips.push(`<span class="st st-modified">${status.unstaged.length} modified</span>`);
    if (status.untracked.length) chips.push(`<span class="st st-untracked">${status.untracked.length} untracked</span>`);
    if (status.conflicts.length) chips.push(`<span class="st st-conflict">${status.conflicts.length} conflict${status.conflicts.length > 1 ? 's' : ''}</span>`);
    if (!chips.length && head) chips.push('<span class="st st-clean">working tree clean</span>');

    const repoName = repo.dir.split('/').pop();
    const headerHtml = `<div class="graph-head">
      <div class="graph-repo"><span class="graph-repo-name">${esc(repoName)}</span>
        <span class="graph-branch">${branch ? `on <strong>${esc(branch)}</strong>` : `<strong>detached HEAD</strong>`}${merge ? ' · <strong class="merging">merging</strong>' : ''}</span></div>
      <div class="graph-status">${chips.join('')}</div>
    </div>`;
    const travelBar = `<div class="tt-bar"><button type="button" class="mini-btn" data-travel-toggle aria-pressed="${this.travel.on}">⏳ Time travel</button></div><div class="tt-box" data-travel hidden></div>`;

    if (!commits.length) {
      this.root.innerHTML = `${headerHtml}<div class="panel-empty"><p><strong>No commits yet.</strong></p><p>Add a file and commit it — your first commit will appear here.</p></div>`;
      return;
    }

    const { rows, index, width } = layout(commits);
    const svgW = PAD * 2 + (width - 1) * LANE;
    const svgH = rows.length * ROW;
    const x = (col) => PAD + col * LANE;
    const y = (row) => row * ROW + ROW / 2;
    const edges = [];
    rows.forEach((r, i) => {
      r.parents.forEach((p, k) => {
        const j = index.get(p);
        const pc = rows[j].col;
        const color = laneColor(k === 0 ? (r.col === pc ? r.col : r.col) : pc);
        let d;
        if (r.col === pc) d = `M${x(r.col)} ${y(i)} L${x(pc)} ${y(j)}`;
        else if (k === 0) d = `M${x(r.col)} ${y(i)} L${x(r.col)} ${y(j) - ROW * 0.75} C ${x(r.col)} ${y(j) - ROW * 0.3}, ${x(pc)} ${y(j) - ROW * 0.45}, ${x(pc)} ${y(j)}`;
        else d = `M${x(r.col)} ${y(i)} C ${x(r.col)} ${y(i) + ROW * 0.45}, ${x(pc)} ${y(i) + ROW * 0.3}, ${x(pc)} ${y(i) + ROW * 0.75} L${x(pc)} ${y(j)}`;
        edges.push(`<path d="${d}" stroke="${color}" />`);
      });
      if (r.missingParent) edges.push(`<path d="M${x(r.col)} ${y(i)} L${x(r.col)} ${svgH}" stroke="${laneColor(r.col)}" stroke-dasharray="3 4" />`);
    });
    const nodes = rows.map((r, i) => {
      const isHead = r.oid === head;
      const isNew = this.known.size && !this.known.has(r.oid);
      const merge2 = r.commit.parent.length > 1;
      return `<circle class="g-dot${isHead ? ' is-head' : ''}${isNew ? ' is-new' : ''}${merge2 ? ' is-merge' : ''}" cx="${x(r.col)}" cy="${y(i)}" r="${merge2 ? 6.5 : 6}" style="--c:${laneColor(r.col)}" />`;
    });

    const labels = rows.map((r) => {
      const d = decor.get(r.oid) ?? [];
      const chipsHtml = d.map((ref) => {
        if (ref.kind === 'head') return `<span class="ref ref-head">HEAD${ref.name ? ` → ${esc(ref.name)}` : ''}</span>`;
        if (ref.kind === 'tag') return `<span class="ref ref-tag">🏷 ${esc(ref.name)}</span>`;
        if (ref.kind === 'remote') return `<span class="ref ref-remote">${esc(ref.name)}</span>`;
        return `<span class="ref ref-branch">${esc(ref.name)}</span>`;
      }).join('');
      const extra = merge && r.oid === merge.oid ? '<span class="ref ref-merge">MERGE_HEAD</span>' : '';
      const c = r.commit;
      const when = new Date(c.author.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `<li class="g-row${this.known.size && !this.known.has(r.oid) ? ' is-new' : ''}" data-oid="${r.oid}" style="height:${ROW}px" title="${esc(`${r.oid}\n${c.author.name} · ${new Date(c.author.timestamp * 1000).toLocaleString()}\n\n${c.message.trim()}`)}">
        <span class="g-hash">${short(r.oid)}</span>
        <span class="g-msg">${chipsHtml}${extra}<span class="g-subject">${esc(subject(c.message))}</span></span>
        <span class="g-meta">${esc(c.author.name.split(' ')[0])} · ${when}</span>
      </li>`;
    });

    this.root.innerHTML = `${headerHtml}${travelBar}
      <div class="graph-body">
        <svg class="g-svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" aria-hidden="true">
          <g class="g-edges">${edges.join('')}</g>
          <g class="g-nodes">${nodes.join('')}</g>
        </svg>
        <ol class="g-rows" aria-label="Commits, newest first">${labels.join('')}</ol>
      </div>
      ${commits.length >= LIMIT ? `<p class="panel-note">Showing the latest ${LIMIT} commits.</p>` : ''}`;
    this.known = new Set(commits.map((c) => c.oid));
    if (this.travel.on) await this.renderTravel();
  }
}
