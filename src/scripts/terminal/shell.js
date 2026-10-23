/**
 * A small Bash-like shell (PRD T-04) over the sandbox file system.
 * Git commands are delegated to ./git/index.js.
 */
import { parseLine, globToRegExp, hasGlob } from './tokenize.js';
import { resolve, dirname, basename, join, tildify, relative } from './path.js';
import { HOME, helpers } from './vfs.js';
import { blue, bold, strip, dim, cyan } from './ansi.js';
import { runGit, promptGitInfo, levenshtein } from './git/index.js';
import { hintFor } from './hints.js';

export const SHELL_COMMANDS = ['cat', 'cd', 'clear', 'cp', 'echo', 'edit', 'help', 'history', 'ls', 'mkdir', 'mv', 'nano', 'code', 'notepad', 'pwd', 'reset-lab', 'rm', 'touch', 'git'];

export class Shell {
  /**
   * @param {object} opts
   * @param {object} opts.fs  LightningFS instance (passed to isomorphic-git)
   * @param {object} opts.ui  { openEditor({path, content, title}) → Promise<string|null>, clear(), resetSandbox() }
   */
  constructor({ fs, ui, history = [] }) {
    this.fs = fs;
    this.h = helpers(fs);
    this.ui = ui;
    this.home = HOME;
    this.cwd = HOME;
    this.prevCwd = HOME;
    this.history = history;
    this.cache = {}; // isomorphic-git object cache
  }

  async init() {
    await this.h.mkdirp(this.home);
    if (!(await this.h.isDir(this.cwd))) this.cwd = this.home;
  }

  abs(p) { return resolve(this.cwd, p, this.home); }
  display(p) { return tildify(p, this.home); }

  async prompt() {
    return { user: 'student', host: 'SBCCAS', path: this.display(this.cwd), git: await promptGitInfo(this).catch(() => '') };
  }

  /** Run a full command line. `out.write(text)` receives ANSI text. Returns the last exit code. */
  async run(line, out) {
    let commands;
    try {
      commands = parseLine(line);
    } catch (e) {
      out.write(`bash: ${e.message}\n`);
      return 2;
    }
    let code = 0;
    for (const cmd of commands) {
      if (cmd.joiner === '&&' && code !== 0) continue;
      code = await this.exec(cmd, out);
    }
    this.cache = {};
    return code;
  }

  async exec({ argv, redirect }, out) {
    if (!argv.length) return 0;
    argv = await this.expandGlobs(argv);
    let buffer = '';
    let shown = ''; // what reached the screen, for the plain-English hint (T-07)
    const screen = { write: (s) => { shown += s; out.write(s); } };
    const sink = redirect ? { write: (s) => { buffer += s; } } : screen;
    const err = screen; // stderr always goes to the screen
    const name = argv[0];
    let code;
    try {
      code = await this.dispatch(name, argv.slice(1), sink, err);
    } catch (e) {
      console.error(e);
      err.write(`${name}: unexpected error: ${e.message}\n`);
      code = 1;
    }
    if (code) {
      const hint = hintFor(strip(shown));
      if (hint) out.write(cyan(`→ In plain English: ${hint}\n`));
    }
    if (redirect) {
      const target = this.abs(redirect.path);
      if (await this.h.isDir(target)) { err.write(`bash: ${redirect.path}: Is a directory\n`); return 1; }
      if (!(await this.h.isDir(dirname(target)))) { err.write(`bash: ${redirect.path}: No such file or directory\n`); return 1; }
      const prev = redirect.mode === '>>' && (await this.h.isFile(target)) ? await this.h.readText(target) : '';
      await this.h.writeText(target, prev + strip(buffer));
    }
    return code ?? 0;
  }

  async expandGlobs(argv) {
    const out = [argv[0]];
    for (const a of argv.slice(1)) {
      if (!hasGlob(a) || a.startsWith('-')) { out.push(a); continue; }
      const dirPart = a.includes('/') ? a.slice(0, a.lastIndexOf('/')) : '';
      const pattern = a.slice(a.lastIndexOf('/') + 1);
      const dir = this.abs(dirPart || '.');
      let matches = [];
      if (await this.h.isDir(dir)) {
        const re = globToRegExp(pattern);
        matches = (await this.h.readdir(dir)).filter((n) => re.test(n) && (pattern.startsWith('.') || !n.startsWith('.')));
      }
      if (matches.length) out.push(...matches.map((m) => (dirPart ? `${dirPart}/${m}` : m)));
      else out.push(a); // bash keeps the pattern when nothing matches
    }
    return out;
  }

