/**
 * Course tests (npm test). Runs under Node — no browser needed.
 *
 *  1. Missions: for every mission, run its setup, check no required goal is already ticked
 *     (except `guard` goals such as "main must survive", which start true by design),
 *     play the solution from its last hint, and check every required goal ticks.
 *  2. Git engine smoke test: a typical Unit 2–4 session with expected output fragments.
 *  3. Content: every quiz and the glossary/cheat sheet parse and are well-formed.
 */
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createNodeFs } from './node-fs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gg-tests-'));

const { Shell } = await imp('src/scripts/terminal/shell.js');
const { MISSIONS } = await imp('content/missions/missions.js');
const engine = await imp('src/scripts/missions/engine.js');

let failures = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => { failures++; console.log(`  ✗ ${msg}`); };

async function newShell(name) {
  const fs2 = createNodeFs(path.join(TMP, name));
  const sh = new Shell({ fs: fs2, ui: { openEditor: async ({ content }) => content, clear() {}, resetSandbox() {} } });
  await sh.init();
  await sh.h.writeText('/home/student/.gitconfig', '[init]\n\tdefaultBranch = main\n');
  return sh;
}
const run = async (sh, cmd) => { let out = ''; const code = await sh.run(cmd, { write: (s) => { out += s; } }); return { code, out: strip(out) }; };

/* ---------------- 1. Missions ---------------- */
console.log('\nMissions');
for (const m of MISSIONS) {
  const sh = await newShell(m.id);
  const wb = {
    get shell() { return sh; }, sandboxId: `test-${m.id}`, settings: { githubUser: 'student' },
    runSilent: async (cmd) => (await run(sh, cmd)).out,
  };
  const ctx = engine.createContext(wb, m);
  try {
    await m.setup(ctx);
    sh.cwd = m.start ? `/home/student/${m.start}` : '/home/student';
    const before = await engine.evaluate(m, ctx);
    const pre = before.filter((r, i) => r.done && !m.goals[i].optional && !m.goals[i].guard).length;
    // The solution is the list of <code> commands in the last hint (edits replaced by echo).
    const cmds = [...m.hints[m.hints.length - 1].matchAll(/<code>(.*?)<\/code>/g)]
      .map((x) => x[1].replace(/<[^>]+>/g, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').trim())
      .filter((c) => /^(git|mkdir|cd|echo|cat|edit)/.test(c))
      .map((c) => (c.startsWith('edit menu.txt') ? 'echo "Samosa 15" > menu.txt' : c));
    for (const c of cmds) {
      await run(sh, c);
      sh.history.push(c);
      await engine.evaluate(m, ctx);
    }
    const after = await engine.evaluate(m, ctx);
    const missing = after.map((r, i) => (!r.done && !m.goals[i].optional ? i + 1 : null)).filter(Boolean);
    if (pre) fail(`${m.id} ${m.title}: ${pre} goal(s) ticked before the student did anything`);
    else if (missing.length) fail(`${m.id} ${m.title}: goal(s) ${missing.join(', ')} not met by the hint solution`);
    else ok(`${m.id} ${m.title}`);
  } catch (e) {
    fail(`${m.id} ${m.title}: ${e.stack}`);
  }
}

/* ---------------- 2. Git engine smoke test ---------------- */
console.log('\nGit engine');
{
  const sh = await newShell('engine');
  const expect = async (cmd, fragment) => {
    const { out } = await run(sh, cmd);
    if (fragment instanceof RegExp ? fragment.test(out) : out.includes(fragment)) ok(cmd);
    else fail(`${cmd}\n      expected: ${fragment}\n      got: ${out.split('\n').slice(0, 4).join(' | ')}`);
  };
  await expect('git config --global user.name "Test" && git config --global user.email t@example.com && git config user.name', 'Test');
  await expect('mkdir p && cd p && git init', 'Initialized empty Git repository in /home/student/p/.git/');
  await expect('echo "Samosa 15" > menu.txt && git status', 'Untracked files:');
  await expect('git add menu.txt && git commit -m "Add menu"', /\[main \(root-commit\) [0-9a-f]{7}\] Add menu/);
  await expect('echo "Open: 9 AM" > t.txt && git add . && git commit -qm "Add time" && git switch -c b', "Switched to a new branch 'b'");
  await expect('echo "Open: 8 AM" > t.txt && git commit -qam "Earlier" && git switch main && echo "Open: 10 AM" > t.txt && git commit -qam "Later" && git merge b', 'CONFLICT (content): Merge conflict in t.txt');
  await expect('cat t.txt', '<<<<<<< HEAD');
  await expect('echo "Open: 8 AM" > t.txt && git add t.txt && git commit --no-edit', "Merge branch 'b'");
  await expect('git log --oneline --graph', /\*\s+[0-9a-f]{7} \(HEAD -> main\) Merge branch 'b'/);
  await expect('echo x >> menu.txt && git stash && git stash list', 'stash@{0}: WIP on main');
  await expect('git stash pop', 'Dropped refs/stash@{0}');
  await expect('git commit -qam "More" && git revert HEAD --no-edit', 'Revert "More"');
  await expect('git tag -a v1.0 -m "Release" && git tag', 'v1.0');
  await expect('git reset --hard HEAD~1', 'HEAD is now at');
  await expect('git rebase main', 'not part of this course');
  await expect('gti status', 'command not found');
  await expect('sl', 'did you mean: ls');
  await expect('python app.py', 'This playground understands:');
  await expect('cd ~ && git status', 'In plain English: This folder is not a Git project yet');
  await expect('cd p && git switch nope', 'In plain English: Git cannot find that branch');
}

/* ---------------- 3. Content ---------------- */
console.log('\nContent');
for (const f of fs.readdirSync(path.join(ROOT, 'content/quizzes'))) {
  const quiz = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/quizzes', f), 'utf8'));
  const bad = quiz.questions.filter((q) => {
    if (q.type === 'order') return !Array.isArray(q.items) || q.items.length < 2;
    if (!Array.isArray(q.options)) return true;
    const answers = Array.isArray(q.answer) ? q.answer : [q.answer];
    return !q.explain || answers.some((a) => a < 0 || a >= q.options.length);
  });
  if (bad.length) fail(`${f}: invalid question(s) ${bad.map((q) => q.id).join(', ')}`);
  else ok(`${f} (${quiz.questions.length} questions)`);
}
{
  // The Teach hub shows each session's objectives, read from the faculty guide at build time.
  const guide = fs.readFileSync(path.join(ROOT, 'docs/faculty-guide.md'), 'utf8');
  const missing = [];
  for (let n = 1; n <= 15; n++) {
    const start = guide.indexOf(`### Session ${n} `);
    const next = guide.indexOf('### Session ', start + 1);
    const body = guide.slice(start, next === -1 ? undefined : next);
    if (start === -1 || !/^\*\*Objectives:\*\* \S/m.test(body)) missing.push(n);
  }
  if (missing.length) fail(`faculty-guide.md: session(s) ${missing.join(', ')} have no **Objectives:** line`);
  else ok('faculty-guide.md: objectives for all 15 sessions');
}
for (const f of ['glossary.json', 'cheatsheet.json', 'conflict-game.json']) {
  try { JSON.parse(fs.readFileSync(path.join(ROOT, 'content', f), 'utf8')); ok(f); } catch (e) { fail(`${f}: ${e.message}`); }
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(failures ? `\n${failures} test(s) failed` : '\nAll tests passed');
process.exit(failures ? 1 : 0);
