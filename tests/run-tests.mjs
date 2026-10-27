/**
 * Course tests (npm test). Runs under Node — no browser needed.
 *
 *  1. Missions: for every mission, run its setup, check no required goal is already ticked
 *     (except `guard` goals such as "main must survive", which start true by design),
 *     play the solution from its last hint, and check every required goal ticks.
 *  2. Git engine smoke test: a typical Unit 2–4 session with expected output fragments.
 *  3. Content: every quiz and the glossary/cheat sheet parse and are well-formed.
 *  4.–6. Git Passport, ebooks, share previews.
 *  7. Accounts and sync (Phase 2): merge rules, XP, sync engine, database constants, service worker, build switch,
 *     secret scan. The database itself is tested on gg-test with supabase/tests/m10_m11_security_test.sql.
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

/* ---------------- 5. Course ebooks (Milestone 8) ---------------- */
console.log('\nEbooks');
{
  const check = (cond, msg) => (cond ? ok(msg) : fail(msg));
  const BASE = '/git-github-fundamentals/';
  const { createMarkdown } = await imp('build/markdown.js');
  const { renderBook, BOOKS } = await imp('build/book.js');
  const { FACULTY } = await imp('src/scripts/data/site.js');
  const md = createMarkdown({ root: ROOT, base: BASE });
  const pages = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/book-pages.json'), 'utf8'));
  const count = (html, re) => (html.match(re) ?? []).length;

  for (const kind of ['student', 'faculty']) {
    const html = renderBook(kind, md, BASE, ROOT);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    const toc = [...html.matchAll(/<li class="bk-toc-\d"><a href="#([^"]+)"/g)].map((m) => m[1]);
    const broken = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]).filter((id) => !ids.includes(id));
    check(html.includes('class="bk-cover"') && html.includes('id="about-book"') && html.includes('id="contents"'), `${kind}: cover, About this book and contents`);
    check(!dupes.length, `${kind}: no duplicate anchors${dupes.length ? ` (${[...new Set(dupes)].slice(0, 5).join(', ')})` : ''}`);
    check(!broken.length, `${kind}: every in-book link has a target${broken.length ? ` (missing ${broken.slice(0, 5).join(', ')})` : ''}`);
    check(toc.length > 40 && toc.every((id) => Number.isInteger(pages[kind]?.[id])), `${kind}: ${toc.length} contents entries, each with a page number from build/book-pages.json`);
    check(FACULTY.every((f) => html.includes(f.name) && (!f.photo || html.includes(`${BASE}${f.photo}`))), `${kind}: faculty details (name, photo) from FACULTY`);
    check(!new RegExp(`href="${BASE}`).test(html.replace(/src="[^"]*"/g, '')), `${kind}: links inside the book go to the live site or within the book (work in the PDF)`);
    const pdf = path.join(ROOT, 'public', BOOKS[kind].pdf);
    check(fs.existsSync(pdf) && fs.readFileSync(pdf).subarray(0, 5).toString() === '%PDF-', `${kind}: PDF present at public/${BOOKS[kind].pdf}`);
    if (kind === 'student') {
      check(count(html, /<h3 id="u[1-5]-/g) === 56 && count(html, /class="diagram/g) === 14, 'student: all 56 lesson sections and 14 diagrams');
      check(count(html, /<dt><code>/g) === 62 && count(html.split('bk-glossary')[1] ?? '', /<dt>/g) === 47, 'student: cheat sheet (62 commands) and glossary (47 terms) appendices');
      check([1, 2, 3, 4, 5].every((n) => html.includes(`id="chapter-${n}"`)), 'student: five chapters');
    } else {
      check(['story-bible', 'chapter-1', 'chapter-2', 'chapter-3', 'chapter-4', 'chapter-5', 'appendices'].every((id) => html.includes(`id="${id}"`)), 'faculty: story bible, chapters 1–5 and appendices');
    }
  }
  const config = fs.readFileSync(path.join(ROOT, 'vite.config.js'), 'utf8');
  check(/publicFiles\([^)]*\)\)\.filter\(\(f\) => !f\.endsWith\('\.pdf'\)/.test(config), 'service worker does not precache the ebook PDFs');
}

