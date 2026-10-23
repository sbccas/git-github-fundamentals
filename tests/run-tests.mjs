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

/* ---------------- 4. Git Passport and progress import (Milestone 7) ---------------- */
console.log('\nGit Passport');
{
  // Browser stand-ins: progress.js saves to localStorage and announces changes on window.
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  globalThis.window = new EventTarget();
  const P = await imp('src/scripts/lib/progress.js');
  const PP = await imp('src/scripts/lib/passport.js');
  const { UNITS } = await imp('src/scripts/data/site.js');

  const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x));
  const check = (cond, msg) => (cond ? ok(msg) : fail(msg));
  const at = '2026-10-23T10:00:00.000Z';
  const fresh = () => { store.clear(); return P.load(); };
  const withXp = (d) => { d.xp = P.deriveXp(d); return d; };
  const unit = (n) => UNITS[n - 1];

  // 1. New student
  {
    const d = fresh();
    const before = canon(d);
    const s = PP.passportSummary(d, 15);
    const next = PP.nextActivity(d);
    check(s.isNew && s.xp === 0 && s.level === 1 && s.xpToNext === 250 && s.overall === 0, 'new student: empty passport, 0 XP, level 1, 250 XP to level 2');
    check(s.badgesEarned === 0 && s.badges.length === 9 && s.badges.every((b) => !b.earned), 'new student: all 9 badges locked');
    check(next.rule === 'start' && next.unit === 1 && next.title.startsWith('Start Unit 1'), 'new student: next step is "Start Unit 1"');
    check(canon(d) === before && !store.size, 'reading the passport changes nothing and saves nothing');
  }

  // 2–5. Partial progress across units
  const partial = () => {
    const d = fresh();
    d.units['1'] = { sections: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'], total: 9, quiz: { best: 80, last: 80, passed: true }, complete: false };
    d.units['2'] = { sections: ['a', 'b', 'c'], total: 12, quiz: null, complete: false };
    for (const m of ['M-01', 'M-02', 'M-03']) d.missions[m] = { done: true, at };
    d.badges = { 'unit-1': at, 'first-commit': at };
    return withXp(d);
  };
  {
    const d = partial();
    const s = PP.passportSummary(d, 15);
    const u1 = s.units[0]; const u2 = s.units[1]; const u5 = s.units[4];
    check(u1.percent === 100 && u2.percent === 23 && s.overall === 25, 'partial: unit percentages match the home-page rings; overall 25%');
    check(u1.badgeEarned === at && !u1.missing.length, 'partial: Unit 1 badge earned, nothing missing');
    check(!u2.badgeEarned && u2.missing.join(' | ') === 'Pass the Unit 2 quiz | Finish M-04, M-05, M-06, M-07', 'partial: Unit 2 locked badge says exactly what is missing');
    check(u5.missionsTotal === 0 && u5.missing.join() === 'Pass the Unit 5 quiz', 'Unit 5: no browser missions; badge needs the quiz (rule unchanged)');
    check(s.missionsDone === 3 && s.quizzesPassed === 1 && u2.missionsDone === 1 && u2.missionsTotal === 5, 'mission and quiz counts');
    check(s.badgesEarned === 2 && s.badges.find((b) => b.id === 'conflict-crusher').earned === null, 'earned vs locked badges');
    check(d.xp === 325 && s.level === 2 && s.levelInto === 75 && s.xpToNext === 175, 'XP 325 → level 2, 175 XP to level 3');
    check(P.level(249).level === 1 && P.level(250).level === 2 && P.level(500).level === 3, 'level boundaries every 250 XP');
  }

  // 6. Next activity, in G-05 order
  {
    let d = partial();
    let n = PP.nextActivity(d, (id) => (id === 'M-04' ? 'Staging decisions' : ''));
    check(n.rule === 'mission' && n.href.endsWith('missions/?m=M-04') && n.title === 'Mission M-04 · Staging decisions', 'next: unfinished mission in a started unit');
    for (const m of ['M-04', 'M-05', 'M-06', 'M-07']) d.missions[m] = { done: true, at };
    n = PP.nextActivity(d);
    check(n.rule === 'quiz' && n.unit === 2 && n.href.endsWith('unit-2/#quiz'), 'next: unpassed quiz in a started unit');
    d.units['2'].quiz = { best: 40, last: 40, passed: false };
    check(PP.nextActivity(d).text.includes('40%'), 'next: failed quiz shows the best score');
    d.units['2'].quiz = { best: 90, last: 90, passed: true };
    d.units['1'].quiz = { best: 60, last: 60, passed: true };
    n = PP.nextActivity(d);
    check(n.rule === 'revise' && n.unit === 1, 'next: revise a unit with a best score below 75%');
    d.units['1'].quiz = { best: 85, last: 85, passed: true };
    d.lastVisited = { href: '/git-github-fundamentals/unit-2/', title: 'Unit 2: Getting Started with Git' };
    n = PP.nextActivity(d);
    check(n.rule === 'resume' && n.title === 'Unit 2: Getting Started with Git', 'next: resume the last visited page');
    d.lastVisited = null;
    n = PP.nextActivity(d);
    check(n.rule === 'start' && n.unit === 3, 'next: start the next unstarted unit');
    d = fresh();
    for (const u of UNITS) {
      d.units[String(u.n)] = { sections: ['x'], total: 1, quiz: { best: 90, last: 90, passed: true }, complete: false };
      for (const m of PP.unitMissions(u)) d.missions[m] = { done: true, at };
    }
    check(PP.nextActivity(d).rule === 'self-check', 'next: final self-check when every unit is done');
    d.selfCheck = { best: 88, last: 88, byUnit: {}, at };
    check(PP.nextActivity(d).rule === 'done', 'next: all done');
  }

  // 7. Import validation
  {
    const honest = partial();
    honest.lastVisited = { href: '/git-github-fundamentals/missions/?m=M-04', title: 'Mission M-04: Staging decisions' };
    honest.selfCheck = { best: 70, last: 70, byUnit: { 1: 80, 2: 60, 3: 70, 4: 70, 5: 70 }, at };
    honest.profile = { name: 'Asha Patel' };
    check(canon(P.validateProgress(JSON.parse(JSON.stringify(honest)))) === canon(honest), 'valid export → import round trip is unchanged');

    const rejects = (obj, why) => { try { P.validateProgress(obj); fail(`rejects ${why}`); } catch (e) { check(/not a valid progress export/.test(e.message), `rejects ${why}`); } };
    rejects(null, 'a non-object');
    rejects([1, 2], 'an array');
    rejects({ ...honest, version: 2 }, 'an unsupported version');
    rejects({ ...honest, units: [] }, 'units of the wrong type');
    rejects({ ...honest, units: { 1: { ...honest.units['1'], quiz: { best: 150, last: 150, passed: true } } } }, 'an out-of-range quiz score');
    rejects({ ...honest, missions: { 'M-01': { done: 'yes' } } }, 'a mission with a non-boolean "done"');
    rejects({ ...honest, badges: { 'unit-1': 'yesterday' } }, 'a badge with an invalid date');

    const forged = { ...JSON.parse(JSON.stringify(honest)), xp: 99999 };
    forged.badges = { ...forged.badges, 'unit-3': at, 'course-complete': at, 'conflict-crusher': at, 'time-traveller': at, 'super-hacker': at };
    forged.missions['M-99'] = { done: true, at };
    forged.games = { conflict: at, 'free-xp': at };
    forged.lastVisited = { href: 'javascript:alert(1)', title: 'x' };
    forged.profile = { name: '<img src=x onerror=alert(1)>  Ravi ' };
    const v = P.validateProgress(forged);
    check(!v.badges['super-hacker'] && !v.missions['M-99'] && !v.games['free-xp'], 'drops unknown badge, mission and game IDs');
    check(!v.badges['unit-3'] && !v.badges['course-complete'] && !v.badges['conflict-crusher'], 'removes badges the recorded work does not justify');
    check(v.badges['unit-1'] && v.badges['first-commit'] && v.badges['time-traveller'], 'keeps justified badges (and time-traveller, which leaves no other record)');
    check(v.xp === 375 && v.xp === P.deriveXp(v), 'recalculates XP from recorded work (forged 99999 → 375)');
    check(v.lastVisited === null && P.validateProgress({ ...honest, lastVisited: { href: 'https://evil.example/', title: 'x' } }).lastVisited === null, 'rejects script and off-site "Continue" links');
    check(v.profile.name === 'img src=x onerror=alert(1) Ravi', 'passport name is cleaned of markup characters');

    store.clear();
    P.save(honest);
    const saved = store.get('gg-progress');
    const throws = (fn) => { try { fn(); return false; } catch { return true; } };
    const bad1 = throws(() => P.importJson('{not json'));
    const bad2 = throws(() => P.importJson(JSON.stringify({ ...honest, units: 'oops' })));
    check(bad1 && bad2 && store.get('gg-progress') === saved, 'failed imports leave the saved progress untouched');
    P.importJson(JSON.stringify(forged));
    const once = store.get('gg-progress');
    P.importJson(JSON.stringify(forged));
    check(store.get('gg-progress') === once && JSON.parse(once).xp === 375, 'importing the same file twice does not duplicate XP or badges');
    P.setPassportName('  Meera   Shah ');
    check(P.load().profile.name === 'Meera Shah' && P.load().xp === 375, 'saving a passport name changes nothing else');
    P.setPassportName('');
    check(!('profile' in P.load()), 'clearing the name removes it');
  }

  // 8. Print layout and labels are present
  {
    const css = fs.readFileSync(path.join(ROOT, 'src/styles/passport.css'), 'utf8');
    const html = fs.readFileSync(path.join(ROOT, 'src/passport/index.html'), 'utf8');
    check(/@media print[\s\S]*@page \{ size: A4/.test(css) && css.includes('not an official college certificate'), 'print stylesheet: one A4 page with the "not an official certificate" label');
    check(html.includes('not an official college certificate') && html.includes('data-pp-print') && html.includes('data-pp-card'), 'page offers Print/PDF and PNG card, both labelled');
  }
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(failures ? `\n${failures} test(s) failed` : '\nAll tests passed');
process.exit(failures ? 1 : 0);
