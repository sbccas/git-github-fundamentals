/**
 * Command palette (PRD U-01): Ctrl/⌘+K or "/" opens a search over pages, units, topics, commands,
 * glossary terms and missions. Missions load the first time the palette opens (they are not needed before).
 */
import { PAGES, UNITS, COMMANDS, pageUrl } from '../data/site.js';
import TERMS from '../../../content/glossary.json';
import { slug } from './glossary.js';

const KIND_LABEL = { unit: 'Unit', topic: 'Topic', command: 'Command', page: 'Page', term: 'Term', mission: 'Mission' };

function buildIndex() {
  const items = [];
  for (const u of UNITS) {
    items.push({ kind: 'unit', title: `Unit ${u.n} · ${u.title}`, sub: u.summary, href: pageUrl(`${u.slug}/`), color: u.color, keys: `${u.short} ${u.topics.join(' ')}` });
    for (const t of u.topics) {
      items.push({ kind: 'topic', title: t, sub: `Unit ${u.n} · ${u.title}`, href: pageUrl(`${u.slug}/`), color: u.color, keys: '' });
    }
  }
  for (const c of COMMANDS) {
    const u = UNITS[c.unit - 1];
    items.push({ kind: 'command', title: c.cmd, sub: `${c.desc} — Unit ${u.n}`, href: pageUrl(`${u.slug}/`), color: u.color, keys: c.desc, mono: true });
  }
  for (const t of TERMS) {
    items.push({ kind: 'term', title: t.term, sub: t.def, href: pageUrl(`glossary/#${slug(t.term)}`), color: UNITS[t.unit - 1].color, keys: (t.aliases ?? []).join(' ') });
  }
  for (const p of PAGES) {
    items.push({ kind: 'page', title: p.title, sub: p.desc, href: pageUrl(p.slug), keys: '' });
  }
  return items.map(indexed);
}

const indexed = (it) => ({ ...it, hay: `${it.title} ${it.sub} ${it.keys}`.toLowerCase(), titleLc: it.title.toLowerCase() });
const plain = (html) => html.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();

async function missionItems() {
  const { MISSIONS } = await import('../../../content/missions/missions.js');
  return MISSIONS.map((m) => {
    const u = UNITS[m.unit - 1];
    const brief = plain(m.brief);
    return indexed({
      kind: 'mission',
      title: `${m.id} · ${m.title}`,
      sub: `Unit ${u.n} · ${m.minutes} min — ${brief.length > 90 ? `${brief.slice(0, 88)}…` : brief}`,
      href: pageUrl(`missions/?m=${m.id}`),
      color: u.color,
      keys: `mission ${m.goals.map((g) => plain(g.text)).join(' ')}`,
    });
  });
}

function score(item, terms) {
  let s = 0;
  for (const t of terms) {
    const inTitle = item.titleLc.indexOf(t);
    if (inTitle === 0) s += 12;
    else if (inTitle > 0) s += 7;
    else if (item.hay.includes(t)) s += 2;
    else return -1;
  }
  if (item.kind === 'unit') s += 2;
  if (item.kind === 'command' && terms.join(' ').startsWith('git')) s += 3;
  return s;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

export function initPalette() {
  const dialog = document.querySelector('[data-palette]');
  if (!dialog) return;
  const input = dialog.querySelector('[data-palette-input]');
  const list = dialog.querySelector('[data-palette-results]');
  const index = buildIndex();
  let missionsLoaded = false;
  let results = [];
  let active = 0;

  const defaults = () => index.filter((i) => i.kind === 'unit' || i.kind === 'page').slice(0, 12);

  function render() {
    const q = input.value.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    results = terms.length
      ? index.map((i) => [i, score(i, terms)]).filter(([, s]) => s >= 0).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([i]) => i)
      : defaults();
    active = 0;
    if (!results.length) {
      list.innerHTML = `<li class="palette-empty">No matches for “${escapeHtml(input.value)}”. Try a command like <code>git merge</code> or a word like <em>branch</em>.</li>`;
      input.removeAttribute('aria-activedescendant');
      return;
    }
    list.innerHTML = results.map((r, i) => `
      <li id="pal-${i}" role="option" class="palette-item" aria-selected="${i === 0}" data-index="${i}">
        <span class="palette-kind" ${r.color ? `style="--u:${r.color}"` : ''}>${KIND_LABEL[r.kind]}</span>
        <span class="palette-text">
          <span class="palette-title ${r.mono ? 'mono' : ''}">${escapeHtml(r.title)}</span>
          <span class="palette-sub">${escapeHtml(r.sub)}</span>
        </span>
      </li>`).join('');
    input.setAttribute('aria-activedescendant', 'pal-0');
  }

  function setActive(i) {
    if (!results.length) return;
    active = (i + results.length) % results.length;
    list.querySelectorAll('.palette-item').forEach((el, idx) => el.setAttribute('aria-selected', String(idx === active)));
    const el = list.querySelector(`#pal-${active}`);
    input.setAttribute('aria-activedescendant', `pal-${active}`);
    el?.scrollIntoView({ block: 'nearest' });
  }

  function go(i) {
    const r = results[i];
    if (r) window.location.href = r.href;
  }

  function open() {
    if (dialog.open) return;
    input.value = '';
    render();
    if (!missionsLoaded) {
      missionsLoaded = true;
      missionItems().then((items) => { index.push(...items); if (dialog.open) render(); }).catch(() => { missionsLoaded = false; });
    }
    dialog.showModal();
    input.focus();
  }

  function close() { if (dialog.open) dialog.close(); }

  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); go(active); }
  });
  list.addEventListener('click', (e) => {
    const li = e.target.closest('.palette-item');
    if (li) go(Number(li.dataset.index));
  });
  list.addEventListener('mousemove', (e) => {
    const li = e.target.closest('.palette-item');
    if (li && Number(li.dataset.index) !== active) setActive(Number(li.dataset.index));
  });
  // Click on the backdrop closes the dialog.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });

  document.querySelectorAll('[data-palette-open]').forEach((b) => b.addEventListener('click', open));
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dialog.open ? close() : open(); }
    else if (e.key === '/' && !typing && !dialog.open) { e.preventDefault(); open(); }
  });
}
