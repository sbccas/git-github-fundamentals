/**
 * Phase 2 account settings (Milestone 10 plan §4.2, Milestone 11 plan §5).
 * Values come from git-ignored env files (.env.development.local) and are PUBLIC by design: the project URL and the
 * publishable (anon) key. A secret or service-role key must never appear here or anywhere in the site (K1).
 * Accounts are compiled in only when VITE_ACCOUNTS_ENABLED=true, and vite.config.js refuses that for production
 * builds until the college sign-off (G-4).
 */
const env = import.meta.env ?? {};

export const SUPABASE_URL = env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY ?? '';
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
 * (private.consent_versions); the database rejects any other. "draft-1" exists only on the test project.
 */
export const CONSENT = {
  version: 'draft-2',
  draft: true,
  title: 'Save your progress online',
  points: [
    ['What is saved', 'Your GitHub user id and username, the display name and programme you enter, the batch you join with your teacher\'s code, the date you agreed, and your course progress (lessons read, quiz scores, missions, mini-games, badges, XP, self-check result, passport name, last page).'],
    ['The sign-in record', 'When you sign in with GitHub, our database service (Supabase) also keeps a sign-in record: the email address GitHub shares, sign-in dates and security logs. It is created as soon as GitHub sends you back here — even if you stop before saving your profile.'],
    ['Who can see it', 'You, and the course faculty of the batch you join: your display name, GitHub username, programme and progress — never your email address. Faculty cannot change your progress. Other students cannot see it.'],
    ['Where', 'Supabase, on servers in Mumbai, India.'],
    ['How long', 'Until you delete your account. Nothing is deleted automatically.'],
    ['Deleting', '"Delete my account" removes your profile and online progress at once; the college then removes your sign-in record. Supabase\'s security logs and your GitHub authorisation of this app (GitHub → Settings → Applications) are not removed by us.'],
    ['Optional', 'Signing in is optional. Without it everything works as before, saved only on this device.'],
  ],
};
