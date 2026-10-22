import { git, GitError, requireRepo, short, subject, formatDate } from './repo.js';
import { parseArgs } from '../args.js';
import { yellow, boldCyan, boldGreen, boldRed, boldYellow, red, green, magenta, cyan } from '../ansi.js';
import { unifiedDiff, commitChanges, diffStat, hashText } from './diffutil.js';
import { join } from '../path.js';

/* ---------------- Ref decorations ---------------- */

export async function decorations(repo) {
  const map = new Map(); // oid → [{ kind, name }]
  const add = (oid, kind, name) => { if (!oid) return; if (!map.has(oid)) map.set(oid, []); map.get(oid).push({ kind, name }); };
  const headBranch = await repo.branch();
  const headOid = await repo.headOid();
  if (headOid) add(headOid, 'head', headBranch);
  for (const t of await repo.tags()) {
    const oid = await repo.refOid(`refs/tags/${t}`);
    if (oid) add(await repo.peel(oid), 'tag', t);
  }
  for (const r of await repo.remotes()) {
    const names = (await repo.remoteBranches(r.remote)).filter((b) => b !== 'HEAD');
    for (const b of names) add(await repo.refOid(`refs/remotes/${r.remote}/${b}`), 'remote', `${r.remote}/${b}`);
    const headTarget = await repo.refOid(`refs/remotes/${r.remote}/HEAD`);
    if (headTarget) add(headTarget, 'remote', `${r.remote}/HEAD`);
  }
  for (const b of await repo.branches()) {
    if (b === headBranch) continue;
    add(await repo.refOid(`refs/heads/${b}`), 'branch', b);
  }
  return map;
}

export function formatDecor(list) {
  if (!list?.length) return '';
  const parts = list.map((d) => {
    if (d.kind === 'head') return d.name ? `${boldCyan('HEAD -> ')}${boldGreen(d.name)}` : boldCyan('HEAD');
    if (d.kind === 'tag') return boldYellow(`tag: ${d.name}`);
    if (d.kind === 'remote') return boldRed(d.name);
    return boldGreen(d.name);
  });
  return ` ${yellow('(')}${parts.join(yellow(', '))}${yellow(')')}`;
}

/* ---------------- Commit walking ---------------- */

/** Commits reachable from `starts` but not from `excludes`, newest first, parents after children. */
export async function walkCommits(repo, starts, excludes = []) {
  const excluded = new Set();
  for (const e of excludes) for (const o of await repo.ancestors(e)) excluded.add(o);
  const nodes = new Map();
  const order = [];
  const stack = [...starts];
  while (stack.length) {
    const oid = stack.shift();
    if (!oid || nodes.has(oid) || excluded.has(oid)) continue;
    const c = await repo.commit(oid);
    nodes.set(oid, c);
    order.push(oid);
    stack.push(...c.parent);
  }
  const childCount = new Map([...nodes.keys()].map((o) => [o, 0]));
  for (const c of nodes.values()) for (const p of c.parent) if (childCount.has(p)) childCount.set(p, childCount.get(p) + 1);
  const rank = new Map(order.map((o, i) => [o, i]));
  const ready = [...nodes.keys()].filter((o) => childCount.get(o) === 0);
  const out = [];
  while (ready.length) {
    ready.sort((a, b) => nodes.get(b).committer.timestamp - nodes.get(a).committer.timestamp || rank.get(a) - rank.get(b));
    const oid = ready.shift();
    out.push({ oid, commit: nodes.get(oid) });
    for (const p of nodes.get(oid).parent) {
      if (!childCount.has(p)) continue;
      childCount.set(p, childCount.get(p) - 1);
      if (childCount.get(p) === 0) ready.push(p);
    }
  }
  return out;
}

/** Parse revision arguments (a, a..b, ^a) into starts/excludes. */
async function parseRevs(repo, revs) {
  const starts = [];
  const excludes = [];
  for (const r of revs) {
    if (r.includes('..')) {
      const [a, b] = r.split('..');
      excludes.push(await repo.resolve(a || 'HEAD'));
      starts.push(await repo.resolve(b || 'HEAD'));
    } else if (r.startsWith('^')) {
      excludes.push(await repo.resolve(r.slice(1)));
    } else {
      starts.push(await repo.resolve(r));
    }
  }
  return { starts, excludes };
}

/* ---------------- ASCII graph ---------------- */

const LANE_COLORS = [red, green, yellow, cyan, magenta];
const lane = (i, s) => LANE_COLORS[i % LANE_COLORS.length](s);

