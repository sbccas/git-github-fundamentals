import { git, GitError, requireRepo, findRepo, short, Repo } from './repo.js';
import { parseArgs } from '../args.js';
import { join, basename } from '../path.js';
import { parseGithubUrl, gitdirOf, exists, copyObjects, remoteRefs, setRemoteRef } from './github.js';
import { mergeInto } from './cmd-branch.js';

const NO_REPO = (url) => `remote: Repository not found.\nfatal: repository '${url.replace(/\/?$/, '/')}' not found`;
const BAD_REMOTE = (name) => `fatal: '${name}' does not appear to be a git repository\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.`;

async function remoteUrl(repo, name) {
  return repo.getConfig(`remote.${name}.url`);
}

/** Resolve a remote name (or URL) to { name, url, id }; throws Git-style errors. */
async function resolveRemote(sh, repo, nameOrUrl) {
  let url = parseGithubUrl(nameOrUrl) ? nameOrUrl : await remoteUrl(repo, nameOrUrl);
  if (!url) throw new GitError(BAD_REMOTE(nameOrUrl));
  const id = parseGithubUrl(url);
  if (!id) throw new GitError(`fatal: unable to access '${url}': Could not resolve host: ${url.replace(/^\w+:\/\//, '').split('/')[0]}\nhint: This playground can only talk to its simulated GitHub (https://github.com/<user>/<repo>.git).`);
  if (!(await exists(sh, id))) throw new GitError(NO_REPO(url));
  return { name: parseGithubUrl(nameOrUrl) ? null : nameOrUrl, url, id };
}

const pad = (s, n) => s.padEnd(n);

function transferLines(n) {
  return n ? `Enumerating objects: ${n}, done.\nCounting objects: 100% (${n}/${n}), done.\n` : '';
}

/* ======================= remote ======================= */

export async function remote({ sh, args, out }) {
  const repo = await requireRepo(sh);
  const sub = args[0] && !args[0].startsWith('-') ? args[0] : null;
  const rest = sub ? args.slice(1) : args;
  const remotes = await repo.remotes();

  if (!sub) {
    const verbose = rest.includes('-v') || rest.includes('--verbose');
    const lines = remotes.flatMap((r) => (verbose ? [`${r.remote}\t${r.url} (fetch)`, `${r.remote}\t${r.url} (push)`] : [r.remote]));
    if (lines.length) out.write(`${lines.join('\n')}\n`);
    return 0;
  }
  const [name, url] = rest;
  switch (sub) {
    case 'add': {
      if (!name || !url) throw new GitError('usage: git remote add [<options>] <name> <url>', 129);
      if (remotes.some((r) => r.remote === name)) throw new GitError(`error: remote ${name} already exists.`, 3);
      await git.addRemote({ ...repo.base, remote: name, url });
      return 0;
    }
    case 'remove': case 'rm': {
      if (!remotes.some((r) => r.remote === name)) throw new GitError(`error: No such remote: '${name}'`, 2);
      await git.deleteRemote({ ...repo.base, remote: name });
      await repo.h.rmrf(join(repo.gitdir, 'refs/remotes', name));
      for (const b of await repo.branches()) {
        if ((await repo.getConfig(`branch.${b}.remote`)) === name) {
          await repo.setConfig(`branch.${b}.remote`, undefined);
          await repo.setConfig(`branch.${b}.merge`, undefined);
        }
      }
      return 0;
    }
    case 'set-url': {
      if (!name || !url) throw new GitError('usage: git remote set-url [--push] <name> <newurl> [<oldurl>]', 129);
      if (!remotes.some((r) => r.remote === name)) throw new GitError(`error: No such remote '${name}'`, 2);
      await repo.setConfig(`remote.${name}.url`, url);
      return 0;
    }
    case 'get-url': {
      const r = remotes.find((x) => x.remote === name);
      if (!r) throw new GitError(`error: No such remote '${name}'`, 2);
      out.write(`${r.url}\n`);
      return 0;
    }
    case 'rename': {
      const [oldName, newName] = rest;
      const r = remotes.find((x) => x.remote === oldName);
      if (!r) throw new GitError(`error: No such remote: '${oldName}'`, 2);
      await git.deleteRemote({ ...repo.base, remote: oldName });
      await git.addRemote({ ...repo.base, remote: newName, url: r.url });
      const from = join(repo.gitdir, 'refs/remotes', oldName);
      if (await repo.h.isDir(from)) { await repo.h.copy(from, join(repo.gitdir, 'refs/remotes', newName)); await repo.h.rmrf(from); }
      return 0;
    }
    case 'show': {
      const r = remotes.find((x) => x.remote === name);
      if (!r) throw new GitError(BAD_REMOTE(name));
      out.write(`* remote ${name}\n  Fetch URL: ${r.url}\n  Push  URL: ${r.url}\n`);
      return 0;
    }
    default:
      throw new GitError(`error: unknown subcommand: \`${sub}'`, 129);
  }
}

