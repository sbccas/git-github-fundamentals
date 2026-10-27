/**
 * Supabase client and account calls (Milestone 10 plan §4.1, §4.5, §4.9; Milestone 11 plan §4.3).
 * Imported lazily: only on the account page or when a session is already stored, so signed-out visitors never
 * download the Supabase client or make a network call (Phase 2 plan §8).
 */
import { SUPABASE_URL, SUPABASE_KEY, AUTH_STORAGE_KEY } from '../data/supabase.js';
import { BASE } from '../data/site.js';
import { read, write } from './storage.js';
import { createSync, syncMeta, classify } from './sync.js';

/**
 * Session storage for the Supabase client. GitHub's own access token (provider_token) is dropped before saving:
 * the site never uses it, so it is never kept on the device.
 */
const storage = {
  getItem(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem(key, value) {
    try {
      let v = value;
      if (key === AUTH_STORAGE_KEY) {
        const s = JSON.parse(value);
        if (s && typeof s === 'object') { delete s.provider_token; delete s.provider_refresh_token; v = JSON.stringify(s); }
      }
      localStorage.setItem(key, v);
    } catch { /* storage unavailable: the session lasts for this page only */ }
  },
  removeItem(key) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

let clientPromise = null;

/** The one Supabase client for this page. The account page creates it with detectSessionInUrl (OAuth return). */
export function getClient({ detectSessionInUrl = false } = {}) {
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { flowType: 'pkce', storage, storageKey: AUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl },
  }));
  return clientPromise;
}

export const accountUrl = () => new URL(`${BASE}account/`, location.origin).href;

export function hasStoredSession() {
  try { return !!localStorage.getItem(AUTH_STORAGE_KEY); } catch { return false; }
}

class ApiError extends Error {
  constructor(e) {
    super(e?.message || 'The request failed.');
    this.code = e?.code ?? '';
    this.status = e?.status;
  }
}
async function call(promise) {
  const { data, error } = await promise;
  if (error) throw new ApiError(error);
  return data;
}

export async function getSession() {
  const client = await getClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw new ApiError(error);
  return data.session;
}

/** Starts GitHub sign-in (PKCE). Called only after the student agreed on the consent screen. */
export async function signInWithGitHub() {
  const client = await getClient();
  const { error } = await client.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: accountUrl() } });
  if (error) throw new ApiError(error);
}

/** Signs out on this device only; other devices stay signed in. */
export async function signOutHere() {
  const client = await getClient();
  await client.auth.signOut({ scope: 'local' });
  write('account', null);
}

const rpc = async (fn, args) => call((await getClient()).rpc(fn, args));

export const api = {
  status: () => rpc('account_status'),
  acceptConsent: (version, name, programme) =>
    rpc('accept_consent', { p_consent_version: version, p_display_name: name, p_programme: programme }),
  async profile() {
    const client = await getClient();
    return call(client.from('profiles').select('display_name, programme, github_username, consent_version, consent_at').maybeSingle());
  },
  async updateProfile(name, programme) {
    const client = await getClient();
    const session = await getSession();
    return call(client.from('profiles').update({ display_name: name, programme }).eq('id', session.user.id)
      .select('display_name, programme').single());
  },
  async load() {
    const client = await getClient();
    return call(client.from('progress').select('doc, revision').maybeSingle());
  },
  save: (doc, baseRevision) => rpc('save_progress', { p_doc: doc, p_base_revision: baseRevision }),
  exportData: () => rpc('export_my_data'),
  deleteAccount: () => rpc('delete_my_account'),
};

/** Remembers the display name for the header, so pages can show it without a network call. */
export const rememberName = (name) => write('account', name ? { name } : null);
export const rememberedName = () => read('account', null)?.name ?? '';

/**
 * Background sync on ordinary pages (not the account page). Starts only when this device is already linked to the
 * signed-in account and its consent is current; anything else is finished on the account page.
 */
export async function startBackgroundSync(onStatus) {
  let session;
  try { session = await getSession(); } catch { session = null; }
  if (!session) { onStatus('signed-out'); return null; }
  let st;
  try { st = await api.status(); } catch (err) { onStatus(classify(err)); return null; }
  if (!st.has_profile) { onStatus('setup'); return null; }
  if (!st.consent_current) { onStatus('consent'); return null; }
  if (syncMeta()?.account !== session.user.id) { onStatus('setup'); return null; }
  const sync = createSync({ api, uid: session.user.id, onStatus });
  sync.attach();
  await sync.pull();
  return sync;
}
