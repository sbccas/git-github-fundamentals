import { startDeck } from '../teach/deck.js';

const W = 1920;
const H = 1080;
const presenterMode = new URLSearchParams(location.search).has('presenter');

if (!presenterMode) {
  startDeck();
} else {
  /* ---------- Presenter view (F-10): current + next slide, notes, clocks ---------- */
  const deck = document.querySelector('.deck');
  const title = deck.dataset.title;
  const duration = Number(deck.dataset.duration || 120);
  document.body.classList.add('is-presenter');
  document.title = `Presenter · ${title}`;
  const root = document.createElement('div');
  root.className = 'presenter';
  root.innerHTML = `
    <header>
      <span class="p-clock" data-elapsed>00:00</span>
      <span class="p-meta"><strong>${title}</strong> · <span data-pos></span> · now <span data-now></span> · <span data-left></span></span>
      <span class="p-controls" style="margin-left:auto"><button type="button" data-p="prev">← Back</button><button type="button" data-p="next">Next →</button><button type="button" data-p="reset">Reset clock</button></span>
    </header>
    <div><p class="p-label">Projected now</p><div class="p-cur"></div></div>
    <div class="p-side">
      <div><p class="p-label">Next</p><div class="p-next"></div></div>
      <p class="p-label">Speaker notes</p>
      <div class="p-notes" data-notes></div>
    </div>`;
  document.body.appendChild(root);
  const cur = root.querySelector('.p-cur');
  const nextBox = root.querySelector('.p-next');
  const viewport = document.querySelector('.deck-viewport');
  cur.appendChild(viewport);
  viewport.style.position = 'relative';
  viewport.style.inset = 'auto';

  const fitCur = () => {
    const s = cur.clientWidth / W;
    deck.style.transform = `scale(${s})`;
    deck.style.transformOrigin = '0 0';
    viewport.style.width = `${cur.clientWidth}px`;
    viewport.style.height = `${H * s}px`;
    viewport.style.display = 'block';
  };
  new ResizeObserver(fitCur).observe(cur);

  const api = startDeck({ presenter: true });
  let start = Date.now();
  const pad = (n) => String(n).padStart(2, '0');

  function renderNext() {
    nextBox.innerHTML = '';
    const nxt = api.slides[api.index + 1];
    if (!nxt) { nextBox.innerHTML = '<p style="padding:20px;color:#8a94ad">End of the deck</p>'; return; }
    const clone = nxt.cloneNode(true);
    clone.classList.add('is-current');
    clone.querySelectorAll('.fragment').forEach((f) => f.classList.add('is-shown'));
    clone.style.width = `${W}px`;
    clone.style.height = `${H}px`;
    clone.style.transform = `scale(${nextBox.clientWidth / W})`;
    nextBox.appendChild(clone);
  }
  api.onChange = (i, step) => {
    const notes = api.slides[i].querySelector('.slide-notes');
    root.querySelector('[data-notes]').innerHTML = notes ? notes.innerHTML : '<p style="color:#8a94ad">No notes for this slide.</p>';
    const frags = api.slides[i].querySelectorAll('.fragment').length;
    root.querySelector('[data-pos]').textContent = `slide ${i + 1} of ${api.total}${frags ? ` · step ${step}/${frags}` : ''}`;
    renderNext();
  };
  api.show(api.index, api.step, { broadcast: false });
  new ResizeObserver(renderNext).observe(nextBox);

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    if (b.dataset.p === 'next') api.next();
    if (b.dataset.p === 'prev') api.prev();
    if (b.dataset.p === 'reset') start = Date.now();
  });
  setInterval(() => {
    const sec = Math.floor((Date.now() - start) / 1000);
    root.querySelector('[data-elapsed]').textContent = `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
    root.querySelector('[data-now]').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const left = duration - Math.floor(sec / 60);
    root.querySelector('[data-left]').textContent = left >= 0 ? `${left} min left of ${duration}` : `${-left} min over`;
  }, 1000);
}
