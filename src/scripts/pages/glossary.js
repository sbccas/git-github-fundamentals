import '../main.js';
import TERMS from '../../../content/glossary.json';
import { UNITS, pageUrl } from '../data/site.js';
import { slug } from '../lib/glossary.js';

const list = document.querySelector('[data-gl-list]');
const search = document.querySelector('[data-gl-search]');
const sorted = [...TERMS].sort((a, b) => a.term.replace(/^\./, '').localeCompare(b.term.replace(/^\./, ''), undefined, { sensitivity: 'base' }));
const letterOf = (t) => t.term.replace(/^\./, '')[0].toUpperCase();
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

document.querySelector('[data-gl-letters]').innerHTML = [...new Set(sorted.map(letterOf))]
  .map((l) => `<a href="#letter-${l}">${l}</a>`).join('');

function render() {
  const q = search.value.trim().toLowerCase();
  let last = '';
  list.innerHTML = sorted.filter((t) => !q || `${t.term} ${(t.aliases ?? []).join(' ')} ${t.def}`.toLowerCase().includes(q)).map((t) => {
    const l = letterOf(t);
    const head = l !== last ? `<div class="gl-letter" id="letter-${l}">${l}</div>` : '';
    last = l;
    const u = UNITS[t.unit - 1];
    return `${head}<div class="gl-item" id="${slug(t.term)}" style="--u:${u.color}">
      <dt>${esc(t.term)}${t.aliases?.length ? ` <span class="muted">(${esc(t.aliases.join(', '))})</span>` : ''}</dt>
      <dd>${esc(t.def)} <a href="${pageUrl(`unit-${u.n}/`)}" class="gl-unit">Unit ${u.n}</a></dd>
    </div>`;
  }).join('') || '<p class="panel-empty">No terms match.</p>';
}
search.addEventListener('input', render);
render();
if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
