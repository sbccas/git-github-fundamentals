/**
 * Build-time Markdown for lessons, slides and the handbook (runs in Node from vite.config.js).
 *
 * Extras on top of GitHub-flavoured Markdown:
 *   ## Heading {#id}           heading with a fixed id (otherwise one is generated)
 *   :::tip Title … :::         callout box: tip | warning | note | analogy | story | insight | neon | reveal | example
 *   :::tip+ Title … :::        same, revealed step by step on slides (fragment)
 *   :::diagram name            inserts content/diagrams/<name>.html
 *   ```terminal                Git Bash block: "$ " lines are commands, others are output; adds Copy + Try it
 *   ```terminal notry          same without the Try it button
 *   ==text==                   neon highlight
 *   text {+}                   (slides) reveal this paragraph / list item step by step
 */
import { Marked } from 'marked';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const slugify = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const CALLOUT_ICONS = {
  tip: '💡', warning: '⚠️', note: '📝', analogy: '🧠', story: '🍽️', insight: '✨', example: '🧪', neon: '', reveal: '❓',
};

export function createMarkdown({ root, base }) {
  let headings = [];

  const marked = new Marked({ gfm: true });
  marked.use({
    extensions: [{
      name: 'mark',
      level: 'inline',
      start(src) { return src.indexOf('=='); },
      tokenizer(src) {
        const m = /^==([^=\n]+?)==/.exec(src);
        if (m) return { type: 'mark', raw: m[0], tokens: this.lexer.inlineTokens(m[1]) };
        return undefined;
      },
      renderer(t) { return `<mark class="hl">${this.parser.parseInline(t.tokens)}</mark>`; },
    }],
    renderer: {
      heading({ tokens, depth }) {
        let html = this.parser.parseInline(tokens);
        let id;
        const m = /\s*\{#([\w-]+)\}\s*$/.exec(html);
        if (m) { id = m[1]; html = html.slice(0, m.index); } else id = slugify(html);
        headings.push({ depth, id, html });
        return `<h${depth} id="${id}">${html}</h${depth}>\n`;
      },
      code({ text, lang }) {
        const [kind, ...flags] = (lang ?? '').trim().split(/\s+/);
        if (kind === 'terminal') return terminalBlock(text, { base, noTry: flags.includes('notry') });
        if (kind === 'output') return `<pre class="out-block">${esc(text)}</pre>\n`;
        return `<div class="code-block"><button class="copy-btn" type="button" data-copy="${esc(text)}" aria-label="Copy code">Copy</button><pre><code${kind ? ` class="lang-${esc(kind)}"` : ''}>${esc(text)}</code></pre></div>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        let h = href;
        if (h.startsWith('/')) h = base + h.slice(1);
        const ext = /^https?:/.test(h);
        return `<a href="${esc(h)}"${title ? ` title="${esc(title)}"` : ''}${ext ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
      },
      table(token) {
        // Wrap tables so they scroll sideways on phones.
        const header = token.header.map((c) => `<th${c.align ? ` style="text-align:${c.align}"` : ''}>${this.parser.parseInline(c.tokens)}</th>`).join('');
        const rows = token.rows.map((r) => `<tr>${r.map((c) => `<td${c.align ? ` style="text-align:${c.align}"` : ''}>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`).join('');
        return `<div class="table-wrap"><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
      },
    },
  });

  function preprocess(src) {
    // :::diagram name
    src = src.replace(/^:::diagram[ \t]+([\w-]+)[ \t]*$/gm, (_, name) => {
      const p = join(root, 'content', 'diagrams', `${name}.html`);
      if (!existsSync(p)) return `<p class="build-error">Missing diagram: ${esc(name)}</p>`;
      return `<figure class="diagram diagram-${name}">${readFileSync(p, 'utf8').trim()}</figure>`;
    });
    // :::type Title … :::   (containers do not nest)
    src = src.replace(/^:::(\w+)(\+)?[ \t]*(.*)\n([\s\S]*?)^:::[ \t]*$/gm, (_, type, frag, title, body) => {
      const icon = CALLOUT_ICONS[type] ?? '';
      const head = title.trim() ? `<p class="callout-title">${icon ? `<span class="callout-icon" aria-hidden="true">${icon}</span>` : ''}${marked.parseInline(title.trim())}</p>` : '';
      return `<div class="callout callout-${type}${frag ? ' fragment' : ''}">${head}\n\n${body.trim()}\n\n</div>`;
    });
    return src;
  }

  /** Mark paragraphs / list items ending in {+} as fragments. */
  function fragments(html) {
    return html
      .replace(/<li>([\s\S]*?)\s*\{\+\}(\s*(?:<ul>|<ol>|<\/li>))/g, '<li class="fragment">$1$2')
      .replace(/<p>([\s\S]*?)\s*\{\+\}<\/p>/g, '<p class="fragment">$1</p>')
      .replace(/<tr>([\s\S]*?)\s*\{\+\}<\/td><\/tr>/g, '<tr class="fragment">$1</td></tr>');
  }

  return {
    /** Render Markdown text → { html, headings } */
    render(src) {
      headings = [];
      const html = fragments(marked.parse(preprocess(src)));
      return { html, headings: [...headings] };
    },
    renderFile(relPath) {
      return this.render(readFileSync(join(root, relPath), 'utf8'));
    },
  };
}

function terminalBlock(text, { base, noTry }) {
  const lines = text.replace(/\n$/, '').split('\n');
  const cmds = lines.filter((l) => l.startsWith('$ ')).map((l) => l.slice(2));
  const body = lines.map((l) => {
    if (l.startsWith('$ ')) return `<span class="tb-line tb-cmd"><span class="tb-prompt">$</span> ${esc(l.slice(2))}</span>`;
    if (l.startsWith('# ')) return `<span class="tb-line tb-comment">${esc(l)}</span>`;
    if (/^\+(?!\+\+)/.test(l)) return `<span class="tb-line tb-add">${esc(l)}</span>`;
    if (/^-(?!--)/.test(l)) return `<span class="tb-line tb-del">${esc(l)}</span>`;
    if (/^@@/.test(l)) return `<span class="tb-line tb-hunk">${esc(l)}</span>`;
    return `<span class="tb-line tb-out">${esc(l) || ' '}</span>`;
  }).join('');
  const tryHref = `${base}playground/?cmd=${encodeURIComponent(cmds.join(' && '))}`;
  return `<div class="term-block">
  <div class="term-block-bar"><span class="term-dots" aria-hidden="true"><span></span><span></span><span></span></span><span class="term-block-title">Git Bash</span>
    <span class="term-block-actions">${cmds.length ? `<button class="copy-btn" type="button" data-copy="${esc(cmds.join('\n'))}" aria-label="Copy commands">Copy</button>` : ''}${cmds.length && !noTry ? `<a class="try-btn" href="${esc(tryHref)}" target="_blank" rel="noopener">▶ Try it</a>` : ''}</span></div>
  <pre class="term-block-body">${body}</pre>
</div>\n`;
}

/* ---------------- Slides ---------------- */

/** Split a deck file into front matter + slides, ignoring --- inside code fences. */
function splitDeck(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const meta = {};
  let i = 0;
  if (lines[0] === '---') {
    for (i = 1; i < lines.length && lines[i] !== '---'; i++) {
      const m = /^(\w+):\s*(.*)$/.exec(lines[i]);
      if (m) meta[m[1]] = m[2].trim();
    }
    i++;
  }
  const slides = [];
  let cur = [];
  let fence = false;
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (/^```/.test(l)) fence = !fence;
    if (!fence && l === '---') { slides.push(cur.join('\n')); cur = []; } else cur.push(l);
  }
  slides.push(cur.join('\n'));
  return { meta, slides: slides.filter((s) => s.trim()) };
}

export function renderDeck(md, relPath, root) {
  const { meta, slides } = splitDeck(readFileSync(join(root, relPath), 'utf8'));
  const unit = meta.unit ?? '1';
  const sections = slides.map((raw, index) => {
    let body = raw;
    let type = 'content';
    let extra = [];
    const head = /^\s*<!--\s*slide:\s*([^>]*?)\s*-->\s*\n?/.exec(body);
    if (head) {
      [type, ...extra] = head[1].split(/\s+/);
      body = body.slice(head[0].length);
    }
    let notes = '';
    const n = /^(?:Notes|Note):\s*$/m.exec(body);
    if (n) { notes = body.slice(n.index + n[0].length).trim(); body = body.slice(0, n.index); }
    let { html } = md.render(body);
    if (extra.includes('reveal')) html = html.replace(/<li>/g, '<li class="fragment">');
    const timer = type === 'activity' ? Number(extra.find((x) => /^\d+$/.test(x)) ?? 10) : null;
    const notesHtml = notes ? md.render(notes).html : '';
    return `<section class="slide slide-${type}${extra.filter((x) => !/^\d+$/.test(x)).map((x) => ` is-${x}`).join('')}" data-index="${index}"${timer ? ` data-timer="${timer}"` : ''} aria-roledescription="slide" aria-label="Slide ${index + 1}">
  <div class="slide-inner">${html}</div>
  ${notesHtml ? `<aside class="slide-notes">${notesHtml}</aside>` : ''}
</section>`;
  });
  return `<div class="deck" data-deck="${esc(meta.session ?? '')}" data-unit="${esc(unit)}" data-title="${esc(meta.title ?? '')}" data-duration="${esc(meta.duration ?? '120')}" style="--u: var(--u${esc(unit)})">
${sections.join('\n')}
</div>`;
}
