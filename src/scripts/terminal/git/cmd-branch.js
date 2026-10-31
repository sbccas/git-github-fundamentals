import { git, GitError, requireRepo, short, subject } from './repo.js';
import { parseArgs } from '../args.js';
import { green, red } from '../ansi.js';
import { join } from '../path.js';
import { commitChanges, diffStat } from './diffutil.js';
import { trackingInfo } from './cmd-basic.js';

const validName = (n) => /^(?!-)(?!.*\.\.)(?!.*\/\/)(?!.*@\{)[^\s~^:?*[\\]+(?<![./])$/.test(n) && !n.endsWith('.lock');

/* ---------------- switching ---------------- */

const overwriteError = (paths) => new GitError(`error: Your local changes to the following files would be overwritten by checkout:\n${paths.map((p) => `\t${p}`).join('\n')}\nPlease commit your changes or stash them before you switch branches.\nAborting`, 1);

/** Refuse to switch if uncommitted (or untracked) files would be overwritten — checked by content. */
async function guardCheckout(repo, targetOid) {
  const before = await repo.headOid();
  const incoming = await repo.changedPaths(before, targetOid);
  const clash = (await repo.dirtyPaths()).filter((p) => incoming.includes(p));
  if (clash.length) throw overwriteError(clash);
  const target = await repo.treeMap(targetOid);
  const untracked = (await repo.status()).untracked.filter((p) => target.has(p));
  if (untracked.length) throw new GitError(`error: The following untracked working tree files would be overwritten by checkout:\n${untracked.map((p) => `\t${p}`).join('\n')}\nPlease move or remove them before you switch branches.\nAborting`, 1);
}

async function checkoutBranch(repo, name) {
  const target = await repo.refOid(`refs/heads/${name}`);
  if (target) await guardCheckout(repo, target);
  try {
    await git.checkout({ ...repo.base, ref: name });
  } catch (e) {
    if (e.code === 'CheckoutConflictError') throw overwriteError(e.data.filepaths);
    throw e;
  }
}

async function ensureNoMerge(repo) {
  if (await repo.mergeState()) throw new GitError('error: you need to resolve your current index first\nhint: (finish the merge with "git commit", or cancel it with "git merge --abort")', 1);
}

/** Create a local branch tracking remote/name if it only exists as a remote-tracking branch. */
async function dwimRemoteBranch(repo, name) {
  for (const r of await repo.remotes()) {
    const oid = await repo.refOid(`refs/remotes/${r.remote}/${name}`);
    if (oid) {
      await git.branch({ ...repo.base, ref: name, object: oid });
      await repo.setConfig(`branch.${name}.remote`, r.remote);
      await repo.setConfig(`branch.${name}.merge`, `refs/heads/${name}`);
      return `branch '${name}' set up to track '${r.remote}/${name}'.\n`;
    }
  }
  return null;
}

/** Switch to an existing local branch. */
async function switchTo(repo, name, out) {
  const current = await repo.branch();
  if (current === name) {
    out.write(`Already on '${name}'\n`);
    out.write(await trackingInfo(repo, name));
    return 0;
  }
  await checkoutBranch(repo, name, out);
  out.write(`Switched to branch '${name}'\n`);
  out.write(await trackingInfo(repo, name));
  return 0;
}

async function createBranch(repo, name, start) {
  if (!validName(name)) throw new GitError(`fatal: '${name}' is not a valid branch name`);
  if (await repo.refOid(`refs/heads/${name}`)) throw new GitError(`fatal: a branch named '${name}' already exists`);
  const head = await repo.headOid();
  if (!start && !head) return null; // unborn
  const oid = start ? await repo.resolve(start).catch(() => { throw new GitError(`fatal: not a valid object name: '${start}'`); }) : head;
  await git.branch({ ...repo.base, ref: name, object: oid });
  return oid;
}

async function createAndSwitch(repo, name, start, out) {
  await ensureNoMerge(repo);
  const oid = await createBranch(repo, name, start);
  if (oid === null) {
    // Unborn branch: just point HEAD at the new name.
    await repo.h.writeText(join(repo.gitdir, 'HEAD'), `ref: refs/heads/${name}\n`);
  } else {
    await checkoutBranch(repo, name, out);
  }
  out.write(`Switched to a new branch '${name}'\n`);
  return 0;
}

async function detach(repo, rev, out) {
  await ensureNoMerge(repo);
  const oid = await repo.resolve(rev);
  await guardCheckout(repo, oid);
  try {
    await git.checkout({ ...repo.base, ref: oid });
  } catch (e) {
    if (e.code === 'CheckoutConflictError') throw overwriteError(e.data.filepaths);
    throw e;
  }
  await repo.h.writeText(join(repo.gitdir, 'HEAD'), `${oid}\n`);
  const c = await repo.commit(oid);
  out.write(`Note: switching to '${rev}'.

You are in 'detached HEAD' state. You can look around, make experimental
changes and commit them, and you can discard any commits you make in this
state without impacting any branches by switching back to a branch.

If you want to create a new branch to retain commits you create, you may
do so (now or later) by using -c with the switch command. Example:

  git switch -c <new-branch-name>

Or undo this operation with:

  git switch -

Turn off this advice by setting config variable advice.detachedHead to false

HEAD is now at ${short(oid)} ${subject(c.message)}
`);
  return 0;
}

/* ======================= switch ======================= */

export async function switchCmd({ sh, args, out }) {
  const { flags, values, positional } = parseArgs(args, { value: { c: 'create', C: 'force-create' }, longBool: ['detach', 'discard-changes', 'quiet'], bool: { d: 'detach', f: 'discard-changes', q: 'quiet' } });
  const repo = await requireRepo(sh);
  if (flags.quiet) out = { write() {} };
  if (values.create) return createAndSwitch(repo, values.create, positional[0], out);
  const target = positional[0];
  if (!target) throw new GitError('fatal: missing branch or commit argument');
  if (flags.detach) return detach(repo, target, out);
  await ensureNoMerge(repo);
  if (await repo.refOid(`refs/heads/${target}`)) return switchTo(repo, target, out);
  const created = await dwimRemoteBranch(repo, target);
  if (created) { await checkoutBranch(repo, target, out); out.write(`${created}Switched to a new branch '${target}'\n`); return 0; }
  try {
    await repo.resolve(target);
    throw new GitError(`fatal: a branch is expected, got commit '${target}'\nhint: If you want to detach HEAD at the commit, try again with the --detach option.`);
  } catch (e) {
    if (e instanceof GitError && e.message.startsWith('fatal: a branch')) throw e;
    throw new GitError(`fatal: invalid reference: ${target}`);
  }
}

/* ======================= checkout ======================= */

export async function checkout({ sh, args, out }) {
  const { flags, values, positional, paths } = parseArgs(args, { value: { b: 'branch', B: 'force-branch' }, bool: { f: 'force', q: 'quiet' }, longBool: ['detach', 'ours', 'theirs'] });
  const repo = await requireRepo(sh);
  if (flags.ours || flags.theirs) {
    const { takeSide } = await import('./cmd-basic.js');
    return takeSide(sh, repo, flags.ours ? 'ours' : 'theirs', [...positional, ...paths], out);
  }
  if (values.branch) return createAndSwitch(repo, values.branch, positional[0], out);

  const restorePaths = async (rev, specs) => {
    const src = rev ? await repo.treeMap(await repo.resolve(rev)) : null;
    const index = await repo.indexMap();
    let count = 0;
    for (const spec of specs) {
      const rp = repo.repoPath(spec);
      const pool = src ? [...src.keys()] : [...index.keys()];
      const hits = pool.filter((p) => rp === '' || p === rp || p.startsWith(`${rp}/`));
      if (!hits.length) throw new GitError(`error: pathspec '${spec}' did not match any file(s) known to git`, 1);
      for (const p of hits) {
        const oid = src ? src.get(p).oid : index.get(p);
        const { blob } = await git.readBlob({ ...repo.base, oid });
        const full = join(repo.dir, p);
        await repo.h.mkdirp(full.slice(0, full.lastIndexOf('/')));
        await repo.h.pfs.writeFile(full, blob);
        if (src) await git.add({ ...repo.base, filepath: p });
        count++;
      }
    }
    out.write(`Updated ${count} path${count === 1 ? '' : 's'} from ${rev ? short(await repo.resolve(rev)) : 'the index'}\n`);
    return 0;
  };

  if (paths.length) return restorePaths(positional[0] ?? null, paths);
  const target = positional[0];
  if (!target) throw new GitError("fatal: you must specify path(s) to restore");
  await ensureNoMerge(repo);
  if (await repo.refOid(`refs/heads/${target}`)) return switchTo(repo, target, out);
  const created = await dwimRemoteBranch(repo, target);
  if (created) { await checkoutBranch(repo, target, out); out.write(`${created}Switched to a new branch '${target}'\n`); return 0; }
  let isRev = true;
  try { await repo.resolve(target); } catch { isRev = false; }
  if (isRev) return detach(repo, target, out);
  if (await sh.h.exists(sh.abs(target))) return restorePaths(null, positional);
  throw new GitError(`error: pathspec '${target}' did not match any file(s) known to git`, 1);
}

/* ======================= branch ======================= */

export async function branch({ sh, args, out }) {
  const { flags, values, positional } = parseArgs(args, {
    bool: { a: 'all', r: 'remotes', d: 'delete', D: 'force-delete', m: 'move', M: 'force-move', v: 'verbose', l: 'list' },
    value: { u: 'set-upstream-to' },
    longBool: ['show-current', 'unset-upstream', 'merged', 'no-merged'],
    longValue: ['set-upstream-to'],
  });
  const repo = await requireRepo(sh);
  const current = await repo.branch();
  const head = await repo.headOid();

  if (flags['show-current']) { if (current) out.write(`${current}\n`); return 0; }

  if (flags.delete || flags['force-delete']) {
    if (!positional.length) throw new GitError('fatal: branch name required');
    let code = 0;
    for (const name of positional) {
      if (flags.remotes) {
        const oid = await repo.refOid(`refs/remotes/${name}`);
        if (!oid) { out.write(`error: remote-tracking branch '${name}' not found.\n`); code = 1; continue; }
        await git.deleteRef({ ...repo.base, ref: `refs/remotes/${name}` });
        out.write(`Deleted remote-tracking branch ${name} (was ${short(oid)}).\n`);
        continue;
      }
      const oid = await repo.refOid(`refs/heads/${name}`);
      if (!oid) { out.write(`error: branch '${name}' not found.\n`); code = 1; continue; }
      if (name === current) { out.write(`error: cannot delete branch '${name}' used by worktree at '${repo.dir}'\n`); code = 1; continue; }
      if (!flags['force-delete'] && head && !(await repo.isAncestor(oid, head))) {
        out.write(`error: the branch '${name}' is not fully merged\nhint: If you are sure you want to delete it, run 'git branch -D ${name}'\nhint: Disable this message with "git config set advice.forceDeleteBranch false"\n`);
        code = 1;
        continue;
      }
      await git.deleteBranch({ ...repo.base, ref: name });
      out.write(`Deleted branch ${name} (was ${short(oid)}).\n`);
    }
    return code;
  }

  if (flags.move || flags['force-move']) {
    const [a, b] = positional;
    const oldName = b ? a : current;
    const newName = b ?? a;
    if (!newName) throw new GitError('fatal: branch name required');
    if (!validName(newName)) throw new GitError(`fatal: '${newName}' is not a valid branch name`);
    if (await repo.refOid(`refs/heads/${newName}`) && !flags['force-move'] && newName !== oldName) throw new GitError(`fatal: a branch named '${newName}' already exists`);
    if (!(await repo.refOid(`refs/heads/${oldName}`))) {
      if (oldName === current) { await repo.h.writeText(join(repo.gitdir, 'HEAD'), `ref: refs/heads/${newName}\n`); return 0; }
      throw new GitError(`error: refname refs/heads/${oldName} not found\nfatal: branch rename failed`);
    }
    await git.renameBranch({ ...repo.base, oldref: oldName, ref: newName, checkout: oldName === current });
    return 0;
  }

  if (values['set-upstream-to']) {
    const up = values['set-upstream-to'];
    const [remote, ...rest] = up.split('/');
    const name = positional[0] ?? current;
    if (!(await repo.refOid(`refs/remotes/${up}`))) throw new GitError(`fatal: the requested upstream branch '${up}' does not exist`);
    await repo.setConfig(`branch.${name}.remote`, remote);
    await repo.setConfig(`branch.${name}.merge`, `refs/heads/${rest.join('/')}`);
    out.write(`branch '${name}' set up to track '${up}'.\n`);
    return 0;
  }
  if (flags['unset-upstream']) {
    const name = positional[0] ?? current;
    await repo.setConfig(`branch.${name}.remote`, undefined);
    await repo.setConfig(`branch.${name}.merge`, undefined);
    return 0;
  }

  // Create
  if (positional.length && !flags.list) {
    const [name, start] = positional;
    const oid = await createBranch(repo, name, start);
    if (oid === null) throw new GitError(`fatal: not a valid object name: '${current}'`);
    return 0;
  }

  // List
  const lines = [];
  const width = Math.max(0, ...(await repo.branches()).map((b) => b.length));
  if (!flags.remotes) {
    if (!current && head) lines.push(green(`* (HEAD detached at ${short(head)})`));
    for (const b of await repo.branches()) {
      const oid = await repo.refOid(`refs/heads/${b}`);
      if (flags.merged && head && !(await repo.isAncestor(oid, head))) continue;
      if (flags['no-merged'] && head && (await repo.isAncestor(oid, head))) continue;
      const name = b === current ? green(`* ${b.padEnd(flags.verbose ? width : 0)}`) : `  ${b.padEnd(flags.verbose ? width : 0)}`;
      lines.push(flags.verbose ? `${name} ${short(oid)} ${subject((await repo.commit(oid)).message)}` : name);
    }
  }
  if (flags.all || flags.remotes) {
    for (const r of await repo.remotes()) {
      const names = await repo.remoteBranches(r.remote);
      const pre = flags.all ? 'remotes/' : '';
      const headTarget = await readRemoteHead(repo, r.remote);
      if (headTarget) lines.push(`  ${red(`${pre}${r.remote}/HEAD`)} -> ${headTarget}`);
      for (const b of names.filter((n) => n !== 'HEAD')) lines.push(`  ${red(`${pre}${r.remote}/${b}`)}`);
    }
  }
  if (lines.length) out.write(`${lines.join('\n')}\n`);
  return 0;
}

async function readRemoteHead(repo, remote) {
  const p = join(repo.gitdir, `refs/remotes/${remote}/HEAD`);
  if (!(await repo.h.isFile(p))) return null;
  const raw = (await repo.h.readText(p)).trim();
  return raw.startsWith('ref: refs/remotes/') ? raw.slice('ref: refs/remotes/'.length) : null;
}

/* ======================= merge ======================= */

function mergeMessage(theirName, ourBranch) {
  const into = ourBranch && !['main', 'master'].includes(ourBranch) ? ` into ${ourBranch}` : '';
  if (/^[^/]+\/.+/.test(theirName) && !theirName.startsWith('refs/')) return `Merge remote-tracking branch '${theirName}'${into}`;
  if (/^[0-9a-f]{7,40}$/.test(theirName)) return `Merge commit '${theirName}'${into}`;
  return `Merge branch '${theirName}'${into}`;
}

/**
 * Merge `theirRev` into the current branch. Used by `git merge` and `git pull`.
 * Returns an exit code; writes Git-style output.
 */
export async function mergeInto(repo, theirRev, out, opts = {}) {
  const merge = await repo.mergeState();
  if (merge) {
    if (merge.conflicts.length) throw new GitError("error: Merging is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add/rm <file>'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.");
    throw new GitError('fatal: You have not concluded your merge (MERGE_HEAD exists).\nPlease, commit your changes before you merge.');
  }
  let theirs;
  try { theirs = await repo.resolve(theirRev); } catch { throw new GitError(`merge: ${theirRev} - not something we can merge`, 1); }
  const ours = await repo.headOid();
  const branchName = await repo.branch();
  const ref = branchName ? `refs/heads/${branchName}` : 'HEAD';

  // Unborn branch: just take their history.
  if (!ours) {
    await git.writeRef({ ...repo.base, ref, value: theirs, force: true });
    await repo.syncTo(null, theirs);
    return 0;
  }
  if (await repo.isAncestor(theirs, ours)) { out.write('Already up to date.\n'); return 0; }

  const canFF = await repo.isAncestor(ours, theirs);
  const bases = await git.findMergeBase({ ...repo.base, oids: [ours, theirs] });
  const base = bases[0] ?? null;
  if (!bases.length && !opts.allowUnrelated) throw new GitError('fatal: refusing to merge unrelated histories');

  // Refuse if local changes would be overwritten.
  const incoming = await repo.changedPaths(canFF ? ours : base, theirs);
  const dirty = await repo.dirtyPaths();
  const clash = dirty.filter((p) => incoming.includes(p));
  if (clash.length) throw new GitError(`error: Your local changes to the following files would be overwritten by merge:\n${clash.map((p) => `\t${p}`).join('\n')}\nPlease commit your changes or stash them before you merge.\nAborting`, 1);
  const s = await repo.status();
  const untrackedClash = s.untracked.filter((p) => incoming.includes(p));
  if (untrackedClash.length) throw new GitError(`error: The following untracked working tree files would be overwritten by merge:\n${untrackedClash.map((p) => `\t${p}`).join('\n')}\nPlease move or remove them before you merge.\nAborting`, 1);

  if (canFF && !opts.noFF) {
    await git.writeRef({ ...repo.base, ref, value: theirs, force: true });
    await repo.syncTo(ours, theirs);
    out.write(`Updating ${short(ours)}..${short(theirs)}\nFast-forward\n`);
    const stat = diffStat(await commitChanges(repo, ours, theirs));
    if (stat) out.write(`${stat}\n`);
    return 0;
  }
  if (opts.ffOnly) throw new GitError('fatal: Not possible to fast-forward, aborting.');

  const id = await repo.requireIdentity();
  const now = Math.floor(Date.now() / 1000);
  const person = { ...id, timestamp: now, timezoneOffset: new Date().getTimezoneOffset() };
  const message = opts.message ?? mergeMessage(opts.theirName ?? theirRev, branchName);
  const ourChanged = new Set(await repo.changedPaths(base, ours));
  const theirChanged = await repo.changedPaths(base, theirs);
  const both = theirChanged.filter((p) => ourChanged.has(p));

  let result;
  try {
    result = await git.merge({
      ...repo.base,
      ours: ref,
      theirs,
      fastForward: false,
      abortOnConflict: false,
      allowUnrelatedHistories: !!opts.allowUnrelated,
      message,
      author: person,
      committer: person,
    });
  } catch (e) {
    if (e.code === 'MergeConflictError') {
      const conflicts = e.data.filepaths;
      // Label conflict markers like Git: "<<<<<<< HEAD" … ">>>>>>> feature-branch" (or the commit id for pulls).
      const theirLabel = opts.markerLabel ?? opts.theirName ?? theirRev;
      for (const p of conflicts) {
        const full = join(repo.dir, p);
        if (!(await repo.h.isFile(full))) continue;
        const text = await repo.h.readText(full);
        await repo.h.writeText(full, text.replace(/^<{7} .*$/gm, '<<<<<<< HEAD').replace(/^>{7} .*$/gm, `>>>>>>> ${theirLabel}`));
      }
      for (const p of theirChanged.filter((x) => !conflicts.includes(x))) {
        if (await repo.h.isFile(join(repo.dir, p))) await git.add({ ...repo.base, filepath: p, force: true });
        else await git.remove({ ...repo.base, filepath: p }).catch(() => {});
      }
      await repo.writeMergeState(theirs, `${message}\n\n# Conflicts:\n${conflicts.map((p) => `#\t${p}`).join('\n')}\n`, conflicts);
      await repo.h.writeText(join(repo.gitdir, 'SIM_TOUCHED'), JSON.stringify(theirChanged));
      for (const p of both) out.write(`Auto-merging ${p}\n`);
      for (const p of e.data.bothModified ?? []) out.write(`CONFLICT (content): Merge conflict in ${p}\n`);
      for (const p of e.data.deleteByUs ?? []) out.write(`CONFLICT (modify/delete): ${p} deleted in HEAD and modified in ${opts.theirName ?? theirRev}.  Version ${opts.theirName ?? theirRev} of ${p} left in tree.\n`);
      for (const p of e.data.deleteByTheirs ?? []) out.write(`CONFLICT (modify/delete): ${p} deleted in ${opts.theirName ?? theirRev} and modified in HEAD.  Version HEAD of ${p} left in tree.\n`);
      out.write('Automatic merge failed; fix conflicts and then commit the result.\n');
      return 1;
    }
    if (e.code === 'MergeNotSupportedError') throw new GitError('error: this merge has more than one merge base (a "criss-cross" merge), which this playground cannot handle yet.');
    throw e;
  }
  await repo.syncTo(ours, result.oid);
  for (const p of both) out.write(`Auto-merging ${p}\n`);
  out.write("Merge made by the 'ort' strategy.\n");
  const stat = diffStat(await commitChanges(repo, ours, result.oid));
  if (stat) out.write(`${stat}\n`);
  return 0;
}

async function abortMerge(repo) {
  const st = await repo.mergeState();
  if (!st) throw new GitError('fatal: There is no merge to abort (MERGE_HEAD missing).');
  const head = await repo.headOid();
  const headTree = await repo.treeMap(head);
  const touchedPath = join(repo.gitdir, 'SIM_TOUCHED');
  const touched = (await repo.h.isFile(touchedPath)) ? JSON.parse(await repo.h.readText(touchedPath)) : [];
  for (const p of new Set([...touched, ...st.conflicts])) {
    const full = join(repo.dir, p);
    const entry = headTree.get(p);
    if (entry) {
      const { blob } = await git.readBlob({ ...repo.base, oid: entry.oid });
      await repo.h.mkdirp(full.slice(0, full.lastIndexOf('/')));
      await repo.h.pfs.writeFile(full, blob);
      await git.add({ ...repo.base, filepath: p, force: true });
    } else {
      if (await repo.h.isFile(full)) await repo.h.pfs.unlink(full);
      await git.remove({ ...repo.base, filepath: p }).catch(() => {});
    }
  }
  await repo.clearMergeState();
  if (await repo.h.isFile(touchedPath)) await repo.h.pfs.unlink(touchedPath);
}

export async function merge({ sh, args, out }) {
  const { flags, values, positional } = parseArgs(args, {
    value: { m: 'message' },
    longBool: ['abort', 'continue', 'no-ff', 'ff-only', 'ff', 'no-edit', 'allow-unrelated-histories', 'squash', 'quiet'],
    bool: { q: 'quiet' },
  });
  const repo = await requireRepo(sh);
  if (flags.quiet) out = { write() {} };
  if (flags.abort) { await abortMerge(repo); return 0; }
  if (flags.continue) {
    const { commit } = await import('./cmd-basic.js');
    return commit({ sh, args: ['--no-edit'], out });
  }
  if (flags.squash) throw new GitError('error: --squash is not part of this course playground', 1);
  if (!positional.length) {
    throw new GitError('fatal: No remote for the current branch.', 128);
  }
  // Several branches: real Git makes one "octopus" merge; the playground merges them one at a time instead.
  if (positional.length > 1) out.write(`Merging ${positional.length} branches one at a time.\n`);
  for (const theirName of positional) {
    const code = await mergeInto(repo, theirName, out, {
      noFF: flags['no-ff'],
      ffOnly: flags['ff-only'],
      message: values.message,
      allowUnrelated: flags['allow-unrelated-histories'],
      theirName,
    });
    if (code) return code;
  }
  return 0;
}
