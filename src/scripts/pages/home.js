import { observeReveal } from '../main.js';
import { UNITS, CAST, COLLEGE, COURSE, pageUrl } from '../data/site.js';
import { load, unitPercent } from '../lib/progress.js';
import { isNewStudent } from '../lib/passport.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- Unit cards ---------------- */
function ring(percent) {
  const offset = 100 - percent;
  return `<div class="ring" role="img" aria-label="${percent}% complete">
    <svg viewBox="0 0 36 36" aria-hidden="true">
      <circle class="ring-track" cx="18" cy="18" r="15.9155" />
      <circle class="ring-value" cx="18" cy="18" r="15.9155" pathLength="100" style="stroke-dashoffset:${offset}" />
    </svg>
    <span class="ring-label">${percent}%</span>
  </div>`;
}

function renderUnits() {
  const grid = document.querySelector('[data-unit-grid]');
  if (!grid) return;
  const progress = load();
  const arrow = '<svg class="i i-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const cards = UNITS.map((u, i) => {
    const pct = unitPercent(progress, u.n);
    const practice = u.n === 5 ? `${u.missions.length} GitHub labs` : `${u.missions.length} missions`;
    return `<a class="card card-link unit-card" href="${pageUrl(`${u.slug}/`)}" style="--u:${u.color}; --delay:${i * 70}ms" data-reveal>
      <div class="unit-top">
        <div>
          <span class="unit-num">Unit ${u.n}</span>
          <h3>${u.title}</h3>
        </div>
        ${ring(pct)}
      </div>
      <p>${u.summary}</p>
      <ul class="unit-topics">${u.topics.map((t) => `<li class="chip">${t}</li>`).join('')}</ul>
      <div class="unit-meta">
        <span>${u.hours} hours · ${practice}</span>
        <span class="go">${pct > 0 ? 'Continue' : 'Start'} ${arrow}</span>
      </div>
    </a>`;
  });
  cards.push(`<a class="card card-link unit-card unit-card-extra" href="${pageUrl('self-check/')}" style="--delay:${UNITS.length * 70}ms" data-reveal>
      <span class="unit-num">Finish line</span>
      <h3>Final self-check</h3>
      <p>40 mixed questions across all five units, with a score report that shows what to revise.</p>
      <div class="unit-meta"><span>${COURSE.hours} hours · ${COURSE.credits} credits</span><span class="go">Preview ${arrow}</span></div>
    </a>`);
  grid.innerHTML = cards.join('');
}

function renderCast() {
  const grid = document.querySelector('[data-cast-grid]');
  if (!grid) return;
  grid.innerHTML = CAST.map((c, i) => `
    <div class="card cast-card" style="--u:${c.color}; --delay:${i * 70}ms" data-reveal>
      <span class="avatar" aria-hidden="true">${c.name[0]}</span>
      <h3>${c.name}</h3>
      <span class="cast-role">${c.role}</span>
      <span class="cast-files">${c.files}</span>
    </div>`).join('');
}

function renderCollege() {
  const set = (sel, text) => { const el = document.querySelector(sel); if (el) el.textContent = text; };
  set('[data-college-name]', `${COLLEGE.name} (${COLLEGE.popularName})`);
  set('[data-college-meta]', `${COLLEGE.location} · Affiliated to ${COLLEGE.affiliation} · Managed by ${COLLEGE.trust}`);
  set('[data-programmes]', `${COLLEGE.programmes.join(' · ')} students`);
}

function renderContinue() {
  const data = load();
  const { lastVisited } = data;
  // The passport link appears once the student has recorded anything (G-04).
  const passport = document.querySelector('[data-passport-link]');
  if (passport) passport.hidden = isNewStudent(data);
  const link = document.querySelector('[data-continue]');
  if (!link || !lastVisited?.href) return;
  link.href = lastVisited.href;
  link.textContent = `↻ Continue where you left off: ${lastVisited.title}`;
  link.hidden = false;
}

/* ---------------- Hero demo: terminal + commit graph ---------------- */
// Outputs are real Git messages; commit lines are shown without output to avoid made-up hashes (PRD N-06).
const SCRIPT = [
  { cmd: 'git init', out: ['Initialized empty Git repository in /home/krish/amroli-canteen/.git/'] },
  { cmd: 'git add menu.txt' },
  { cmd: 'git commit -m "Add menu"', graph: { on: ['c1'], main: 'c1', head: 'main' } },
  { cmd: 'git switch -c feature-cart', out: ["Switched to a new branch 'feature-cart'"], graph: { feature: 'c1', head: 'feature' } },
  { cmd: 'git commit -am "Add cart"', graph: { on: ['e12', 'c2'], feature: 'c2' } },
  { cmd: 'git switch main', out: ["Switched to branch 'main'"], graph: { head: 'main' } },
  { cmd: 'git commit -am "Update timings"', graph: { on: ['e13', 'c3'], main: 'c3' } },
  { cmd: 'git merge feature-cart', out: ["Merge made by the 'ort' strategy."], graph: { on: ['e34', 'e24', 'c4'], main: 'c4' } },
];

