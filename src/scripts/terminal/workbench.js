/**
 * The terminal + side panels used by the Playground and the Missions runner.
 * Expects the markup from src/playground/index.html (data-terminal, data-tab, data-panel, data-editor, data-toast).
 */
import { Shell } from './shell.js';
import { TerminalView } from './ui/terminal-view.js';
import { GraphView } from './ui/graph-view.js';
import { FilesView } from './ui/files-view.js';
import { GithubView } from './ui/github-view.js';
import { createEditor } from './ui/editor.js';
import { openSandbox, loadHistory, saveHistory, loadSettings, saveSettings } from './sandbox.js';
import { strip } from './ansi.js';

const quote = (s) => (/[\s"']/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s);

export function createWorkbench({ onAfterCommand = null, onReset = null, extraPanels = {}, defaultTab = 'graph', welcome = null } = {}) {
  const $ = (s) => document.querySelector(s);
  const termRoot = $('[data-terminal]');
  const openEditor = createEditor($('[data-editor]'));
  const state = { sandboxId: null, shell: null, settings: {}, activeTab: defaultTab };

  /* toast */
  const toastEl = $('[data-toast]');
  let toastTimer;
  function notify(msg, ms = 3800) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms);
  }

  /* terminal */
  const term = new TerminalView(termRoot, {
    getShell: () => state.shell,
    onCommand: async (line, out) => {
      await state.shell.run(line, out);
      if (state.settings.cwd !== state.shell.cwd) { state.settings.cwd = state.shell.cwd; saveSettings(state.sandboxId, state.settings); }
      await onAfterCommand?.(line);
      await refreshPanels();
    },
    onHistoryChange: (h) => saveHistory(state.sandboxId, h),
  });

  async function runCommand(cmd) {
    term.setInput(cmd);
    await term.submit();
  }

  /** Run a command without showing it (mission setup). Returns plain-text output. */
  async function runSilent(cmd) {
    let text = '';
    await state.shell.run(cmd, { write: (s) => { text += s; } });
    return strip(text);
  }

  /* panels */
  const panels = {
    graph: new GraphView($('[data-panel="graph"]')),
    files: new FilesView($('[data-panel="files"]'), {
      openFile: (abs) => runCommand(`edit ${quote(state.shell.display(abs))}`),
      insertCommand: (cmd, run) => (run ? runCommand(cmd) : term.insert(cmd)),
    }),
    github: new GithubView($('[data-panel="github"]'), {
      getUser: () => state.settings.githubUser,
      setUser: (u) => { state.settings.githubUser = u; saveSettings(state.sandboxId, state.settings); },
      insertCommand: (cmd) => { term.setInput(cmd); term.focus(); },
      notify,
    }),
    ...extraPanels,
  };

  let refreshQueued = false;
  async function refreshPanels() {
    if (!state.shell || refreshQueued) return;
    refreshQueued = true;
    await Promise.resolve();
    refreshQueued = false;
    try { await panels[state.activeTab]?.refresh(state.shell); } catch (e) { console.error(e); }
    const title = termRoot.querySelector('.term-title');
    if (title) title.textContent = `MINGW64:${state.shell.cwd}`;
  }

  function selectTab(name) {
    state.activeTab = name;
    document.querySelectorAll('[data-tab]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    document.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== name; });
    refreshPanels();
  }
  document.querySelectorAll('[data-tab]').forEach((tab) => tab.addEventListener('click', () => selectTab(tab.dataset.tab)));
  document.querySelector('.pg-tabs')?.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const tabs = [...document.querySelectorAll('[data-tab]')];
    const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    selectTab(next.dataset.tab);
    next.focus();
  });

  /** Open a sandbox. `wipe` deletes everything in it first. */
  async function load(id, { wipe = false, keepCwd = true } = {}) {
    state.sandboxId = id;
    state.settings = loadSettings(id);
    const fs = await openSandbox(id, { wipe });
    state.shell = new Shell({
      fs,
      history: wipe ? [] : loadHistory(id),
      ui: { openEditor, clear: () => term.clear(), resetSandbox: () => onReset?.() },
    });
    if (wipe) {
      saveHistory(id, []);
      state.settings = { githubUser: state.settings.githubUser };
      saveSettings(id, state.settings);
    } else if (keepCwd && state.settings.cwd) {
      state.shell.cwd = state.settings.cwd;
    }
    await state.shell.init();
    term.clear();
    if (welcome) term.print(welcome(state), 't-welcome');
    await term.renderPrompt();
    await refreshPanels();
    return state.shell;
  }

  async function setCwd(path) {
    state.shell.cwd = path;
    state.settings.cwd = path;
    saveSettings(state.sandboxId, state.settings);
    await term.renderPrompt();
    await refreshPanels();
  }

  return {
    term, panels, notify, runCommand, runSilent, refreshPanels, selectTab, load, setCwd,
    get shell() { return state.shell; },
    get sandboxId() { return state.sandboxId; },
    get settings() { return state.settings; },
  };
}
