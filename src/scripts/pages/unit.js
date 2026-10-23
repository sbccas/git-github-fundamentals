import { observeReveal } from '../main.js';
import { MISSIONS } from '../../../content/missions/missions.js';
import { UNITS, pageUrl } from '../data/site.js';
import { load, markSection, setUnitTotal, recordQuiz, completeUnit, unitPercent, setLastVisited, completeGame, BADGES } from '../lib/progress.js';
import { mountQuiz } from '../lib/quiz.js';
import { linkTerms } from '../lib/glossary.js';

const quizzes = import.meta.glob('../../../content/quizzes/unit-*.json', { import: 'default' });

const n = Number(document.body.dataset.unit);
const unit = UNITS[n - 1];
const lesson = document.querySelector('[data-lesson]');
const sections = [...lesson.querySelectorAll('.lesson-body h2[id]')];
const tocLinks = new Map([...document.querySelectorAll('[data-toc]')].map((a) => [a.dataset.toc, a]));

setUnitTotal(n, sections.length);

/* ---------- progress bar & TOC ticks ---------- */
function paintProgress() {
  const p = load();
  const read = new Set(p.units[String(n)]?.sections ?? []);
  for (const [id, a] of tocLinks) a.classList.toggle('is-read', read.has(id));
  const bar = document.querySelector('[data-unit-bar]');
  if (bar) bar.style.width = `${unitPercent(p, n)}%`;
  const btn = document.querySelector('[data-complete-unit]');
  if (btn && p.units[String(n)]?.complete) { btn.textContent = `Unit ${n} complete ✓`; btn.disabled = true; }
}

/* ---------- scroll spy + "read" tracking ---------- */
// A section counts as read once its end has scrolled into view (the next heading reaches the top half).
const ids = sections.map((h) => h.id);
let current = null;
function onScroll() {
  const line = window.innerHeight * 0.35;
  let active = ids[0];
  for (const h of sections) if (h.getBoundingClientRect().top < line) active = h.id;
  const practice = document.getElementById('practice');
  const quiz = document.getElementById('quiz');
  if (practice.getBoundingClientRect().top < line) active = 'practice';
  if (quiz.getBoundingClientRect().top < line) active = 'quiz';
  if (active !== current) {
    current = active;
    for (const [id, a] of tocLinks) a.classList.toggle('is-active', id === active);
  }
  sections.forEach((h, i) => {
    const nextTop = (sections[i + 1] ?? practice).getBoundingClientRect().top;
    if (nextTop < window.innerHeight * 0.55) {
      const before = load().units[String(n)]?.sections ?? [];
      if (!before.includes(h.id)) { markSection(n, h.id, sections.length); paintProgress(); }
    }
  });
}
let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; onScroll(); });
}, { passive: true });

/* ---------- flip cards ---------- */
lesson.addEventListener('click', (e) => {
  const card = e.target.closest('.flip-card');
  if (card) card.classList.toggle('is-flipped');
});

/* ---------- missions & labs ---------- */
function renderPractice() {
  const p = load();
  const list = MISSIONS.filter((m) => m.unit === n);
  const LABS = { 'L-01': 'Your profile README', 'L-02': 'Create & configure a repository', 'L-03': 'Report and fix an issue', 'L-04': 'Fork & pull request' };
  const labCards = unit.missions.filter((id) => id.startsWith('L-')).map((id) => `<a class="practice-card is-lab" href="${pageUrl(`labs/#${id.toLowerCase()}`)}">
      <span class="practice-kind">Lab ${id} · real GitHub</span>
      <strong>${LABS[id]}</strong>
      <span class="muted">Steps, checklist and what to submit</span>
    </a>`);
  const cards = list.map((m) => {
    const done = p.missions[m.id]?.done;
    return `<a class="practice-card${done ? ' is-done' : ''}" href="${pageUrl(`missions/?m=${m.id}`)}">
      <span class="practice-kind">Mission ${m.id}${done ? ' · done ✓' : ''}</span>
      <strong>${m.title}</strong>
      <span class="muted">~${m.minutes} min in the browser</span>
    </a>`;
  });
  cards.push(...labCards);
  if (!labCards.length) cards.push(`<a class="practice-card is-lab" href="${pageUrl(`labs/#unit-${n}`)}">
      <span class="practice-kind">Lab · real computer</span>
      <strong>Unit ${n} lab</strong>
      <span class="muted">Practise on Git Bash and github.com</span>
    </a>`);
  cards.push(`<a class="practice-card is-play" href="${pageUrl('playground/')}">
      <span class="practice-kind">Free practice</span>
      <strong>Open the Playground</strong>
      <span class="muted">Try any command from this unit</span>
    </a>`);
  document.querySelector('[data-practice]').innerHTML = cards.join('');
}

/* ---------- quiz ---------- */
async function renderQuiz() {
  const root = document.querySelector('[data-quiz]');
  const loader = quizzes[`../../../content/quizzes/unit-${n}.json`];
  if (!root || !loader) return;
  const quiz = await loader();
  mountQuiz(root, quiz, {
    best: load().units[String(n)]?.quiz?.best ?? null,
    onFinish: (percent) => {
      const r = recordQuiz(n, percent, quiz.passMark);
      paintProgress();
      return r;
    },
  });
}

/* ---------- complete ---------- */
document.querySelector('[data-complete-unit]')?.addEventListener('click', (e) => {
  const r = completeUnit(n);
  e.currentTarget.textContent = r.xp ? `Unit ${n} complete ✓ (+${r.xp} XP)` : `Unit ${n} complete ✓`;
  e.currentTarget.disabled = true;
  for (const b of r.badges) {
    const badge = BADGES.find((x) => x.id === b);
    if (badge) e.currentTarget.insertAdjacentHTML('afterend', `<p class="badge-earned">${badge.icon} New badge: <strong>${badge.title}</strong></p>`);
  }
  paintProgress();
});

/* ---------- conflict mini-game (Unit 3) ---------- */
async function renderConflictGame() {
  const root = document.querySelector('[data-conflict-game]');
  if (!root) return;
  const [{ mountConflictGame }, game] = await Promise.all([
    import('../lib/conflict-game.js'),
    import('../../../content/conflict-game.json').then((m) => m.default),
  ]);
  mountConflictGame(root, game, { onWin: () => completeGame('conflict') });
}

linkTerms(document.querySelector('.lesson-body'));
renderPractice();
renderQuiz();
renderConflictGame();
paintProgress();
onScroll();
observeReveal();
setLastVisited(location.pathname, `Unit ${n}: ${unit.title}`);
