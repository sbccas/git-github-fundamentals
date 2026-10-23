/**
 * Story missions (PRD §6.3). Each mission:
 *   id, unit, title, minutes, brief (HTML), goals [{ text, check(ctx) → bool, optional, latch, guard }], hints [3], setup(ctx), success (HTML)
 *
 * ctx helpers (see src/scripts/missions/engine.js):
 *   ctx.run(cmd)            run a shell command silently (setup only)
 *   ctx.ran(re, after?)     did the student run a command matching re (after the first command matching `after`)?
 *   ctx.globalConfig(key)   value in ~/.gitconfig
 *   ctx.repo(path)          Repo at ~/path (or null)
 *   ctx.files(repo)         Map of files in HEAD
 *   ctx.objectType(repo, oid)  "commit" | "tree" | "blob" | "tag"
 *   ctx.read(path)          text of ~/path (or null)
 *   ctx.exists(path) / ctx.isDir(path)
 *   ctx.github              { create(owner, name, opts), teammatePush(owner, name, edit), refs(owner, name) }
 *   ctx.cwd                 current folder (absolute)
 *   ctx.home                '/home/student'
 */

const KRISH = 'git config --global user.name "Krish Patel" && git config --global user.email "krish@example.com"';

export const MISSIONS = [
  /* ============================ UNIT 1 ============================ */
  {
    id: 'M-01',
    unit: 1,
    title: 'Who am I?',
    minutes: 5,
    brief: `<p>It's your first day in the SBCCAS lab. Hetvi, the team lead, wants every commit in the Amroli Canteen project to show <strong>who</strong> made it.</p>
      <p>Tell Git your name and email on this computer, then check that Git remembered them.</p>`,
    goals: [
      { text: 'Set your name for every repository: <code>git config --global user.name "…"</code>', check: (c) => !!c.globalConfig('user.name')?.trim() },
      { text: 'Set your email: <code>git config --global user.email "…"</code>', check: (c) => /.+@.+\..+/.test(c.globalConfig('user.email') ?? '') },
      { text: 'Read one setting back, e.g. <code>git config user.name</code>', check: (c) => c.ran(/^git config (--global )?user\.(name|email)\s*$/) },
      { text: 'List all your settings', check: (c) => c.ran(/^git config( --global)? (--list|-l)\b/) },
    ],
    hints: [
      'Settings are written as <code>git config --global &lt;key&gt; "&lt;value&gt;"</code>. The keys are <code>user.name</code> and <code>user.email</code>.',
      'Use quotes around a name with a space: <code>git config --global user.name "Your Name"</code>. To read a setting, leave out the value.',
      'Type these one by one:<br><code>git config --global user.name "Your Name"</code><br><code>git config --global user.email "you@example.com"</code><br><code>git config user.name</code><br><code>git config --list</code>',
    ],
    setup: async () => {},
    success: '<p>Every commit you make will now be signed with your name. On a real computer, use the same email as your GitHub account.</p>',
  },
  {
    id: 'M-02',
    unit: 1,
    title: 'Ask the manual',
    minutes: 5,
    brief: `<p>Krish forgot what the <code>-m</code> in <code>git commit -m</code> means. Instead of searching the internet, Hetvi tells him: <em>"Git has its own manual. Ask Git."</em></p>
      <p>Explore Git's built-in help.</p>`,
    goals: [
      { text: 'Check which version of Git you have', check: (c) => c.ran(/^git (--version|version|-v)\s*$/) },
      { text: 'Show the list of common Git commands', check: (c) => c.ran(/^git( help| --help)?\s*$/) },
      { text: 'Open the full manual for <code>commit</code>', check: (c) => c.ran(/^git (help commit|commit --help)\s*$/) },
      { text: 'Show the short options summary for <code>commit</code>', check: (c) => c.ran(/^git commit -h\s*$/) },
      { text: 'Bonus: list Git\'s concept guides', check: (c) => c.ran(/^git help (-g|--guides)\s*$/), optional: true },
    ],
    hints: [
      'There are three ways to ask: <code>git help</code>, <code>git help &lt;command&gt;</code> and <code>git &lt;command&gt; -h</code>.',
      'The version is shown by <code>git --version</code>. The short summary uses a single dash: <code>-h</code>.',
      'Run: <code>git --version</code>, <code>git help</code>, <code>git help commit</code>, <code>git commit -h</code>, and for the bonus <code>git help -g</code>.',
    ],
    setup: async () => {},
    success: '<p>Whenever you are stuck, <code>git &lt;command&gt; -h</code> is the fastest answer, and Git\'s error messages usually tell you the next command to run.</p>',
  },

  /* ============================ UNIT 2 ============================ */
  {
    id: 'M-03',
    unit: 2,
    title: 'Day One',
    minutes: 10,
    brief: `<p>The project starts today! Krish needs a folder for <strong>Amroli Canteen</strong>, tracked by Git, with the first version of the menu saved.</p>
      <p>Git already knows who you are (you are Krish in this mission).</p>`,
    goals: [
      { text: 'Create a folder <code>amroli-canteen</code> in your home folder', check: (c) => c.isDir('amroli-canteen') },
      { text: 'Turn it into a Git repository', check: (c) => c.isDir('amroli-canteen/.git') },
      { text: 'Create <code>menu.txt</code> with at least one item', check: async (c) => !!(await c.read('amroli-canteen/menu.txt'))?.trim() },
      { text: 'Commit <code>menu.txt</code>', check: async (c) => { const r = await c.repo('amroli-canteen'); return !!r && (await c.files(r)).has('menu.txt'); } },
      { text: 'Finish with a clean working tree (<code>git status</code> says nothing to commit)', check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r || !(await r.headOid())) return false; const s = await r.status(); return !s.staged.length && !s.unstaged.length && !s.untracked.length; } },
    ],
    hints: [
      'Make the folder with <code>mkdir</code>, go into it with <code>cd</code>, then start tracking with <code>git init</code>.',
      'Write a file with <code>echo "Samosa 15" &gt; menu.txt</code>. Then it must be <strong>staged</strong> before it can be committed.',
      '<code>mkdir amroli-canteen</code><br><code>cd amroli-canteen</code><br><code>git init</code><br><code>echo "Samosa 15" &gt; menu.txt</code><br><code>git add menu.txt</code><br><code>git commit -m "Add menu"</code>',
    ],
    setup: async (c) => { await c.run(KRISH); },
    success: '<p>That was your <strong>root commit</strong>, the first snapshot in the project\'s history. Run <code>git log</code> any time to see it.</p>',
  },
  {
    id: 'M-04',
    unit: 2,
    title: 'Pack only what matters',
    minutes: 10,
    brief: `<p>Krish added <em>Vada Pav</em> to the menu and started <code>cart.js</code>. He also keeps personal reminders in <code>notes-private.txt</code>, and those must <strong>never</strong> reach GitHub.</p>
      <p>Commit only the project work, with a clear message.</p>`,
    goals: [
      { text: 'Look at what changed with <code>git status</code>', check: (c) => c.ran(/^git status/) },
      { text: 'Commit the menu change <em>and</em> <code>cart.js</code>', check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r) return false; const f = await c.files(r); return f.has('cart.js') && /Vada Pav/i.test(await c.blob(r, f.get('menu.txt')) ?? ''); } },
      { text: 'Keep <code>notes-private.txt</code> out of every commit (and don\'t delete it)', check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r || !(await c.exists('amroli-canteen/notes-private.txt'))) return false; const f = await c.files(r); if (!f.has('cart.js')) return false; return !(await c.inAnyCommit(r, 'notes-private.txt')); } },
      { text: 'Use a clear message: 3+ words, starting with a verb (not "update")', check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r) return false; const head = await r.headOid(); const m = (await r.commit(head)).message.trim(); return m !== 'Add menu' && m.split(/\s+/).length >= 3 && !/^(update|updated|changes|final|commit)\b/i.test(m); } },
      { text: 'Bonus: add <code>notes-private.txt</code> to a <code>.gitignore</code> file', optional: true, check: async (c) => /notes-private\.txt/.test((await c.read('amroli-canteen/.gitignore')) ?? '') },
    ],
    hints: [
      'Stage files one at a time instead of using <code>git add .</code>, which would include the private notes.',
      'Stage exactly two files: <code>git add menu.txt cart.js</code>. Check with <code>git status</code> before committing. Staged something wrong? <code>git restore --staged &lt;file&gt;</code>.',
      '<code>git add menu.txt cart.js</code><br><code>git status</code><br><code>git commit -m "Add vada pav and start cart"</code><br>Bonus: <code>echo "notes-private.txt" &gt; .gitignore</code> then commit <code>.gitignore</code>.',
    ],
    setup: async (c) => {
      await c.run(`${KRISH} && mkdir amroli-canteen && cd amroli-canteen && git init -q && echo "Samosa 15" > menu.txt && git add . && git commit -q -m "Add menu"`);
      await c.run('cd ~/amroli-canteen && echo "Vada Pav 20" >> menu.txt && echo "// cart: add items and show the total" > cart.js && echo "TODO: ask Hetvi about the demo date (personal note - keep out of Git)" > notes-private.txt');
    },
    start: 'amroli-canteen',
    success: '<p>The staging area let you choose exactly what went into the snapshot. A <code>.gitignore</code> file makes Git skip private files automatically.</p>',
  },
  {
    id: 'M-05',
    unit: 2,
    title: 'Ship it to origin',
    minutes: 10,
    brief: `<p>Hetvi created an <strong>empty</strong> repository on GitHub for the team:</p>
      <p><code>https://github.com/krish-patel/amroli-canteen.git</code></p>
      <p>Connect your local project to it and upload your commits so the team can see them. Open the <strong>GitHub</strong> tab afterwards.</p>`,
    goals: [
      { text: 'Add a remote named <code>origin</code> with that URL', check: async (c) => { const r = await c.repo('amroli-canteen'); return !!r && /github\.com\/krish-patel\/amroli-canteen(\.git)?$/.test((await r.getConfig('remote.origin.url')) ?? ''); } },
      { text: 'Push <code>main</code> to GitHub', check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r) return false; const refs = await c.github.refs('krish-patel', 'amroli-canteen'); return refs.branches.main && refs.branches.main === (await r.refOid('refs/heads/main')); } },
      { text: 'Set the upstream (<code>-u</code>) so plain <code>git push</code> works next time', check: async (c) => { const r = await c.repo('amroli-canteen'); return !!r && (await r.getConfig('branch.main.remote')) === 'origin'; } },
      { text: 'Run <code>git status</code> to confirm you are up to date', check: (c) => c.ran(/^git status/, /^git push/) },
    ],
    hints: [
      'Two steps: first give the URL a nickname with <code>git remote add</code>, then upload with <code>git push</code>.',
      '<code>git remote add origin &lt;url&gt;</code>, then <code>git push -u origin main</code>. Check the remote with <code>git remote -v</code>.',
      '<code>git remote add origin https://github.com/krish-patel/amroli-canteen.git</code><br><code>git push -u origin main</code><br><code>git status</code>',
    ],
    setup: async (c) => {
      await c.run(`${KRISH} && mkdir amroli-canteen && cd amroli-canteen && git init -q && echo "Samosa 15" > menu.txt && git add . && git commit -q -m "Add menu" && echo "Vada Pav 20" >> menu.txt && git commit -q -am "Add vada pav to menu"`);
      await c.github.create('krish-patel', 'amroli-canteen', { description: 'Canteen pre-order app (BCA final-year project)' });
      c.setGithubUser('krish-patel');
    },
    start: 'amroli-canteen',
    success: '<p>Your commits are now on GitHub, the team\'s shared copy. <code>branch \'main\' set up to track \'origin/main\'</code> means future pushes need no extra words.</p>',
  },
  {
    id: 'M-06',
    unit: 2,
    title: 'Teammate pushed overnight',
    minutes: 10,
    brief: `<p>Good morning! While you slept, <strong>Dhruvi</strong> pushed the order system to GitHub. Before you write any code today, get her work, but <em>look before you leap</em>.</p>`,
    goals: [
      { text: 'Download the new commits <em>without</em> changing your files (<code>git fetch</code>)', check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r) return false; const refs = await c.github.refs('krish-patel', 'amroli-canteen'); return c.ran(/^git fetch/) && (await r.refOid('refs/remotes/origin/main')) === refs.branches.main; } },
      { text: 'See what is new before merging (<code>git status</code> or <code>git log main..origin/main</code>)', check: (c) => c.ran(/^git (status|log.*origin\/main|diff.*origin\/main)/, /^git fetch/) },
      { text: 'Bring Dhruvi\'s work into your <code>main</code>', check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r) return false; const refs = await c.github.refs('krish-patel', 'amroli-canteen'); return (await r.refOid('refs/heads/main')) === refs.branches.main && (await c.exists('amroli-canteen/orders.py')); } },
    ],
    hints: [
      '<code>git fetch</code> only downloads. Your branch stays where it is until you merge.',
      'After fetching, <code>git status</code> says how far behind you are. <code>git log --oneline main..origin/main</code> lists the new commits. Then use <code>git pull</code> (or <code>git merge origin/main</code>).',
      '<code>git fetch</code><br><code>git status</code><br><code>git log --oneline main..origin/main</code><br><code>git pull</code>',
    ],
    setup: async (c) => {
      await c.github.create('krish-patel', 'amroli-canteen', { description: 'Canteen pre-order app (BCA final-year project)' });
      await c.run(`${KRISH} && mkdir amroli-canteen && cd amroli-canteen && git init -q && echo "Samosa 15" > menu.txt && git add . && git commit -q -m "Add menu" && git remote add origin https://github.com/krish-patel/amroli-canteen.git && git push -q -u origin main`);
      await c.github.teammatePush('krish-patel', 'amroli-canteen', { path: 'orders.py', content: 'orders = []\n\ndef place_order(item, qty):\n    orders.append((item, qty))\n', message: 'Add order system', who: { name: 'Dhruvi Patel', email: 'dhruvi@example.com' } });
      c.setGithubUser('krish-patel');
    },
    start: 'amroli-canteen',
    success: '<p><code>fetch</code> = parcel at the door; <code>pull</code> = parcel opened. Starting every day with a pull keeps conflicts small.</p>',
  },
  {
    id: 'M-07',
    unit: 2,
    title: 'Join the project',
    minutes: 10,
    brief: `<p>Hetvi keeps the team's planning notes in her repository and has added you as a collaborator:</p>
      <p><code>https://github.com/hetvi-desai/canteen-docs.git</code></p>
      <p>Get a copy, add yourself to the team list, and share it back.</p>`,
    goals: [
      { text: 'Clone the repository into your home folder', check: async (c) => { const r = await c.repo('canteen-docs'); return !!r && /hetvi-desai\/canteen-docs/.test((await r.getConfig('remote.origin.url')) ?? ''); } },
      { text: 'Add a line with your name to <code>team.md</code> and commit it', check: async (c) => { const r = await c.repo('canteen-docs'); if (!r) return false; const f = await c.files(r); if (!f.has('team.md')) return false; const text = await c.blob(r, f.get('team.md')); return text.split('\n').filter((l) => l.trim()).length >= 3; } },
      { text: 'Push your commit to GitHub', check: async (c) => { const r = await c.repo('canteen-docs'); if (!r) return false; const refs = await c.github.refs('hetvi-desai', 'canteen-docs'); const head = await r.refOid('refs/heads/main'); return refs.branches.main === head && head !== c.state.startOid; } },
    ],
    hints: [
      '<code>git clone &lt;url&gt;</code> makes the folder, downloads the history and sets <code>origin</code>, so no <code>git init</code> is needed.',
      'After cloning, <code>cd canteen-docs</code>. Add a line with <code>echo "- Your Name: frontend" &gt;&gt; team.md</code> (two &gt; signs add to the end).',
      '<code>git clone https://github.com/hetvi-desai/canteen-docs.git</code><br><code>cd canteen-docs</code><br><code>echo "- Krish: menu and cart" &gt;&gt; team.md</code><br><code>git commit -am "Add Krish to team list"</code><br><code>git push</code>',
    ],
    setup: async (c) => {
      await c.run(KRISH);
      await c.github.create('hetvi-desai', 'canteen-docs', { readme: true, description: 'Planning notes for the Amroli Canteen app', ownerName: 'Hetvi Desai' });
      const hetvi = { name: 'Hetvi Desai', email: 'hetvi@example.com' };
      c.state.startOid = (await c.github.teammatePush('hetvi-desai', 'canteen-docs', { path: 'team.md', content: '# Team\n\n- Hetvi: team lead, README and reviews\n', message: 'Add team list', who: hetvi })).oid;
    },
    success: '<p>Clone → change → commit → push is how you will contribute to every team project from now on.</p>',
  },
];

