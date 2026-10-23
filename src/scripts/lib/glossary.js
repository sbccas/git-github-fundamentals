/**
 * Tap/hover definitions for glossary terms inside lessons (PRD U-04).
 * The first mention of each term in a lesson becomes a dotted, focusable term with a small popover.
 */
import TERMS from '../../../content/glossary.json';
import { pageUrl } from '../data/site.js';

export const slug = (t) => t.toLowerCase().replace(/^\./, 'dot-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SKIP = 'code, pre, a, h1, h2, h3, h4, th, .gloss, .callout-title, .term-block, .diagram, .flip-card, .conflict-game, button';
// Very common words that would be noisy to underline.
const NO_LINK = new Set(['Git', 'GitHub', 'Commit', 'Repository', 'Push', 'Pull', 'Branch', 'Merge', 'origin', 'HEAD', 'Tag', 'Star']);

export function linkTerms(root) {
  if (!root) return;
  const candidates = [];
  for (const t of TERMS) {
    if (NO_LINK.has(t.term)) continue;
    for (const name of [t.term, ...(t.aliases ?? [])]) {
      if (name.length < 4 || /^git /.test(name)) continue;
      candidates.push({ name, term: t });
    }
  }
  candidates.sort((a, b) => b.name.length - a.name.length);
  const done = new Set();
  for (const { name, term } of candidates) {
    if (done.has(term.term)) continue;
    const re = new RegExp(`(^|[^\\w.-])(${esc(name)})(?=$|[^\\w-])`, 'i');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const m = re.exec(node.data);
      if (!m) continue;
      const start = m.index + m[1].length;
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, start + m[2].length);
      const span = document.createElement('dfn');
      span.className = 'gloss';
      span.tabIndex = 0;
      span.dataset.term = term.term;
      span.setAttribute('aria-describedby', 'gloss-pop');
      range.surroundContents(span);
      done.add(term.term);
      break;
    }
  }
  enablePopover(root);
}

function enablePopover(root) {
  const pop = document.createElement('div');
  pop.className = 'gloss-pop';
  pop.id = 'gloss-pop';
  pop.setAttribute('role', 'tooltip');
  pop.hidden = true;
  document.body.appendChild(pop);
  let current = null;

  const show = (el) => {
    const t = TERMS.find((x) => x.term === el.dataset.term);
    if (!t) return;
    current = el;
    pop.innerHTML = `<b>${t.term}</b>${t.def} <a href="${pageUrl(`glossary/#${slug(t.term)}`)}">Glossary →</a>`;
    pop.hidden = false;
    const r = el.getBoundingClientRect();
    const w = Math.min(300, window.innerWidth - 24);
    pop.style.width = `${w}px`;
    pop.style.left = `${Math.max(12, Math.min(window.scrollX + r.left, window.scrollX + window.innerWidth - w - 12))}px`;
    pop.style.top = `${window.scrollY + r.bottom + 8}px`;
  };
  const hide = () => { pop.hidden = true; current = null; };

  root.addEventListener('mouseover', (e) => { const g = e.target.closest('.gloss'); if (g) show(g); });
  root.addEventListener('mouseout', (e) => { if (e.target.closest('.gloss') && !pop.matches(':hover')) setTimeout(() => { if (!pop.matches(':hover') && !current?.matches(':hover')) hide(); }, 150); });
  root.addEventListener('focusin', (e) => { const g = e.target.closest('.gloss'); if (g) show(g); });
  root.addEventListener('focusout', (e) => { if (e.target.closest('.gloss')) setTimeout(() => { if (!pop.contains(document.activeElement)) hide(); }, 100); });
  root.addEventListener('click', (e) => { const g = e.target.closest('.gloss'); if (g) { if (current === g) hide(); else show(g); } });
  pop.addEventListener('mouseleave', hide);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
}