const NODE_POS = { c1: [50, 100], c2: [140, 44], c3: [200, 100], c4: [290, 100] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function initDemo() {
  const term = document.querySelector('[data-demo-term]');
  const svg = document.querySelector('[data-demo-graph]');
  if (!term || !svg) return;

  const els = Object.fromEntries([...svg.querySelectorAll('[data-el]')].map((e) => [e.dataset.el, e]));
  const labels = { main: svg.querySelector('[data-label="main"]'), feature: svg.querySelector('[data-label="feature"]') };
  const state = { main: null, feature: null, head: 'main' };

  function placeLabel(name) {
    const g = labels[name];
    const at = state[name];
    if (!at) { g.classList.remove('is-on'); return; }
    const isHead = state.head === name;
    const text = `${isHead ? 'HEAD → ' : ''}${name === 'main' ? 'main' : 'feature-cart'}`;
    const t = g.querySelector('text');
    const r = g.querySelector('rect');
    t.textContent = text;
    const w = Math.ceil(t.getComputedTextLength()) + 16;
    r.setAttribute('width', w);
    t.setAttribute('x', 8);
    const [x, y] = NODE_POS[at];
    const ty = name === 'main' ? y + 18 : y - 38;
    const firstShow = !g.classList.contains('is-on');
    if (firstShow) g.style.transition = 'none'; // appear in place, don't fly in from the corner
    const lx = Math.min(Math.max(x - w / 2, 2), 358 - w); // keep the label inside the 360-wide viewBox
    g.style.transform = `translate(${lx}px, ${ty}px)`;
    if (firstShow) { g.getBoundingClientRect(); g.style.transition = ''; }
    g.classList.toggle('is-head', isHead);
    g.classList.add('is-on');
  }

  function applyGraph(step) {
    if (!step) return;
    svg.querySelectorAll('.is-new').forEach((e) => e.classList.remove('is-new'));
    for (const id of step.on ?? []) {
      els[id].classList.add('is-on');
      if (id.startsWith('c')) els[id].classList.add('is-new');
    }
    if (step.main) state.main = step.main;
    if (step.feature) state.feature = step.feature;
    if (step.head) state.head = step.head;
    placeLabel('main');
    placeLabel('feature');
  }

  function reset() {
    term.innerHTML = '';
    Object.values(els).forEach((e) => e.classList.remove('is-on', 'is-new'));
    Object.assign(state, { main: null, feature: null, head: 'main' });
    placeLabel('main');
    placeLabel('feature');
  }

  const prompt = () => '<span class="term-prompt">krish</span> <span class="term-path">~/amroli-canteen</span> <span class="term-prompt">$</span> ';

  function addLine(html, cls = '') {
    const div = document.createElement('div');
    div.className = `term-line ${cls}`;
    div.innerHTML = html;
    term.appendChild(div);
    while (term.children.length > 12) term.firstChild.remove();
    return div;
  }

  if (reduceMotion) {
    for (const s of SCRIPT) {
      addLine(prompt() + s.cmd);
      (s.out ?? []).forEach((o) => addLine(o, 'term-out'));
      applyGraph(s.graph);
    }
    return;
  }

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(term);

  async function run() {
    for (;;) {
      reset();
      await sleep(600);
      for (const s of SCRIPT) {
        while (!visible || document.hidden) await sleep(400);
        const line = addLine(prompt());
        const typed = document.createElement('span');
        const cursor = document.createElement('span');
        cursor.className = 'term-cursor';
        line.append(typed, cursor);
        for (const ch of s.cmd) {
          typed.textContent += ch;
          await sleep(28 + Math.random() * 45);
        }
        await sleep(260);
        cursor.remove();
        (s.out ?? []).forEach((o) => addLine(o, 'term-out'));
        applyGraph(s.graph);
        await sleep(s.graph ? 1100 : 650);
      }
      const end = addLine(prompt());
      const cursor = document.createElement('span');
      cursor.className = 'term-cursor';
      end.append(cursor);
      await sleep(4200);
    }
  }
  run();
}

renderUnits();
renderCast();
renderCollege();
renderContinue();
observeReveal();
initDemo();

// Participant counter (Milestone 12b): only in builds with accounts; one cached request, hidden on failure.
if (__ACCOUNTS__) {
  import('../../styles/counter.css');
  import('../lib/counter.js').then((m) => m.mountCounter()).catch(() => {});
}