  async dispatch(name, args, out, err) {
    switch (name) {
      case 'git': return runGit(this, args, out, err);
      case 'pwd': out.write(`${this.cwd}\n`); return 0;
      case 'cd': return this.cd(args, err);
      case 'ls': return this.ls(args, out, err);
      case 'mkdir': return this.mkdir(args, err);
      case 'touch': return this.touch(args, err);
      case 'cat': return this.cat(args, out, err);
      case 'echo': out.write(`${args.join(' ')}\n`); return 0;
      case 'rm': return this.rm(args, err);
      case 'mv': return this.mv(args, err);
      case 'cp': return this.cp(args, err);
      case 'clear': this.ui.clear(); return 0;
      case 'history':
        this.history.forEach((h, i) => out.write(`${String(i + 1).padStart(5)}  ${h}\n`));
        return 0;
      case 'edit': case 'nano': case 'code': case 'notepad': case 'vim': case 'vi':
        return this.edit(name, args, out, err);
      case 'help': out.write(SHELL_HELP); return 0;
      case 'reset-lab':
        await this.ui.resetSandbox();
        return 0;
      case 'sudo':
        err.write('sudo: not needed here — this playground has no admin rights to give.\n');
        return 1;
      default:
        err.write(`bash: ${name}: command not found\n`);
        if (/^git[a-z]/.test(name)) err.write(dim(`(did you mean: git ${name.slice(3)} ?)\n`));
        else {
          const typed = name.toLowerCase();
          const letters = (s) => [...s].sort().join('');
          const close = SHELL_COMMANDS.find((c) => letters(c) === letters(typed) || levenshtein(typed, c) <= (c.length > 4 ? 2 : 1));
          if (close) err.write(dim(`(did you mean: ${close} ?)\n`));
        }
        // T-14: never leave the student guessing — say what this playground understands.
        err.write(dim('This playground understands: git, pwd, ls, cd, mkdir, touch, cat, echo, rm, mv, cp, edit, clear, history, help, reset-lab.\nType \'help\' for details.\n'));
        return 127;
    }
  }

  async cd(args, err) {
    let target = args[0] ?? '~';
    if (target === '-') target = this.prevCwd;
    const p = this.abs(target);
    if (!(await this.h.exists(p))) { err.write(`bash: cd: ${args[0]}: No such file or directory\n`); return 1; }
    if (!(await this.h.isDir(p))) { err.write(`bash: cd: ${args[0]}: Not a directory\n`); return 1; }
    this.prevCwd = this.cwd;
    this.cwd = p;
    return 0;
  }

