import { git, GitError, requireRepo, short, subject, writeTreeFlat } from './repo.js';
import { parseArgs } from '../args.js';
import { join, dirname } from '../path.js';
import { commitChanges, commitSummary, diffStat } from './diffutil.js';
import { longStatus } from './cmd-basic.js';

const person = (id) => ({ ...id, timestamp: Math.floor(Date.now() / 1000), timezoneOffset: new Date().getTimezoneOffset() });

/* ======================= reset ======================= */

async function unstagedList(repo) {
  const s = await repo.status();
  return s.unstaged.map((c) => `${c.kind === 'deleted' ? 'D' : 'M'}\t${repo.displayPath(c.path)}`);
}

export async function reset({ sh, args, out }) {
  const { flags, positional, paths } = parseArgs(args, { longBool: ['soft', 'mixed', 'hard'], bool: { q: 'quiet' } });
  const repo = await requireRepo(sh);
  const head = await repo.headOid();

  // Path form: git reset [<rev>] [--] <paths>  → unstage
  let rev = null;
  const pathSpecs = [...paths];
  for (const p of positional) {
    if (rev === null && !pathSpecs.length) {
      try { await repo.resolve(p); rev = p; continue; } catch { /* not a revision */ }
    }
    if (await sh.h.exists(sh.abs(p)) || (await repo.indexMap()).has(repo.repoPath(p) ?? '')) pathSpecs.push(p);
    else throw new GitError(`fatal: ambiguous argument '${p}': unknown revision or path not in the working tree.\nUse '--' to separate paths from revisions, like this:\n'git <command> [<revision>...] -- [<file>...]'`);
  }
  if (pathSpecs.length) {
    if (flags.soft || flags.hard) throw new GitError(`fatal: Cannot do ${flags.soft ? 'soft' : 'hard'} reset with paths.`);
    const src = rev ? await repo.resolve(rev) : head;
    const srcTree = await repo.treeMap(src);
    const index = await repo.indexMap();
    for (const spec of pathSpecs) {
      const rp = repo.repoPath(spec);
      const hits = [...new Set([...index.keys(), ...srcTree.keys()])].filter((p) => rp === '' || p === rp || p.startsWith(`${rp}/`));
      for (const p of hits) {
        if (srcTree.has(p)) await git.resetIndex({ ...repo.base, filepath: p, ref: src });
        else await git.remove({ ...repo.base, filepath: p });
      }
    }
    const list = await unstagedList(repo);
    if (list.length && !flags.quiet) out.write(`Unstaged changes after reset:\n${list.join('\n')}\n`);
    return 0;
  }

  if (!head) throw new GitError("fatal: ambiguous argument 'HEAD': unknown revision or path not in the working tree.");
  const target = await repo.resolve(rev ?? 'HEAD');
  const mode = flags.hard ? 'hard' : flags.soft ? 'soft' : 'mixed';
  const branch = await repo.branch();
  if (branch) await git.writeRef({ ...repo.base, ref: `refs/heads/${branch}`, value: target, force: true });
  else await repo.h.writeText(join(repo.gitdir, 'HEAD'), `${target}\n`);

  if (mode === 'soft') return 0;

  const targetTree = await repo.treeMap(target);
  const index = await repo.indexMap();
  const oldTree = await repo.treeMap(head);
  const all = new Set([...index.keys(), ...targetTree.keys(), ...(mode === 'hard' ? oldTree.keys() : [])]);
  for (const p of all) {
    const entry = targetTree.get(p);
    if (mode === 'hard') {
      const full = join(repo.dir, p);
      if (entry) {
        const { blob } = await git.readBlob({ ...repo.base, oid: entry.oid });
        await repo.h.mkdirp(dirname(full));
        await repo.h.pfs.writeFile(full, blob);
        await git.add({ ...repo.base, filepath: p, force: true });
      } else {
        if (await repo.h.isFile(full)) await repo.h.pfs.unlink(full);
        await git.remove({ ...repo.base, filepath: p });
        await repo.removeEmptyDirs(dirname(full));
      }
    } else if (entry) {
      if (index.get(p) !== entry.oid) await git.resetIndex({ ...repo.base, filepath: p, ref: target });
    } else {
      await git.remove({ ...repo.base, filepath: p });
    }
  }
  if (await repo.mergeState()) await repo.clearMergeState();

  if (flags.quiet) return 0;
  if (mode === 'hard') {
    out.write(`HEAD is now at ${short(target)} ${subject((await repo.commit(target)).message)}\n`);
  } else {
    const list = await unstagedList(repo);
    if (list.length) out.write(`Unstaged changes after reset:\n${list.join('\n')}\n`);
  }
  return 0;
}

