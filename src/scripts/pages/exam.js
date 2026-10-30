/**
 * Final exam page (Milestone 12c plan §3). Questions come from the server without the correct answers; each choice is
 * saved at once (and kept on the device until confirmed); the countdown uses the server clock; at 0 the paper is
 * submitted; the result is shown at once; the correct answers only after faculty close the exam.
 */
import '../main.js';
import '../lib/account-boot.js';
import { configured } from '../data/supabase.js';
import { BASE } from '../data/site.js';
import { getSession, api } from '../lib/account.js';
import { classify } from '../lib/sync.js';
import { msLeft, mmss, LETTERS, choose, confirmSaved, mergeAnswers, palette } from '../lib/exam.js';

const $ = (s, root = document) => root.querySelector(s);
const view = $('[data-exam-view]');
const msgBox = $('[data-exam-msg]');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let exam = null; // { id, title, … }
let attempt = null; // { deadline, submitted_at, … }
let questions = [];
let current = 0;
let offset = 0; // server clock − device clock
let state = { answers: {}, pending: {} };
let clock = null;
let retry = null;
let refresh = null;
let leaves = 0;
let submitting = false;

const storeKey = () => `gg-exam-${exam?.id}`;
const saveLocal = () => { try { localStorage.setItem(storeKey(), JSON.stringify(state)); } catch { /* ignore */ } };
const loadLocal = () => { try { return JSON.parse(localStorage.getItem(storeKey())) ?? undefined; } catch { return undefined; } };

function message(text, tone = 'info') {
  msgBox.textContent = text ?? '';
  msgBox.dataset.tone = tone;
  msgBox.hidden = !text;
}
const explain = (err) => (classify(err) === 'offline' ? 'No connection — your answers are kept on this phone and sent when the connection returns.' : err?.message || 'Something went wrong. Try again.');
const card = (html) => `<section class="card acct-card exam-card">${html}</section>`;

/* ---------------- Screens ---------------- */

async function load() {
  clearInterval(refresh);
  if (!configured) { view.innerHTML = card('<h1>Exam not available</h1>'); return; }
  let session = null;
  try { session = await getSession(); } catch { /* signed out */ }
  if (!session) {
    view.innerHTML = card(`<h1>Final exam</h1><p>Sign in with your GitHub account first.</p>
      <p><a class="btn btn-primary" href="${BASE}account/">Go to the account page →</a></p>`);
    return;
  }
  let st;
  try { st = await api.examStatus(); } catch (err) { view.innerHTML = card(`<h1>Final exam</h1><p>${esc(explain(err))}</p><p><button class="btn btn-primary" type="button" data-reload>Try again</button></p>`); $('[data-reload]', view).onclick = load; return; }
  offset = Date.parse(st.server_now) - Date.now();
  exam = st.exam;
  attempt = st.attempt;
  if (!exam) {
    view.innerHTML = card(`<h1>Final exam</h1><p>No exam is open right now. Your teacher will open it in class — this page checks again every 15 seconds.</p>
      <p><button class="btn btn-ghost" type="button" data-reload>Check now</button></p>`);
    $('[data-reload]', view).onclick = load;
    refresh = setInterval(load, 15e3);
    return;
  }
  if (attempt?.submitted_at) { showResult(); return; }
  if (attempt) { await begin(); return; }
  if (exam.status !== 'open') { view.innerHTML = card(`<h1>${esc(exam.title)}</h1><p>The exam is closed.</p>`); return; }
  showRules();
}

function showRules() {
  view.innerHTML = card(`
    <p class="eyebrow">Final exam</p>
    <h1>${esc(exam.title)}</h1>
    <ul class="exam-facts">
      <li><strong>${exam.questions}</strong> questions</li>
      <li><strong>${exam.duration_minutes}</strong> minutes</li>
      <li>Pass mark <strong>${exam.pass_percent}%</strong></li>
    </ul>
    <ol class="exam-rules">
      <li>You have <strong>one attempt</strong>. The timer starts when you tap Start and does not stop.</li>
      <li>Tap an answer to choose it — it is saved at once. You can change it until you submit.</li>
      <li>Stay on this page. <strong>Leaving the page is recorded</strong> and shown to your teacher.</li>
      <li>If the page reloads or the network drops, open this page again: your answers are kept.</li>
      <li>At 0:00 the exam is submitted automatically. Your result appears straight away.</li>
    </ol>
    <p><button class="btn btn-primary exam-start" type="button" data-start>Start the exam</button></p>`);
  $('[data-start]', view).onclick = async (e) => {
    if (!confirm(`Start "${exam.title}" now? You will have ${exam.duration_minutes} minutes.`)) return;
    e.currentTarget.disabled = true;
    await begin();
  };
}

