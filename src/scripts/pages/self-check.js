import '../main.js';
import { mountQuiz } from '../lib/quiz.js';
import { UNITS, pageUrl } from '../data/site.js';
import { load, save, unitPercent, setLastVisited } from '../lib/progress.js';
import SELF from '../../../content/quizzes/self-check.json';

const unitQuizzes = import.meta.glob('../../../content/quizzes/unit-*.json', { import: 'default', eager: true });
const PER_UNIT_FROM_QUIZ = 3;

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/** 5 self-check questions + 3 random unit-quiz questions per unit = 40. */
function buildPool() {
  const pool = [];
  for (const u of UNITS) {
    pool.push(...SELF.questions.filter((q) => q.unit === u.n));
    const quiz = unitQuizzes[`../../../content/quizzes/unit-${u.n}.json`];
    pool.push(...shuffle(quiz.questions).slice(0, PER_UNIT_FROM_QUIZ).map((q) => ({ ...q, unit: u.n })));
  }
  return pool;
}

function renderUnits() {
  const p = load();
  const last = p.selfCheck?.byUnit ?? {};
  document.querySelector('[data-sc-units]').innerHTML = UNITS.map((u) => `
    <a class="sc-unit" href="${pageUrl(`unit-${u.n}/`)}" style="--u:${u.color}">
      <span class="unit-num">Unit ${u.n}</span><strong>${u.short}</strong>
      <span class="muted">Lesson ${unitPercent(p, u.n)}%${last[u.n] !== undefined ? ` · last self-check ${last[u.n]}%` : ''}</span>
    </a>`).join('');
}

function byUnit(results) {
  const out = {};
  for (const u of UNITS) {
    const rs = results.filter((r) => r.unit === u.n);
    out[u.n] = rs.length ? Math.round((rs.filter((r) => r.correct).length / rs.length) * 100) : 0;
  }
  return out;
}

mountQuiz(document.querySelector('[data-sc-quiz]'), SELF, {
  best: load().selfCheck?.best ?? null,
  prepare: buildPool,
  onFinish: (percent, passed, results) => {
    const data = load();
    data.selfCheck = { best: Math.max(data.selfCheck?.best ?? 0, percent), last: percent, byUnit: byUnit(results), at: new Date().toISOString() };
    save(data);
    renderUnits();
    return {};
  },
  resultExtra: (results) => {
    const scores = byUnit(results);
    const weak = UNITS.filter((u) => scores[u.n] < 75);
    return `<div class="sc-report">
      ${UNITS.map((u) => `<div class="sc-row" style="--u:${u.color}"><span>Unit ${u.n} · ${u.short}</span>
        <span class="sc-bar"><span style="width:${scores[u.n]}%"></span></span><b>${scores[u.n]}%</b></div>`).join('')}
      ${weak.length ? `<p class="sc-tip">Revise: ${weak.map((u) => `<a href="${pageUrl(`unit-${u.n}/`)}">Unit ${u.n}</a>`).join(', ')}, then try the matching <a href="${pageUrl('missions/')}">missions</a>.</p>` : '<p class="sc-tip">Excellent across every unit. You are ready for the final practical. 🎉</p>'}
    </div>`;
  },
});
renderUnits();
setLastVisited(location.pathname, 'Final self-check');