/* ======================= fetch ======================= */

/** Fetch from a remote into refs/remotes/<name>/*. Returns { lines, count, refs } and writes output. */
async function doFetch(sh, repo, rem, out, { quiet = false } = {}) {
  const count = await copyObjects(sh, gitdirOf(rem.id), repo.gitdir);
  const refs = await remoteRefs(sh, rem.id);
  const lines = [];
  const width = Math.max(4, ...Object.keys(refs.branches).map((b) => b.length), ...Object.keys(refs.tags).map((t) => t.length));
  if (rem.name) {
    for (const [b, oid] of Object.entries(refs.branches)) {
      const ref = `refs/remotes/${rem.name}/${b}`;
      const old = await repo.refOid(ref);
      if (old === oid) continue;
      await git.writeRef({ ...repo.base, ref, value: oid, force: true });
      if (!old) lines.push(` * [new branch]      ${pad(b, width)} -> ${rem.name}/${b}`);
      else if (await repo.isAncestor(old, oid)) lines.push(`   ${short(old)}..${short(oid)}  ${pad(b, width)} -> ${rem.name}/${b}`);
      else lines.push(` + ${short(old)}...${short(oid)} ${pad(b, width)} -> ${rem.name}/${b}  (forced update)`);
    }
  }
  for (const [t, oid] of Object.entries(refs.tags)) {
    if (await repo.refOid(`refs/tags/${t}`)) continue;
    await git.writeRef({ ...repo.base, ref: `refs/tags/${t}`, value: oid, force: true });
    lines.push(` * [new tag]         ${pad(t, width)} -> ${t}`);
  }
  if (!quiet) {
    if (count) out.write(`remote: Enumerating objects: ${count}, done.\nremote: Counting objects: 100% (${count}/${count}), done.\nremote: Total ${count} (delta 0), reused 0 (delta 0), pack-reused 0\nUnpacking objects: 100% (${count}/${count}), done.\n`);
    if (lines.length) out.write(`From ${rem.url.replace(/\.git$/, '')}\n${lines.join('\n')}\n`);
  }
  return { refs, count, lines };
}

async function defaultRemoteName(repo) {
  const branch = await repo.branch();
  const up = branch ? await repo.getConfig(`branch.${branch}.remote`) : null;
  if (up) return up;
  const remotes = await repo.remotes();
  if (remotes.some((r) => r.remote === 'origin')) return 'origin';
  if (remotes.length) return remotes[0].remote;
  return null;
}

export async function fetch({ sh, args, out }) {
  const { flags, positional } = parseArgs(args, { bool: { q: 'quiet', p: 'prune', t: 'tags' }, longBool: ['all', 'prune', 'tags'] });
  const repo = await requireRepo(sh);
  const names = flags.all ? (await repo.remotes()).map((r) => r.remote) : [positional[0] ?? (await defaultRemoteName(repo))];
  if (!names[0]) throw new GitError('fatal: No remote repository specified.  Please, specify either a URL or a\nremote name from which new revisions should be fetched.');
  for (const n of names) {
    const rem = await resolveRemote(sh, repo, n);
    const res = await doFetch(sh, repo, rem, out, { quiet: flags.quiet });
    if (flags.prune && rem.name) {
      for (const b of await repo.remoteBranches(rem.name)) {
        if (b !== 'HEAD' && !res.refs.branches[b]) {
          await git.deleteRef({ ...repo.base, ref: `refs/remotes/${rem.name}/${b}` });
          out.write(` - [deleted]         (none)     -> ${rem.name}/${b}\n`);
        }
      }
    }
  }
  return 0;
}

/* ======================= pull ======================= */

