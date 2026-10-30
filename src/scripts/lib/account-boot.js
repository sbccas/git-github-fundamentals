/**
 * Account entry on every page — loaded by main.js only when accounts are compiled in (Milestone 10 plan §4.1).
 * Signed out: an account button in the header (and a line on the Git Passport); no Supabase code, no network.
 * Signed in: loads lib/account.js and keeps progress in sync in the background.
 */
import '../../styles/account.css';
import { pageUrl } from '../data/site.js';
import { AUTH_STORAGE_KEY } from '../data/supabase.js';
import { read } from './storage.js';

export const STATUS_TEXT = {
  'signed-out': 'Sign in to save your progress online',
  checking: 'Checking your account…',
  saved: 'Progress saved online',
  saving: 'Saving your progress online…',
  pending: 'Progress waiting to be saved online',
  offline: 'Offline — progress will be saved online later',
  error: 'Sync problem — will try again',
  invalid: 'Sync problem — open your account page',
  auth: 'Please sign in again to keep saving online',
  consent: 'Please review the updated consent',
  setup: 'Finish setting up your account',
};
const TONE = {
  'signed-out': 'none', checking: 'busy', saved: 'ok', saving: 'busy', pending: 'busy',
  offline: 'warn', error: 'warn', invalid: 'bad', auth: 'bad', consent: 'bad', setup: 'bad',
};
const PERSON = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';

let headerBtn = null;
let passportLine = null;

function mount() {
  const actions = document.querySelector('.header-actions');
  if (actions && !headerBtn) {
    headerBtn = document.createElement('a');
    headerBtn.className = 'icon-btn acct-btn';
    headerBtn.href = pageUrl('account/');
    headerBtn.innerHTML = `${PERSON}<span class="acct-dot" aria-hidden="true"></span>`;
    if (document.body.dataset.page === 'account') headerBtn.setAttribute('aria-current', 'page');
    actions.prepend(headerBtn);
  }
  // Narrow phones have no room in the header: the mobile menu gets an Account tile instead (account.css).
  const grid = document.querySelector('.mobile-grid');
  if (grid && !grid.querySelector('.acct-tile')) {
    const tile = document.createElement('a');
    tile.className = 'mobile-tile acct-tile';
    tile.href = pageUrl('account/');
    tile.textContent = 'Account';
    if (document.body.dataset.page === 'account') tile.setAttribute('aria-current', 'page');
    grid.prepend(tile);
  }
  const cover = document.body.dataset.page === 'passport' && document.querySelector('.pp-cover-text');
  if (cover && !passportLine) {
    passportLine = document.createElement('p');
    passportLine.className = 'acct-line';
    passportLine.innerHTML = '<span class="acct-dot" aria-hidden="true"></span><a></a>';
    passportLine.querySelector('a').href = pageUrl('account/');
    cover.append(passportLine);
  }
}

/**
 * "Faculty dashboard" in the More menu and the phone menu — only for an account remembered as faculty
 * (M12-D10). The dashboard itself checks the faculty list on every visit, so this link is a shortcut, not access.
 */
function facultyLinks() {
  const faculty = !!read('account', null)?.faculty && storedSession();
  const here = document.body.dataset.page === 'dashboard';
  const place = (container, make) => {
    if (!container) return;
    const existing = container.querySelector('.acct-faculty-link');
    if (!faculty) { existing?.remove(); return; }
    if (existing) return;
    const a = make();
    a.classList.add('acct-faculty-link');
    a.href = pageUrl('teach/dashboard/');
    if (here) a.setAttribute('aria-current', 'page');
    container.prepend(a);
  };
  place(document.getElementById('menu-more'), () => Object.assign(document.createElement('a'), {
    className: 'nav-menu-link',
    innerHTML: '<span><strong>Faculty dashboard</strong> Batches &amp; student progress</span>',
  }));
  place(document.querySelector('.mobile-grid'), () => Object.assign(document.createElement('a'), {
    className: 'mobile-tile', textContent: 'Faculty dashboard',
  }));
}

/** Shows the account / sync state in the header button and on the Git Passport. */
export function showStatus(state) {
  const text = STATUS_TEXT[state] ?? STATUS_TEXT.error;
  const name = state === 'signed-out' ? '' : read('account', null)?.name ?? '';
  const label = `Account${name ? ` (${name})` : ''}: ${text}`;
  for (const el of [headerBtn, passportLine]) if (el) el.dataset.tone = TONE[state] ?? 'warn';
  if (headerBtn) { headerBtn.setAttribute('aria-label', label); headerBtn.title = label; }
  if (passportLine) passportLine.querySelector('a').textContent = state === 'signed-out' ? `${text} →` : `${name ? `${name} · ` : ''}${text}`;
  window.dispatchEvent(new CustomEvent('gg:account', { detail: { state } }));
}

function storedSession() {
  try { return !!localStorage.getItem(AUTH_STORAGE_KEY); } catch { return false; }
}
const hasSession = storedSession();

mount();
facultyLinks();
window.addEventListener('gg:account-info', facultyLinks);
if (!hasSession) {
  showStatus('signed-out');
} else if (document.body.dataset.page !== 'account') {
  showStatus('checking');
  import('./account.js')
    .then(async (m) => {
      const sync = await m.startBackgroundSync(showStatus);
      // Remote session timer bar (students only, only while the session runs).
      if (sync && !read('account', null)?.faculty) {
        const t = await import('./session-timer.js');
        if (t.isSessionLiveNow()) t.mountSessionBar(`${pageUrl('account/')}#session`);
      }
    })
    .catch(() => showStatus('error'));
}
