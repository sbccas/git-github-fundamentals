/**
 * Slide deck engine (PRD F-05 – F-14).
 *  → Space PgDn ↓ : next step / slide      ← PgUp ↑ Backspace : previous
 *  Home / End     : first / last           F : full screen     O : overview
 *  P              : presenter view         T : activity timer  B : blank screen
 *  G              : projector boost        ? : help            Esc : close / clear spotlight
 *  Click a block to spotlight it. Swipe or tap the edges on touch screens.
 */
import { readRaw, writeRaw } from '../lib/storage.js';

const W = 1920;
const H = 1080;

export function startDeck({ presenter = false } = {}) {
  const viewport = document.querySelector('.deck-viewport');
  const deck = document.querySelector('.deck');
  const slides = [...deck.querySelectorAll('.slide')];
  const sessionId = deck.dataset.deck;
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(`gg-deck-${sessionId}`) : null;
  const total = slides.length;
  let index = 0;
  let step = 0; // number of fragments shown on the current slide
  let onChange = null;
  const fragmentsOf = (s) => [...s.querySelectorAll('.fragment')];

  /* ---------- scaling ---------- */
  function fit() {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    deck.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  if (!presenter) { fit(); window.addEventListener('resize', fit); }

  /* ---------- render ---------- */
  function show(i, st = 0, { back = false, broadcast = true } = {}) {
    index = Math.max(0, Math.min(total - 1, i));
    const frags = fragmentsOf(slides[index]);
    step = Math.max(0, Math.min(frags.length, st));
    slides.forEach((s, k) => {
      const cur = k === index;
      if (cur && !s.classList.contains('is-current')) {
        s.classList.toggle('is-back', back);
        s.classList.add('is-current');
      } else if (!cur) {
        s.classList.remove('is-current', 'is-back', 'has-spot');
        s.querySelectorAll('.is-spot').forEach((e) => e.classList.remove('is-spot'));
      }
    });
    frags.forEach((f, k) => {
      f.classList.toggle('is-shown', k < step);
      f.classList.toggle('is-latest', k === step - 1);
    });
    const bar = document.querySelector('.deck-progress');
    if (bar) bar.style.width = `${((index + 1) / total) * 100}%`;
    const count = document.querySelector('[data-count]');
    if (count) count.textContent = `${index + 1} / ${total}`;
    history.replaceState(null, '', `#${index + 1}${step ? `.${step}` : ''}`);
    setupTimer(slides[index]);
    if (broadcast) channel?.postMessage({ type: 'go', index, step });
    onChange?.(index, step);
  }

  function next() {
    const frags = fragmentsOf(slides[index]);
    if (step < frags.length) show(index, step + 1);
    else if (index < total - 1) show(index + 1, 0);
  }
  function prev() {
    if (step > 0) show(index, step - 1);
    else if (index > 0) show(index - 1, fragmentsOf(slides[index - 1]).length, { back: true });
  }

  /* ---------- activity timer (T) ---------- */
  let timer = null;
  function setupTimer(slide) {
    stopTimer();
    if (!slide.dataset.timer || slide.querySelector('.slide-timer')) return;
    const el = document.createElement('div');
    el.className = 'slide-timer';
    el.textContent = `${String(slide.dataset.timer).padStart(2, '0')}:00`;
    slide.querySelector('.slide-inner').appendChild(el);
  }
  function stopTimer() { clearInterval(timer?.id); timer = null; }
  function toggleTimer() {
    const slide = slides[index];
    const el = slide.querySelector('.slide-timer');
    if (!el) return;
    if (timer) { stopTimer(); el.classList.remove('is-running'); return; }
    const mins = Number(slide.dataset.timer);
    let left = el.dataset.left ? Number(el.dataset.left) : mins * 60;
    el.classList.add('is-running');
    const tick = () => {
      el.dataset.left = left;
      el.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
      if (left <= 0) { stopTimer(); el.classList.remove('is-running'); el.classList.add('is-done'); el.textContent = "Time's up!"; return; }
      left -= 1;
    };
    tick();
    timer = { id: setInterval(tick, 1000) };
  }

  /* ---------- overlays ---------- */
  const blank = document.querySelector('.deck-blank');
  const help = document.querySelector('.deck-help');
  const overview = document.querySelector('.deck-overview');
  const toggleBlank = () => { blank.hidden = !blank.hidden; };
  const toggleHelp = () => { help.hidden = !help.hidden; };

  function openOverview() {
    const grid = overview.querySelector('.overview-grid');
    grid.innerHTML = '';
    slides.forEach((s, k) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `overview-item${k === index ? ' is-current' : ''}`;
      item.setAttribute('aria-label', `Go to slide ${k + 1}`);
      const clone = s.cloneNode(true);
      clone.classList.add('is-current');
      clone.style.width = `${W}px`;
      clone.style.height = `${H}px`;
      item.append(Object.assign(document.createElement('span'), { className: 'overview-num', textContent: k + 1 }), clone);
      item.addEventListener('click', () => { closeOverview(); show(k, 0); });
      grid.appendChild(item);
    });
    overview.hidden = false;
    requestAnimationFrame(() => grid.querySelectorAll('.overview-item').forEach((it) => {
      it.querySelector('.slide').style.transform = `scale(${it.clientWidth / W})`;
    }));
    grid.querySelector('.is-current')?.focus();
  }
  function closeOverview() { overview.hidden = true; }

  function toggleBoost() {
    document.body.classList.toggle('boost');
    writeRaw('deck-boost', document.body.classList.contains('boost') ? '1' : '0');
    document.querySelector('[data-boost]')?.setAttribute('aria-pressed', String(document.body.classList.contains('boost')));
  }
  if (readRaw('deck-boost') === '1') { document.body.classList.add('boost'); document.querySelector('[data-boost]')?.setAttribute('aria-pressed', 'true'); }

  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }

  function openPresenter() {
    window.open(`${location.pathname}?presenter#${index + 1}${step ? `.${step}` : ''}`, `presenter-${sessionId}`, 'width=1280,height=760');
  }

  /* ---------- input ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (!overview.hidden || !help.hidden) {
      if (k === 'Escape' || k === 'o' || k === 'O' || k === '?') { closeOverview(); help.hidden = true; e.preventDefault(); }
      return;
    }
    if (!blank.hidden && !['b', 'B', '.'].includes(k)) { blank.hidden = true; e.preventDefault(); return; }
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter', 'n', 'N'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') { e.preventDefault(); show(0, 0); }
    else if (k === 'End') { e.preventDefault(); show(total - 1, 0); }
    else if (k === 'f' || k === 'F') fullscreen();
    else if (k === 'o' || k === 'O') openOverview();
    else if ((k === 'p' || k === 'P') && !presenter) openPresenter();
    else if (k === 't' || k === 'T') toggleTimer();
    else if (k === 'b' || k === 'B' || k === '.') toggleBlank();
    else if (k === 'g' || k === 'G') toggleBoost();
    else if (k === '?') toggleHelp();
    else if (k === 'Escape') { const s = slides[index]; s.classList.remove('has-spot'); s.querySelectorAll('.is-spot').forEach((x) => x.classList.remove('is-spot')); }
  });

  // Spotlight: click a top-level block on the slide.
  viewport?.addEventListener('click', (e) => {
    if (presenter) return;
    const inner = slides[index].querySelector('.slide-inner');
    let el = e.target;
    while (el && el.parentElement !== inner) el = el.parentElement;
    if (!el || e.target.closest('a, button')) return;
    const slide = slides[index];
    const on = el.classList.contains('is-spot');
    slide.querySelectorAll('.is-spot').forEach((x) => x.classList.remove('is-spot'));
    if (!on) el.classList.add('is-spot');
    slide.classList.toggle('has-spot', !on);
  });

  // Touch: swipe, or tap the left/right edges.
  let touchX = null;
  viewport?.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  viewport?.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
    else if (touchX > window.innerWidth * 0.75) next();
    else if (touchX < window.innerWidth * 0.25) prev();
    touchX = null;
  });

  // Toolbar buttons
  const ui = document.querySelector('.deck-ui');
  ui?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    ({ prev, next, overview: openOverview, presenter: openPresenter, fullscreen, boost: toggleBoost, timer: toggleTimer, blank: toggleBlank, help: toggleHelp })[b.dataset.act]?.();
  });
  // Hide the toolbar when the mouse is still.
  let idle;
  const wake = () => { ui?.classList.remove('is-idle'); clearTimeout(idle); idle = setTimeout(() => ui?.classList.add('is-idle'), 2500); };
  document.addEventListener('mousemove', wake);
  wake();

  // Sync with the presenter window (or the projected window).
  channel?.addEventListener('message', (e) => {
    if (e.data?.type === 'go' && (e.data.index !== index || e.data.step !== step)) show(e.data.index, e.data.step, { broadcast: false, back: e.data.index < index });
  });

  // Jump when the hash is edited by hand (#7 or #7.2).
  window.addEventListener('hashchange', () => {
    const h = /^#(\d+)(?:\.(\d+))?/.exec(location.hash);
    if (h && (Number(h[1]) - 1 !== index || Number(h[2] ?? 0) !== step)) show(Number(h[1]) - 1, Number(h[2] ?? 0));
  });

  // Start from the URL hash (#slide.step).
  const m = /^#(\d+)(?:\.(\d+))?/.exec(location.hash);
  const api = {
    slides, total, next, prev, show,
    get index() { return index; }, get step() { return step; },
    set onChange(fn) { onChange = fn; },
  };
  show(m ? Number(m[1]) - 1 : 0, m?.[2] ? Number(m[2]) : 0, { broadcast: false });
  return api;
}
