/**
 * Print one built page to PDF with headless Chrome (same method as the course ebooks, scripts/ebooks.mjs).
 * Usage: npm run build && npm run preview (another terminal), then
 *   node scripts/print-page.mjs remote-session/ public/downloads/remote-session-31-oct-2026.pdf
 * then npm run build again so the PDF is included. Chrome is found automatically; CHROME=/path overrides.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const [page, out] = process.argv.slice(2);
if (!page || !out) {
  console.error('Usage: node scripts/print-page.mjs <page-path> <output.pdf>');
  process.exit(1);
}
const candidates = {
  win32: ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`],
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
}[process.platform] ?? [];
const chrome = process.env.CHROME ?? candidates.find((c) => existsSync(c));
if (!chrome) throw new Error('Google Chrome not found. Set CHROME=/path/to/chrome.');

const file = resolve(out);
mkdirSync(dirname(file), { recursive: true });
rmSync(file, { force: true });
const profile = mkdtempSync(join(tmpdir(), 'ggp-'));
const url = `http://localhost:4173/git-github-fundamentals/${page}`;
spawnSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--generate-pdf-document-outline',
  `--user-data-dir=${profile}`, '--virtual-time-budget=15000', `--print-to-pdf=${file}`, url], { stdio: 'ignore' });
rmSync(profile, { recursive: true, force: true });
if (!existsSync(file)) throw new Error(`Chrome did not print ${url}`);
console.log(`✓ ${url} → ${out}`);
