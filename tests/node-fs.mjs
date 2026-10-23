// A disk-backed stand-in for LightningFS so the playground's shell and Git engine run under Node.
// Every method is async: isomorphic-git calls readFile() with no arguments and checks for a
// returned promise to decide whether the fs is promise-based.
import fsNode from 'node:fs';
import pathNode from 'node:path';

export function createNodeFs(root) {
  fsNode.rmSync(root, { recursive: true, force: true });
  fsNode.mkdirSync(root, { recursive: true });
  const P = (p) => pathNode.join(root, p);
  const enc = (o) => (typeof o === 'string' ? { encoding: o } : o?.encoding ? { encoding: o.encoding } : undefined);
  const typed = (s) => { s.type = s.isDirectory() ? 'dir' : 'file'; return s; };
  return {
    promises: {
      readFile: async (p, o) => fsNode.promises.readFile(P(p), enc(o)),
      writeFile: async (p, d, o) => fsNode.promises.writeFile(P(p), d, enc(o)),
      unlink: async (p) => fsNode.promises.unlink(P(p)),
      readdir: async (p) => fsNode.promises.readdir(P(p)),
      mkdir: async (p) => fsNode.promises.mkdir(P(p)),
      rmdir: async (p) => fsNode.promises.rmdir(P(p)),
      stat: async (p) => typed(await fsNode.promises.stat(P(p))),
      lstat: async (p) => typed(await fsNode.promises.lstat(P(p))),
      readlink: async (p) => fsNode.promises.readlink(P(p)),
      symlink: async (t, p) => fsNode.promises.symlink(t, P(p)),
      chmod: async (p, m) => fsNode.promises.chmod(P(p), m),
      rename: async (a, b) => fsNode.promises.rename(P(a), P(b)),
    },
  };
}
