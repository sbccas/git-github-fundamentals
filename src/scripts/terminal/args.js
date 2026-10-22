/**
 * Minimal getopt for Git-style options.
 * spec: { bool: { a: 'all', ... }, value: { m: 'message', ... }, multi: ['message'] }
 *  - short flags can be combined: -am "msg"
 *  - values: -m msg, -mmsg, --message msg, --message=msg
 *  - everything after `--` goes to `paths`
 */
export class ArgError extends Error {}

export function parseArgs(argv, spec = {}) {
  const bool = spec.bool ?? {};
  const value = spec.value ?? {};
  const multi = new Set(spec.multi ?? []);
  const longBool = new Set(Object.values(bool).concat(spec.longBool ?? []));
  const longValue = new Set(Object.values(value).concat(spec.longValue ?? []));
  const flags = {};
  const values = {};
  const positional = [];
  const paths = [];
  let afterDashes = false;

  const setValue = (name, v) => {
    if (multi.has(name)) (values[name] ??= []).push(v);
    else values[name] = v;
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (afterDashes) { paths.push(a); continue; }
    if (a === '--') { afterDashes = true; continue; }
    if (a.startsWith('--') && a.length > 2) {
      const eq = a.indexOf('=');
      const name = eq === -1 ? a.slice(2) : a.slice(2, eq);
      if (longValue.has(name)) {
        if (eq !== -1) setValue(name, a.slice(eq + 1));
        else if (i + 1 < argv.length) setValue(name, argv[++i]);
        else throw new ArgError(`option \`${name}' requires a value`);
      } else if (longBool.has(name) && eq === -1) {
        flags[name] = true;
      } else {
        throw new ArgError(`unknown option \`${name}'`);
      }
    } else if (a.startsWith('-') && a.length > 1 && !/^-\d+$/.test(a)) {
      for (let j = 1; j < a.length; j++) {
        const ch = a[j];
        if (value[ch]) {
          const rest = a.slice(j + 1);
          if (rest) setValue(value[ch], rest);
          else if (i + 1 < argv.length) setValue(value[ch], argv[++i]);
          else throw new ArgError(`switch \`${ch}' requires a value`);
          break;
        } else if (bool[ch]) {
          flags[bool[ch]] = true;
        } else {
          throw new ArgError(`unknown switch \`${ch}'`);
        }
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, values, positional, paths };
}