/* ======================= revert ======================= */

export async function revert({ sh, args, out }) {
  const { flags, positional } = parseArgs(args, { longBool: ['no-edit', 'edit'], bool: { n: 'no-commit' } });
  const repo = await requireRepo(sh);
  if (!positional.length) throw new GitError('usage: git revert [<options>] <commit-ish>...', 129);
  const head = await repo.headOid();
  const oid = await repo.resolve(positional[0]);
  const c = await repo.commit(oid);
  if (c.parent.length > 1) throw new GitError(`error: commit ${oid} is a merge but no -m option was given.\nfatal: revert failed`);
  const parent = c.parent[0] ?? null;

  const changed = await repo.changedPaths(parent, oid);
  const dirty = await repo.dirtyPaths();
  if (dirty.some((p) => changed.includes(p))) throw new GitError('error: your local changes would be overwritten by revert.\nhint: commit your changes or stash them to proceed.\nfatal: revert failed');

  const headTree = await repo.treeMap(head);
  const cTree = await repo.treeMap(oid);
  const pTree = await repo.treeMap(parent);
  const conflicts = changed.filter((p) => headTree.get(p)?.oid !== cTree.get(p)?.oid && headTree.get(p)?.oid !== pTree.get(p)?.oid);
  if (conflicts.length) {
    throw new GitError(`error: could not revert ${short(oid)}... ${subject(c.message)}\nhint: ${conflicts.join(', ')} changed again after this commit, so Git cannot undo it automatically.\nhint: (In this playground, revert the newer commit first, or edit the file and commit the fix yourself.)`, 1);
  }

  const id = await repo.requireIdentity();
  // Build the new tree: HEAD's tree with the reverted paths set back to the parent's version.
  const newFiles = new Map(headTree);
  for (const p of changed) {
    if (pTree.has(p)) newFiles.set(p, pTree.get(p));
    else newFiles.delete(p);
  }
  const tree = await writeTreeFlat(repo.base, newFiles);

  let message = `Revert "${subject(c.message)}"\n\nThis reverts commit ${oid}.\n`;
  if (!flags['no-edit']) {
    const edited = await sh.ui.openEditor({ path: '.git/COMMIT_EDITMSG', content: `${message}\n# Please enter the commit message for your changes. Lines starting\n# with '#' will be ignored, and an empty message aborts the commit.\n`, title: 'Revert message', hint: 'The message is ready — press Save to finish the revert.' });
    if (edited === null) { out.write('Aborting commit due to empty commit message.\n'); return 1; }
    message = edited.split('\n').filter((l) => !l.startsWith('#')).join('\n').trim();
    if (!message) { out.write('Aborting commit due to empty commit message.\n'); return 1; }
  }
  const branch = await repo.branch();
  const newOid = await git.commit({ ...repo.base, message, tree, parent: [head], author: person(id), committer: person(id), ref: branch ? undefined : 'HEAD' });
  await repo.syncTo(head, newOid);
  out.write(`[${branch ?? 'detached HEAD'} ${short(newOid)}] ${subject(message)}\n${commitSummary(await commitChanges(repo, head, newOid))}\n`);
  return 0;
}

/* ======================= stash ======================= */

