/**
 * Progress sync (Milestone 11 plan §4.3; Phase 2 plan §5.2). Local-first: every change is saved on the device by
 * progress.js as before; this module sends it to save_progress, adopts the merged result and retries on failure.
 * The server API is injected (lib/account.js in the browser, a fake in npm test), so this file never loads Supabase.
 *
 * Device sync state lives in its own key, gg-sync = { account, revision, pending, lastSyncAt, lastError }, so the
 * gg-progress document keeps its exact version 1 format.
 */
import { load, save, mergeProgress, hasProgress, sameProgress, validateProgress } from './progress.js';
import { read, write } from './storage.js';

const KEY = 'sync';
const STASH = 'progress-guest';
export const RETRY_MS = [30e3, 60e3, 120e3, 300e3];
const SEND_DELAY_MS = 1500;

export const syncMeta = () => read(KEY, null);
const setMeta = (patch) => write(KEY, { ...(read(KEY, null) ?? {}), ...patch });

/** Sort a failed request into what the student can do about it. */
export function classify(err) {
  const msg = String(err?.message ?? '');
  const code = String(err?.code ?? '');
  if ((typeof navigator !== 'undefined' && navigator.onLine === false) || /failed to fetch|networkerror|network request|load failed/i.test(msg)) return 'offline';
  if (code === '42501' && /consent/i.test(msg)) return 'consent';
  if (code === 'PGRST301' || code === '42501' || err?.status === 401 || /jwt|token|sign in/i.test(msg)) return 'auth';
  if (code === '22023') return 'invalid';
  return 'error';
}

/**
 * What to do with this device's progress when `uid` signs in (plan §4.3 table):
 *  'synced'        already synced to this account → normal sync
 *  'empty'         nothing recorded here → load the online copy
 *  'guest'         progress made while signed out → ask before adding it
 *  'other-account' progress synced to a different account → ask before adding it
 */
export function deviceSituation(uid) {
  const meta = syncMeta();
  if (meta?.account === uid) return 'synced';
  if (!hasProgress(load())) return 'empty';
  return meta?.account ? 'other-account' : 'guest';
}

/** "Keep separate": set this device's progress aside unchanged; it comes back at sign-out. */
export function stashDevice() {
  if (read(STASH, null)) {
    // One slot only. Progress already synced to another account is safe online, so it can simply be replaced.
    if (syncMeta()?.pending) return false;
  } else {
    write(STASH, { progress: load(), sync: syncMeta() });
  }
  return true;
}
export const hasStash = () => !!read(STASH, null);

/** After account deletion: keep this device's progress as signed-out progress. */
export const forgetDeviceLink = () => write(KEY, null);

/**
 * The student's answer to "Add this device's progress to your account?". addLocal: merge it into the account on
 * the next sync. Otherwise it is set aside (restored at sign-out) and the online copy is loaded. Returns false when
 * it cannot be set aside safely (unsaved progress of another account and the slot already used).
 */
export function linkDevice(uid, { addLocal }) {
  if (!addLocal) {
    if (!stashDevice()) return false;
    save(validateProgress({ version: 1 }));
  }
  write(KEY, { account: uid, revision: null, pending: !!addLocal });
  return true;
}

/** Sign-out clean-up. removeLocal: drop the account's copy from this device (it stays online). */
export function leaveDevice({ removeLocal }) {
  const stash = read(STASH, null);
  if (stash) {
    save(stash.progress);
    write(KEY, stash.sync ?? null);
    write(STASH, null);
    return 'restored';
  }
  if (removeLocal) {
    save(validateProgress({ version: 1 }));
    write(KEY, null);
    return 'removed';
  }
  setMeta({ pending: false }); // kept on this PC, still tagged with the account
  return 'kept';
}

/**
 * createSync({ api, uid, onStatus, timers }) — api.load() → { doc, revision } | null; api.save(doc, revision) →
 * { doc, revision, changed, merged_newer }. Status values: saved · saving · pending · offline · error · auth ·
 * consent · invalid.
 */
export function createSync({ api, uid, onStatus = () => {}, timers = globalThis }) {
  let adopting = false;
  let inFlight = null;
  let again = false;
  let timer = null;
  let attempt = 0;
  let status = 'pending';
  let stopped = false;

  const setStatus = (s) => { status = s; onStatus(s); };
  const adopt = (doc) => { adopting = true; try { save(doc); } finally { adopting = false; } };
  const schedule = (ms) => {
    if (stopped) return;
    timers.clearTimeout(timer);
    timer = timers.setTimeout(() => { push(); }, ms);
  };

  function fail(err) {
    const kind = classify(err);
    setMeta({ lastError: kind });
    setStatus(kind);
    // Retry only what can recover by itself; sign-in, consent and invalid data need the student or a fix.
    if (kind === 'offline' || kind === 'error') schedule(RETRY_MS[Math.min(attempt++, RETRY_MS.length - 1)]);
  }

  /** Send pending changes. "Saved" is reported only after the server confirmed them. */
  function push() {
    if (stopped) return Promise.resolve();
    if (inFlight) { again = true; return inFlight; }
    const meta = syncMeta() ?? {};
    if (!meta.pending) { setStatus('saved'); return Promise.resolve(); }
    setStatus('saving');
    const sent = load();
    inFlight = (async () => {
      try {
        const res = await api.save(sent, meta.revision ?? null);
        attempt = 0;
        const local = load();
        const changedMeanwhile = !sameProgress(local, sent);
        adopt(changedMeanwhile ? mergeProgress(res.doc, local) : res.doc);
        setMeta({ account: uid, revision: res.revision, pending: changedMeanwhile, lastSyncAt: new Date().toISOString(), lastError: null });
        setStatus(changedMeanwhile ? 'pending' : 'saved');
        if (changedMeanwhile) schedule(SEND_DELAY_MS);
      } catch (err) {
        fail(err);
      } finally {
        inFlight = null;
        if (again) { again = false; push(); }
      }
    })();
    return inFlight;
  }

  /** Load the online copy and merge this device's progress into it (only for a device tagged to this account). */
  async function pull() {
    try {
      const row = await api.load();
      const local = load();
      const merged = row ? mergeProgress(row.doc, local) : local;
      adopt(merged);
      const pending = !row || !sameProgress(merged, row.doc) || !!syncMeta()?.pending;
      setMeta({ account: uid, revision: row?.revision ?? null, pending });
      if (pending) return push();
      setMeta({ lastSyncAt: new Date().toISOString(), lastError: null });
      setStatus('saved');
    } catch (err) {
      fail(err);
    }
  }

  function onLocalChange() {
    if (adopting || stopped) return;
    setMeta({ pending: true });
    setStatus('pending');
    schedule(SEND_DELAY_MS);
  }

  /** Browser wiring: progress.js announces every save with gg:progress. */
  function attach(target = globalThis.window) {
    target?.addEventListener?.('gg:progress', onLocalChange);
    target?.addEventListener?.('online', () => push());
  }

  function stop() { stopped = true; timers.clearTimeout(timer); }

  return { pull, push, onLocalChange, attach, stop, status: () => status };
}