async function begin() {
  let res;
  try { res = await api.startExam(exam.id); } catch (err) { message(explain(err), 'bad'); load(); return; }
  offset = Date.parse(res.server_now) - Date.now();
  attempt = res.attempt;
  if (attempt?.submitted_at) { showResult(); return; }
  questions = res.questions;
  state = mergeAnswers(attempt.answers ?? {}, loadLocal());
  saveLocal();
  const firstOpen = questions.findIndex((q) => state.answers[String(q.q)] === undefined);
  current = firstOpen < 0 ? 0 : firstOpen;
  renderPaper();
  flushPending();
  clearInterval(clock);
  clock = setInterval(tick, 500);
  document.addEventListener('visibilitychange', onVisibility);
}

function onVisibility() {
  if (document.visibilityState !== 'hidden' || !attempt || attempt.submitted_at) return;
  leaves += 1;
  api.noteExamLeave(exam.id).catch(() => {});
  message(`You left the exam page (${leaves} time${leaves === 1 ? '' : 's'}). This is recorded for your teacher.`, 'bad');
}

function tick() {
  const left = msLeft(attempt.deadline, offset);
  const t = $('[data-timer]', view);
  if (t) { t.textContent = mmss(left); t.dataset.low = String(left < 5 * 60e3); }
  if (left <= 0) submit(true);
}

function renderPaper() {
  const q = questions[current];
  const chosen = state.answers[String(q.q)];
  const answered = Object.keys(state.answers).length;
  view.innerHTML = `
    <div class="exam-bar">
      <span class="exam-timer" data-timer>${mmss(msLeft(attempt.deadline, offset))}</span>
      <span class="exam-count">${answered} / ${questions.length} answered</span>
      <button class="btn btn-primary exam-submit" type="button" data-submit>Submit</button>
    </div>
    <section class="card acct-card exam-q" aria-labelledby="exam-q-h">
      <p class="exam-qno">Question ${current + 1} of ${questions.length} · Unit ${q.unit}</p>
      <h2 id="exam-q-h">${esc(q.text)}</h2>
      <div class="exam-options" role="radiogroup" aria-labelledby="exam-q-h">
        ${q.options.map((o, i) => `<button type="button" role="radio" class="exam-option" aria-checked="${chosen === i}" data-choice="${i}"><span class="exam-letter">${LETTERS[i]}</span><span>${esc(o)}</span></button>`).join('')}
      </div>
      <p class="muted acct-small exam-save" data-save>${state.pending[String(q.q)] !== undefined ? 'Saving…' : chosen !== undefined ? 'Saved ✓' : ''}</p>
      <div class="exam-nav">
        <button class="btn btn-ghost" type="button" data-prev ${current === 0 ? 'disabled' : ''}>← Previous</button>
        <button class="btn btn-ghost" type="button" data-next ${current === questions.length - 1 ? 'disabled' : ''}>Next →</button>
      </div>
    </section>
    <nav class="exam-grid" aria-label="Questions">
      ${palette(questions, state.answers, current).map((c) => `<button type="button" class="exam-cell" data-go="${c.n - 1}" data-answered="${c.answered}" ${c.current ? 'aria-current="true"' : ''} aria-label="Question ${c.n}${c.answered ? ', answered' : ''}">${c.n}</button>`).join('')}
    </nav>`;
  view.querySelectorAll('[data-choice]').forEach((b) => { b.onclick = () => pick(q.q, Number(b.dataset.choice)); });
  $('[data-prev]', view).onclick = () => { current -= 1; renderPaper(); };
  $('[data-next]', view).onclick = () => { current += 1; renderPaper(); };
  view.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => { current = Number(b.dataset.go); renderPaper(); }; });
  $('[data-submit]', view).onclick = () => submit(false);
}

