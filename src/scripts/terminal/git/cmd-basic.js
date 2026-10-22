import { git, GitError, requireRepo, findRepo, readGlobalConfig, writeGlobalConfig, short, subject, plural, NOT_A_REPO } from './repo.js';
import { parseArgs } from '../args.js';
import { normalizeKey } from './ini.js';
import { join } from '../path.js';
import { green, red } from '../ansi.js';
import { commitChanges, commitSummary } from './diffutil.js';
import { globToRegExp, hasGlob } from '../tokenize.js';

/* ======================= init ======================= */

export async function init({ sh, args, out }) {
  const { positional, values, flags } = parseArgs(args, { value: { b: 'initial-branch' }, bool: { q: 'quiet' } });
  const dir = sh.abs(positional[0] ?? '.');
  await sh.h.mkdirp(dir);
  const gitdir = join(dir, '.git');
  if (await sh.h.isDir(gitdir)) {
    if (!flags.quiet) out.write(`Reinitialized existing Git repository in ${gitdir}/\n`);
    return 0;
  }
  const global = await readGlobalConfig(sh);
  const configured = global.filter((e) => e.key === 'init.defaultbranch').pop()?.value;
  const defaultBranch = values['initial-branch'] ?? configured ?? 'master';
  if (!values['initial-branch'] && !configured) {
    out.write(`hint: Using 'master' as the name for the initial branch. This default branch name
hint: is subject to change. To configure the initial branch name to use in all
hint: of your new repositories, which will suppress this warning, call:
hint:
hint: 	git config --global init.defaultBranch <name>
hint:
hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
hint: 'development'. The just-created branch can be renamed via this command:
hint:
hint: 	git branch -m <name>
`);
  }
  await git.init({ fs: sh.fs, dir, defaultBranch });
  if (!flags.quiet) out.write(`Initialized empty Git repository in ${gitdir}/\n`);
  return 0;
}

/* ======================= config ======================= */

export async function config({ sh, args, out, err }) {
  const { flags, values, positional } = parseArgs(args, {
    bool: { l: 'list' },
    longBool: ['global', 'local', 'get', 'unset', 'system'],
  });
  if (flags.system) throw new GitError('error: the system config file is managed by your college IT team in this lab', 1);
  const repo = await findRepo(sh);
  const scope = flags.global ? 'global' : flags.local ? 'local' : null;
  if (flags.local && !repo) throw new GitError('fatal: --local can only be used inside a git repository');

  if (flags.list) {
    const lines = [];
    if (scope !== 'local') for (const e of await readGlobalConfig(sh)) lines.push(`${e.key}=${e.value}`);
    if (scope !== 'global' && repo) for (const e of await repo.localConfig()) lines.push(`${e.key}=${e.value}`);
    if (lines.length) out.write(`${lines.join('\n')}\n`);
    return 0;
  }

  const [rawKey, value] = positional;
  if (!rawKey) {
    err.write('usage: git config [<options>]\n\n    --global              use global config file\n    --local               use repository config file\n    -l, --list            list all\n    --get                 get value: name\n    --unset               remove a variable: name\n');
    return 129;
  }
  const key = normalizeKey(rawKey);
  if (!key) throw new GitError(`error: key does not contain a section: ${rawKey}`, 1);

  const useGlobal = scope === 'global' || (!scope && !repo && (value !== undefined || flags.unset));
  if (!scope && !repo && (value !== undefined || flags.unset) && !useGlobal) throw new GitError('fatal: not in a git directory');

  // Read
  if (value === undefined && !flags.unset) {
    let found;
    if (scope === 'global') found = (await readGlobalConfig(sh)).filter((e) => e.key === key).pop()?.value;
    else if (scope === 'local') found = (await repo.localConfig()).filter((e) => e.key === key).pop()?.value;
    else found = repo ? await repo.getConfig(key) : (await readGlobalConfig(sh)).filter((e) => e.key === key).pop()?.value;
    if (found === undefined) return 1;
    out.write(`${found}\n`);
    return 0;
  }

  // Write / unset
  if (useGlobal) {
    const entries = (await readGlobalConfig(sh)).filter((e) => e.key !== key);
    if (flags.unset) {
      const before = (await readGlobalConfig(sh)).length;
      if (before === entries.length) return 5;
    } else {
      entries.push({ key, value });
    }
    await writeGlobalConfig(sh, entries);
    return 0;
  }
  if (!repo) throw new GitError('fatal: not in a git directory');
  if (flags.unset) {
    if ((await repo.localConfig()).every((e) => e.key !== key)) return 5;
    await repo.setConfig(rawKey, undefined);
  } else {
    await repo.setConfig(rawKey, value);
  }
  return 0;
}

