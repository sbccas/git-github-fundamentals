import { defineConfig } from 'vite';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createMarkdown, renderDeck } from './build/markdown.js';
import { renderBook } from './build/book.js';
import { socialMeta } from './build/meta.js';

const PROJECT = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(PROJECT, 'src');
const PARTIALS = join(ROOT, 'partials');
const BASE = '/git-github-fundamentals/';

/** Every index.html under src/ (except partials) becomes a page: src/unit-1/index.html → /unit-1/ */
function findPages(dir, pages = {}) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (['partials', 'scripts', 'styles'].includes(name)) continue;
    if (statSync(full).isDirectory()) findPages(full, pages);
    else if (name === 'index.html') {
      const key = full.slice(ROOT.length + 1).replace(/\\/g, '/').replace(/\/?index\.html$/, '') || 'home';
      pages[key] = full;
    }
  }
  return pages;
}

/**
 * Tiny HTML partials plugin.
 *  <!-- @include header -->  → contents of src/partials/header.html
 *  {{base}}                   → the site base path
 *  data-nav="x"               → gets aria-current="page" when <body data-page="x"> (or data-section="x")
 *  <!-- @md path.md -->        → Markdown file rendered to HTML (path from the project root)
 *  <!-- @toc path.md -->       → table of contents (h2 headings) for that file
 *  <!-- @deck path.md -->      → slide deck rendered from a deck file
 *  <!-- @book student|faculty --> → a whole ebook (build/book.js)
 */
function partials() {
  let base = BASE;
  let md = createMarkdown({ root: PROJECT, base });
  return {
    name: 'sbccas-partials',
    configResolved(config) { base = config.base; md = createMarkdown({ root: PROJECT, base }); },
    configureServer(server) {
      // Lesson/slide/handbook sources live outside src/, so watch them explicitly.
      const dirs = [join(PROJECT, 'content'), join(PROJECT, 'docs')];
      server.watcher.add(dirs);
      server.watcher.on('change', (f) => { if (dirs.some((d) => f.startsWith(d))) server.ws.send({ type: 'full-reload' }); });
    },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(PARTIALS)) server.ws.send({ type: 'full-reload' });
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        let out = html;
        for (let i = 0; i < 3 && out.includes('<!-- @include'); i++) {
          out = out.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (_, name) =>
            readFileSync(join(PARTIALS, `${name}.html`), 'utf8'));
        }
        out = out.replace(/<!--\s*@toc\s+(\S+)\s*-->/g, (_, p) => {
          const { headings } = md.renderFile(p);
          return `<ol class="toc-list">${headings.filter((h) => h.depth === 2).map((h) => `<li><a href="#${h.id}" data-toc="${h.id}">${h.html}</a></li>`).join('')}</ol>`;
        });
        out = out.replace(/<!--\s*@md\s+(\S+)\s*-->/g, (_, p) => md.renderFile(p).html);
        out = out.replace(/<!--\s*@deck\s+(\S+)\s*-->/g, (_, p) => renderDeck(md, p, PROJECT));
        out = out.replace(/<!--\s*@book\s+(student|faculty)\s*-->/g, (_, kind) => renderBook(kind, md, base, PROJECT));
        out = out.replaceAll('{{base}}', base);
        out = socialMeta(out, ctx?.path); // share previews (PRD U-07)
        const page = /<body[^>]*data-page="([^"]+)"/.exec(out)?.[1];
        const section = /<body[^>]*data-section="([^"]+)"/.exec(out)?.[1];
        for (const key of [page, section].filter(Boolean)) {
          out = out.replaceAll(`data-nav="${key}"`, `data-nav="${key}" aria-current="page"`);
        }
        return out;
      },
    },
  };
}

/** Files under public/, as URL paths relative to the base. */
function publicFiles(dir, prefix = '') {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? publicFiles(full, `${prefix}${name}/`) : [`${prefix}${name}`];
  });
}

/**
 * Writes sw.js (from build/sw-template.js) listing every built file, so the whole course works
 * offline after the first visit (PRD U-05). Pages are cached by folder URL: unit-1/index.html → unit-1/.
 */
function serviceWorker() {
  return {
    name: 'sbccas-service-worker',
    apply: 'build',
    writeBundle(options, bundle) {
      const hash = createHash('sha256');
      const files = [];
      for (const [name, item] of Object.entries(bundle).sort(([a], [b]) => a.localeCompare(b))) {
        if (name.endsWith('.map')) continue;
        files.push(name.endsWith('index.html') ? name.replace(/index\.html$/, '') : name);
        hash.update(name).update(item.type === 'chunk' ? item.code : item.source);
      }
      // Ebook PDFs (several MB) and link-preview images are not precached; the worker caches a PDF when it is first downloaded.
      const extra = publicFiles(resolve(PROJECT, 'public')).filter((f) => !f.endsWith('.pdf') && !f.startsWith('share/'));
      for (const f of extra) hash.update(f).update(readFileSync(resolve(PROJECT, 'public', f)));
      const source = readFileSync(resolve(PROJECT, 'build/sw-template.js'), 'utf8')
        .replace('__VERSION__', hash.digest('hex').slice(0, 12))
        .replace('__BASE__', BASE)
        .replace('__PRECACHE__', JSON.stringify([...files, ...extra]));
      writeFileSync(join(options.dir, 'sw.js'), source);
    },
  };
}

/**
 * `import OBJECTIVES from 'virtual:session-objectives'` → { [session]: html } taken from the
 * "**Objectives:**" line of each session plan in docs/faculty-guide.md (Teach hub, PRD F-04),
 * so the guide stays the single source.
 */
function sessionObjectives() {
  const ID = 'virtual:session-objectives';
  const GUIDE = join(PROJECT, 'docs/faculty-guide.md');
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return {
    name: 'sbccas-session-objectives',
    resolveId: (id) => (id === ID ? `\0${ID}` : null),
    load(id) {
      if (id !== `\0${ID}`) return null;
      this.addWatchFile(GUIDE);
      const out = {};
      let session = null;
      for (const line of readFileSync(GUIDE, 'utf8').split(/\r?\n/)) {
        const h = /^### Session (\d+)/.exec(line);
        if (h) session = Number(h[1]);
        const o = /^\*\*Objectives:\*\*\s*(.+)$/.exec(line);
        if (o && session) out[session] = esc(o[1]).replace(/`([^`]+)`/g, '<code>$1</code>');
      }
      return `export default ${JSON.stringify(out)};`;
    },
  };
}

export default defineConfig({
  root: ROOT,
  base: BASE,
  publicDir: resolve(ROOT, '../public'),
  plugins: [partials(), sessionObjectives(), serviceWorker()],
  build: {
    outDir: resolve(ROOT, '../dist'),
    emptyOutDir: true,
    rollupOptions: { input: findPages(ROOT) },
  },
  server: { port: 5173, open: false },
  preview: { port: 4173 },
});