function pick(questionId, choice) {
  state = choose(state, questionId, choice);
  saveLocal();
  renderPaper();
  send(questionId, choice);
}

async function send(questionId, choice) {
  try {
    const res = await api.saveExamAnswer(exam.id, questionId, choice);
    if (res.time_up || res.submitted) { showResultFromServer(); return; }
    state = confirmSaved(state, questionId, choice);
    saveLocal();
    const s = $('[data-save]', view);
    if (s && questions[current]?.q === questionId) s.textContent = 'Saved ✓';
    if (!retry && Object.keys(state.pending).length === 0) message('');
  } catch (err) {
    message(explain(err), 'bad');
    clearTimeout(retry);
    retry = setTimeout(() => { retry = null; flushPending(); }, 5000);
  }
}

function flushPending() {
  for (const [q, choice] of Object.entries(state.pending)) send(Number(q), choice);
}

async function submit(auto) {
  if (submitting) return;
  const unanswered = questions.length - Object.keys(state.answers).length;
  if (!auto && !confirm(unanswered ? `${unanswered} question${unanswered === 1 ? ' is' : 's are'} not answered. Submit anyway?` : 'Submit your exam now?')) return;
  submitting = true;
  clearInterval(clock);
  // Send anything still waiting first, then submit.
  for (const [q, choice] of Object.entries(state.pending)) {
    try { await api.saveExamAnswer(exam.id, Number(q), choice); } catch { /* the server keeps what it already has */ }
  }
  try {
    attempt = await api.submitExam(exam.id);
    document.removeEventListener('visibilitychange', onVisibility);
    try { localStorage.removeItem(storeKey()); } catch { /* ignore */ }
    showResult();
  } catch (err) {
    submitting = false;
    message(`${explain(err)} Tap Submit again when you are online.`, 'bad');
    clock = setInterval(tick, 1000);
  }
}

async function showResultFromServer() {
  clearInterval(clock);
  try { const st = await api.examStatus(); attempt = st.attempt; exam = st.exam ?? exam; } catch { /* keep */ }
  showResult();
}

function showResult() {
  clearInterval(clock);
  message('');
  const a = attempt;
  view.innerHTML = card(`
    <p class="eyebrow">${esc(exam.title)}</p>
    <h1>Your result</h1>
    <p class="exam-score"><strong>${a.score} / ${a.total}</strong> · ${a.percent}%</p>
    <p class="exam-verdict" data-pass="${a.passed}">${a.passed ? '✓ PASSED' : 'NOT PASSED'}</p>
    <p class="muted">Pass mark ${exam.pass_percent ?? 40}% · submitted ${new Date(a.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
    ${exam.status === 'closed' ? '<p><button class="btn btn-ghost" type="button" data-review>Show the correct answers</button></p><div data-review-box></div>'
      : '<p class="muted acct-small">The correct answers are shown here after your teacher closes the exam.</p>'}`);
  $('[data-review]', view)?.addEventListener('click', review);
}

async function review(e) {
  e.currentTarget.disabled = true;
  try {
    const items = await api.examReview(exam.id);
    $('[data-review-box]', view).innerHTML = `<ol class="exam-review">${items.map((it) => `
      <li><p>${esc(it.text)}</p><ul>${it.options.map((o, i) => `<li data-correct="${i === it.correct}" data-chosen="${i === it.chosen}">${LETTERS[i]}. ${esc(o)}${i === it.correct ? ' ✓' : i === it.chosen ? ' ✗ your answer' : ''}</li>`).join('')}</ul>
      ${it.chosen == null ? '<p class="muted acct-small">Not answered</p>' : ''}${it.explanation ? `<p class="muted acct-small">${esc(it.explanation)}</p>` : ''}</li>`).join('')}</ol>`;
  } catch (err) { message(explain(err), 'bad'); }
}

window.addEventListener('online', () => { if (attempt && !attempt.submitted_at) flushPending(); });
load();
