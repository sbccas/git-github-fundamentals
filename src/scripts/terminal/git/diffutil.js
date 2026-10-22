import { structuredPatch } from 'diff';
import { git, plural } from './repo.js';
import { bold, cyan, red, green } from '../ansi.js';

const ZERO = '0000000';

export async function hashText(text) {
  const { oid } = await git.hashBlob({ object: new TextEncoder().encode(text) });
  return oid;
}

function range(start, count) {
  if (count === 0) return `${start},0`;
  return count === 1 ? `${start}` : `${start},${count}`;
}

/** Count added/removed lines between two texts. */
export function countChanges(oldText, newText) {
  const patch = structuredPatch('a', 'b', oldText ?? '', newText ?? '', '', '', { context: 0 });
  let add = 0;
  let del = 0;
  for (const h of patch.hunks) for (const l of h.lines) {
    if (l[0] === '+') add++;
    else if (l[0] === '-') del++;
  }
  return { add, del };
}

/**
 * Unified diff for one file, coloured like `git diff`.
 * oldText/newText null = file absent on that side.
 */
export function unifiedDiff(path, oldText, newText, oldOid, newOid, mode = '100644') {
  const lines = [bold(`diff --git a/${path} b/${path}`)];
  const o = oldOid ? oldOid.slice(0, 7) : ZERO;
  const n = newOid ? newOid.slice(0, 7) : ZERO;
  if (oldText === null) {
    lines.push(bold(`new file mode ${mode}`), bold(`index ${ZERO}..${n}`));
  } else if (newText === null) {
    lines.push(bold(`deleted file mode ${mode}`), bold(`index ${o}..${ZERO}`));
  } else {
    lines.push(bold(`index ${o}..${n} ${mode}`));
  }
  const patch = structuredPatch(path, path, oldText ?? '', newText ?? '', '', '', { context: 3 });
  if (!patch.hunks.length) return lines.join('\n');
  lines.push(bold(oldText === null ? '--- /dev/null' : `--- a/${path}`));
  lines.push(bold(newText === null ? '+++ /dev/null' : `+++ b/${path}`));
  for (const h of patch.hunks) {
    const oldStart = h.oldLines === 0 ? h.oldStart - (oldText === null ? 0 : 0) : h.oldStart;
    lines.push(cyan(`@@ -${range(oldText === null ? 0 : oldStart, h.oldLines)} +${range(newText === null ? 0 : h.newStart, h.newLines)} @@`));
    for (const l of h.lines) {
      if (l[0] === '+') lines.push(green(l));
      else if (l[0] === '-') lines.push(red(l));
      else lines.push(l);
    }
  }
  return lines.join('\n');
}

/** " 2 files changed, 3 insertions(+), 1 deletion(-)" */
export function summaryLine(files, add, del) {
  let s = ` ${plural(files, 'file')} changed`;
  if (add || !del) s += `, ${plural(add, 'insertion')}(+)`;
  if (del || !add) s += `, ${plural(del, 'deletion')}(-)`;
  return s;
}

/**
 * Collect per-file changes between two commits (null = empty tree).
 * Returns [{ path, add, del, created, deleted, mode }]
 */
export async function commitChanges(repo, fromOid, toOid, paths = null) {
  const a = await repo.treeMap(fromOid);
  const b = await repo.treeMap(toOid);
  const out = [];
  for (const p of paths ?? (await repo.changedPaths(fromOid, toOid))) {
    const ea = a.get(p);
    const eb = b.get(p);
    if (ea?.oid === eb?.oid) continue;
    const oldText = ea ? await repo.blobText(ea.oid) : null;
    const newText = eb ? await repo.blobText(eb.oid) : null;
    out.push({ path: p, ...countChanges(oldText, newText), created: !ea, deleted: !eb, mode: (eb ?? ea).mode.toString(8) });
  }
  return out;
}

/** Commit-style summary: summary line plus create/delete mode lines. */
export function commitSummary(changes) {
  const add = changes.reduce((s, c) => s + c.add, 0);
  const del = changes.reduce((s, c) => s + c.del, 0);
  const lines = [summaryLine(changes.length, add, del)];
  for (const c of changes) {
    if (c.created) lines.push(` create mode ${c.mode} ${c.path}`);
    else if (c.deleted) lines.push(` delete mode ${c.mode} ${c.path}`);
  }
  return lines.join('\n');
}

/** Merge/pull-style diffstat:  " menu.txt | 2 +-" lines, summary, create/delete modes. */
export function diffStat(changes) {
  if (!changes.length) return '';
  const width = Math.max(...changes.map((c) => c.path.length));
  const maxTotal = Math.max(...changes.map((c) => c.add + c.del));
  const numWidth = String(maxTotal).length;
  const scale = maxTotal > 40 ? 40 / maxTotal : 1;
  const lines = changes.map((c) => {
    const plus = '+'.repeat(Math.ceil(c.add * scale));
    const minus = '-'.repeat(Math.ceil(c.del * scale));
    return ` ${c.path.padEnd(width)} | ${String(c.add + c.del).padStart(numWidth)} ${green(plus)}${red(minus)}`;
  });
  return `${lines.join('\n')}\n${commitSummary(changes)}`;
}