function makeGraph() {
  let cols = [];
  return {
    /** Lines to print before and on the commit row; returns { pre: [str], row: str, post: [str] } */
    step(oid, parents) {
      const pre = [];
      let col = cols.indexOf(oid);
      if (col === -1) { col = cols.indexOf(null); if (col === -1) { col = cols.length; cols.push(oid); } else cols[col] = oid; }
      const dups = cols.map((c, i) => (c === oid && i !== col ? i : -1)).filter((i) => i >= 0);
      if (dups.length) {
        pre.push(cols.map((c, i) => (dups.includes(i) ? lane(i, '/') : c ? lane(i, '|') : ' ')).join(' ').replace(/ \x1b\[\d+m\//g, (m) => m.slice(1)));
        for (const d of dups.reverse()) cols.splice(d, 1);
        col = cols.indexOf(oid);
      }
      const row = cols.map((c, i) => (i === col ? '*' : c ? lane(i, '|') : ' ')).join(' ');
      const post = [];
      if (!parents.length) {
        cols[col] = null;
      } else {
        cols[col] = parents[0];
        const extra = parents.slice(1).filter((p) => !cols.includes(p));
        if (extra.length) {
          post.push(cols.map((c, i) => (i === col ? `${lane(i, '|')}${lane(i + 1, '\\')}` : c ? lane(i, '|') : ' ')).join(' '));
          cols.splice(col + 1, 0, ...extra);
        }
      }
      while (cols.length && cols[cols.length - 1] === null) cols.pop();
      return { pre, row, post };
    },
    continuation() {
      return cols.map((c, i) => (c ? lane(i, '|') : ' ')).join(' ') || ' ';
    },
  };
}

/* ======================= log ======================= */

export async function log({ sh, args, out }) {
  const numeric = args.find((a) => /^-\d+$/.test(a));
  const rest = args.filter((a) => a !== numeric);
  const { flags, values, positional, paths } = parseArgs(rest, {
    value: { n: 'max-count' },
    longBool: ['oneline', 'graph', 'all', 'decorate', 'no-decorate', 'stat', 'reverse', 'first-parent'],
    longValue: ['author', 'grep', 'max-count'],
    bool: { p: 'patch' },
  });
  const repo = await requireRepo(sh);
  const head = await repo.headOid();
  const branch = await repo.branch();
  if (!head && !flags.all) throw new GitError(`fatal: your current branch '${branch}' does not have any commits yet`);

  // Positional arguments that are files (not revisions) are treated as paths.
  const revs = [];
  const filterPaths = [...paths];
  for (const p of positional) {
    try { await repo.resolve(p.split('..')[0] || 'HEAD'); revs.push(p); } catch (e) {
      if (await sh.h.exists(sh.abs(p))) filterPaths.push(p); else throw e;
    }
  }
  let { starts, excludes } = await parseRevs(repo, revs);
  if (flags.all) {
    for (const b of await repo.branches()) starts.push(await repo.refOid(`refs/heads/${b}`));
    for (const r of await repo.remotes()) for (const b of await repo.remoteBranches(r.remote)) starts.push(await repo.refOid(`refs/remotes/${r.remote}/${b}`));
    for (const t of await repo.tags()) starts.push(await repo.peel(await repo.refOid(`refs/tags/${t}`)));
  }
  if (!starts.length && head) starts = [head];
  starts = starts.filter(Boolean);

  let commits = await walkCommits(repo, starts, excludes);
  if (values.author) commits = commits.filter((c) => `${c.commit.author.name} <${c.commit.author.email}>`.toLowerCase().includes(values.author.toLowerCase()));
  if (values.grep) commits = commits.filter((c) => c.commit.message.toLowerCase().includes(values.grep.toLowerCase()));
  if (filterPaths.length) {
    const rps = filterPaths.map((p) => repo.repoPath(p));
    const keep = [];
    for (const c of commits) {
      const changed = await repo.changedPaths(c.commit.parent[0] ?? null, c.oid);
      if (changed.some((f) => rps.some((rp) => f === rp || f.startsWith(`${rp}/`) || rp === ''))) keep.push(c);
    }
    commits = keep;
  }
  const max = numeric ? Number(numeric.slice(1)) : values['max-count'] ? Number(values['max-count']) : Infinity;
  commits = commits.slice(0, max);
  if (flags.reverse && !flags.graph) commits.reverse();

  const decor = flags['no-decorate'] ? new Map() : await decorations(repo);
  const graph = flags.graph ? makeGraph() : null;
  const lines = [];
  for (const [i, { oid, commit: c }] of commits.entries()) {
    const g = graph ? graph.step(oid, c.parent.filter((p) => commits.some((x) => x.oid === p))) : null;
    if (g) lines.push(...g.pre);
    const prefix = g ? `${g.row}${c.parent.length > 1 && g.post.length ? '   ' : ' '}` : '';
    const cont = () => (graph ? `${graph.continuation()} ` : '');
    if (flags.oneline) {
      lines.push(`${prefix}${yellow(short(oid))}${formatDecor(decor.get(oid))} ${subject(c.message)}`);
      if (g) lines.push(...g.post);
      continue;
    }
    if (i > 0 && !graph) lines.push('');
    if (i > 0 && graph) lines.push(cont().trimEnd());
    lines.push(`${prefix}${yellow(`commit ${oid}`)}${formatDecor(decor.get(oid))}`);
    if (g) lines.push(...g.post);
    if (c.parent.length > 1) lines.push(`${cont()}Merge: ${c.parent.map(short).join(' ')}`);
    lines.push(`${cont()}Author: ${c.author.name} <${c.author.email}>`);
    lines.push(`${cont()}Date:   ${formatDate(c.author.timestamp, c.author.timezoneOffset)}`);
    lines.push(cont().trimEnd());
    for (const l of c.message.trimEnd().split('\n')) lines.push(`${cont()}    ${l}`.trimEnd());
    if (flags.stat || flags.patch) {
      const changes = await commitChanges(repo, c.parent[0] ?? null, oid);
      if (flags.stat && changes.length) lines.push('', diffStat(changes));
      if (flags.patch) {
        lines.push('');
        lines.push(await commitPatch(repo, c.parent[0] ?? null, oid));
      }
    }
  }
  if (lines.length) out.write(`${lines.join('\n')}\n`);
  return 0;
}

/* ======================= diff ======================= */

async function commitPatch(repo, fromOid, toOid, filter = null) {
  const a = await repo.treeMap(fromOid);
  const b = await repo.treeMap(toOid);
  const parts = [];
  for (const p of await repo.changedPaths(fromOid, toOid)) {
    if (filter && !filter(p)) continue;
    const ea = a.get(p);
    const eb = b.get(p);
    parts.push(unifiedDiff(p, ea ? await repo.blobText(ea.oid) : null, eb ? await repo.blobText(eb.oid) : null, ea?.oid, eb?.oid));
  }
  return parts.join('\n');
}

export async function diff({ sh, args, out }) {
  const { flags, positional, paths } = parseArgs(args, { longBool: ['staged', 'cached', 'stat', 'name-only', 'name-status'] });
  const repo = await requireRepo(sh);
  const revs = [];
  const filePaths = [...paths];
  for (const p of positional) {
    try { await repo.resolve(p.split('..')[0] || 'HEAD'); revs.push(p); } catch (e) {
      if (await sh.h.exists(sh.abs(p))) filePaths.push(p); else throw e;
    }
  }
  const rps = filePaths.map((p) => repo.repoPath(p));
  const filter = rps.length ? (f) => rps.some((rp) => rp === '' || f === rp || f.startsWith(`${rp}/`)) : () => true;

  // Build [path, oldText, newText, oldOid, newOid] entries
  const entries = [];
  const head = await repo.headOid();
  const fromTree = async (oid) => repo.treeMap(oid);
  const readSide = async (map, p) => (map.get(p) ? [await repo.blobText(map.get(p).oid ?? map.get(p)), map.get(p).oid ?? map.get(p)] : [null, null]);

  let left;
  let right;
  if (revs.length === 1 && revs[0].includes('..')) {
    const [a, b] = revs[0].split('..');
    left = { kind: 'tree', map: await fromTree(await repo.resolve(a || 'HEAD')) };
    right = { kind: 'tree', map: await fromTree(await repo.resolve(b || 'HEAD')) };
  } else if (revs.length >= 2) {
    left = { kind: 'tree', map: await fromTree(await repo.resolve(revs[0])) };
    right = { kind: 'tree', map: await fromTree(await repo.resolve(revs[1])) };
  } else if (flags.staged || flags.cached) {
    left = { kind: 'tree', map: await fromTree(revs[0] ? await repo.resolve(revs[0]) : head) };
    right = { kind: 'index', map: await repo.indexMap() };
  } else if (revs.length === 1) {
    left = { kind: 'tree', map: await fromTree(await repo.resolve(revs[0])) };
    right = { kind: 'work' };
  } else {
    left = { kind: 'index', map: await repo.indexMap() };
    right = { kind: 'work' };
  }

  const pathsAll = new Set([...left.map.keys(), ...(right.map ? right.map.keys() : [])]);
  if (right.kind === 'work') for (const p of (await repo.indexMap()).keys()) pathsAll.add(p);
  for (const p of [...pathsAll].sort()) {
    if (!filter(p)) continue;
    const [oldText, oldOid] = await readSide(left.map, p);
    let newText;
    let newOid;
    if (right.kind === 'work') {
      newText = await repo.workText(p);
      newOid = newText === null ? null : await hashText(newText);
    } else {
      [newText, newOid] = await readSide(right.map, p);
    }
    if (oldOid === newOid) continue;
    entries.push([p, oldText, newText, oldOid, newOid]);
  }

  if (flags['name-only']) { if (entries.length) out.write(`${entries.map((e) => e[0]).join('\n')}\n`); return 0; }
  if (flags['name-status']) { if (entries.length) out.write(`${entries.map((e) => `${e[1] === null ? 'A' : e[2] === null ? 'D' : 'M'}\t${e[0]}`).join('\n')}\n`); return 0; }
  if (flags.stat) {
    const { countChanges } = await import('./diffutil.js');
    const changes = entries.map(([p, o, n]) => ({ path: p, ...countChanges(o, n), created: o === null, deleted: n === null, mode: '100644' }));
    if (changes.length) out.write(`${diffStat(changes).split('\n').filter((l) => !/^ (create|delete) mode/.test(l)).join('\n')}\n`);
    return 0;
  }
  const text = entries.map(([p, o, n, oo, no]) => unifiedDiff(p, o, n, oo, no)).join('\n');
  if (text) out.write(`${text}\n`);
  return 0;
}

/* ======================= show ======================= */

export async function show({ sh, args, out }) {
  const { flags, positional } = parseArgs(args, { longBool: ['stat', 'oneline', 'name-only'] });
  const repo = await requireRepo(sh);
  const target = positional[0] ?? 'HEAD';

  // rev:path → file contents at that revision
  if (target.includes(':')) {
    const [rev, p] = target.split(':');
    const oid = await repo.resolve(rev || 'HEAD');
    const rp = p.startsWith('./') ? repo.repoPath(p) : p;
    const entry = (await repo.treeMap(oid)).get(rp);
    if (!entry) throw new GitError(`fatal: path '${p}' does not exist in '${rev || 'HEAD'}'`);
    out.write(await repo.blobText(entry.oid));
    return 0;
  }

  const lines = [];
  // Annotated tag header
  const tagOid = await repo.refOid(`refs/tags/${target}`);
  if (tagOid) {
    const { type, object } = await git.readObject({ ...repo.base, oid: tagOid, format: 'parsed' });
    if (type === 'tag') {
      lines.push(`${yellow(`tag ${object.tag}`)}`, `Tagger: ${object.tagger.name} <${object.tagger.email}>`, `Date:   ${formatDate(object.tagger.timestamp, object.tagger.timezoneOffset)}`, '', object.message.trimEnd(), '');
    }
  }
  const oid = await repo.resolve(target);
  const c = await repo.commit(oid);
  const decor = await decorations(repo);
  if (flags.oneline) {
    lines.push(`${yellow(short(oid))}${formatDecor(decor.get(oid))} ${subject(c.message)}`);
  } else {
    lines.push(`${yellow(`commit ${oid}`)}${formatDecor(decor.get(oid))}`);
    if (c.parent.length > 1) lines.push(`Merge: ${c.parent.map(short).join(' ')}`);
    lines.push(`Author: ${c.author.name} <${c.author.email}>`, `Date:   ${formatDate(c.author.timestamp, c.author.timezoneOffset)}`, '');
    for (const l of c.message.trimEnd().split('\n')) lines.push(`    ${l}`.trimEnd());
  }
  if (c.parent.length <= 1) {
    if (flags.stat || flags['name-only']) {
      const changes = await commitChanges(repo, c.parent[0] ?? null, oid);
      lines.push('', flags['name-only'] ? changes.map((x) => x.path).join('\n') : diffStat(changes));
    } else {
      const patch = await commitPatch(repo, c.parent[0] ?? null, oid);
      if (patch) lines.push('', patch);
    }
  }
  out.write(`${lines.join('\n')}\n`);
  return 0;
}

export { join };
