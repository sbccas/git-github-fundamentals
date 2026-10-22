/**
 * Live commit graph (PRD T-08): every branch, remote-tracking branch, tag and HEAD,
 * newest at the top. Redrawn after each command; new commits pop in.
 */
import { findRepo, short, subject } from '../git/repo.js';
import { walkCommits, decorations } from '../git/cmd-history.js';

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
      return `<li class="g-row${this.known.size && !this.known.has(r.oid) ? ' is-new' : ''}" style="height:${ROW}px" title="${esc(`${r.oid}\n${c.author.name} · ${new Date(c.author.timestamp * 1000).toLocaleString()}\n\n${c.message.trim()}`)}">
        <span class="g-hash">${short(r.oid)}</span>
        <span class="g-msg">${chipsHtml}${extra}<span class="g-subject">${esc(subject(c.message))}</span></span>
        <span class="g-meta">${esc(c.author.name.split(' ')[0])} · ${when}</span>
      </li>`;
    });

    this.root.innerHTML = `${headerHtml}
      <div class="graph-body">
        <svg class="g-svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" aria-hidden="true">
          <g class="g-edges">${edges.join('')}</g>
          <g class="g-nodes">${nodes.join('')}</g>
        </svg>
        <ol class="g-rows" aria-label="Commits, newest first">${labels.join('')}</ol>
      </div>
      ${commits.length >= LIMIT ? `<p class="panel-note">Showing the latest ${LIMIT} commits.</p>` : ''}`;
    this.known = new Set(commits.map((c) => c.oid));
  }
}