/* ======================= status ======================= */

async function trackingInfo(repo, branch) {
  if (!branch) return '';
  const remote = await repo.getConfig(`branch.${branch}.remote`);
  const merge = await repo.getConfig(`branch.${branch}.merge`);
  if (!remote || !merge) return '';
  const upName = `${remote}/${merge.replace(/^refs\/heads\//, '')}`;
  const upOid = await repo.refOid(`refs/remotes/${upName}`);
  if (!upOid) return `Your branch is based on '${upName}', but the upstream is gone.\n  (use "git branch --unset-upstream" to fixup)\n`;
  const local = await repo.headOid();
  if (!local) return '';
  const a = await repo.ancestors(local);
  const b = await repo.ancestors(upOid);
  const ahead = [...a].filter((x) => !b.has(x)).length;
  const behind = [...b].filter((x) => !a.has(x)).length;
  if (!ahead && !behind) return `Your branch is up to date with '${upName}'.\n`;
  if (ahead && !behind) return `Your branch is ahead of '${upName}' by ${plural(ahead, 'commit')}.\n  (use "git push" to publish your local commits)\n`;
  if (behind && !ahead) return `Your branch is behind '${upName}' by ${plural(behind, 'commit')}, and can be fast-forwarded.\n  (use "git pull" to update your local branch)\n`;
  return `Your branch and '${upName}' have diverged,\nand have ${ahead} and ${behind} different commits each, respectively.\n  (use "git pull" if you want to integrate the remote branch with yours)\n`;
}

export { trackingInfo };

/** Collapse untracked paths into their highest untracked directory, like Git does. */
async function collapseUntracked(repo, untracked) {
  const tracked = new Set([...(await repo.indexMap()).keys(), ...(await repo.treeMap(await repo.headOid())).keys()]);
  const trackedDirs = new Set();
  for (const t of tracked) {
    const parts = t.split('/');
    for (let i = 1; i < parts.length; i++) trackedDirs.add(parts.slice(0, i).join('/'));
  }
  const shown = new Set();
  for (const p of untracked) {
    const parts = p.split('/');
    let label = p;
    for (let i = 1; i < parts.length; i++) {
      const d = parts.slice(0, i).join('/');
      if (!trackedDirs.has(d)) { label = `${d}/`; break; }
    }
    shown.add(label);
  }
  return [...shown].sort();
}

/** Long-format status text (used by `git status` and by `git commit` when there is nothing to commit). */
export async function longStatus(repo) {
  const lines = [];
  const branch = await repo.branch();
  const head = await repo.headOid();
  if (branch) lines.push(`On branch ${branch}`);
  else lines.push(`HEAD detached at ${short(head)}`);
  const track = await trackingInfo(repo, branch);
  if (track) lines.push(track.trimEnd());
  if (!head) lines.push('', 'No commits yet');

  const s = await repo.status();
  const merge = await repo.mergeState();
  if (merge) {
    if (s.conflicts.length) lines.push('You have unmerged paths.', '  (fix conflicts and run "git commit")', '  (use "git merge --abort" to abort the merge)');
    else lines.push('All conflicts fixed but you are still merging.', '  (use "git commit" to conclude merge)');
  }
  const pad = (k) => `${k}:`.padEnd(12);
  const dp = (p) => repo.displayPath(p);
  if (s.staged.length) {
    lines.push('', 'Changes to be committed:', head ? '  (use "git restore --staged <file>..." to unstage)' : '  (use "git rm --cached <file>..." to unstage)');
    for (const c of s.staged) lines.push(green(`\t${pad(c.kind)}${dp(c.path)}`));
  }
  if (s.conflicts.length) {
    lines.push('', 'Unmerged paths:', '  (use "git add <file>..." to mark resolution)');
    for (const p of s.conflicts) lines.push(red(`\tboth modified:   ${dp(p)}`));
  }
  if (s.unstaged.length) {
    const hasDel = s.unstaged.some((c) => c.kind === 'deleted');
    lines.push('', 'Changes not staged for commit:', `  (use "git add${hasDel ? '/rm' : ''} <file>..." to update what will be committed)`, '  (use "git restore <file>..." to discard changes in working directory)');
    for (const c of s.unstaged) lines.push(red(`\t${pad(c.kind)}${dp(c.path)}`));
  }
  const untracked = await collapseUntracked(repo, s.untracked);
  if (untracked.length) {
    lines.push('', 'Untracked files:', '  (use "git add <file>..." to include in what will be committed)');
    for (const p of untracked) lines.push(red(`\t${dp(p)}${p.endsWith('/') && !dp(p).endsWith('/') ? '/' : ''}`));
  }
  lines.push('');
  if (!s.staged.length && !merge) {
    if (s.unstaged.length || s.conflicts.length) lines.push('no changes added to commit (use "git add" and/or "git commit -a")');
    else if (untracked.length) lines.push('nothing added to commit but untracked files present (use "git add" to track)');
    else if (!head) lines.push('nothing to commit (create/copy files and use "git add" to track)');
    else lines.push('nothing to commit, working tree clean');
  } else {
    lines.pop();
  }
  return { text: `${lines.join('\n')}\n`, status: s, untracked };
}

