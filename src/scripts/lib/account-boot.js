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

const hasSession = (() => { try { return !!localStorage.getItem(AUTH_STORAGE_KEY); } catch { return false; } })();

mount();
if (!hasSession) {
  showStatus('signed-out');
} else if (document.body.dataset.page !== 'account') {
  showStatus('checking');
  import('./account.js')
    .then((m) => m.startBackgroundSync(showStatus))
    .catch(() => showStatus('error'));
}
