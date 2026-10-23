/**
 * Story missions (PRD §6.3). Each mission:
 *   id, unit, title, minutes, brief (HTML), goals [{ text, check(ctx) → bool, optional }], hints [3], setup(ctx), success (HTML)
 *
 * ctx helpers (see src/scripts/missions/engine.js):
 *   ctx.run(cmd)            run a shell command silently (setup only)
 *   ctx.ran(re, after?)     did the student run a command matching re (after the first command matching `after`)?
 *   ctx.globalConfig(key)   value in ~/.gitconfig
 *   ctx.repo(path)          Repo at ~/path (or null)
 *   ctx.files(repo)         Map of files in HEAD
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

/** Missions planned for later milestones (shown as "coming soon" on the Missions page). */
export const UPCOMING = [
  { id: 'M-08', unit: 3, title: 'Parallel universe' },
  { id: 'M-09', unit: 3, title: 'Bring it home' },
  { id: 'M-10', unit: 3, title: 'Two edits, one line' },
  { id: 'M-11', unit: 3, title: 'Spring cleaning' },
  { id: 'M-12', unit: 4, title: 'Detective' },
  { id: 'M-13', unit: 4, title: 'Drop everything!' },
  { id: 'M-14', unit: 4, title: 'Release day' },
  { id: 'M-15', unit: 4, title: 'Undo, the safe way' },
];