export async function status({ sh, args, out }) {
  const { flags } = parseArgs(args, { bool: { s: 'short', b: 'branch' } });
  const repo = await requireRepo(sh);
  if (!flags.short) {
    out.write((await longStatus(repo)).text);
    return 0;
  }
  const s = await repo.status();
  const lines = [];
  if (flags.branch) {
    const b = await repo.branch();
    lines.push(`## ${b ?? 'HEAD (no branch)'}`);
  }
  const rows = new Map();
  const code = { 'new file': 'A', modified: 'M', deleted: 'D' };
  for (const c of s.staged) rows.set(c.path, [code[c.kind], ' ']);
  for (const c of s.unstaged) rows.set(c.path, [rows.get(c.path)?.[0] ?? ' ', code[c.kind]]);
  for (const p of s.conflicts) rows.set(p, ['U', 'U']);
  for (const [p, [x, y]] of [...rows].sort()) lines.push(`${x === 'U' ? red(x) : green(x)}${red(y)} ${repo.displayPath(p)}`);
  for (const p of await collapseUntracked(repo, s.untracked)) lines.push(`${red('??')} ${repo.displayPath(p)}`);
  if (lines.length) out.write(`${lines.join('\n')}\n`);
  return 0;
}

/* ======================= add / rm ======================= */

/** Match status rows against user pathspecs. Returns { matched:Set, unmatched:[spec] } */
async function matchPathspecs(repo, specs, allPaths) {
  const matched = new Set();
  const unmatched = [];
  for (const spec of specs) {
    let hits = [];
    if (hasGlob(spec)) {
      const baseRel = repo.prefix;
      const re = globToRegExp(spec);
      hits = allPaths.filter((p) => {
        const rel = baseRel ? (p.startsWith(`${baseRel}/`) ? p.slice(baseRel.length + 1) : null) : p;
        return rel !== null && (re.test(rel) || re.test(rel.split('/').pop()));
      });
    } else {
      const rp = repo.repoPath(spec);
      if (rp === null) throw new GitError(`fatal: ${spec}: '${spec}' is outside repository at '${repo.dir}'`);
      hits = allPaths.filter((p) => rp === '' || p === rp || p.startsWith(`${rp}/`));
    }
    if (hits.length) hits.forEach((h) => matched.add(h)); else unmatched.push(spec);
  }
  return { matched, unmatched };
}