  async ls(args, out, err) {
    const flags = args.filter((a) => a.startsWith('-') && a.length > 1).join('');
    const all = flags.includes('a');
    const long = flags.includes('l');
    const targets = args.filter((a) => !a.startsWith('-') || a === '-');
    if (!targets.length) targets.push('.');
    let code = 0;
    for (const [i, t] of targets.entries()) {
      const p = this.abs(t);
      const st = await this.h.stat(p);
      if (!st) { err.write(`ls: cannot access '${t}': No such file or directory\n`); code = 2; continue; }
      if (targets.length > 1) out.write(`${i ? '\n' : ''}${t}:\n`);
      let entries;
      if (st.type === 'dir') {
        entries = (await this.h.readdir(p)).filter((n) => all || !n.startsWith('.'));
        if (all) entries = ['.', '..', ...entries];
      } else {
        entries = [t];
      }
      const items = [];
      for (const n of entries) {
        const full = st.type === 'dir' ? join(p, n) : p;
        const s = n === '.' || n === '..' ? { type: 'dir', size: 0, mtimeMs: Date.now() } : await this.h.stat(full);
        items.push({ n, dir: s?.type === 'dir', size: s?.size ?? 0, mtime: s?.mtimeMs ?? Date.now() });
      }
      if (long) {
        out.write(`total ${items.length}\n`);
        for (const it of items) {
          const d = new Date(it.mtime);
          const date = `${d.toLocaleString('en-US', { month: 'short' })} ${String(d.getDate()).padStart(2)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          out.write(`${it.dir ? 'drwxr-xr-x' : '-rw-r--r--'} 1 student 197121 ${String(it.size).padStart(5)} ${date} ${it.dir ? blue(`${it.n}/`) : it.n}\n`);
        }
      } else if (items.length) {
        out.write(`${items.map((it) => (it.dir ? `${boldBlueName(it.n)}/` : it.n)).join('  ')}\n`);
      }
    }
    return code;
  }

  async mkdir(args, err) {
    const parents = args.includes('-p');
    let code = 0;
    for (const a of args.filter((x) => !x.startsWith('-'))) {
      const p = this.abs(a);
      if (await this.h.exists(p)) {
        if (!parents) { err.write(`mkdir: cannot create directory ‘${a}’: File exists\n`); code = 1; }
        continue;
      }
      if (!parents && !(await this.h.isDir(dirname(p)))) { err.write(`mkdir: cannot create directory ‘${a}’: No such file or directory\n`); code = 1; continue; }
      await this.h.mkdirp(p);
    }
    if (!args.filter((x) => !x.startsWith('-')).length) { err.write('mkdir: missing operand\n'); return 1; }
    return code;
  }

  async touch(args, err) {
    if (!args.length) { err.write('touch: missing file operand\n'); return 1; }
    for (const a of args) {
      const p = this.abs(a);
      if (!(await this.h.isDir(dirname(p)))) { err.write(`touch: cannot touch '${a}': No such file or directory\n`); return 1; }
      if (await this.h.isDir(p)) continue;
      const prev = (await this.h.isFile(p)) ? await this.h.readText(p) : '';
      await this.h.writeText(p, prev);
    }
    return 0;
  }

  async cat(args, out, err) {
    let code = 0;
    for (const a of args) {
      const p = this.abs(a);
      const st = await this.h.stat(p);
      if (!st) { err.write(`cat: ${a}: No such file or directory\n`); code = 1; continue; }
      if (st.type === 'dir') { err.write(`cat: ${a}: Is a directory\n`); code = 1; continue; }
      const text = await this.h.readText(p);
      out.write(text.endsWith('\n') || !text ? text : `${text}\n`);
    }
    return code;
  }

  async rm(args, err) {
    const flags = args.filter((a) => a.startsWith('-')).join('');
    const recursive = /r|R/.test(flags);
    const force = flags.includes('f');
    const targets = args.filter((a) => !a.startsWith('-'));
    if (!targets.length) { err.write('rm: missing operand\n'); return 1; }
    let code = 0;
    for (const t of targets) {
      const p = this.abs(t);
      const st = await this.h.stat(p);
      if (!st) { if (!force) { err.write(`rm: cannot remove '${t}': No such file or directory\n`); code = 1; } continue; }
      if (st.type === 'dir' && !recursive) { err.write(`rm: cannot remove '${t}': Is a directory\n`); code = 1; continue; }
      if (p === this.home || relative(p, this.cwd) !== null) { err.write(`rm: refusing to remove '${t}': it contains your current folder\n`); code = 1; continue; }
      await this.h.rmrf(p);
    }
    return code;
  }

  async mv(args, err) {
    const [src, dest] = args.filter((a) => !a.startsWith('-'));
    if (!src || !dest) { err.write(`mv: missing ${src ? 'destination' : ''} file operand\n`); return 1; }
    const s = this.abs(src);
    if (!(await this.h.exists(s))) { err.write(`mv: cannot stat '${src}': No such file or directory\n`); return 1; }
    let d = this.abs(dest);
    if (await this.h.isDir(d)) d = join(d, basename(s));
    await this.h.copy(s, d);
    await this.h.rmrf(s);
    return 0;
  }

  async cp(args, err) {
    const recursive = args.some((a) => /^-.*r/i.test(a));
    const [src, dest] = args.filter((a) => !a.startsWith('-'));
    if (!src || !dest) { err.write('cp: missing file operand\n'); return 1; }
    const s = this.abs(src);
    const st = await this.h.stat(s);
    if (!st) { err.write(`cp: cannot stat '${src}': No such file or directory\n`); return 1; }
    if (st.type === 'dir' && !recursive) { err.write(`cp: -r not specified; omitting directory '${src}'\n`); return 1; }
    let d = this.abs(dest);
    if (await this.h.isDir(d)) d = join(d, basename(s));
    await this.h.copy(s, d);
    return 0;
  }

  async edit(name, args, out, err) {
    const file = args.find((a) => !a.startsWith('-'));
    if (!file) { err.write(`${name}: please give a file name, e.g. ${name} README.md\n`); return 1; }
    const p = this.abs(file);
    if (await this.h.isDir(p)) { err.write(`${name}: ${file}: Is a directory\n`); return 1; }
    if (!(await this.h.isDir(dirname(p)))) { err.write(`${name}: ${file}: No such file or directory\n`); return 1; }
    const content = (await this.h.isFile(p)) ? await this.h.readText(p) : '';
    const result = await this.ui.openEditor({ path: this.display(p), content, title: file });
    if (result === null) { out.write(dim('(closed without saving)\n')); return 0; }
    await this.h.writeText(p, result);
    out.write(dim(`Saved ${file}\n`));
    return 0;
  }
}

const boldBlueName = (n) => `\x1b[1;34m${n}\x1b[0m`;

const SHELL_HELP = `${bold('SBCCAS Git Playground')} — real Git running in your browser.

${bold('Git')}
  git <command>          init, config, help, status, add, commit, log, diff, show,
                         branch, switch, checkout, merge, restore, rm, reset, revert,
                         stash, tag, remote, clone, fetch, pull, push
  git help <command>     Git's help for one command

${bold('Files & folders')}
  pwd                    show the current folder
  ls [-a] [-l]           list files (-a shows hidden files like .git)
  cd <folder>            change folder (cd .. goes up, cd ~ goes home)
  mkdir [-p] <folder>    make a folder
  touch <file>           create an empty file
  echo "text" > file     write text to a file (>> adds to the end)
  cat <file>             show a file
  edit <file>            open a file in the editor (also: nano, code)
  rm [-r] <path>         delete a file (or folder with -r)
  mv / cp <from> <to>    move or copy

${bold('Terminal')}
  clear                  clear the screen
  history                list commands you typed
  reset-lab              wipe this sandbox and start fresh

${dim('Tips: ↑/↓ recall commands · Tab completes names · use && to chain commands')}
`;