/* ---------------- 6. Share previews (Milestone 9) ---------------- */
console.log('\nShare previews');
{
  const check = (cond, msg) => (cond ? ok(msg) : fail(msg));
  const { socialMeta, pageSlug, SHARE_IMAGE, DEFAULT_IMAGE, LIVE } = await imp('build/meta.js');
  const page = '<html><head><title>Student Edition ebook · Git &amp; GitHub Fundamentals</title>\n<meta name="description" content="The whole course as a book.">\n</head><body></body></html>';
  const out = socialMeta(page, '/book/student/index.html');
  const tag = (prop) => new RegExp(`<meta (property|name)="${prop}" content="([^"]*)"`).exec(out)?.[2];
  check(pageSlug('/book/student/index.html') === 'book/student/' && pageSlug('/index.html') === '' && pageSlug('/git-github-fundamentals/passport/') === 'passport/', 'page paths become live URL slugs');
  check(tag('og:title') === 'Student Edition ebook · Git &amp; GitHub Fundamentals' && tag('og:description') === 'The whole course as a book.', 'og:title and og:description come from the page');
  check(tag('og:url') === `${LIVE}book/student/` && out.includes(`<link rel="canonical" href="${LIVE}book/student/">`), 'og:url and canonical point to the live page');
  check(tag('og:image') === `${LIVE}share/student-ebook.jpg` && tag('twitter:card') === 'summary_large_image', 'page-specific image, large Twitter card');
  check(socialMeta(page, '/unit-3/index.html').includes(`<meta property="og:image" content="${LIVE}${DEFAULT_IMAGE.file}">`), 'other pages use the course image');
  check(socialMeta(out, '/book/student/') === out, 'tags are added only once');
  // Images: JPEG, 1200 × 630, under 300 KB (WhatsApp skips larger previews).
  const jpegSize = (buf) => {
    for (let i = 2; i < buf.length - 9;) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return null;
  };
  for (const { file } of [DEFAULT_IMAGE, ...Object.values(SHARE_IMAGE)]) {
    const p = path.join(ROOT, 'public', file);
    const buf = fs.existsSync(p) ? fs.readFileSync(p) : null;
    const size = buf && jpegSize(buf);
    check(buf && size?.w === 1200 && size?.h === 630 && buf.length < 300 * 1024, `public/${file}: 1200 × 630 JPEG, ${buf ? Math.round(buf.length / 1024) : '?'} KB`);
  }
  const config = fs.readFileSync(path.join(ROOT, 'vite.config.js'), 'utf8');
  check(config.includes("!f.startsWith('share/')") && config.includes('socialMeta(out, ctx?.path)'), 'tags added to every page at build time; images not precached');
}