export async function add({ sh, args, out, err }) {
  const { flags, positional, paths } = parseArgs(args, { bool: { A: 'all', f: 'force', u: 'update', v: 'verbose', n: 'dry-run' }, longBool: ['all', 'force', 'update'] });
  const repo = await requireRepo(sh);
  let specs = [...positional, ...paths];
  if (!specs.length && !flags.all && !flags.update) {
    out.write("Nothing specified, nothing added.\nhint: Maybe you wanted to say 'git add .'?\nhint: Disable this message with \"git config set advice.addEmptyPathspec false\"\n");
    return 0;
  }
  if (!specs.length) specs = [repo.dir];
  const matrix = await repo.statusMatrix();
  const merge = await repo.mergeState();
  const conflictSet = new Set(merge?.conflicts ?? []);
  const rows = new Map(matrix.map((r) => [r[0], r]));
  const { matched, unmatched } = await matchPathspecs(repo, specs.map((s) => (s === repo.dir ? '.' : s)), [...rows.keys()]);

  for (const spec of unmatched) {
    const rp = repo.repoPath(spec);
    const full = sh.abs(spec);
    if (rp !== null && (await sh.h.exists(full))) {
      if (flags.force && (await sh.h.isFile(full))) { await git.add({ ...repo.base, filepath: rp, force: true }); continue; }
      if (await git.isIgnored({ ...repo.base, filepath: rp })) {
        err.write(`The following paths are ignored by one of your .gitignore files:\n${spec}\nhint: Use -f if you really want to add them.\nhint: Disable this message with "git config set advice.addIgnoredFile false"\n`);
        return 1;
      }
      continue; // exists and unchanged
    }
    throw new GitError(`fatal: pathspec '${spec}' did not match any files`);
  }

  for (const p of [...matched].sort()) {
    const [, head, work, stage] = rows.get(p);
    if (flags.update && head === 0 && stage === 0) continue;
    const changed = !(head === 1 && work === 1 && stage === 1) || conflictSet.has(p);
    if (!changed) continue;
    if (work === 0) {
      if (stage !== 0) await git.remove({ ...repo.base, filepath: p });
    } else {
      await git.add({ ...repo.base, filepath: p, force: flags.force });
    }
    if (conflictSet.has(p)) await repo.resolveConflict(p);
    if (flags.verbose) out.write(`add '${repo.displayPath(p)}'\n`);
  }
  return 0;
}

export async function rm({ sh, args, out }) {
  const { flags, positional, paths } = parseArgs(args, { bool: { r: 'recursive', f: 'force', q: 'quiet' }, longBool: ['cached'] });
  const repo = await requireRepo(sh);
  const specs = [...positional, ...paths];
  if (!specs.length) throw new GitError('usage: git rm [<options>] [--] <file>...', 129);
  const index = [...(await repo.indexMap()).keys()];
  const targets = [];
  for (const spec of specs) {
    const rp = repo.repoPath(spec);
    const hits = index.filter((p) => p === rp || p.startsWith(`${rp}/`) || rp === '');
    if (!hits.length) throw new GitError(`fatal: pathspec '${spec}' did not match any files`);
    if (hits.some((h) => h !== rp) && !flags.recursive) throw new GitError(`fatal: not removing '${spec}' recursively without -r`);
    targets.push(...hits);
  }
  for (const p of targets) {
    await git.remove({ ...repo.base, filepath: p });
    if (!flags.cached) {
      const full = join(repo.dir, p);
      if (await sh.h.isFile(full)) await sh.h.pfs.unlink(full);
      await repo.removeEmptyDirs(join(repo.dir, p.split('/').slice(0, -1).join('/')));
    }
    if (!flags.quiet) out.write(`rm '${p}'\n`);
  }
  return 0;
}

/* ======================= commit ======================= */