async function stashEntries(repo) {
  const p = join(repo.gitdir, 'logs/refs/stash');
  if (!(await repo.h.isFile(p))) return [];
  const lines = (await repo.h.readText(p)).split('\n').filter(Boolean);
  return lines.map((l) => {
    const [meta, msg] = l.split('\t');
    return { oid: meta.split(' ')[1], message: msg ?? '' };
  }).reverse(); // stash@{0} first
}

async function rewriteLastStashMessage(repo, message) {
  const p = join(repo.gitdir, 'logs/refs/stash');
  const lines = (await repo.h.readText(p)).split('\n').filter(Boolean);
  const last = lines.pop();
  lines.push(`${last.split('\t')[0]}\t${message}`);
  await repo.h.writeText(p, `${lines.join('\n')}\n`);
}

function stashIndex(arg) {
  if (arg === undefined) return 0;
  const m = /^(?:stash@\{)?(\d+)\}?$/.exec(arg);
  if (!m) throw new GitError(`error: ${arg} is not a valid reference`, 1);
  return Number(m[1]);
}

export async function stash({ sh, args, out }) {
  const sub = ['push', 'save', 'list', 'pop', 'apply', 'drop', 'clear', 'show'].includes(args[0]) ? args[0] : 'push';
  const rest = sub === 'push' && args[0] !== 'push' ? args : args.slice(1);
  const repo = await requireRepo(sh);
  const branch = (await repo.branch()) ?? '(no branch)';
  const head = await repo.headOid();
  const entries = await stashEntries(repo);

  if (sub === 'push' || sub === 'save') {
    const { values, positional } = parseArgs(rest, { value: { m: 'message' }, bool: { u: 'include-untracked', q: 'quiet' } });
    if (!head) throw new GitError("You do not have the initial commit yet", 1);
    const s = await repo.status();
    if (!s.staged.length && !s.unstaged.length) { out.write('No local changes to save\n'); return 0; }
    const msg = values.message ?? (sub === 'save' ? positional.join(' ') : null);
    await repo.withLocalIdentity(() => git.stash({ ...repo.base, op: 'push' }));
    const label = msg ? `On ${branch}: ${msg}` : `WIP on ${branch}: ${short(head)} ${subject((await repo.commit(head)).message)}`;
    await rewriteLastStashMessage(repo, label);
    out.write(`Saved working directory and index state ${label}\n`);
    return 0;
  }
  if (sub === 'list') {
    if (entries.length) out.write(`${entries.map((e, i) => `stash@{${i}}: ${e.message}`).join('\n')}\n`);
    return 0;
  }
  if (sub === 'clear') { await repo.withLocalIdentity(() => git.stash({ ...repo.base, op: 'clear' })); return 0; }

  const idx = stashIndex(rest.find((a) => !a.startsWith('-')));
  if (!entries.length) { out.write('No stash entries found.\n'); return 1; }
  if (!entries[idx]) throw new GitError(`error: stash@{${idx}} is not a valid reference`, 1);
  const entry = entries[idx];

  if (sub === 'show') {
    const c = await repo.commit(entry.oid);
    const changes = await commitChanges(repo, c.parent[0], entry.oid);
    if (rest.includes('-p')) {
      const { diff } = await import('./cmd-history.js');
      return diff({ sh, args: [c.parent[0], entry.oid], out });
    }
    const stat = diffStat(changes).split('\n').filter((l) => !/^ (create|delete) mode/.test(l)).join('\n');
    if (stat) out.write(`${stat}\n`);
    return 0;
  }
  if (sub === 'drop') {
    await repo.withLocalIdentity(() => git.stash({ ...repo.base, op: 'drop', refIdx: idx }));
    out.write(`Dropped refs/stash@{${idx}} (${entry.oid})\n`);
    return 0;
  }
  // apply / pop
  const stashCommit = await repo.commit(entry.oid);
  const changed = await repo.changedPaths(stashCommit.parent[0], entry.oid);
  const dirty = await repo.dirtyPaths();
  const clash = dirty.filter((p) => changed.includes(p));
  if (clash.length) throw new GitError(`error: Your local changes to the following files would be overwritten by merge:\n${clash.map((p) => `\t${p}`).join('\n')}\nPlease commit your changes or stash them before you merge.\nAborting\nThe stash entry is kept in case you need it again.`, 1);
  await repo.withLocalIdentity(() => git.stash({ ...repo.base, op: 'apply', refIdx: idx }));
  // Git restores the changes as unstaged (index is not restored without --index).
  for (const p of changed) {
    const inHead = (await repo.treeMap(head)).has(p);
    if (inHead) await git.resetIndex({ ...repo.base, filepath: p, ref: 'HEAD' }).catch(() => {});
  }
  out.write((await longStatus(repo)).text);
  if (sub === 'pop') {
    await repo.withLocalIdentity(() => git.stash({ ...repo.base, op: 'drop', refIdx: idx }));
    out.write(`Dropped refs/stash@{${idx}} (${entry.oid})\n`);
  }
  return 0;
}

