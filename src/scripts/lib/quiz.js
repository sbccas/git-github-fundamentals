/**
 * Quiz component (PRD Q-01 – Q-04). Question types: single, multi, predict (single with code), order.
 * One question at a time, instant feedback with explanations, shuffled, best score saved.
 */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** Inline `code` in question text. */
const fmt = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function mountQuiz(root, quiz, { onFinish, best = null, resultExtra = null, prepare = null } = {}) {
  let order;
  let index;
  let score;
  let answered;
  let results; // [{ id, unit, correct }]

  function start() {
    results = [];
    const pool = prepare ? prepare() : quiz.questions;
    order = shuffle(pool).map((q) => {
      if (q.type === 'order') return { ...q, shuffled: shuffleUntilDifferent(q.items) };
      const opts = q.options.map((text, i) => ({ text, i }));
      return { ...q, opts: shuffle(opts) };
    });
    index = 0;
    score = 0;
    renderIntro();
  }

  function shuffleUntilDifferent(items) {
    let s;
    do { s = shuffle(items.map((text, i) => ({ text, i }))); } while (items.length > 1 && s.every((x, k) => x.i === k));
    return s;
  }

  function renderIntro() {
    root.innerHTML = `<div class="quiz-card quiz-intro">
      <p class="quiz-kicker">${quiz.count ?? quiz.questions.length} questions · pass mark ${quiz.passMark}%</p>
      <h3>${esc(quiz.title)}</h3>
      <p>${quiz.intro ?? 'Answer one question at a time. You get instant feedback and an explanation for every answer.'}</p>
      ${best !== null ? `<p class="quiz-best">Your best score: <strong>${best}%</strong></p>` : ''}
      <button class="btn btn-primary" type="button" data-q-start>${best !== null ? 'Try again' : 'Start the quiz'}</button>
    </div>`;
    root.querySelector('[data-q-start]').addEventListener('click', () => renderQuestion());
  }

  function dots() {
    return `<div class="quiz-dots" aria-hidden="true">${order.map((_, i) => `<span class="${i < index ? 'is-done' : i === index ? 'is-now' : ''}"></span>`).join('')}</div>`;
  }

  function renderQuestion() {
    answered = false;
    const q = order[index];
    const label = { single: 'Choose one answer', predict: 'Predict the output', multi: 'Choose all that apply', order: 'Tap the steps in the right order' }[q.type];
    let body;
    if (q.type === 'order') {
      body = `<div class="q-order"><ol class="q-picked" data-picked></ol>
        <div class="q-pool" data-pool>${q.shuffled.map((it) => `<button type="button" class="q-chip" data-item="${it.i}">${fmt(it.text)}</button>`).join('')}</div>
        <button type="button" class="mini-btn" data-undo>Undo</button></div>`;
    } else {
      const type = q.type === 'multi' ? 'checkbox' : 'radio';
      body = `<fieldset class="q-options"><legend class="visually-hidden">${esc(q.q)}</legend>${q.opts.map((o, k) => `
        <label class="q-opt"><input type="${type}" name="q-${index}" value="${o.i}"><span class="q-letter">${String.fromCharCode(65 + k)}</span><span class="q-text">${fmt(o.text)}</span></label>`).join('')}</fieldset>`;
    }
    root.innerHTML = `<div class="quiz-card">
      ${dots()}
      <p class="quiz-kicker">Question ${index + 1} of ${order.length} · ${label}</p>
      <h3 class="q-title">${fmt(q.q)}</h3>
      ${q.code ? `<pre class="q-code">${esc(q.code)}</pre>` : ''}
      ${body}
      <div class="q-feedback" data-feedback aria-live="polite"></div>
      <div class="q-actions"><button class="btn btn-primary" type="button" data-check disabled>Check answer</button></div>
    </div>`;
    const check = root.querySelector('[data-check]');
    if (q.type === 'order') {
      const picked = [];
      const pool = root.querySelector('[data-pool]');
      const list = root.querySelector('[data-picked]');
      const sync = () => {
        list.innerHTML = picked.map((i) => `<li>${fmt(q.items[i])}</li>`).join('');
        pool.querySelectorAll('[data-item]').forEach((b) => { b.hidden = picked.includes(Number(b.dataset.item)); });
        check.disabled = picked.length !== q.items.length;
      };
      pool.addEventListener('click', (e) => { const b = e.target.closest('[data-item]'); if (!b || answered) return; picked.push(Number(b.dataset.item)); sync(); });
      root.querySelector('[data-undo]').addEventListener('click', () => { if (!answered) { picked.pop(); sync(); } });
      check.addEventListener('click', () => grade(picked));
    } else {
      root.querySelector('.q-options').addEventListener('change', () => {
        check.disabled = !root.querySelector('.q-options input:checked');
      });
      check.addEventListener('click', () => grade([...root.querySelectorAll('.q-options input:checked')].map((x) => Number(x.value))));
    }
    root.querySelector('.quiz-card').focus?.();
  }

  function grade(chosen) {
    if (answered) { next(); return; }
    answered = true;
    const q = order[index];
    let correct;
    if (q.type === 'order') correct = chosen.every((v, k) => v === k);
    else if (q.type === 'multi') correct = [...q.answer].sort().join() === [...chosen].sort().join();
    else correct = chosen[0] === q.answer;
    if (correct) score++;
    results.push({ id: q.id, unit: q.unit, correct });

    const fb = root.querySelector('[data-feedback]');
    if (q.type === 'order') {
      root.querySelectorAll('.q-picked li').forEach((li, k) => li.classList.add(chosen[k] === k ? 'is-right' : 'is-wrong'));
      fb.innerHTML = `${correct ? '<p class="q-verdict is-right">✓ Correct order!</p>' : `<p class="q-verdict is-wrong">✗ Not quite. The right order:</p><ol class="q-answer">${q.items.map((t) => `<li>${fmt(t)}</li>`).join('')}</ol>`}<p>${fmt(q.explain)}</p>`;
    } else {
      const answers = Array.isArray(q.answer) ? q.answer : [q.answer];
      root.querySelectorAll('.q-opt').forEach((label) => {
        const input = label.querySelector('input');
        const v = Number(input.value);
        input.disabled = true;
        if (answers.includes(v)) label.classList.add('is-right');
        else if (input.checked) label.classList.add('is-wrong');
      });
      fb.innerHTML = `<p class="q-verdict ${correct ? 'is-right' : 'is-wrong'}">${correct ? '✓ Correct!' : '✗ Not quite.'}</p><p>${fmt(q.explain)}</p>`;
    }
    const btn = root.querySelector('[data-check]');
    btn.textContent = index + 1 < order.length ? 'Next question →' : 'See my score';
    btn.disabled = false;
    btn.focus();
  }

  function next() {
    index++;
    if (index < order.length) renderQuestion();
    else finish();
  }

  function finish() {
    const percent = Math.round((score / order.length) * 100);
    const passed = percent >= quiz.passMark;
    const result = onFinish?.(percent, passed, results) ?? {};
    best = Math.max(best ?? 0, percent);
    root.innerHTML = `<div class="quiz-card quiz-result ${passed ? 'is-pass' : 'is-retry'}">
      <div class="quiz-score" style="--p:${percent}"><span>${percent}%</span></div>
      <h3>${passed ? 'You passed! 🎉' : 'Keep practising'}</h3>
      <p>${score} of ${order.length} correct. ${passed ? 'Great work.' : `You need ${quiz.passMark}% to pass. Re-read the sections you missed and try again; questions are shuffled each time.`}</p>
      ${result.xp ? `<p class="quiz-xp">+${result.xp} XP${result.badges?.length ? ` · new badge!` : ''}</p>` : ''}
      ${resultExtra ? resultExtra(results) : ''}
      <button class="btn btn-ghost" type="button" data-q-again>Try again</button>
    </div>`;
    root.querySelector('[data-q-again]').addEventListener('click', start);
  }

  start();
}