function cleanMessage(text) {
  return text
    .split('\n')
    .filter((l) => !l.startsWith('#'))
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/^\n+/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

export async function commit({ sh, args, out }) {
  const { flags, values } = parseArgs(args, {
    bool: { a: 'all', q: 'quiet' },
    value: { m: 'message' },
    multi: ['message'],
    longBool: ['amend', 'allow-empty', 'no-edit'],
  });
  const repo = await requireRepo(sh);
  const merge = await repo.mergeState();
  if (merge?.conflicts.length) {
    throw new GitError("error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add/rm <file>'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.");
  }

  if (flags.all) {
    for (const c of (await repo.status()).unstaged) {
      if (c.kind === 'deleted') await git.remove({ ...repo.base, filepath: c.path });
      else await git.add({ ...repo.base, filepath: c.path });
    }
  }

  const head = await repo.headOid();
  if (flags.amend && !head) throw new GitError('fatal: You have nothing to amend.');
  const s = await repo.status();
  if (!s.staged.length && !merge && !flags['allow-empty'] && !flags.amend) {
    out.write((await longStatus(repo)).text);
    return 1;
  }

  const id = await repo.requireIdentity();
  const branch = await repo.branch();

  let message = values.message ? values.message.join('\n\n') : null;
  if (message === null) {
    const prev = flags.amend ? (await repo.commit(head)).message : merge ? merge.message : '';
    if (flags['no-edit'] && prev) {
      message = prev;
    } else {
      const template = `${prev}${prev && !prev.endsWith('\n') ? '\n' : ''}\n# Please enter the commit message for your changes. Lines starting\n# with '#' will be ignored, and an empty message aborts the commit.\n#\n# On branch ${branch ?? 'HEAD'}\n${s.staged.length ? `# Changes to be committed:\n${s.staged.map((c) => `#\t${`${c.kind}:`.padEnd(12)}${c.path}`).join('\n')}\n#\n` : ''}`;
      const edited = await sh.ui.openEditor({ path: '.git/COMMIT_EDITMSG', content: template, title: 'Commit message', hint: 'Write your commit message on the first line, then press Save.' });
      message = edited === null ? '' : edited;
    }
  }
  message = cleanMessage(message);
  if (!message) {
    out.write('Aborting commit due to empty commit message.\n');
    return 1;
  }

  const now = Math.floor(Date.now() / 1000);
  const tz = new Date().getTimezoneOffset();
  const person = { ...id, timestamp: now, timezoneOffset: tz };
  let parent;
  if (merge) parent = [head, merge.oid];
  else if (flags.amend) parent = (await repo.commit(head)).parent;
  const oid = await git.commit({
    ...repo.base,
    message,
    author: flags.amend ? { ...(await repo.commit(head)).author, ...(values.message ? {} : {}) } : person,
    committer: person,
    parent,
    ref: branch ? undefined : 'HEAD',
  });
  if (merge) await repo.clearMergeState();

  if (flags.quiet) return 0;
  const where = branch ? `${branch}${head || flags.amend ? '' : ' (root-commit)'}` : 'detached HEAD';
  out.write(`[${where} ${short(oid)}] ${subject(message)}\n`);
  if (merge) return 0;
  const parentOid = (await repo.commit(oid)).parent[0] ?? null;
  const changes = await commitChanges(repo, parentOid, oid);
  out.write(`${commitSummary(changes)}\n`);
  return 0;
}

/* ======================= restore ======================= */

export async function restore({ sh, args }) {
  const { flags, values, positional, paths } = parseArgs(args, {
    bool: { S: 'staged', W: 'worktree' },
    value: { s: 'source' },
    longBool: ['staged', 'worktree'],
  });
  const repo = await requireRepo(sh);
  const specs = [...positional, ...paths];
  if (!specs.length) throw new GitError('fatal: you must specify path(s) to restore');
  const staged = !!flags.staged;
  const worktree = !!flags.worktree || !staged;
  const head = await repo.headOid();
  const sourceOid = values.source ? await repo.resolve(values.source) : null;

  const index = await repo.indexMap();
  const headTree = await repo.treeMap(head);
  const srcTree = sourceOid ? await repo.treeMap(sourceOid) : null;
  const known = [...new Set([...index.keys(), ...headTree.keys(), ...(srcTree?.keys() ?? [])])];
  const { matched, unmatched } = await matchPathspecs(repo, specs, known);
  if (unmatched.length) throw new GitError(`error: pathspec '${unmatched[0]}' did not match any file(s) known to git`, 1);

  for (const p of matched) {
    if (staged) {
      const from = srcTree ?? headTree;
      if (from.has(p)) await git.resetIndex({ ...repo.base, filepath: p, ref: sourceOid ?? 'HEAD' });
      else await git.remove({ ...repo.base, filepath: p });
    }
    if (worktree) {
      const src = srcTree ?? (staged ? headTree : null);
      const oid = src ? src.get(p)?.oid : index.get(p);
      const full = join(repo.dir, p);
      if (oid) {
        const { blob } = await git.readBlob({ ...repo.base, oid });
        await sh.h.mkdirp(full.slice(0, full.lastIndexOf('/')));
        await sh.h.pfs.writeFile(full, blob);
      } else if (await sh.h.isFile(full)) {
        await sh.h.pfs.unlink(full);
      }
    }
  }
  return 0;
}

export { NOT_A_REPO };
