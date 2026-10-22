/**
 * DOM terminal (PRD T-02, T-07, T-11, T-12, T-14): native <input> so phone keyboards, IME and
 * screen readers work; Git Bash style prompt; history; Tab completion; touch key bar.
 */
import { toHtml } from '../ansi.js';
import { SHELL_COMMANDS } from '../shell.js';
import { GIT_COMMANDS } from '../git/index.js';
import { findRepo } from '../git/repo.js';
import { basename } from '../path.js';

const MAX_BLOCKS = 400;

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class TerminalView {
  /**
   * @param {HTMLElement} root  element containing [data-term-output], [data-term-form], [data-term-input], [data-term-prompt], [data-keybar]
   * @param {object} opts { onCommand(line) → Promise, getShell() → Shell, onHistoryChange(list) }
   */
  constructor(root, { onCommand, getShell, onHistoryChange }) {
    this.root = root;
    this.output = root.querySelector('[data-term-output]');
    this.form = root.querySelector('[data-term-form]');
    this.input = root.querySelector('[data-term-input]');
    this.promptEl = root.querySelector('[data-term-prompt]');
    this.scroller = root.querySelector('[data-term-scroll]') ?? this.output;
    this.onCommand = onCommand;
    this.getShell = getShell;
    this.onHistoryChange = onHistoryChange;
    this.busy = false;
    this.queue = [];
    this.histIndex = null;
    this.draft = '';
    this.bind();
  }

  get history() { return this.getShell().history; }

  bind() {
    this.form.addEventListener('submit', (e) => { e.preventDefault(); this.submit(); });
    this.input.addEventListener('keydown', (e) => this.onKey(e));
    this.root.addEventListener('click', (e) => {
      if (e.target.closest('button, a, input, textarea, [data-keybar]')) return;
      if (window.getSelection()?.toString()) return;
      this.focus();
    });
    const bar = this.root.querySelector('[data-keybar]');
    if (bar) {
      // pointerdown + preventDefault keeps the input focused so the phone keyboard stays open.
      bar.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
      bar.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.key) this.pressKey(b.dataset.key);
        else if (b.dataset.insert !== undefined) this.insert(b.dataset.insert, b.dataset.cursor ? Number(b.dataset.cursor) : null);
        this.focus();
      });
    }
  }

  focus() { this.input.focus({ preventScroll: true }); }

  async renderPrompt() {
    const p = await this.getShell().prompt();
    this.promptEl.innerHTML = this.promptHtml(p);
  }

  promptHtml(p) {
    return `<span class="p-line"><span class="p-user">${p.user}@${p.host}</span> <span class="p-sys">MINGW64</span> <span class="p-path">${esc(p.path)}</span>${p.git ? ` <span class="p-git">${esc(p.git)}</span>` : ''}</span>`;
  }

  /** Append raw ANSI text as an output block. */
  print(text, cls = '') {
    const pre = document.createElement('pre');
    pre.className = `t-out ${cls}`;
    pre.innerHTML = toHtml(text);
    this.output.appendChild(pre);
    this.trim();
    this.scrollToEnd();
    return pre;
  }

  printHtml(html, cls = '') {
    const div = document.createElement('div');
    div.className = `t-out ${cls}`;
    div.innerHTML = html;
    this.output.appendChild(div);
    this.scrollToEnd();
    return div;
  }

  clear() { this.output.innerHTML = ''; }

  trim() {
    while (this.output.childElementCount > MAX_BLOCKS) this.output.firstElementChild.remove();
  }

  scrollToEnd() {
    requestAnimationFrame(() => { this.scroller.scrollTop = this.scroller.scrollHeight; });
  }

  /** Run the typed line. Lines entered while a command is running are queued, like a real terminal. */
  async submit() {
    const line = this.input.value;
    this.input.value = '';
    this.histIndex = null;
    if (this.busy) { this.queue.push(line); return; }
    await this.execute(line);
    while (this.queue.length) await this.execute(this.queue.shift());
  }

  async execute(line) {
    const echo = document.createElement('div');
    echo.className = 't-echo';
    echo.innerHTML = `${this.promptEl.innerHTML}<span class="p-line"><span class="p-dollar">$</span> <span class="t-cmd">${esc(line)}</span></span>`;
    this.output.appendChild(echo);
    this.scrollToEnd();
    if (!line.trim()) return;
    const h = this.history;
    if (h[h.length - 1] !== line) h.push(line);
    this.onHistoryChange?.(h);
    this.busy = true;
    this.root.classList.add('is-busy');
    const block = document.createElement('pre');
    block.className = 't-out';
    this.output.appendChild(block);
    let buffer = '';
    const out = { write: (s) => { buffer += s; block.innerHTML = toHtml(buffer); this.scrollToEnd(); } };
    try {
      await this.onCommand(line, out);
    } catch (e) {
      console.error(e);
      out.write(`\x1b[31mSomething went wrong in the playground: ${e.message}\x1b[0m\n`);
    } finally {
      if (!buffer) block.remove();
      this.busy = false;
      this.root.classList.remove('is-busy');
      this.trim();
      await this.renderPrompt();
      this.scrollToEnd();
      this.focus();
    }
  }

  onKey(e) {
    if (e.key === 'ArrowUp') { e.preventDefault(); this.pressKey('up'); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); this.pressKey('down'); }
    else if (e.key === 'Tab') { e.preventDefault(); this.pressKey('tab'); }
    else if (e.ctrlKey && e.key.toLowerCase() === 'c' && !window.getSelection()?.toString()) { e.preventDefault(); this.pressKey('ctrl-c'); }
    else if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); this.clear(); }
  }

  pressKey(key) {
    const h = this.history;
    if (key === 'up') {
      if (!h.length) return;
      if (this.histIndex === null) { this.draft = this.input.value; this.histIndex = h.length; }
      this.histIndex = Math.max(0, this.histIndex - 1);
      this.setInput(h[this.histIndex]);
    } else if (key === 'down') {
      if (this.histIndex === null) return;
      this.histIndex += 1;
      if (this.histIndex >= h.length) { this.histIndex = null; this.setInput(this.draft); }
      else this.setInput(h[this.histIndex]);
    } else if (key === 'ctrl-c') {
      const echo = document.createElement('div');
      echo.className = 't-echo';
      echo.innerHTML = `${this.promptEl.innerHTML}<span class="p-line"><span class="p-dollar">$</span> <span class="t-cmd">${esc(this.input.value)}</span>^C</span>`;
      this.output.appendChild(echo);
      this.input.value = '';
      this.histIndex = null;
      this.scrollToEnd();
    } else if (key === 'tab') {
      this.complete();
    }
  }

  setInput(v) {
    this.input.value = v;
    requestAnimationFrame(() => this.input.setSelectionRange(v.length, v.length));
  }

  /** Insert text at the cursor; `cursorBack` moves the caret left (e.g. between quotes). */
  insert(text, cursorBack = null) {
    const el = this.input;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    let before = el.value.slice(0, start);
    if (text && !text.startsWith(' ') && before && !before.endsWith(' ') && /^[a-z-]/.test(text) && !text.startsWith('git')) before += ' ';
    el.value = before + text + el.value.slice(end);
    const pos = before.length + text.length - (cursorBack ?? 0);
    el.setSelectionRange(pos, pos);
  }

  async complete() {
    const sh = this.getShell();
    const value = this.input.value;
    const caret = this.input.selectionStart ?? value.length;
    const head = value.slice(0, caret);
    const words = head.split(/\s+/);
    const current = words[words.length - 1];
    const index = words.length - 1;
    let candidates = [];
    if (index === 0) {
      candidates = SHELL_COMMANDS.filter((c) => c.startsWith(current));
    } else if (words[0] === 'git' && index === 1) {
      candidates = GIT_COMMANDS.filter((c) => c.startsWith(current)).map((c) => `${c} `);
    } else {
      const refCmds = ['switch', 'checkout', 'merge', 'branch', 'rebase', 'push', 'pull', 'log', 'diff', 'reset', 'revert', 'show', 'tag'];
      if (words[0] === 'git' && refCmds.includes(words[1]) && !current.includes('/')) {
        const repo = await findRepo(sh);
        if (repo) {
          const names = [...(await repo.branches()), ...(await repo.tags())];
          for (const r of await repo.remotes()) {
            names.push(r.remote);
            for (const b of await repo.remoteBranches(r.remote)) if (b !== 'HEAD') names.push(`${r.remote}/${b}`);
          }
          candidates.push(...names.filter((n) => n.startsWith(current)).map((n) => `${n} `));
        }
      }
      // file names
      const dirPart = current.includes('/') ? current.slice(0, current.lastIndexOf('/') + 1) : '';
      const base = current.slice(dirPart.length);
      const dir = sh.abs(dirPart || '.');
      if (await sh.h.isDir(dir)) {
        for (const n of await sh.h.readdir(dir)) {
          if (!n.startsWith(base) || (n.startsWith('.') && !base.startsWith('.'))) continue;
          const isDir = await sh.h.isDir(`${dir}/${n}`);
          candidates.push(`${dirPart}${n}${isDir ? '/' : ' '}`);
        }
      }
    }
    candidates = [...new Set(candidates)];
    if (!candidates.length) return;
    let common = candidates[0];
    for (const c of candidates) { while (!c.startsWith(common)) common = common.slice(0, -1); }
    if (candidates.length === 1 || common.length > current.length) {
      const completion = candidates.length === 1 ? candidates[0] : common;
      const newHead = head.slice(0, head.length - current.length) + completion;
      this.input.value = newHead + value.slice(caret);
      this.input.setSelectionRange(newHead.length, newHead.length);
    } else {
      this.printHtml(`<div class="t-complete">${candidates.map((c) => `<span>${esc(basename(c.trim()) + (c.endsWith('/') ? '/' : ''))}</span>`).join('')}</div>`);
    }
  }
}

