/** Read/write Git config files (INI with [section] and [section "sub"]). */

export function parseIni(text) {
  const entries = []; // [{ key: 'user.name', value }]
  let section = '';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sec = /^\[([^\]\s"]+)(?:\s+"([^"]*)")?\]$/.exec(line);
    if (sec) {
      section = sec[2] !== undefined ? `${sec[1].toLowerCase()}.${sec[2]}` : sec[1].toLowerCase();
      continue;
    }
    const kv = /^([A-Za-z][\w-]*)\s*(?:=\s*(.*))?$/.exec(line);
    if (kv && section) {
      let value = kv[2] ?? 'true';
      if (/^".*"$/.test(value)) value = value.slice(1, -1);
      entries.push({ key: `${section}.${kv[1].toLowerCase()}`, value });
    }
  }
  return entries;
}

function splitKey(key) {
  const first = key.indexOf('.');
  const last = key.lastIndexOf('.');
  if (first === -1) return null;
  const section = key.slice(0, first).toLowerCase();
  const name = key.slice(last + 1).toLowerCase();
  const sub = first === last ? null : key.slice(first + 1, last);
  return { section, sub, name };
}

export function serializeIni(entries) {
  const groups = new Map();
  for (const { key, value } of entries) {
    const k = splitKey(key);
    const head = k.sub !== null ? `[${k.section} "${k.sub}"]` : `[${k.section}]`;
    if (!groups.has(head)) groups.set(head, []);
    const v = /[\s#;"]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
    groups.get(head).push(`\t${k.name} = ${v}`);
  }
  return [...groups].map(([head, lines]) => `${head}\n${lines.join('\n')}`).join('\n') + '\n';
}

export const normalizeKey = (key) => {
  const k = splitKey(key);
  if (!k) return null;
  return k.sub !== null ? `${k.section}.${k.sub}.${k.name}` : `${k.section}.${k.name}`;
};
