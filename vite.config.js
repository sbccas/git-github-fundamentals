import { defineConfig } from 'vite';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), 'src');
const PARTIALS = join(ROOT, 'partials');
const BASE = '/git-github-fundamentals/';

/** Every index.html under src/ (except partials) becomes a page: src/unit-1/index.html → /unit-1/ */
function findPages(dir, pages = {}) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name === 'partials' || name === 'scripts' || name === 'styles') continue;
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
 */
function partials() {
  let base = BASE;
  return {
    name: 'sbccas-partials',
    configResolved(config) { base = config.base; },
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
