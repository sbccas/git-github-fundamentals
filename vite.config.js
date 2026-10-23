import { defineConfig } from 'vite';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMarkdown, renderDeck } from './build/markdown.js';

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
      handler(html) {
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
        out = out.replaceAll('{{base}}', base);
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

export default defineConfig({
  root: ROOT,
  base: BASE,
  publicDir: resolve(ROOT, '../public'),
  plugins: [partials()],
  build: {
    outDir: resolve(ROOT, '../dist'),
    emptyOutDir: true,
    rollupOptions: { input: findPages(ROOT) },
  },
  server: { port: 5173, open: false },
  preview: { port: 4173 },
});
