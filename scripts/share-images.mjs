/**
 * npm run share-images — make the 1200×630 link-preview images in public/share/ (PRD U-07).
 * Renders build/share-image.html?v=<name> with headless Chrome, then converts each to a JPEG under 300 KB
 * (WhatsApp skips large preview images). Needs: Google Chrome, Python 3 with Pillow (pip install pillow).
 * Set CHROME / PYTHON to override the programs used.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SHARE_IMAGES = ['course', 'student-ebook', 'faculty-ebook', 'passport'];
const PYTHON = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
const chrome = process.env.CHROME ?? [
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium',
].find((p) => existsSync(p));
if (!chrome) throw new Error('Google Chrome not found. Set CHROME=/path/to/chrome.');

const work = mkdtempSync(join(tmpdir(), 'gg-share-'));
const out = join(ROOT, 'public/share');
mkdirSync(out, { recursive: true });
try {
  for (const name of SHARE_IMAGES) {
    const png = join(work, `${name}.png`);
    const url = `${pathToFileURL(join(ROOT, 'build/share-image.html')).href}?v=${name}`;
    spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--user-data-dir=${join(work, 'profile')}`,
      '--virtual-time-budget=5000', '--window-size=1200,630', `--screenshot=${png}`, url], { stdio: 'ignore' });
    if (!existsSync(png)) throw new Error(`Chrome did not render ${name}`);
    const jpg = join(out, `${name}.jpg`);
    const py = spawnSync(PYTHON, ['-c', `
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
assert im.size == (1200, 630), im.size
for q in (86, 80, 72, 64):
    im.save(sys.argv[2], 'JPEG', quality=q, optimize=True, progressive=True)
    import os
    if os.path.getsize(sys.argv[2]) < 300 * 1024: break
`, png, jpg], { encoding: 'utf8' });
    if (py.status !== 0) throw new Error(py.stderr);
    console.log(`public/share/${name}.jpg · ${(statSync(jpg).size / 1024).toFixed(0)} KB`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
