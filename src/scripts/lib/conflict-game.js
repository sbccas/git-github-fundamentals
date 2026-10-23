/**
 * Conflict mini-game (PRD Q-05): tap lines to keep or delete until the file
 * matches the team's decision, with no conflict markers left.
 */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isMarker = (l) => /^(<{7}|={7}|>{7})/.test(l);

export function mountConflictGame(root, game, { onWin } = {}) {
  let round = 0;
  let kept;

  function render() {
    const r = game.rounds[round];
    kept = new Set(r.lines.map((_, i) => i)); // start with everything kept, as in the real file
    draw();
  }

  function draw(feedback = '') {
    const r = game.rounds[round];
    let side = null;
    const rows = r.lines.map((l, i) => {
      if (l.startsWith('<<<<<<<')) side = 'ours';
      const cls = isMarker(l) ? 'is-marker' : side === 'ours' ? 'is-ours' : side === 'theirs' ? 'is-theirs' : '';
      if (l.startsWith('=======')) side = 'theirs';
      if (l.startsWith('>>>>>>>')) side = null;
      const on = kept.has(i);
      return `<li><button type="button" class="cg-line ${cls}${on ? '' : ' is-cut'}" data-line="${i}" aria-pressed="${on}" aria-label="${on ? 'Keep' : 'Deleted'}: ${esc(l) || 'blank line'}">
        <span class="cg-n">${i + 1}</span><span class="cg-text">${esc(l) || '&nbsp;'}</span><span class="cg-state">${on ? 'keep' : 'deleted'}</span></button></li>`;
    }).join('');
    const preview = r.lines.filter((_, i) => kept.has(i)).join('\n');
    root.innerHTML = `<div class="cg">
      <div class="cg-head"><span class="quiz-kicker">Round ${round + 1} of ${game.rounds.length} · ${esc(r.file)}</span>
        <div class="quiz-dots" aria-hidden="true">${game.rounds.map((_, i) => `<span class="${i < round ? 'is-done' : i === round ? 'is-now' : ''}"></span>`).join('')}</div></div>
      <p class="cg-story">${r.story}</p>
      <p class="cg-help">Tap a line to <strong>delete</strong> it (tap again to keep it). <span class="cg-legend"><span class="is-ours">yours (HEAD)</span> <span class="is-theirs">theirs</span> <span class="is-marker">marker</span></span></p>
      <ol class="cg-lines">${rows}</ol>
      <details class="cg-preview"><summary>Preview the saved file</summary><pre>${esc(preview) || '(empty file)'}</pre></details>
      <div class="q-feedback" aria-live="polite">${feedback}</div>
      <div class="q-actions"><button class="btn btn-primary" type="button" data-cg-check>Save &amp; check</button> <button class="mini-btn" type="button" data-cg-reset>Start over</button></div>
    </div>`;
  }

  root.addEventListener('click', (e) => {
    const line = e.target.closest('[data-line]');
    if (line) {
      const i = Number(line.dataset.line);
      if (kept.has(i)) kept.delete(i); else kept.add(i);
      draw();
      root.querySelector(`[data-line="${i}"]`)?.focus();
      return;
    }
    if (e.target.closest('[data-cg-reset]')) { render(); return; }
    if (e.target.closest('[data-cg-next]')) {
      round += 1;
      if (round < game.rounds.length) render();
      else {
        const res = onWin?.() ?? {};
        root.innerHTML = `<div class="cg quiz-result is-pass"><div class="quiz-score" style="--p:100"><span>🏆</span></div>
          <h3>Conflicts crushed!</h3><p>You resolved every conflict. In real Git you would now run <code>git add</code> and <code>git commit</code>.</p>
          ${res.xp ? `<p class="quiz-xp">+${res.xp} XP</p>` : ''}<button class="btn btn-ghost" type="button" data-cg-again>Play again</button></div>`;
      }
      return;
    }
    if (e.target.closest('[data-cg-again]')) { round = 0; render(); return; }
    if (e.target.closest('[data-cg-check]')) {
      const r = game.rounds[round];
      const markersLeft = [...kept].some((i) => isMarker(r.lines[i]));
      const want = new Set(r.keep);
      const right = !markersLeft && kept.size === want.size && [...want].every((i) => kept.has(i));
      let fb;
      if (markersLeft) fb = '<p class="q-verdict is-wrong">✗ Conflict markers are still in the file.</p><p>Git would save them as normal text, and your code would break. Delete every <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code>, <code>=======</code> and <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code> line.</p>';
      else if (!right) fb = '<p class="q-verdict is-wrong">✗ The markers are gone, but the content isn\'t what the team decided.</p><p>Re-read the story and check which lines should stay.</p>';
      else fb = `<p class="q-verdict is-right">✓ Resolved!</p><p>${r.explain}</p>`;
      draw(fb);
      if (right) {
        const actions = root.querySelector('.q-actions');
        actions.innerHTML = `<button class="btn btn-primary" type="button" data-cg-next>${round + 1 < game.rounds.length ? 'Next conflict →' : 'Finish'}</button>`;
        actions.querySelector('button').focus();
      }
    }
  });

  render();
}
