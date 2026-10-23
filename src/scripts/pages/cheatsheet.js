import '../main.js';
import SHEET from '../../../content/cheatsheet.json';
import { UNITS, pageUrl } from '../data/site.js';
import { setLastVisited } from '../lib/progress.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const grid = document.querySelector('[data-cs-grid]');
const search = document.querySelector('[data-cs-search]');
const unitsBox = document.querySelector('[data-cs-units]');
const count = document.querySelector('[data-cs-count]');
let unit = 0; // 0 = all

unitsBox.innerHTML = [{ n: 0, short: 'All' }, ...UNITS].map((u) => `<button type="button" class="cs-chip" data-unit="${u.n}" aria-pressed="${u.n === 0}" ${u.n ? `style="--u:${u.color}"` : ''}>${u.n ? `Unit ${u.n}` : 'All units'}</button>`).join('');

/** Commands with <placeholders> can't run as-is, so "Try" is offered only for runnable ones. */
const runnable = (cmd) => !/[<>]/.test(cmd) && !/--global|remote add|push|pull|fetch|clone|upstream/.test(cmd);

function render() {
  const q = search.value.trim().toLowerCase();
  let shown = 0;
  grid.innerHTML = SHEET.map((cat) => {
    const items = cat.items.filter((it) => (!unit || it.unit === unit) && (!q || `${it.cmd} ${it.desc} ${cat.category}`.toLowerCase().includes(q)));
    shown += items.length;
    if (!items.length) return '';
    return `<section class="cs-cat">
      <h2><span aria-hidden="true">${cat.icon}</span> ${esc(cat.category)}</h2>
      <ul>${items.map((it) => `<li style="--u:${UNITS[it.unit - 1].color}">
        <code class="cs-cmd">${esc(it.cmd)}</code>
        <span class="cs-desc">${esc(it.desc)}</span>
        <span class="cs-acts">
          <button class="cs-btn" type="button" data-copy="${esc(it.cmd)}" aria-label="Copy ${esc(it.cmd)}">Copy</button>
          ${runnable(it.cmd) ? `<a class="cs-btn" href="${pageUrl(`playground/?cmd=${encodeURIComponent(it.cmd)}`)}" aria-label="Try ${esc(it.cmd)} in the Playground">Try</a>` : ''}
          <a class="cs-unit" href="${pageUrl(`unit-${it.unit}/`)}" title="Taught in Unit ${it.unit}">U${it.unit}</a>
        </span>
      </li>`).join('')}</ul>
    </section>`;
  }).join('') || `<p class="panel-empty">No commands match “${esc(search.value)}”.</p>`;
  count.textContent = `${shown} command${shown === 1 ? '' : 's'}`;
}

search.addEventListener('input', render);
unitsBox.addEventListener('click', (e) => {
  const b = e.target.closest('[data-unit]');
  if (!b) return;
  unit = Number(b.dataset.unit);
  unitsBox.querySelectorAll('[data-unit]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  render();
});
const q = new URLSearchParams(location.search).get('q');
if (q) search.value = q;
render();
setLastVisited(location.pathname, 'Cheat sheet');
