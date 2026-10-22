/**
 * Split a command line into commands joined by && or ;, each with argv and an optional
 * > or >> redirect. Supports single quotes, double quotes and backslash escapes.
 */
export function parseLine(line) {
  const commands = [];
  let argv = [];
  let cur = '';
  let hasToken = false;
  let redirect = null;
  let pendingRedirect = null;
  let joiner = null;

  const pushToken = () => {
    if (!hasToken) return;
    if (pendingRedirect) { redirect = { mode: pendingRedirect, path: cur }; pendingRedirect = null; }
    else argv.push(cur);
    cur = '';
    hasToken = false;
  };
  const pushCommand = (nextJoiner) => {
    pushToken();
    if (pendingRedirect) throw new SyntaxError("syntax error near unexpected token `newline'");
    if (argv.length || redirect) commands.push({ argv, redirect, joiner });
    argv = [];
    redirect = null;
    joiner = nextJoiner;
  };

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "'") {
      const end = line.indexOf("'", i + 1);
      if (end === -1) throw new SyntaxError('unexpected EOF while looking for matching `\'\'');
      cur += line.slice(i + 1, end);
      hasToken = true;
      i = end;
    } else if (ch === '"') {
      let j = i + 1;
      for (; j < line.length && line[j] !== '"'; j++) {
        if (line[j] === '\\' && (line[j + 1] === '"' || line[j + 1] === '\\' || line[j + 1] === '$')) { cur += line[j + 1]; j++; }
        else cur += line[j];
      }
      if (j >= line.length) throw new SyntaxError('unexpected EOF while looking for matching `"\'');
      hasToken = true;
      i = j;
    } else if (ch === '\\' && i + 1 < line.length) {
      cur += line[++i];
      hasToken = true;
    } else if (ch === ' ' || ch === '\t') {
      pushToken();
    } else if (ch === '>') {
      pushToken();
      pendingRedirect = line[i + 1] === '>' ? '>>' : '>';
      if (pendingRedirect === '>>') i++;
    } else if (ch === '&' && line[i + 1] === '&') {
      pushCommand('&&');
      i++;
    } else if (ch === ';') {
      pushCommand(';');
    } else if (ch === '#' && !hasToken && (i === 0 || line[i - 1] === ' ')) {
      break; // comment
    } else {
      cur += ch;
      hasToken = true;
    }
  }
  pushCommand(null);
  return commands;
}

/** Simple glob match for * and ? (no path separators crossed). */
export function globToRegExp(glob) {
  const re = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
  return new RegExp(`^${re}$`);
}

export const hasGlob = (s) => /[*?]/.test(s);
