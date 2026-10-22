/** ANSI colour helpers. Commands write ANSI like real Git; the terminal view turns it into HTML. */
const wrap = (code) => (s) => `\x1b[${code}m${s}\x1b[0m`;

export const red = wrap('31');
export const green = wrap('32');
export const yellow = wrap('33');
export const blue = wrap('34');
export const magenta = wrap('35');
export const cyan = wrap('36');
export const bold = wrap('1');
export const dim = wrap('2');
export const boldGreen = wrap('1;32');
export const boldRed = wrap('1;31');
export const boldCyan = wrap('1;36');
export const boldYellow = wrap('1;33');
export const boldBlue = wrap('1;34');

export const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

const CLASS = {
  1: 'a-b', 2: 'a-d', 31: 'a-red', 32: 'a-green', 33: 'a-yellow', 34: 'a-blue', 35: 'a-magenta', 36: 'a-cyan',
};

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Convert ANSI-coloured text to HTML spans. */
export function toHtml(text) {
  let html = '';
  let open = 0;
  let last = 0;
  const re = /\x1b\[([0-9;]*)m/g;
  let m;
  while ((m = re.exec(text))) {
    html += esc(text.slice(last, m.index));
    last = re.lastIndex;
    const codes = m[1].split(';').filter(Boolean).map(Number);
    if (!codes.length || codes.includes(0)) {
      html += '</span>'.repeat(open);
      open = 0;
      continue;
    }
    const cls = codes.map((c) => CLASS[c]).filter(Boolean).join(' ');
    if (cls) { html += `<span class="${cls}">`; open++; }
  }
  html += esc(text.slice(last)) + '</span>'.repeat(open);
  return html;
}
