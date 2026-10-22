/** POSIX path helpers for the virtual file system. */

export function normalize(p) {
  const abs = p.startsWith('/');
  const out = [];
  for (const part of p.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') { if (out.length) out.pop(); continue; }
    out.push(part);
  }
  return (abs ? '/' : '') + out.join('/') || (abs ? '/' : '.');
}

export function join(...parts) {
  return normalize(parts.filter(Boolean).join('/'));
}

/** Resolve `p` against `cwd`, expanding a leading ~ to `home`. */
export function resolve(cwd, p, home) {
  if (!p) return cwd;
  if (p === '~') return home;
  if (p.startsWith('~/')) return join(home, p.slice(2));
  if (p.startsWith('/')) return normalize(p);
  return join(cwd, p);
}

export function dirname(p) {
  const n = normalize(p);
  if (n === '/') return '/';
  const i = n.lastIndexOf('/');
  return i <= 0 ? '/' : n.slice(0, i);
}

export function basename(p) {
  const n = normalize(p);
  return n.slice(n.lastIndexOf('/') + 1);
}

/** Path of `p` relative to `base` (both absolute). Returns '' when equal, null when outside. */
export function relative(base, p) {
  const b = normalize(base);
  const n = normalize(p);
  if (n === b) return '';
  const prefix = b === '/' ? '/' : `${b}/`;
  return n.startsWith(prefix) ? n.slice(prefix.length) : null;
}

/** Show a path the way Git Bash does: home becomes ~. */
export function tildify(p, home) {
  if (p === home) return '~';
  if (p.startsWith(`${home}/`)) return `~${p.slice(home.length)}`;
  return p;
}