/* ---------------- 7. Accounts and progress sync (Milestones 10–11, gg-test only) ---------------- */
console.log('\nAccounts and sync');
{
  const check = (cond, msg) => (cond ? ok(msg) : fail(msg));
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  globalThis.window = new EventTarget();
  const P = await imp('src/scripts/lib/progress.js');
  const S = await imp('src/scripts/lib/sync.js');
  const { UNITS, BASE } = await imp('src/scripts/data/site.js');
  const at = (d) => `2026-10-${String(d).padStart(2, '0')}T10:00:00.000Z`;
  const doc = (x = {}) => P.validateProgress({ version: 1, ...x });

  // SY1 — merge rules (Milestone 11 plan §4.2)
  const a = doc({ units: { 1: { sections: ['why', 'what'], total: 9, quiz: { best: 80, last: 80, passed: true }, complete: true } },
    missions: { 'M-01': { done: true, at: at(20) }, 'M-03': { done: true, at: at(22) } }, badges: { 'first-commit': at(22) } });
  const b = doc({ units: { 1: { sections: ['what', 'how'], total: 9, quiz: { best: 60, last: 60, passed: false } }, 2: { sections: ['init'], total: 7 } },
    missions: { 'M-01': { done: true, at: at(18) }, 'M-02': { done: true, at: at(21) } }, games: { conflict: at(23) },
    selfCheck: { best: 70, last: 70, byUnit: { 1: 70 }, at: at(24) }, profile: { name: 'Asha' } });
  const ab = P.mergeProgress(a, b);
  const ba = P.mergeProgress(b, a);
  check(ab.units[1].sections.join() === 'why,what,how' && ab.units[1].quiz.best === 80 && ab.units[1].quiz.passed && ab.units[1].complete && ab.units[2],
    'SY1 merge: lesson sections united, best score kept, passed and complete never undone');
  check(ab.missions['M-01'].at === at(18) && Object.keys(ab.missions).length === 3 && ab.games.conflict && ab.badges['first-commit'],
    'SY1 merge: missions, games and badges united, earliest date kept');
  const facts = (d) => JSON.stringify([Object.keys(d.missions).sort(), Object.keys(d.badges).sort(), Object.keys(d.games).sort(), d.xp,
    Object.entries(d.units).map(([n, u]) => [n, [...u.sections].sort(), u.quiz?.best, u.quiz?.passed, u.complete]).sort()]);
  check(facts(ab) === facts(ba), 'SY1 merge: the order of the two copies does not change any learning fact');
  check(P.sameProgress(P.mergeProgress(ab, ab), ab) && P.sameProgress(P.mergeProgress(ab, b), ab), 'SY1 merge: repeating a merge changes nothing (idempotent)');
  const stale = doc({ missions: { 'M-01': { done: true, at: at(18) } } });
  check(P.sameProgress(P.mergeProgress(ab, stale), ab), 'SY1 merge: a stale copy cannot remove or lower anything');
  check(ab.profile?.name === 'Asha' && P.mergeProgress(b, doc({ selfCheck: { best: 90, last: 40, at: at(25) } })).selfCheck.last === 40
    && P.mergeProgress(b, doc({ selfCheck: { best: 90, last: 40, at: at(25) } })).selfCheck.best === 90,
    'SY1 merge: self-check best is the maximum, last comes from the newer attempt');

  // SY2 — XP from the existing rules; retries add nothing
  check(ab.xp === P.deriveXp(ab) && ab.xp === 3 * 75 + 100 + 50 + 50, `SY2 merged XP = deriveXp() = ${ab.xp}`);
  const retry = P.mergeProgress(ab, doc({ units: { 1: { quiz: { best: 95, last: 95, passed: true } } } }));
  check(retry.xp === ab.xp && retry.units[1].quiz.best === 95, 'SY2 a quiz passed again with a higher score raises the best score, not the XP');
  check(P.mergeProgress(doc({ badges: { 'unit-2': at(1) } }), doc()).badges['unit-2'] === undefined, 'SY2 badges the work does not justify are removed');

  // SY3 — sync engine with a fake save_progress (same rules as the database) and fake timers
  const server = { row: null, calls: 0, fail: null, lose: false,
    async load() { return this.row && { doc: this.row.doc, revision: this.row.revision }; },
    async save(d, base) {
      this.calls++;
      if (this.fail) { const e = this.fail; this.fail = null; throw e; }
      const was = this.row?.revision ?? 0;
      const merged = this.row ? P.mergeProgress(this.row.doc, P.validateProgress(d)) : P.validateProgress(d);
      const changed = !this.row || !P.sameProgress(merged, this.row.doc);
      if (changed) this.row = { doc: merged, revision: was + 1 };
      const res = { doc: this.row.doc, revision: this.row.revision, changed, merged_newer: was > 0 && base !== was };
      if (this.lose) { this.lose = false; throw Object.assign(new Error('TypeError: Failed to fetch'), { code: '' }); }
      return res;
    } };
  const timers = { q: [], setTimeout(fn, ms) { this.q.push({ fn, ms }); return this.q.length; }, clearTimeout() { this.q = []; },
    async run() { const t = this.q.shift(); if (t) await t.fn(); return t?.ms; } };
  const states = [];
  store.clear();
  P.completeMission('M-01');
  check(S.deviceSituation('user-a') === 'guest', 'SY3 a device with signed-out progress is "guest" (the student is asked)');
  S.linkDevice('user-a', { addLocal: true });
  const sync = S.createSync({ api: server, uid: 'user-a', onStatus: (s) => states.push(s), timers });
  await sync.pull();
  check(server.row?.doc.missions['M-01'] && S.syncMeta().revision === 1 && !S.syncMeta().pending && states.at(-1) === 'saved',
    'SY3 "Add": this device\'s progress is saved to the account; "saved" only after the server answered');
  P.completeMission('M-02');
  sync.onLocalChange();
  check(S.syncMeta().pending && states.at(-1) === 'pending', 'SY3 a change is saved locally first and marked pending');
  server.fail = Object.assign(new Error('TypeError: Failed to fetch'), { code: '' });
  await timers.run();
  check(states.at(-1) === 'offline' && S.syncMeta().pending && timers.q[0]?.ms === S.RETRY_MS[0], 'SY3 network failure: still pending, retry scheduled with back-off');
  await timers.run();
  check(states.at(-1) === 'saved' && server.row.doc.missions['M-02'] && server.row.revision === 2, 'SY3 the retry saves the change');
  server.lose = true;
  P.completeGame('conflict');
  sync.onLocalChange();
  await timers.run();
  const revAfterLost = server.row.revision;
  check(states.at(-1) === 'offline' && S.syncMeta().pending, 'SY3 lost response: not reported as saved');
  await timers.run();
  check(states.at(-1) === 'saved' && server.row.revision === revAfterLost && server.row.doc.xp === 75 * 2 + 50, 'SY3 the retry after a lost response is harmless: same revision, XP not doubled');
  server.fail = Object.assign(new Error('Please accept the current consent before saving online.'), { code: '42501' });
  P.recordQuiz(1, 90, 60);
  sync.onLocalChange();
  await timers.run();
  check(states.at(-1) === 'consent' && timers.q.length === 0, 'SY3 consent required: shown to the student, no automatic retry');
  check(S.classify({ code: '42501', message: 'permission denied for function save_progress' }) === 'auth' && S.classify({ code: '22023', message: 'x' }) === 'invalid',
    'SY3 expired sign-in and rejected data are told apart');

  // Another account on the same PC: asked, kept separate, restored at sign-out
  check(S.deviceSituation('user-b') === 'other-account', 'SY3 progress synced to another account is never merged silently');
  const before = P.load();
  check(S.linkDevice('user-b', { addLocal: false }) && !P.hasProgress(P.load()) && S.hasStash(), 'SY3 "Keep separate" sets the progress aside');
  P.completeMission('M-05');
  check(S.leaveDevice({ removeLocal: true }) === 'restored' && P.sameProgress(P.load(), before) && S.syncMeta()?.account === 'user-a' && !S.hasStash(),
    'SY3 sign-out restores the set-aside progress unchanged');
  check(S.leaveDevice({ removeLocal: true }) === 'removed' && !P.hasProgress(P.load()) && S.syncMeta() === null, 'SY3 "Remove my progress from this PC" clears the device copy');

  // SY4 — course constants in the database match the site
  const sql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261027000002_m11_progress.sql'), 'utf8');
  const C = JSON.parse(/-- course-constants:start\n'(.*)'\n-- course-constants:end/.exec(sql)[1]);
  const progressSrc = fs.readFileSync(path.join(ROOT, 'src/scripts/lib/progress.js'), 'utf8');
  const missionBadges = Function(`return ${/const MISSION_BADGES = (\{[^}]*\});/.exec(progressSrc)[1]}`)();
  const games = Function(`return ${/const GAMES = (\[[^\]]*\]);/.exec(progressSrc)[1]}`)();
  const gameXp = Number(/const GAME_XP = (\d+);/.exec(progressSrc)[1]);
  check(C.base === BASE && JSON.stringify(C.unit_missions) === JSON.stringify(Object.fromEntries(UNITS.map((u) => [String(u.n), u.missions.filter((m) => m.startsWith('M-'))])))
    && JSON.stringify(C.mission_ids) === JSON.stringify(UNITS.flatMap((u) => u.missions).filter((m) => m.startsWith('M-')))
    && JSON.stringify(C.badge_ids) === JSON.stringify(P.BADGES.map((x) => x.id)) && JSON.stringify(C.mission_badges) === JSON.stringify(missionBadges)
    && JSON.stringify(C.games) === JSON.stringify(games) && C.xp.mission === P.XP.mission && C.xp.quizPass === P.XP.quizPass
    && C.xp.unitComplete === P.XP.unitComplete && C.xp.game === gameXp,
    'SY4 database course constants (units, missions, badges, games, XP) match site.js and progress.js');

  // SY5 — the service worker never stores sign-in return pages
  const vm = await import('node:vm');
  const handlers = {};
  const puts = [];
  const sw = fs.readFileSync(path.join(ROOT, 'build/sw-template.js'), 'utf8')
    .replace("'__VERSION__'", "'t'").replace("'__BASE__'", "'/git-github-fundamentals/'").replace('__PRECACHE__', '[]');
  vm.runInNewContext(sw, {
    URL, self: { addEventListener: (t, fn) => { handlers[t] = fn; }, location: { origin: 'https://site.test' } },
    caches: { open: async () => ({ put: (req) => puts.push(req.url) }), match: async () => undefined },
    fetch: async () => ({ ok: true, type: 'basic', clone() { return this; } }),
  });
  const nav = async (url) => { let p; handlers.fetch({ request: { url, method: 'GET', mode: 'navigate' }, respondWith: (x) => { p = x; } }); await p; };
  await nav('https://site.test/git-github-fundamentals/account/?code=abc123');
  await nav('https://site.test/git-github-fundamentals/account/?error=access_denied&error_description=x');
  check(puts.length === 0, 'SY5 sign-in return pages (?code=, ?error=) are not stored by the service worker');
  await nav('https://site.test/git-github-fundamentals/unit-1/');
  check(puts.length === 1, 'SY5 ordinary pages are still stored for offline use');

  // SY6 — production switch (the built output is checked by npm run check:dist)
  const config = fs.readFileSync(path.join(ROOT, 'vite.config.js'), 'utf8');
  const mainJs = fs.readFileSync(path.join(ROOT, 'src/scripts/main.js'), 'utf8');
  check(/accounts && mode === 'production'\) \{\s*throw/.test(config) && config.includes("define: { __ACCOUNTS__: JSON.stringify(accounts) }")
    && config.includes("(name === 'account' && dir === ROOT) || (name === 'dashboard' && dir === join(ROOT, 'teach'))")
    && mainJs.includes("if (__ACCOUNTS__) import('./lib/account-boot.js')"),
    'SY6 accounts are compiled in only when enabled, never in a production build; /account/ and /teach/dashboard/ left out when off');

  // DB — faculty dashboard helpers (Milestone 12)
  const D = await imp('src/scripts/lib/dashboard.js');
  const row = { display_name: 'Asha', roll_no: '23BCA-AI-045', github_username: 'asha-gh', programme: 'BCA-AI', xp: 325, updated_at: at(26),
    units: { 1: { sections: ['a', 'b', 'c'], total: 9, quiz: { best: 80, last: 70, passed: true }, complete: true },
      2: { sections: ['a', 'b'], total: 7, quiz: { best: 40, last: 40, passed: false }, complete: false }, 3: { sections: ['x'], total: 6, quiz: null, complete: false } },
    missions: ['M-01', 'M-02', 'M-03'], badges: ['first-commit', 'unit-1'], games: [], self_check_best: 65 };
  const sum = D.summarize(row);
  check(sum.level === 2 && sum.unitsComplete === 1 && sum.missions === 3 && sum.badges === 2 && sum.units[2].read === 1 && sum.units[4].quizBest === null
    && D.MISSION_TOTAL === 15 && D.BADGE_TOTAL === 9, 'DB1 a dashboard row summarises XP, level, units, missions and badges');
  check(D.unitCell(sum.units[0]).text === '✓' && D.unitCell(sum.units[1]).text === '40%' && D.unitCell(sum.units[1]).tone === 'tried'
    && D.unitCell(sum.units[2]).text === '1/6' && D.unitCell(sum.units[3]).text === '—', 'DB1 unit cells: complete, quiz score, lessons read, not started');
  const order = D.sortStudents([D.summarize({ ...row, display_name: 'zed', xp: 10 }), sum, D.summarize({ ...row, display_name: 'Bina', xp: 900 })], 'xp').map((s) => s.name);
  check(order.join() === 'Bina,Asha,zed', 'DB1 students sort by XP (highest first)');
  const rolls = D.sortStudents([D.summarize({ ...row, roll_no: '23BCA-AI-10', display_name: 'P' }), D.summarize({ ...row, roll_no: null, display_name: 'Q' }),
    D.summarize({ ...row, roll_no: '23BCA-AI-9', display_name: 'R' })], 'roll').map((s) => s.name);
  check(rolls.join() === 'R,P,Q', 'DB1 students sort by roll number (9 before 10), missing roll numbers last');
  check(D.csvCell('=HYPERLINK("x")') === `"'=HYPERLINK(""x"")"` && D.csvCell('+91 98') === "'+91 98" && D.csvCell('-x') === "'-x" && D.csvCell('@a') === "'@a"
    && D.csvCell('Shah, Asha') === '"Shah, Asha"' && D.csvCell(null) === '', 'DB2 CSV cells: formulas neutralised, commas and quotes escaped');
  const csv = D.toCsv([D.summarize({ ...row, display_name: '=cmd|calc' })], 'BCA 2026 – SY AI');
  const csvLines = csv.replace(/^﻿/, '').trim().split('\r\n');
  check(csv.startsWith('﻿') && csvLines.length === 2 && csvLines[1].startsWith("BCA 2026 – SY AI,23BCA-AI-045,'=cmd|calc,asha-gh,BCA-AI,325,2,3,9,80,yes,yes")
    && csvLines[0].split(',').length === csvLines[1].split(',').length && !/email/i.test(csv), 'DB2 CSV: one row per student with the roll number, no email, aligned columns');

  // SY7 — no secrets in the repository (K1)
  const { execSync } = await import('node:child_process');
  let files = [];
  try {
    files = execSync('git ls-files -z --cached --others --exclude-standard', { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
  } catch { /* not a git checkout */ }
  const binary = /\.(pdf|png|jpe?g|webp|gif|ico|woff2?|ttf|zip)$/i;
  const hits = [];
  for (const f of files) {
    if (/^\.env(\.|$)/.test(path.basename(f))) { hits.push(`${f} (env file must not be committed)`); continue; }
    if (binary.test(f) || !fs.existsSync(path.join(ROOT, f))) continue;
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (/sb_secret_[A-Za-z0-9_-]{8,}/.test(text)) hits.push(`${f} (Supabase secret key)`);
    if (/postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@/.test(text)) hits.push(`${f} (database URL with password)`);
    for (const [jwt] of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) {
      try { if (JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).role === 'service_role') hits.push(`${f} (service-role key)`); } catch { /* not a JWT */ }
    }
  }
  check(files.length > 0 && hits.length === 0, `SY7 no secret keys, database passwords or env files in ${files.length} repository files${hits.length ? `: ${hits.join(', ')}` : ''}`);
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(failures ? `\n${failures} test(s) failed` : '\nAll tests passed');
process.exit(failures ? 1 : 0);
