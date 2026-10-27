/**
 * Phase 2 account settings (Milestone 10 plan §4.2, Milestone 11 plan §5, Milestone 12 plan §6).
 * The project URL and the publishable key are PUBLIC by design — every visitor's browser receives them — so the live
 * values are kept here (owner approval 27 Oct 2026, go-live point 8). A git-ignored .env.development.local may
 * override them for local work. A secret or service-role key must never appear here or anywhere in the site (K1).
 * Whether accounts are compiled in at all is decided in vite.config.js (__ACCOUNTS__).
 */
const env = import.meta.env ?? {};

/** The one Supabase project, used for testing and for live use (M12-D8). */
const LIVE = {
  url: 'https://mkdvftgovsznnivvuwrn.supabase.co',
  key: 'sb_publishable_pa11gvz9lpo9iazwZyYyhw_8JA9QWyZ',
};

export const SUPABASE_URL = env.VITE_SUPABASE_URL || LIVE.url;
export const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY || LIVE.key;
export const configured = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(SUPABASE_URL) && SUPABASE_KEY.length > 20;

/** localStorage key used by the Supabase client for the session (gg- prefix like every other key). */
export const AUTH_STORAGE_KEY = 'gg-auth';

/** Programme values stored in profiles.programme (same list as the database check). */
export const PROGRAMMES = [
  { value: 'BCA', label: 'BCA' },
  { value: 'BCA-AI', label: 'BCA – AI' },
  { value: 'BSC-DS', label: 'B.Sc. Data Science' },
  { value: 'MSC-IT', label: 'M.Sc. IT' },
];

/**
 * Consent wording shown before sign-in. The version must be the `current` one in the database
 * (private.consent_versions); the database rejects any other. "v1" approved by the owner on 27 Oct 2026.
 */
export const CONSENT = {
  version: 'v1',
  draft: false,
  title: 'Save your progress online',
  lines: [
    'Signing in with GitHub is optional. If you sign in, your name, roll number, programme, batch and course progress are saved online (Supabase, Mumbai) so you can continue on any device; GitHub also shares your email with our sign-in service.',
    'Your course faculty can see your progress, never your email.',
    'You can download or delete your data at any time from your account page.',
  ],
};
