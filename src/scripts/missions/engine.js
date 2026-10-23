/**
 * Mission engine: builds the helper context missions use for setup and goal checks,
 * and evaluates goals after every command.
 */
import { findRepo, Repo, readGlobalConfig } from '../terminal/git/repo.js';
import { walkCommits } from '../terminal/git/cmd-history.js';
import { createRepo, teammatePush, remoteRefs } from '../terminal/git/github.js';
import { saveSettings } from '../terminal/sandbox.js';
import { read, write } from '../lib/storage.js';
import { join } from '../terminal/path.js';

export const missionSandbox = (id) => `mission-${id.toLowerCase()}`;
const stateKey = (id) => `mission-state-${id}`;

export function loadMissionState(id) { return read(stateKey(id), { setupDone: false }); }
export function saveMissionState(id, s) { write(stateKey(id), s); }

/** Individual commands the student typed (lines split on && and ;). */
function typedCommands(sh) {
  return sh.history.flatMap((line) => line.split(/&&|;/).map((s) => s.trim()).filter(Boolean));
}

export function createContext(wb, mission) {
  const sh = () => wb.shell;
  const abs = (p) => join(sh().home, p);
  let globalEntries = [];
  const state = loadMissionState(mission.id);

  const ctx = {
    get home() { return sh().home; },
    get cwd() { return sh().cwd; },
    state,
    async refresh() { globalEntries = await readGlobalConfig(sh()); },
    globalConfig(key) { return globalEntries.filter((e) => e.key === key.toLowerCase()).pop()?.value; },
    run: (cmd) => wb.runSilent(cmd),
    ran(re, after = null) {
      const cmds = typedCommands(sh());
      let from = 0;
      if (after) {
        from = cmds.findIndex((c) => after.test(c));
        if (from === -1) return false;
        from += 1;
      }
      return cmds.slice(from).some((c) => re.test(c));
    },
    async exists(p) { return sh().h.exists(abs(p)); },
    async isDir(p) { return sh().h.isDir(abs(p)); },
    async read(p) { return (await sh().h.isFile(abs(p))) ? sh().h.readText(abs(p)) : null; },
    async repo(p) {
      const dir = abs(p);
      return (await sh().h.isDir(join(dir, '.git'))) ? new Repo(sh(), dir) : null;
    },
    async files(repo) { return repo.treeMap(await repo.headOid()); },
    async blob(repo, entry) { return entry ? repo.blobText(entry.oid) : null; },
    async inAnyCommit(repo, path) {
      const starts = [];
      for (const b of await repo.branches()) starts.push(await repo.refOid(`refs/heads/${b}`));
      for (const { oid } of await walkCommits(repo, starts.filter(Boolean))) {
        if ((await repo.treeMap(oid)).has(path)) return true;
      }
      return false;
    },
    github: {
      create: (owner, name, opts = {}) => createRepo(sh(), { owner, name, ...opts }),
      teammatePush: (owner, name, edit) => teammatePush(sh(), { owner, name }, null, edit),
      refs: (owner, name) => remoteRefs(sh(), { owner, name }),
    },
    setGithubUser(u) { wb.settings.githubUser = u; saveSettings(wb.sandboxId, wb.settings); },
    findRepo: () => findRepo(sh()),
  };
  return ctx;
}

/** Evaluate all goals. Returns [{ done, optional }] in goal order. */
export async function evaluate(mission, ctx) {
  await ctx.refresh();
  const results = [];
  for (const g of mission.goals) {
    let done = false;
    try { done = !!(await g.check(ctx)); } catch (e) { console.warn(`Goal check failed (${mission.id})`, e); }
    results.push({ done, optional: !!g.optional });
  }
  return results;
}