/* ---------- helpers for Units 3–4 setups ---------- */

/** Run `cmd` with a different author (local config set, then removed). */
async function as(c, who, cmd) {
  await c.run(`git config user.name "${who.name}" && git config user.email ${who.email}`);
  await c.run(cmd);
  await c.run('git config --unset user.name ; git config --unset user.email');
}
const DHRUVI = { name: 'Dhruvi Patel', email: 'dhruvi@example.com' };
const MEET = { name: 'Meet Shah', email: 'meet@example.com' };
const HETVI = { name: 'Hetvi Desai', email: 'hetvi@example.com' };
const BASE_REPO = `${KRISH} && mkdir amroli-canteen && cd amroli-canteen && git init -q && echo "Samosa 15" > menu.txt && git add . && git commit -q -m "Add menu" && echo "Open: 9 AM" > timing.txt && git add . && git commit -q -m "Add opening time"`;
const onBranch = async (c, repoPath, name) => { const r = await c.repo(repoPath); return !!r && (await r.branch()) === name; };
const cleanTree = async (r) => { const s = await r.status(); return !s.staged.length && !s.unstaged.length && !s.conflicts.length; };

MISSIONS.push(
  /* ============================ UNIT 3 ============================ */
  {
    id: 'M-08',
    unit: 3,
    title: 'Parallel universe',
    minutes: 10,
    brief: `<p>Krish wants to try new menu items <strong>without</strong> touching the working version on <code>main</code>. Hetvi says: "Use a branch. If it works we merge it; if not, nobody is affected."</p>`,
    goals: [
      { text: 'Create a branch named <code>feature-menu</code>', check: async (c) => { const r = await c.repo('amroli-canteen'); return !!r && !!(await r.refOid('refs/heads/feature-menu')); } },
      { text: 'Switch to <code>feature-menu</code>', check: (c) => c.ran(/^git (switch|checkout)( -c| -b)? feature-menu\s*$/) },
      { text: 'Commit a new menu item on <code>feature-menu</code> (main must not change)', check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r) return false; const f = await r.refOid('refs/heads/feature-menu'); const m = await r.refOid('refs/heads/main'); if (!f || f === m || m !== c.state.mainOid) return false; const t = await r.treeMap(f); return t.has('menu.txt') && (await r.blobText(t.get('menu.txt').oid)).trim().split('\n').length > 1; } },
      { text: 'Switch back to <code>main</code> and <code>cat menu.txt</code>: the new item isn\'t there', check: async (c) => (await onBranch(c, 'amroli-canteen', 'main')) && c.ran(/^cat menu\.txt/, /^git (switch|checkout) main/) },
    ],
    hints: [
      '<code>git branch &lt;name&gt;</code> creates a branch; <code>git switch &lt;name&gt;</code> moves to it (<code>git switch -c</code> does both).',
      'On the branch: <code>echo "Vada Pav 20" &gt;&gt; menu.txt</code> then <code>git commit -am "…"</code>. Check with <code>git log --oneline --graph --all</code>.',
      '<code>git switch -c feature-menu</code><br><code>echo "Vada Pav 20" &gt;&gt; menu.txt</code><br><code>git commit -am "Add vada pav to menu"</code><br><code>git switch main</code><br><code>cat menu.txt</code>',
    ],
    setup: async (c) => {
      await c.run(BASE_REPO);
      c.state.mainOid = (await (await c.repo('amroli-canteen')).refOid('refs/heads/main'));
    },
    start: 'amroli-canteen',
    success: '<p>Switching branches changed the files in your folder. The new item is safe on <code>feature-menu</code>, and <code>main</code> still works for everyone.</p>',
  },
  {
    id: 'M-09',
    unit: 3,
    title: 'Bring it home',
    minutes: 10,
    brief: `<p>Two features are finished: <code>feature-menu</code> (new items) and <code>feature-cart</code> (the cart). Hetvi asks you to bring <strong>both</strong> into <code>main</code>.</p>
      <p>Watch the Graph tab: one merge will be a fast-forward, the other will create a merge commit.</p>`,
    goals: [
      { text: 'Merge <code>feature-menu</code> into <code>main</code>', check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r) return false; const m = await r.refOid('refs/heads/main'); return !!m && (await r.isAncestor(c.state.menuOid, m)); } },
      { text: 'Merge <code>feature-cart</code> into <code>main</code> (a merge commit)', check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r) return false; const m = await r.refOid('refs/heads/main'); if (!m || !(await r.isAncestor(c.state.cartOid, m))) return false; return (await r.commit(m)).parent.length === 2 || (await r.treeMap(m)).has('cart.js'); } },
      { text: 'Look at the result with <code>git log --oneline --graph</code>', check: (c) => c.ran(/^git log.*--graph/, /^git merge feature-cart/) },
      { text: 'Finish on <code>main</code> with a clean working tree', check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r || (await r.branch()) !== 'main' || (await r.mergeState())) return false; const m = await r.refOid('refs/heads/main'); return (await r.isAncestor(c.state.cartOid, m)) && (await r.isAncestor(c.state.menuOid, m)) && (await cleanTree(r)); } },
    ],
    hints: [
      'Merge <em>into</em> the branch you are on. Make sure you are on <code>main</code> first.',
      '<code>git merge feature-menu</code> will say <em>Fast-forward</em>; then <code>git merge feature-cart</code> says <em>Merge made by the \'ort\' strategy</em>.',
      '<code>git switch main</code><br><code>git merge feature-menu</code><br><code>git merge feature-cart</code><br><code>git log --oneline --graph</code>',
    ],
    setup: async (c) => {
      await c.run(BASE_REPO);
      await c.run('cd ~/amroli-canteen && git switch -q -c feature-menu && echo "Vada Pav 20" >> menu.txt && git commit -qam "Add vada pav to menu" && git switch -q main');
      await c.run('cd ~/amroli-canteen && git switch -q -c feature-cart && echo "// cart: add items, show total" > cart.js && git add . && git commit -qm "Add cart" && git switch -q main');
      const r = await c.repo('amroli-canteen');
      c.state.menuOid = await r.refOid('refs/heads/feature-menu');
      c.state.cartOid = await r.refOid('refs/heads/feature-cart');
    },
    start: 'amroli-canteen',
    success: '<p>The first merge was a <strong>fast-forward</strong> (main just moved its label). The second needed a <strong>merge commit</strong> because both branches had new work.</p>',
  },
  {
    id: 'M-10',
    unit: 3,
    title: 'Two edits, one line',
    minutes: 15,
    brief: `<p>Dhruvi changed the opening time to <strong>8 AM</strong> on her branch <code>change-timing</code>. Meanwhile Krish changed the same line on <code>main</code> to <strong>10 AM</strong>.</p>
      <p>Hetvi decides: <strong>the canteen opens at 8 AM</strong>. Merge Dhruvi's branch and resolve the conflict.</p>`,
    goals: [
      { text: 'Merge <code>change-timing</code> into <code>main</code> and see the conflict', check: (c) => c.ran(/^git merge change-timing/) },
      { text: 'Fix <code>timing.txt</code>: only <code>Open: 8 AM</code>, no conflict markers', check: async (c) => { const t = (await c.read('amroli-canteen/timing.txt')) ?? ''; return /8 AM/.test(t) && !/10 AM/.test(t) && !/^(<{7}|={7}|>{7})/m.test(t); } },
      { text: 'Mark it resolved and finish the merge with a commit', check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r || (await r.mergeState())) return false; const m = await r.refOid('refs/heads/main'); const cm = await r.commit(m); if (cm.parent.length !== 2 || !cm.parent.includes(c.state.timingOid)) return false; const t = await r.treeMap(m); return /8 AM/.test(await r.blobText(t.get('timing.txt').oid)); } },
    ],
    hints: [
      'Run <code>git merge change-timing</code>, then <code>git status</code> and <code>cat timing.txt</code> to see both versions between the markers.',
      'Rewrite the file with only the correct line (<code>edit timing.txt</code>, or <code>echo "Open: 8 AM" &gt; timing.txt</code>), then <code>git add timing.txt</code> and <code>git commit</code>.',
      '<code>git merge change-timing</code><br><code>echo "Open: 8 AM" &gt; timing.txt</code><br><code>git add timing.txt</code><br><code>git commit -m "Merge change-timing: open at 8 AM"</code>',
    ],
    setup: async (c) => {
      await c.run(BASE_REPO);
      await c.run('cd ~/amroli-canteen && git switch -q -c change-timing');
      await as(c, DHRUVI, 'cd ~/amroli-canteen && echo "Open: 8 AM" > timing.txt && git commit -qam "Open earlier at 8 AM"');
      await c.run('cd ~/amroli-canteen && git switch -q main && echo "Open: 10 AM" > timing.txt && git commit -qam "Open later at 10 AM"');
      c.state.timingOid = await (await c.repo('amroli-canteen')).refOid('refs/heads/change-timing');
    },
    start: 'amroli-canteen',
    success: '<p>You crushed your first conflict! Git never guesses when two people change the same line: it asks a human. <code>git merge --abort</code> is always there if you want to start over.</p>',
  },
  {
    id: 'M-11',
    unit: 3,
    title: 'Spring cleaning',
    minutes: 10,
    brief: `<p>The repository is cluttered with old branches. <code>feature-menu</code> and <code>feature-cart</code> are already merged. <code>experiment</code> was a failed idea that Hetvi says nobody needs. <code>feature-cart</code> is also still on GitHub.</p>
      <p>Clean up, locally and on GitHub.</p>`,
    goals: [
      { text: 'List all branches, including GitHub\'s (<code>git branch -a</code>)', check: (c) => c.ran(/^git branch (-a|--all)\s*$/) },
      { text: 'Delete the merged branches <code>feature-menu</code> and <code>feature-cart</code>', check: async (c) => { const r = await c.repo('amroli-canteen'); return !!r && !(await r.refOid('refs/heads/feature-menu')) && !(await r.refOid('refs/heads/feature-cart')); } },
      { text: 'Delete the unmerged branch <code>experiment</code> (Git will ask you to be sure)', check: async (c) => { const r = await c.repo('amroli-canteen'); return !!r && !(await r.refOid('refs/heads/experiment')); } },
      { text: 'Delete <code>feature-cart</code> on GitHub', check: async (c) => !(await c.github.refs('krish-patel', 'amroli-canteen')).branches['feature-cart'] },
      { text: '<code>main</code> must survive with all its work', guard: true, check: async (c) => { const r = await c.repo('amroli-canteen'); return !!r && (await r.refOid('refs/heads/main')) === c.state.mainOid; } },
    ],
    hints: [
      '<code>git branch -d</code> deletes merged branches. For unmerged ones Git refuses and suggests <code>-D</code>.',
      'Deleting a branch on GitHub is a push: <code>git push origin --delete &lt;branch&gt;</code>.',
      '<code>git branch -a</code><br><code>git branch -d feature-menu</code><br><code>git branch -d feature-cart</code><br><code>git branch -D experiment</code><br><code>git push origin --delete feature-cart</code>',
    ],
    setup: async (c) => {
      await c.github.create('krish-patel', 'amroli-canteen', { description: 'Canteen pre-order app' });
      await c.run(BASE_REPO);
      await c.run('cd ~/amroli-canteen && git switch -q -c feature-menu && echo "Vada Pav 20" >> menu.txt && git commit -qam "Add vada pav" && git switch -q main && git merge -q feature-menu');
      await c.run('cd ~/amroli-canteen && git switch -q -c feature-cart && echo "// cart" > cart.js && git add . && git commit -qm "Add cart" && git switch -q main && git merge feature-cart');
      await c.run('cd ~/amroli-canteen && git switch -q -c experiment && echo "neon theme?" > theme.css && git add . && git commit -qm "Try neon theme" && git switch -q main');
      await c.run('cd ~/amroli-canteen && git remote add origin https://github.com/krish-patel/amroli-canteen.git && git push -q -u origin main && git push -q origin feature-cart');
      c.state.mainOid = await (await c.repo('amroli-canteen')).refOid('refs/heads/main');
      c.setGithubUser('krish-patel');
    },
    start: 'amroli-canteen',
    success: '<p>Deleting a branch removes only the <em>label</em>. Merged commits stay in <code>main</code>\'s history. <code>-D</code> abandoned <code>experiment</code>\'s unmerged commit, so use it only when you are sure.</p>',
  },

  /* ============================ UNIT 4 ============================ */
  {
    id: 'M-12',
    unit: 4,
    title: 'Detective',
    minutes: 15,
    brief: `<p>Mr. Desai calls: <strong>"The menu says samosa costs ₹0!"</strong> Six commits by four people went in this week. Use the history to find <strong>which commit</strong> broke the price and <strong>who</strong> made it, then fix it.</p>`,
    goals: [
      { text: 'Read the history (<code>git log</code>)', check: (c) => c.ran(/^git log/) },
      { text: 'List only the commits that changed <code>menu.txt</code>', check: (c) => c.ran(/^git log.*(--\s+)?menu\.txt/) },
      { text: 'Open the guilty commit with <code>git show &lt;id&gt;</code>', latch: true, check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r) return false; for (const cmd of c.commands()) { const m = /^git show\s+([^\s:]+)/.exec(cmd); if (!m) continue; try { if ((await r.resolve(m[1])) === c.state.badOid) return true; } catch { /* not a revision */ } } return false; } },
      { text: 'Fix the price (Samosa 15) and commit the fix', check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r) return false; const head = await r.headOid(); if (head === c.state.headOid) return false; const t = await r.treeMap(head); const menu = await r.blobText(t.get('menu.txt').oid); return /Samosa 15/.test(menu) && !/Samosa 0\b/.test(menu); } },
    ],
    hints: [
      '<code>git log --oneline</code> gives a short list. Add <code>-- menu.txt</code> to see only commits that touched the menu.',
      'Copy the short ID of a suspicious commit and run <code>git show &lt;id&gt;</code>. Lines with <code>-</code> were removed, lines with <code>+</code> were added.',
      '<code>git log --oneline -- menu.txt</code><br><code>git show HEAD~2</code> (or the commit ID you found)<br><code>edit menu.txt</code> → change <em>Samosa 0</em> to <em>Samosa 15</em><br><code>git commit -am "Fix samosa price"</code>',
    ],
    setup: async (c) => {
      await c.run(`${KRISH} && mkdir amroli-canteen && cd amroli-canteen && git init -q && echo "Samosa 15" > menu.txt && echo "Vada Pav 20" >> menu.txt && git add . && git commit -qm "Add menu"`);
      await as(c, DHRUVI, 'cd ~/amroli-canteen && echo "orders = []" > orders.py && git add . && git commit -qm "Add order system"');
      await as(c, MEET, 'cd ~/amroli-canteen && echo "CREATE TABLE orders (id INT, item TEXT);" > schema.sql && git add . && git commit -qm "Add database schema"');
      await as(c, MEET, 'cd ~/amroli-canteen && echo "Samosa 0" > menu.txt && echo "Vada Pav 20" >> menu.txt && echo "Tea 10" >> menu.txt && git commit -qam "Update price list"');
      c.state.badOid = await (await c.repo('amroli-canteen')).headOid();
      await as(c, HETVI, 'cd ~/amroli-canteen && echo "# Amroli Canteen" > README.md && git add . && git commit -qm "Add README"');
      await as(c, DHRUVI, 'cd ~/amroli-canteen && echo "next_id = 1" >> orders.py && git commit -qam "Add order numbers"');
      c.state.headOid = await (await c.repo('amroli-canteen')).headOid();
    },
    start: 'amroli-canteen',
    success: '<p>Case closed: <em>Update price list</em> by Meet set the samosa to 0, probably a typo. The history told you <strong>what</strong>, <strong>who</strong> and <strong>when</strong>. Good commit messages tell you <strong>why</strong>.</p>',
  },
  {
    id: 'M-13',
    unit: 4,
    title: 'Drop everything!',
    minutes: 10,
    brief: `<p>You are halfway through the cart code (<code>cart.js</code> is <em>not</em> ready to commit) when Hetvi messages: <strong>"The live demo shows Samosa ₹0. Fix it NOW!"</strong></p>
      <p>Park your cart work, fix and commit the price, then get your cart work back.</p>`,
    goals: [
      { text: 'Park your unfinished cart work with <code>git stash</code>', check: (c) => c.ran(/^git stash(\s+(push|save).*)?\s*$/) },
      { text: 'Fix the samosa price (15) and commit, <em>without</em> the half-done cart code', check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r) return false; const head = await r.headOid(); if (head === c.state.headOid) return false; const t = await r.treeMap(head); const menu = await r.blobText(t.get('menu.txt').oid); const cart = await r.blobText(t.get('cart.js').oid); return /Samosa 15/.test(menu) && !/half-done/.test(cart); } },
      { text: 'Bring your cart work back (<code>git stash pop</code>)', check: async (c) => /half-done/.test((await c.read('amroli-canteen/cart.js')) ?? '') && c.ran(/^git stash (pop|apply)/) },
    ],
    hints: [
      '<code>git stash</code> saves your changes and gives you a clean working tree. Check with <code>git status</code> and <code>git stash list</code>.',
      'Fix with <code>edit menu.txt</code> (or <code>echo "Samosa 15" &gt; menu.txt</code>), commit it, then <code>git stash pop</code>.',
      '<code>git stash</code><br><code>echo "Samosa 15" &gt; menu.txt</code><br><code>git commit -am "Fix samosa price"</code><br><code>git stash pop</code>',
    ],
    setup: async (c) => {
      await c.run(`${KRISH} && mkdir amroli-canteen && cd amroli-canteen && git init -q && echo "Samosa 0" > menu.txt && echo "// cart" > cart.js && git add . && git commit -qm "Add menu and cart"`);
      await c.run('cd ~/amroli-canteen && echo "function total() { // half-done: do not commit yet" >> cart.js');
      c.state.headOid = await (await c.repo('amroli-canteen')).headOid();
    },
    start: 'amroli-canteen',
    success: '<p>The fix went out cleanly and your half-done work came back exactly as it was. That is what <code>stash</code> is for.</p>',
  },
  {
    id: 'M-14',
    unit: 4,
    title: 'Release day',
    minutes: 10,
    brief: `<p>Today is the <strong>Spectrum 2026</strong> tech fest. Hetvi wants a permanent name for the version being demonstrated: <code>v1.0</code>, with a message, and on GitHub so everyone can find it.</p>`,
    goals: [
      { text: 'Create an <strong>annotated</strong> tag <code>v1.0</code> with a message', check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r) return false; const o = await r.refOid('refs/tags/v1.0'); if (!o) return false; return (await c.objectType(r, o)) === 'tag'; } },
      { text: 'The tag must point to the latest commit on <code>main</code>', check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r) return false; const o = await r.refOid('refs/tags/v1.0'); return !!o && (await r.peel(o)) === (await r.refOid('refs/heads/main')); } },
      { text: 'Inspect it with <code>git show v1.0</code>', check: (c) => c.ran(/^git show v1\.0/) },
      { text: 'Push the tag to GitHub', check: async (c) => !!(await c.github.refs('krish-patel', 'amroli-canteen')).tags['v1.0'] },
    ],
    hints: [
      'Annotated tags use <code>-a</code> and <code>-m</code>: <code>git tag -a &lt;name&gt; -m "&lt;message&gt;"</code>.',
      'Tags are not pushed with a normal <code>git push</code>. Push it by name: <code>git push origin v1.0</code>.',
      '<code>git tag -a v1.0 -m "Released at Spectrum 2026"</code><br><code>git show v1.0</code><br><code>git push origin v1.0</code>',
    ],
    setup: async (c) => {
      await c.github.create('krish-patel', 'amroli-canteen', { description: 'Canteen pre-order app' });
      await c.run(`${BASE_REPO} && echo "// cart" > cart.js && git add . && git commit -qm "Add cart" && git remote add origin https://github.com/krish-patel/amroli-canteen.git && git push -q -u origin main`);
      c.setGithubUser('krish-patel');
    },
    start: 'amroli-canteen',
    success: '<p>Months from now anyone can run <code>git checkout v1.0</code> to see exactly what was demonstrated at Spectrum 2026.</p>',
  },
  {
    id: 'M-15',
    unit: 4,
    title: 'Undo, the safe way',
    minutes: 15,
    brief: `<p>Three different mistakes, three different undo tools:</p>
      <ol><li><code>menu.txt</code> has messy <strong>uncommitted</strong> edits. Throw them away.</li>
      <li>The last commit, <em>Add debug notes</em>, was <strong>never pushed</strong>. Remove it.</li>
      <li><em>Change prices</em> <strong>was pushed</strong> and the team already has it, but it set every price to ₹99. Undo it safely, then push the fix.</li></ol>`,
    goals: [
      { text: 'Discard the uncommitted edits in <code>menu.txt</code>', check: async (c) => { const t = (await c.read('amroli-canteen/menu.txt')) ?? ''; return !/garbage/.test(t) && c.ran(/^git (restore|checkout)\b.*menu\.txt/); } },
      { text: 'Remove the unpushed commit <em>Add debug notes</em> (use <code>git reset</code>)', check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r) return false; const m = await r.refOid('refs/heads/main'); return !(await r.isAncestor(c.state.debugOid, m)) && c.ran(/^git reset/); } },
      { text: 'Undo the pushed <em>Change prices</em> with <code>git revert</code> (history kept)', check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r) return false; const m = await r.refOid('refs/heads/main'); if (!(await r.isAncestor(c.state.badOid, m))) return false; const t = await r.treeMap(m); return !/99/.test(await r.blobText(t.get('menu.txt').oid)) && /^Revert/.test((await r.commit(m)).message); } },
      { text: 'Push the fix to GitHub', check: async (c) => { const r = await c.repo('amroli-canteen'); if (!r) return false; const refs = await c.github.refs('krish-patel', 'amroli-canteen'); return refs.branches.main === (await r.refOid('refs/heads/main')) && refs.branches.main !== c.state.badOid; } },
    ],
    hints: [
      'Uncommitted → <code>restore</code>. Committed but not pushed → <code>reset</code>. Pushed → <code>revert</code>.',
      '<code>git restore menu.txt</code>, then <code>git reset --hard HEAD~1</code> removes the debug commit (it only adds a debug file). Then <code>git revert HEAD</code>.',
      '<code>git restore menu.txt</code><br><code>git reset --hard HEAD~1</code><br><code>git revert HEAD --no-edit</code><br><code>git push</code>',
    ],
    setup: async (c) => {
      await c.github.create('krish-patel', 'amroli-canteen', { description: 'Canteen pre-order app' });
      await c.run(`${KRISH} && mkdir amroli-canteen && cd amroli-canteen && git init -q && echo "Samosa 15" > menu.txt && echo "Tea 10" >> menu.txt && git add . && git commit -qm "Add menu"`);
      await c.run('cd ~/amroli-canteen && echo "Samosa 99" > menu.txt && echo "Tea 99" >> menu.txt && git commit -qam "Change prices" && git remote add origin https://github.com/krish-patel/amroli-canteen.git && git push -q -u origin main');
      c.state.badOid = await (await c.repo('amroli-canteen')).headOid();
      await c.run('cd ~/amroli-canteen && echo "debug: print every order" > debug.txt && git add . && git commit -qm "Add debug notes"');
      c.state.debugOid = await (await c.repo('amroli-canteen')).headOid();
      await c.run('cd ~/amroli-canteen && echo "garbage garbage" >> menu.txt');
      c.setGithubUser('krish-patel');
    },
    start: 'amroli-canteen',
    success: '<p>You picked the right tool each time: <code>restore</code> for uncommitted edits, <code>reset</code> for local commits, <code>revert</code> for pushed ones. That last one kept the team\'s history safe.</p>',
  },
);

/** Missions planned for later milestones (shown as "coming soon" on the Missions page). */
export const UPCOMING = [];