export async function pull({ sh, args, out }) {
  const { flags, positional } = parseArgs(args, { bool: { q: 'quiet', r: 'rebase' }, longBool: ['rebase', 'no-rebase', 'ff-only', 'no-ff', 'allow-unrelated-histories'] });
  if (flags.rebase) throw new GitError('fatal: git pull --rebase is not part of this course playground (it uses merge, the Git for Windows default).');
  const repo = await requireRepo(sh);
  const branch = await repo.branch();
  if (!branch) throw new GitError('You are not currently on a branch.\nPlease specify which branch you want to merge with.\nSee git-pull(1) for details.\n\n    git pull <remote> <branch>\n', 1);
  let remoteName = positional[0];
  let remoteBranch = positional[1];
  if (!remoteName) {
    remoteName = await repo.getConfig(`branch.${branch}.remote`);
    const merge = await repo.getConfig(`branch.${branch}.merge`);
    remoteBranch = merge?.replace(/^refs\/heads\//, '');
    if (!remoteName || !remoteBranch) {
      const any = await defaultRemoteName(repo);
      if (!any) throw new GitError('fatal: No remote repository specified.  Please, specify either a URL or a\nremote name from which new revisions should be fetched.');
      const rem = await resolveRemote(sh, repo, any);
      await doFetch(sh, repo, rem, out);
      throw new GitError(`There is no tracking information for the current branch.\nPlease specify which branch you want to merge with.\nSee git-pull(1) for details.\n\n    git pull <remote> <branch>\n\nIf you wish to set tracking information for this branch you can do so with:\n\n    git branch --set-upstream-to=${any}/<branch> ${branch}\n`, 1);
    }
  }
  const rem = await resolveRemote(sh, repo, remoteName);
  const { refs } = await doFetch(sh, repo, rem, out, { quiet: flags.quiet });
  remoteBranch ??= refs.head ?? branch;
  const theirOid = refs.branches[remoteBranch];
  if (!theirOid) throw new GitError(`fatal: couldn't find remote ref ${remoteBranch}`, 1);
  return mergeInto(repo, theirOid, out, {
    message: `Merge branch '${remoteBranch}' of ${rem.url.replace(/\.git$/, '')}`,
    theirName: `${rem.name ?? rem.url}/${remoteBranch}`,
    markerLabel: theirOid,
    ffOnly: flags['ff-only'],
    noFF: flags['no-ff'],
    allowUnrelated: flags['allow-unrelated-histories'],
  });
}

/* ======================= push ======================= */

export async function push({ sh, args, out: realOut }) {
  let out = realOut;
  const { flags, positional } = parseArgs(args, {
    bool: { u: 'set-upstream', f: 'force', d: 'delete', q: 'quiet' },
    longBool: ['set-upstream', 'force', 'delete', 'tags', 'all', 'force-with-lease'],
  });
  const repo = await requireRepo(sh);
  const branch = await repo.branch();
  const force = flags.force || flags['force-with-lease'];

  let remoteName = positional[0];
  let specs = positional.slice(1);
  if (!remoteName) {
    remoteName = branch ? await repo.getConfig(`branch.${branch}.remote`) : null;
    if (!remoteName) {
      const remotes = await repo.remotes();
      if (!remotes.length) throw new GitError('fatal: No configured push destination.\nEither specify the URL from the command-line or configure a remote repository using\n\n    git remote add <name> <url>\n\nand then push using the remote name\n\n    git push <name>\n');
      if (!flags['set-upstream'] && !flags.tags && !flags.all) {
        const rn = remotes.some((r) => r.remote === 'origin') ? 'origin' : remotes[0].remote;
        throw new GitError(`fatal: The current branch ${branch} has no upstream branch.\nTo push the current branch and set the remote as upstream, use\n\n    git push --set-upstream ${rn} ${branch}\n\nTo have this happen automatically for branches without a tracking\nupstream, see 'push.autoSetupRemote' in 'git help config'.\n`);
      }
      remoteName = remotes.some((r) => r.remote === 'origin') ? 'origin' : remotes[0].remote;
    }
  }
  const rem = await resolveRemote(sh, repo, remoteName);
  const remoteGitdir = gitdirOf(rem.id);
  const refs = await remoteRefs(sh, rem.id);

  // Work out what to push: [{ src, dst, kind: 'branch'|'tag'|'delete' }]
  const jobs = [];
  if (flags.tags) for (const t of await repo.tags()) jobs.push({ src: t, dst: t, kind: 'tag' });
  if (flags.all) for (const b of await repo.branches()) jobs.push({ src: b, dst: b, kind: 'branch' });
  if (flags.delete) for (const s of specs) jobs.push({ src: null, dst: s, kind: 'delete' });
  else {
    for (const s of specs) {
      if (s.startsWith(':')) { jobs.push({ src: null, dst: s.slice(1), kind: 'delete' }); continue; }
      const [src, dst] = s.includes(':') ? s.split(':') : [s, s];
      const isTag = !(await repo.refOid(`refs/heads/${src}`)) && (await repo.refOid(`refs/tags/${src}`));
      jobs.push({ src: src === 'HEAD' ? branch : src, dst: dst === 'HEAD' ? branch : dst, kind: isTag ? 'tag' : 'branch' });
    }
  }
  if (!jobs.length) {
    if (!branch) throw new GitError('fatal: You are not currently on a branch.\nTo push the history leading to the current (detached HEAD)\nstate now, use\n\n    git push origin HEAD:<name-of-remote-branch>\n');
    const merge = await repo.getConfig(`branch.${branch}.merge`);
    const dst = merge ? merge.replace(/^refs\/heads\//, '') : branch;
    jobs.push({ src: branch, dst, kind: 'branch' });
  }

  const results = [];
  const errors = [];
  let toCopy = false;
  for (const job of jobs) {
    if (job.kind === 'delete') {
      if (!refs.branches[job.dst]) { errors.push(`error: unable to delete '${job.dst}': remote ref does not exist`); continue; }
      results.push({ job, line: ` - [deleted]         ${job.dst}`, apply: async () => {
        await setRemoteRef(sh, rem.id, `refs/heads/${job.dst}`, null);
        if (rem.name) await git.deleteRef({ ...repo.base, ref: `refs/remotes/${rem.name}/${job.dst}` }).catch(() => {});
      } });
      continue;
    }
    const localRef = job.kind === 'tag' ? `refs/tags/${job.src}` : `refs/heads/${job.src}`;
    const oid = await repo.refOid(localRef);
    if (!oid) { errors.push(`error: src refspec ${job.src} does not match any`); continue; }
    const remoteOid = job.kind === 'tag' ? refs.tags[job.dst] : refs.branches[job.dst];
    const arrow = `${job.src} -> ${job.dst}`;
    if (remoteOid === oid) { results.push({ job, upToDate: true }); continue; }
    if (job.kind === 'tag' && remoteOid && !force) { results.push({ job, rejected: `${' ! [rejected]        '}${arrow} (already exists)`, kind: 'tag-exists' }); continue; }
    if (remoteOid && !force) {
      const known = await git.readObject({ ...repo.base, oid: remoteOid }).then(() => true).catch(() => false);
      if (!known) { results.push({ job, rejected: ` ! [rejected]        ${arrow} (fetch first)`, kind: 'fetch-first' }); continue; }
      if (!(await repo.isAncestor(remoteOid, oid))) { results.push({ job, rejected: ` ! [rejected]        ${arrow} (non-fast-forward)`, kind: 'non-ff' }); continue; }
    }
    toCopy = true;
    let line;
    if (!remoteOid) line = ` * [new ${job.kind === 'tag' ? 'tag' : 'branch'}]${job.kind === 'tag' ? '         ' : '      '}${arrow}`;
    else if (force && !(await repo.isAncestor(remoteOid, oid).catch(() => false))) line = ` + ${short(remoteOid)}...${short(oid)} ${arrow} (forced update)`;
    else line = `   ${short(remoteOid)}..${short(oid)}  ${arrow}`;
    results.push({ job, line, apply: async () => {
      await setRemoteRef(sh, rem.id, job.kind === 'tag' ? `refs/tags/${job.dst}` : `refs/heads/${job.dst}`, oid);
      if (job.kind === 'branch' && rem.name) await git.writeRef({ ...repo.base, ref: `refs/remotes/${rem.name}/${job.dst}`, value: oid, force: true });
    } });
  }

  if (errors.length && !results.some((r) => r.apply)) {
    throw new GitError(`${errors.join('\n')}\nerror: failed to push some refs to '${rem.url}'`, 1);
  }
  const count = toCopy ? await copyObjects(sh, repo.gitdir, remoteGitdir) : 0;
  for (const r of results) if (r.apply) await r.apply();

  if (flags.quiet) out = { write() {} }; // -q: only errors are printed
  if (count) out.write(`${transferLines(count)}Writing objects: 100% (${count}/${count}), done.\nTotal ${count} (delta 0), reused 0 (delta 0), pack-reused 0\n`);
  const shown = results.filter((r) => r.line || r.rejected);
  if (!shown.length && !errors.length) { out.write('Everything up-to-date\n'); return 0; }
  if (shown.length) out.write(`To ${rem.url}\n${shown.map((r) => r.line ?? r.rejected).join('\n')}\n`);

  if (flags['set-upstream'] && rem.name) {
    for (const r of results.filter((x) => x.job.kind === 'branch' && (x.apply || x.upToDate))) {
      await repo.setConfig(`branch.${r.job.src}.remote`, rem.name);
      await repo.setConfig(`branch.${r.job.src}.merge`, `refs/heads/${r.job.dst}`);
      out.write(`branch '${r.job.src}' set up to track '${rem.name}/${r.job.dst}'.\n`);
    }
  }

  const rejected = results.filter((r) => r.rejected);
  if (rejected.length || errors.length) {
    const msg = [...errors, `error: failed to push some refs to '${rem.url}'`];
    if (rejected.some((r) => r.kind === 'fetch-first')) msg.push("hint: Updates were rejected because the remote contains work that you do not\nhint: have locally. This is usually caused by another repository pushing to\nhint: the same ref. If you want to integrate the remote changes, use\nhint: 'git pull' before pushing again.\nhint: See the 'Note about fast-forwards' in 'git push --help' for details.");
    else if (rejected.some((r) => r.kind === 'non-ff')) msg.push("hint: Updates were rejected because the tip of your current branch is behind\nhint: its remote counterpart. If you want to integrate the remote changes,\nhint: use 'git pull' before pushing again.\nhint: See the 'Note about fast-forwards' in 'git push --help' for details.");
    else if (rejected.some((r) => r.kind === 'tag-exists')) msg.push('hint: Updates were rejected because the tag already exists in the remote.');
    throw new GitError(msg.join('\n'), 1);
  }
  return 0;
}

/* ======================= clone ======================= */

export async function clone({ sh, args, out }) {
  const { positional } = parseArgs(args, { bool: { q: 'quiet' }, value: { b: 'branch' } });
  const [url, dirArg] = positional;
  if (!url) throw new GitError('fatal: You must specify a repository to clone.\n\nusage: git clone [<options>] [--] <repo> [<dir>]', 129);
  const id = parseGithubUrl(url);
  const name = dirArg ?? (id ? id.name : basename(url).replace(/\.git$/, ''));
  const dir = sh.abs(name);
  if ((await sh.h.exists(dir)) && (!(await sh.h.isDir(dir)) || (await sh.h.readdir(dir)).length)) {
    throw new GitError(`fatal: destination path '${name}' already exists and is not an empty directory.`);
  }
  out.write(`Cloning into '${name}'...\n`);
  if (!id) throw new GitError(`fatal: unable to access '${url}': Could not resolve host\nhint: This playground can only clone from its simulated GitHub (https://github.com/<user>/<repo>.git).`);
  if (!(await exists(sh, id))) throw new GitError(NO_REPO(url));
  const refs = await remoteRefs(sh, id);
  const defaultBranch = refs.head && refs.branches[refs.head] ? refs.head : Object.keys(refs.branches)[0] ?? 'main';
  await sh.h.mkdirp(dir);
  await git.init({ fs: sh.fs, dir, defaultBranch });
  const repo = new Repo(sh, dir);
  await git.addRemote({ ...repo.base, remote: 'origin', url });
  const count = await copyObjects(sh, gitdirOf(id), repo.gitdir);
  for (const [b, oid] of Object.entries(refs.branches)) await git.writeRef({ ...repo.base, ref: `refs/remotes/origin/${b}`, value: oid, force: true });
  for (const [t, oid] of Object.entries(refs.tags)) await git.writeRef({ ...repo.base, ref: `refs/tags/${t}`, value: oid, force: true });
  if (count) out.write(`remote: Enumerating objects: ${count}, done.\nremote: Counting objects: 100% (${count}/${count}), done.\nremote: Total ${count} (delta 0), reused 0 (delta 0), pack-reused 0\nReceiving objects: 100% (${count}/${count}), done.\n`);
  if (!Object.keys(refs.branches).length) {
    out.write('warning: You appear to have cloned an empty repository.\n');
    return 0;
  }
  await repo.h.writeText(join(repo.gitdir, 'refs/remotes/origin/HEAD'), `ref: refs/remotes/origin/${defaultBranch}\n`);
  await git.writeRef({ ...repo.base, ref: `refs/heads/${defaultBranch}`, value: refs.branches[defaultBranch], force: true });
  await repo.setConfig(`branch.${defaultBranch}.remote`, 'origin');
  await repo.setConfig(`branch.${defaultBranch}.merge`, `refs/heads/${defaultBranch}`);
  await git.checkout({ ...repo.base, ref: defaultBranch, force: true });
  return 0;
}

export { findRepo };
