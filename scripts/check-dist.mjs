/**
 * Post-build check for the live site (Milestone 11 plan §5, Milestone 12 plan §6): run `npm run build`, then
 * `npm run check:dist`. Confirms the build matches ACCOUNTS_IN_PRODUCTION in vite.config.js:
 *  - on:  /account/ and /teach/dashboard/ built, the Supabase client present, only the publishable key of the one
 *         project, the approved consent version, and no secret key of any kind;
 *  - off: no Supabase code and no account pages (the Phase 1 site).
 * In both cases every other page under src/ must be built.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const ACCOUNT_PAGES = ['account', 'teach/dashboard'];
const problems = [];

if (!fs.existsSync(DIST)) {
  console.error('dist/ not found — run npm run build first.');
  process.exit(1);
}
const accountsOn = /export const ACCOUNTS_IN_PRODUCTION = true;/.test(fs.readFileSync(path.join(ROOT, 'vite.config.js'), 'utf8'));

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const rel = (f) => path.relative(DIST, f).replace(/\\/g, '/');
const files = walk(DIST);
const texty = files.filter((f) => /\.(html|js|css|json|webmanifest)$/.test(f));
const all = texty.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

// Never, in any build: secret keys, service-role tokens, database URLs with a password.
if (/sb_secret_[A-Za-z0-9_-]{8,}/.test(all)) problems.push('a Supabase secret key (sb_secret_…) is in the build');
if (/postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@/.test(all)) problems.push('a database URL with a password is in the build');
for (const [jwt] of all.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) {
  try { if (JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).role === 'service_role') problems.push('a service-role key is in the build'); } catch { /* not a JWT */ }
}

if (accountsOn) {
  for (const d of ACCOUNT_PAGES) if (!fs.existsSync(path.join(DIST, d, 'index.html'))) problems.push(`dist/${d}/ missing`);
  const keys = new Set(all.match(/sb_publishable_[A-Za-z0-9_-]+/g) ?? []);
  if (keys.size !== 1) problems.push(`expected exactly one publishable key, found ${keys.size}`);
  const urls = new Set(all.match(/https:\/\/[a-z0-9]+\.supabase\.co/g) ?? []);
  if (urls.size !== 1) problems.push(`expected exactly one Supabase project URL, found ${[...urls].join(', ') || 'none'}`);
  if (!/version:\s*"v1"|version:"v1"/.test(all)) problems.push('the approved consent version "v1" is not in the build');
  if (/draft-[0-9]/.test(all)) problems.push('a draft consent version is in the build');
  if (/counter-preview/.test(all)) problems.push('the local counter preview switch is in the build');
  if (/session-preview/.test(all)) problems.push('the local session preview switch is in the build');
  if (!/course_stats/.test(all)) problems.push('the participant counter is missing from the build');
  for (const m of [/\bTest version\b/, /gg-test/, /\btest project\b/i, /Use test accounts/i, /example\.invalid/]) if (m.test(all)) problems.push(`test wording in the build: ${m}`);
} else {
  const markers = [/supabase/i, /__ACCOUNTS__/, /account-boot/, /sb_publishable_/, /\.supabase\.co/, /faculty_batch/];
  for (const f of texty) {
    const text = fs.readFileSync(f, 'utf8');
    for (const m of markers) if (m.test(text)) problems.push(`${rel(f)} contains ${m}`);
  }
  for (const d of ACCOUNT_PAGES) if (fs.existsSync(path.join(DIST, d))) problems.push(`dist/${d}/ exists`);
}

const srcPages = walk(path.join(ROOT, 'src'))
  .map((f) => path.relative(path.join(ROOT, 'src'), f).replace(/\\/g, '/'))
  .filter((p) => p.endsWith('index.html') && !p.startsWith('partials/') && !ACCOUNT_PAGES.some((d) => p.startsWith(`${d}/`)));
const built = new Set(files.filter((f) => f.endsWith('index.html')).map(rel));
for (const p of srcPages) if (!built.has(p)) problems.push(`page missing from the build: ${p}`);

if (problems.length) {
  console.error(`✗ Production build check failed (accounts ${accountsOn ? 'ON' : 'OFF'}):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(accountsOn
  ? `✓ Production build, accounts ON: account page and faculty dashboard built; one project URL and one publishable key; consent v1; no secret keys; all ${srcPages.length} other pages built (${texty.length} files scanned).`
  : `✓ Production build, accounts OFF: no Supabase code, no account pages; all ${srcPages.length} pages built (${texty.length} files scanned).`);