/* ======================= tag ======================= */

export async function tag({ sh, args, out }) {
  const { flags, values, positional } = parseArgs(args, {
    bool: { a: 'annotate', d: 'delete', l: 'list', f: 'force', n: 'show-message' },
    value: { m: 'message' },
  });
  const repo = await requireRepo(sh);

  if (flags.delete) {
    if (!positional.length) throw new GitError('fatal: tag name required');
    let code = 0;
    for (const name of positional) {
      const oid = await repo.refOid(`refs/tags/${name}`);
      if (!oid) { out.write(`error: tag '${name}' not found.\n`); code = 1; continue; }
      await git.deleteTag({ ...repo.base, ref: name });
      out.write(`Deleted tag '${name}' (was ${short(oid)})\n`);
    }
    return code;
  }

  if (flags.list || !positional.length) {
    const pattern = flags.list && positional[0] ? new RegExp(`^${positional[0].replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`) : null;
    const tags = (await repo.tags()).filter((t) => !pattern || pattern.test(t)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const lines = [];
    for (const t of tags) {
      if (!flags['show-message']) { lines.push(t); continue; }
      const oid = await repo.refOid(`refs/tags/${t}`);
      const { type, object } = await git.readObject({ ...repo.base, oid, format: 'parsed' });
      const msg = type === 'tag' ? subject(object.message) : subject((await repo.commit(oid)).message);
      lines.push(`${t.padEnd(15)} ${msg}`);
    }
    if (lines.length) out.write(`${lines.join('\n')}\n`);
    return 0;
  }

  const [name, rev] = positional;
  if (!/^[^\s~^:?*[\\]+$/.test(name) || name.startsWith('-')) throw new GitError(`fatal: '${name}' is not a valid tag name.`);
  if (await repo.refOid(`refs/tags/${name}`) && !flags.force) throw new GitError(`fatal: tag '${name}' already exists`);
  const target = await repo.resolve(rev ?? 'HEAD');
  const annotated = flags.annotate || values.message !== undefined;
  if (!annotated) {
    await git.tag({ ...repo.base, ref: name, object: target, force: !!flags.force });
    return 0;
  }
  let message = values.message;
  if (message === undefined) {
    const edited = await sh.ui.openEditor({ path: `.git/TAG_EDITMSG`, content: `\n#\n# Write a message for tag:\n#   ${name}\n# Lines starting with '#' will be ignored.\n`, title: `Tag message for ${name}`, hint: 'Describe this release on the first line, then press Save.' });
    message = (edited ?? '').split('\n').filter((l) => !l.startsWith('#')).join('\n').trim();
    if (!message) throw new GitError('fatal: no tag message?');
  }
  const id = await repo.requireIdentity();
  await git.annotatedTag({ ...repo.base, ref: name, message, object: target, tagger: person(id), force: !!flags.force });
  return 0;
}
