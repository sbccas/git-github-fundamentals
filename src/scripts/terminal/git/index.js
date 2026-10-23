/** `git` entry point for the shell: dispatch, help, and error formatting. */
import { GitError, findRepo, short } from './repo.js';
import { ArgError } from '../args.js';
import { init, config, status, add, rm, commit, restore } from './cmd-basic.js';
import { log, diff, show } from './cmd-history.js';
import { branch, switchCmd, checkout, merge } from './cmd-branch.js';
import { reset, revert, stash, tag } from './cmd-undo.js';
import { remote, fetch, pull, push, clone } from './cmd-remote.js';
import { COMMANDS as HELP, mainHelp, usage, manual, GUIDES, GUIDE_TEXT } from './help.js';
import { join } from '../path.js';

const HANDLERS = {
  init, config, status, add, rm, commit, restore,
  log, diff, show,
  branch, switch: switchCmd, checkout, merge,
  reset, revert, stash, tag,
  remote, fetch, pull, push, clone,
};

export const GIT_COMMANDS = [...Object.keys(HANDLERS), 'help'].sort();

export const GIT_VERSION = 'git version 2.47.1 (SBCCAS playground, powered by isomorphic-git)';

export function levenshtein(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

const NOT_IN_COURSE = ['rebase', 'cherry-pick', 'bisect', 'submodule', 'worktree', 'lfs', 'mv', 'grep', 'blame', 'reflog', 'gc', 'am', 'apply', 'archive', 'notes', 'shortlog', 'describe', 'citool', 'gui', 'gitk', 'rev-parse', 'ls-files', 'cat-file', 'hash-object', 'sparse-checkout', 'maintenance', 'clean'];

function helpCommand(args, out, err) {
  const topic = args.find((a) => !a.startsWith('-'));
  if (args.includes('-g') || args.includes('--guides')) {
    out.write(`The Git concept guides are:\n${Object.entries(GUIDES).map(([k, v]) => `   ${k.padEnd(14)}${v}`).join('\n')}\n\nSee 'git help <concept>' to read about a specific guide.\n`);
    return 0;
  }
  if (args.includes('-a') || args.includes('--all')) {
    out.write(`See 'git help <command>' to read about a specific subcommand\n\nCommands available in this playground\n${GIT_COMMANDS.map((c) => `   ${c.padEnd(14)}${HELP[c]?.summary ?? 'Display help information about Git'}`).join('\n')}\n`);
    return 0;
  }
  if (!topic) { out.write(mainHelp()); return 0; }
  if (HELP[topic]) { out.write(manual(topic)); return 0; }
  if (GUIDE_TEXT[topic]) { out.write(`${GUIDES[topic]}\n\n${GUIDE_TEXT[topic]}\n`); return 0; }
  if (NOT_IN_COURSE.includes(topic)) { err.write(`git ${topic} is a real Git command, but it is not part of this course playground.\n`); return 1; }
  err.write(`No manual entry for git${topic}\n`);
  return 1;
}

export async function runGit(sh, args, out, err) {
  if (!args.length) { out.write(mainHelp()); return 1; }
  const [name, ...rest] = args;
  if (name === '--version' || name === '-v' || name === 'version') { out.write(`${GIT_VERSION}\n`); return 0; }
  if (name === '--help' || name === '-h' || name === 'help') return helpCommand(rest, out, err);
  if (name === '-C') {
    const [dir, ...more] = rest;
    const saved = sh.cwd;
    sh.cwd = sh.abs(dir);
    try { return await runGit(sh, more, out, err); } finally { sh.cwd = saved; }
  }

  const handler = HANDLERS[name];
  if (!handler) {
    if (NOT_IN_COURSE.includes(name)) { err.write(`git ${name} is a real Git command, but it is not part of this course playground.\nType 'git help' to see the commands you can use here.\n`); return 1; }
    err.write(`git: '${name}' is not a git command. See 'git --help'.\n`);
    const close = GIT_COMMANDS.map((c) => [c, levenshtein(name, c)]).filter(([, d]) => d <= 2).sort((a, b) => a[1] - b[1]);
    if (close.length) err.write(`\nThe most similar command${close.length > 1 ? 's are' : ' is'}\n${close.slice(0, 3).map(([c]) => `\t${c}`).join('\n')}\n`);
    return 1;
  }
  if (rest.includes('-h')) { out.write(usage(name)); return 129; }
  if (rest.includes('--help')) { out.write(manual(name)); return 0; }

  try {
    return (await handler({ sh, args: rest, out, err })) ?? 0;
  } catch (e) {
    if (e instanceof GitError) {
      err.write(`${e.message}\n`);
      return e.exitCode;
    }
    if (e instanceof ArgError) {
      err.write(`error: ${e.message}\n${usage(name)}`);
      return 129;
    }
    if (e?.code === 'NotFoundError' || e?.code === 'NotFoundError') {
      err.write(`fatal: ${e.message}\n`);
      return 128;
    }
    throw e;
  }
}

/** Git Bash-style prompt suffix: " (main)", " (main|MERGING)", " ((a1b2c3d...))". */
export async function promptGitInfo(sh) {
  const repo = await findRepo(sh);
  if (!repo) return '';
  const b = await repo.branch();
  let label;
  if (b) label = b;
  else {
    const oid = await repo.headOid();
    label = oid ? `(${short(oid)}...)` : '(unknown)';
  }
  if (await sh.h.isFile(join(repo.gitdir, 'MERGE_HEAD'))) label += '|MERGING';
  return `(${label})`;
}
