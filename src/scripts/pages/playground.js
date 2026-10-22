import '../main.js';
import { Shell } from '../terminal/shell.js';
import { TerminalView } from '../terminal/ui/terminal-view.js';
import { GraphView } from '../terminal/ui/graph-view.js';
import { FilesView } from '../terminal/ui/files-view.js';
import { GithubView } from '../terminal/ui/github-view.js';
import { createEditor } from '../terminal/ui/editor.js';
import { listSandboxes, setCurrent, addSandbox, openSandbox, loadHistory, saveHistory, loadSettings, saveSettings } from '../terminal/sandbox.js';
import { setLastVisited } from '../lib/progress.js';
import { bold, dim, cyan } from '../terminal/ansi.js';

const $ = (s) => document.querySelector(s);
const termRoot = $('[data-terminal]');
const openEditor = createEditor($('[data-editor]'));

let sandboxId = listSandboxes().current;
let shell = null;
let settings = loadSettings(sandboxId);
let activeTab = 'graph';

/* ---------------- toast ---------------- */
const toastEl = $('[data-toast]');
let toastTimer;
function notify(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3800);
}

/* ---------------- panels ---------------- */
const graph = new GraphView($('[data-panel="graph"]'));
const files = new FilesView($('[data-panel="files"]'), {
  openFile: (abs) => runCommand(`edit ${quote(shell.display(abs))}`),
  insertCommand: (cmd, run) => (run ? runCommand(cmd) : term.insert(cmd)),
});
const github = new GithubView($('[data-panel="github"]'), {
  getUser: () => settings.githubUser,
  setUser: (u) => { settings.githubUser = u; saveSettings(sandboxId, settings); },
  insertCommand: (cmd) => { term.setInput(cmd); term.focus(); },
  notify,
});
const panels = { graph, files, github };

const quote = (s) => (/[\s"']/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s);

let refreshQueued = false;
async function refreshPanels() {
  if (!shell || refreshQueued) return;
  refreshQueued = true;
  await Promise.resolve();
  refreshQueued = false;
  try {
    await panels[activeTab].refresh(shell);
  } catch (e) {
    console.error(e);
  }
  $('.term-title').textContent = `MINGW64:${shell.cwd}`;
}

document.querySelectorAll('[data-tab]').forEach((tab) => {
  tab.addEventListener('click', () => {
    activeTab = tab.dataset.tab;
    document.querySelectorAll('[data-tab]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    document.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== activeTab; });
    refreshPanels();
  });
});
document.querySelector('.pg-tabs').addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const tabs = [...document.querySelectorAll('[data-tab]')];
  const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
  const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
  next.click();
  next.focus();
});

/* ---------------- terminal ---------------- */
const term = new TerminalView(termRoot, {
  getShell: () => shell,
  onCommand: async (line, out) => {
    await shell.run(line, out);
    if (settings.cwd !== shell.cwd) { settings.cwd = shell.cwd; saveSettings(sandboxId, settings); }
    await refreshPanels();
  },
  onHistoryChange: (h) => saveHistory(sandboxId, h),
});

async function runCommand(cmd) {
  term.setInput(cmd);
  await term.submit();
}

function welcome() {
  const name = listSandboxes().items.find((s) => s.id === sandboxId)?.name ?? sandboxId;
  term.print(`${bold('SBCCAS Git Playground')} — real Git, running in your browser.
${dim(`Sandbox “${name}” · files are saved in this browser on this device.`)}

Type ${cyan('help')} for commands, or start with:  ${cyan('mkdir amroli-canteen && cd amroli-canteen')}
`, 't-welcome');
}

async function loadSandbox(id, { wipe = false } = {}) {
  sandboxId = id;
  setCurrent(id);
  settings = loadSettings(id);
  const fs = await openSandbox(id, { wipe });
  shell = new Shell({
    fs,
    history: wipe ? [] : loadHistory(id),
    ui: {
      openEditor,
      clear: () => term.clear(),
      resetSandbox: () => resetSandbox(false),
    },
  });
  if (!wipe && settings.cwd) shell.cwd = settings.cwd; // reopen in the folder you were in
  await shell.init();
  if (wipe) { saveHistory(id, []); settings = { githubUser: settings.githubUser }; saveSettings(id, settings); }
  term.clear();
  welcome();
  await term.renderPrompt();
  renderSandboxSelect();
  await refreshPanels();
}

async function resetSandbox(confirmFirst = true) {
  const name = listSandboxes().items.find((s) => s.id === sandboxId)?.name ?? sandboxId;
  if (confirmFirst && !window.confirm(`Reset “${name}”? Every file, repository and practice GitHub repo in this sandbox will be deleted.`)) return;
  await loadSandbox(sandboxId, { wipe: true });
  notify(`Sandbox “${name}” has been reset.`);
}

/* ---------------- sandbox toolbar ---------------- */
const select = $('[data-sandbox-select]');
function renderSandboxSelect() {
  const data = listSandboxes();
  select.innerHTML = data.items.map((s) => `<option value="${s.id}" ${s.id === sandboxId ? 'selected' : ''}>${s.name}</option>`).join('');
}
select.addEventListener('change', () => loadSandbox(select.value));
$('[data-sandbox-new]').addEventListener('click', () => {
  const name = window.prompt('Name for the new sandbox (e.g. “Unit 3 practice”):');
  if (!name?.trim()) return;
  loadSandbox(addSandbox(name.trim()));
});
$('[data-sandbox-reset]').addEventListener('click', () => resetSandbox(true));
$('[data-show-help]').addEventListener('click', () => runCommand('help'));

/* ---------------- start ---------------- */
(async () => {
  await loadSandbox(sandboxId);
  // Lessons link here with ?cmd=... to pre-fill a command (the student presses Enter).
  const params = new URLSearchParams(location.search);
  if (params.get('cmd')) term.setInput(params.get('cmd'));
  term.focus();
  setLastVisited(location.pathname, 'Playground');
})();
