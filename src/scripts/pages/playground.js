import '../main.js';
import { createWorkbench } from '../terminal/workbench.js';
import { listSandboxes, setCurrent, addSandbox } from '../terminal/sandbox.js';
import { setLastVisited } from '../lib/progress.js';
import { bold, dim, cyan } from '../terminal/ansi.js';

const $ = (s) => document.querySelector(s);
const sandboxName = (id) => listSandboxes().items.find((s) => s.id === id)?.name ?? id;

const wb = createWorkbench({
  onReset: () => resetSandbox(false),
  welcome: ({ sandboxId }) => `${bold('SBCCAS Git Playground')} — real Git, running in your browser.
${dim(`Sandbox “${sandboxName(sandboxId)}” · files are saved in this browser on this device.`)}

Type ${cyan('help')} for commands, or start with:  ${cyan('mkdir amroli-canteen && cd amroli-canteen')}
`,
});

async function loadSandbox(id, opts) {
  setCurrent(id);
  await wb.load(id, opts);
  renderSandboxSelect();
}

async function resetSandbox(confirmFirst = true) {
  const name = sandboxName(wb.sandboxId);
  if (confirmFirst && !window.confirm(`Reset “${name}”? Every file, repository and practice GitHub repo in this sandbox will be deleted.`)) return;
  await loadSandbox(wb.sandboxId, { wipe: true });
  wb.notify(`Sandbox “${name}” has been reset.`);
}

/* ---------------- sandbox toolbar ---------------- */
const select = $('[data-sandbox-select]');
function renderSandboxSelect() {
  const data = listSandboxes();
  select.innerHTML = data.items.map((s) => `<option value="${s.id}" ${s.id === wb.sandboxId ? 'selected' : ''}>${s.name}</option>`).join('');
}
select.addEventListener('change', () => loadSandbox(select.value));
$('[data-sandbox-new]').addEventListener('click', () => {
  const name = window.prompt('Name for the new sandbox (e.g. “Unit 3 practice”):');
  if (!name?.trim()) return;
  loadSandbox(addSandbox(name.trim()));
});
$('[data-sandbox-reset]').addEventListener('click', () => resetSandbox(true));
$('[data-show-help]').addEventListener('click', () => wb.runCommand('help'));

/* ---------------- start ---------------- */
(async () => {
  await loadSandbox(listSandboxes().current);
  // Lessons link here with ?cmd=... to pre-fill a command (the student presses Enter).
  const params = new URLSearchParams(location.search);
  if (params.get('cmd')) wb.term.setInput(params.get('cmd'));
  wb.term.focus();
  setLastVisited(location.pathname, 'Playground');
})();
