/**
 * Remote session timer for students (owner approval 30 Oct 2026): a countdown to the end of the session and the
 * student's own active minutes towards 2 hours — the same number faculty see in the session report.
 * Shown as a bar inside the sticky header on every page while the session runs, and at the top of the Remote
 * session card on the account page. Active time is fetched every 2 minutes and shortly after each saved change.
 */
import { REMOTE_SESSION } from '../data/session.js';
import { sessionWindow, sessionPhase, formatClock, activeSummary } from './session.js';
import { api } from './account.js';

const FETCH_EVERY_MS = 120e3;

/** Local trial only: ?session-preview on localhost makes the session "live now" (removed from the live build). */
function previewOn() {
  if (!import.meta.env.DEV) return false;
  try {
    if (new URLSearchParams(location.search).has('session-preview')) sessionStorage.setItem('gg-session-preview', '1');
    return sessionStorage.getItem('gg-session-preview') === '1';
  } catch { return false; }
}

/**
 * Starts the timer. render(state) is called every second with
 * { phase: 'before'|'live'|'after', clock: '2:15:05', active: { minutes, remaining, done, percent } | null }.
 * Returns stop().
 */
export function startSessionTimer(render) {
  const preview = previewOn();
  const win = sessionWindow(Date.now(), REMOTE_SESSION, preview);
  let active = null;
  let fetchTimer = null;
  let soon = null;

  async function fetchActive() {
    try {
      const r = await api.sessionActivity(new Date(win.from).toISOString(), new Date(win.to).toISOString());
      active = activeSummary(r.active_periods);
    } catch { /* offline or signed out: keep the last value */ }
  }
  const tick = () => {
    const now = Date.now();
    const phase = sessionPhase(now, win);
    render({ phase, clock: formatClock(phase === 'before' ? win.from - now : win.to - now), active });
  };
  // A saved change usually adds activity: fetch again a few seconds after the sync reports "saved".
  const onAccount = (e) => {
    if (e.detail?.state !== 'saved') return;
    clearTimeout(soon);
    soon = setTimeout(() => fetchActive().then(tick), 4000);
  };

  if (sessionPhase(Date.now(), win) !== 'before') fetchActive().then(tick);
  fetchTimer = setInterval(() => { if (sessionPhase(Date.now(), win) === 'live') fetchActive(); }, FETCH_EVERY_MS);
  const clock = setInterval(tick, 1000);
  window.addEventListener('gg:account', onAccount);
  tick();
  return () => { clearInterval(clock); clearInterval(fetchTimer); clearTimeout(soon); window.removeEventListener('gg:account', onAccount); };
}

export const isSessionLiveNow = () => sessionPhase(Date.now(), sessionWindow(Date.now(), REMOTE_SESSION, previewOn())) === 'live';

const activeText = (a) => (a ? (a.done ? `✓ ${a.minutes} min — 2 hours reached` : `${a.minutes} / ${a.target} min · ${a.remaining} to go`) : '…');

/** The bar inside the header on every page (only while the session is live). */
export function mountSessionBar(href) {
  const header = document.querySelector('[data-header]');
  if (!header || header.querySelector('.session-bar')) return;
  const bar = document.createElement('a');
  bar.className = 'session-bar';
  bar.href = href;
  header.append(bar);
  const stop = startSessionTimer(({ phase, clock, active }) => {
    if (phase !== 'live') { bar.remove(); stop?.(); return; }
    bar.innerHTML = `<span class="session-bar-in container"><span class="session-bar-tag">Remote session</span>
      <span>⏱ <strong>${clock}</strong> left</span>
      <span class="session-bar-active">Active <strong>${activeText(active)}</strong></span>
      <span class="session-bar-track" aria-hidden="true"><span style="width:${active?.percent ?? 0}%"></span></span></span>`;
    bar.setAttribute('aria-label', `Remote session: ${clock} left. Active ${activeText(active)}.`);
  });
}

/** The timer block at the top of the Remote session card (all phases). */
export function timerHtml({ phase, clock, active }) {
  if (phase === 'before') return `<p class="session-timer"><span>⏳ Starts in <strong>${clock}</strong></span></p>`;
  if (phase === 'after') return `<p class="session-timer"><span>Session ended · your active time: <strong>${active ? `${active.minutes} min` : '…'}</strong></span></p>`;
  return `
    <div class="session-timer" data-live>
      <p><span>⏱ <strong>${clock}</strong> left (ends 3:00 PM)</span> · <span>Active <strong>${activeText(active)}</strong></span></p>
      <span class="session-bar-track" aria-hidden="true"><span style="width:${active?.percent ?? 0}%"></span></span>
      <p class="muted acct-small">Active time counts 5-minute periods in which your progress changes on this site — lessons, missions, quizzes. An open page with no activity does not count. Your GitHub work (Part B) shows separately as commits.</p>
    </div>`;
}
