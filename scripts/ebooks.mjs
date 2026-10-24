/**
 * npm run ebooks — make the course ebook PDFs (PRD P-12, F-19).
 *
 *   1. Build the site and serve it locally.
 *   2. Print /book/student/ and /book/faculty/ with headless Chrome, with PDF bookmarks.
 *   3. Read the bookmarks to find the page of every contents entry; save them in build/book-pages.json.
 *   4. Rebuild and print again until the contents page numbers are stable.
 *   5. Copy the PDFs to public/books/ (committed, so GitHub Pages serves them) and build once more.
 *
 * Checks: every contents line links to the page printed beside it (scripts/check_pdf_links.py).
 * Needs (maintainer machine only): Node 20+, Google Chrome, Python 3 with `pip install pypdfium2`.
 * Chrome is found automatically; set CHROME=/path/to/chrome to override. PYTHON overrides the Python command.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES_JSON = join(ROOT, 'build/book-pages.json');
const PORT = 4179;
const BASE = `http://localhost:${PORT}/git-github-fundamentals/`;
const BOOKS = {
  student: { url: 'book/student/', out: 'git-github-fundamentals-student-edition.pdf' },
  faculty: { url: 'book/faculty/', out: 'git-github-fundamentals-faculty-handbook.pdf' },
};
const PYTHON = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const candidates = {
    win32: ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`],
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  }[process.platform] ?? [];
  const found = candidates.find((p) => p && existsSync(p));
  if (!found) throw new Error('Google Chrome not found. Set CHROME=/path/to/chrome.');
  return found;
}

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: opts.capture ? 'pipe' : 'inherit', shell: process.platform === 'win32' && cmd === 'npx', encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed${r.stderr ? `:\n${r.stderr}` : ''}`);
  return r.stdout;
};
const build = () => run('npx', ['vite', 'build', '--logLevel', 'error']);

async function serve() {
  const child = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, shell: process.platform === 'win32', stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) return child; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  child.kill();
  throw new Error('Preview server did not start');
}

function print(chrome, url, file, profile) {
  rmSync(file, { force: true });
  spawnSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--generate-pdf-document-outline',
    `--user-data-dir=${profile}`, '--virtual-time-budget=15000', `--print-to-pdf=${file}`, url], { stdio: 'ignore' });
  if (!existsSync(file)) throw new Error(`Chrome did not print ${url}`);
  return JSON.parse(run(PYTHON, [join(ROOT, 'scripts/pdf_outline.py'), file], { capture: true }));
}

/** Contents entries (in order) and every heading of the book page, from the built HTML. */
function bookHeadings(kind) {
  const html = readFileSync(join(ROOT, 'dist', BOOKS[kind].url, 'index.html'), 'utf8');
  const main = html.slice(html.indexOf('<main'), html.lastIndexOf('</main>'));
  const text = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
  const headings = [...main.matchAll(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/g)].map((m) => ({ id: /\sid="([^"]+)"/.exec(m[2])?.[1] ?? null, text: text(m[3]) }));
  const toc = [...main.matchAll(/<li class="bk-toc-\d"><a href="#([^"]+)"/g)].map((m) => m[1]);
  return { headings, toc };
}

/** Match bookmarks to headings in document order (same text), giving each contents entry its page. */
function pagesFor(kind, outline) {
  const { headings, toc } = bookHeadings(kind);
  const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const pageOf = {};
  let h = 0;
  for (const item of outline) {
    const t = norm(item.title);
    let k = h;
    while (k < headings.length && norm(headings[k].text) !== t) k++;
    if (k === headings.length) continue; // a bookmark we cannot place (should not happen)
    if (headings[k].id) pageOf[headings[k].id] = item.page;
    h = k + 1;
  }
  // A contents entry can point at a section (e.g. a chapter opener) instead of a heading: use its first heading.
  const result = {};
  for (const id of toc) {
    if (pageOf[id]) { result[id] = pageOf[id]; continue; }
    const html = readFileSync(join(ROOT, 'dist', BOOKS[kind].url, 'index.html'), 'utf8');
    const at = html.indexOf(` id="${id}"`);
    const next = headings.find((x) => x.id && html.indexOf(` id="${x.id}"`) > at);
    if (next && pageOf[next.id]) result[id] = pageOf[next.id];
  }
  const missing = toc.filter((id) => !result[id]);
  if (missing.length) throw new Error(`${kind}: no page found for ${missing.join(', ')}`);
  return result;
}

const chrome = findChrome();
const work = mkdtempSync(join(tmpdir(), 'gg-ebooks-'));
const profile = join(work, 'profile');
let server;
try {
  let pages = existsSync(PAGES_JSON) ? JSON.parse(readFileSync(PAGES_JSON, 'utf8')) : {};
  let pdfs = {};
  for (let pass = 1; pass <= 4; pass++) {
    build();
    server = await serve();
    const next = {};
    for (const kind of Object.keys(BOOKS)) {
      const file = join(work, BOOKS[kind].out);
      const { pages: count, outline } = print(chrome, BASE + BOOKS[kind].url, file, profile);
      next[kind] = pagesFor(kind, outline);
      pdfs[kind] = { file, count };
    }
    server.kill();
    server = null;
    const stable = JSON.stringify(next) === JSON.stringify(pages);
    pages = next;
    writeFileSync(PAGES_JSON, `${JSON.stringify(pages, null, 2)}\n`);
    console.log(`pass ${pass}: ${Object.entries(pdfs).map(([k, v]) => `${k} ${v.count} pages`).join(', ')}${stable ? ' — contents page numbers stable' : ''}`);
    if (stable) break;
    if (pass === 4) throw new Error('Contents page numbers did not settle after 4 passes');
  }
  // Every contents line must be a link to the page printed beside it; the cover must have no page number.
  for (const [kind, { file }] of Object.entries(pdfs)) {
    const html = readFileSync(join(ROOT, 'dist', BOOKS[kind].url, 'index.html'), 'utf8');
    const entries = (html.match(/<li class="bk-toc-\d">/g) ?? []).length;
    const firstChapter = Math.min(...Object.entries(pages[kind]).filter(([id]) => id !== 'about-book').map(([, p]) => p));
    const contentsFrom = pages[kind]['about-book'] + 1;
    const check = JSON.parse(run(PYTHON, [join(ROOT, 'scripts/check_pdf_links.py'), file, String(contentsFrom), String(firstChapter - 1)], { capture: true }));
    if (check.links !== entries || check.checked !== entries || check.mismatches.length) {
      throw new Error(`${kind}: contents check failed — ${entries} entries, ${check.links} links, ${check.checked} checked, mismatches ${JSON.stringify(check.mismatches)}`);
    }
    console.log(`${kind}: ${entries} contents links checked, each goes to its printed page`);
  }
  mkdirSync(join(ROOT, 'public/books'), { recursive: true });
  for (const [kind, { file, count }] of Object.entries(pdfs)) {
    const dest = join(ROOT, 'public/books', BOOKS[kind].out);
    copyFileSync(file, dest);
    console.log(`${kind}: public/books/${BOOKS[kind].out} · ${count} pages · ${(statSync(dest).size / 1048576).toFixed(1)} MB`);
  }
  build();
} finally {
  server?.kill();
  rmSync(work, { recursive: true, force: true });
}
