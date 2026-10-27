/**
 * Post-build check for the live site (Milestone 11 plan §5, SY6): run `npm run build` first, then
 * `npm run check:dist`. Confirms the production build has accounts switched off — no Supabase client code, no
 * /account/ page, no account settings — and that every page under src/ (except account/) was built.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const problems = [];

if (!fs.existsSync(DIST)) {
  console.error('dist/ not found — run npm run build first.');
  process.exit(1);
}

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const rel = (f) => path.relative(DIST, f).replace(/\\/g, '/');

const files = walk(DIST);
const texty = files.filter((f) => /\.(html|js|css|json|webmanifest)$/.test(f));
const markers = [/supabase/i, /__ACCOUNTS__/, /account-boot/, /sb_publishable_/, /VITE_SUPABASE/, /\.supabase\.co/];
for (const f of texty) {
  const text = fs.readFileSync(f, 'utf8');
  for (const m of markers) if (m.test(text)) problems.push(`${rel(f)} contains ${m}`);
}
if (fs.existsSync(path.join(DIST, 'account'))) problems.push('dist/account/ exists');

const srcPages = walk(path.join(ROOT, 'src'))
  .filter((f) => path.basename(f) === 'index.html' && !/[\\/](partials|account)[\\/]/.test(f))
  .map((f) => path.relative(path.join(ROOT, 'src'), f).replace(/\\/g, '/'));
const built = new Set(files.filter((f) => f.endsWith('index.html')).map(rel));
for (const p of srcPages) if (!built.has(p)) problems.push(`page missing from the build: ${p}`);

if (problems.length) {
  console.error(`✗ Production build check failed:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ Production build: accounts off — no Supabase code, no /account/ page; all ${srcPages.length} pages built (${texty.length} files scanned).`);
