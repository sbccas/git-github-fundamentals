// isomorphic-git expects a Node-style Buffer global. Import this module before isomorphic-git.
import { Buffer } from 'buffer';

if (!globalThis.Buffer) globalThis.Buffer = Buffer;
