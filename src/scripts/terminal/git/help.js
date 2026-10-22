/**
 * Help text for `git help`, `git help <cmd>` and `git <cmd> -h`.
 * Usage lines follow Git's own synopsis; descriptions are written for this course.
 */
import { bold } from '../ansi.js';

export const COMMANDS = {
  init: { summary: 'Create an empty Git repository or reinitialize an existing one', usage: ['git init [-b <branch-name>] [<directory>]'], about: 'Creates a hidden .git folder that stores the history of this project. Run it once, inside your project folder.', examples: ['git init', 'git init amroli-canteen', 'git init -b main'] },
  clone: { summary: 'Clone a repository into a new directory', usage: ['git clone <repository> [<directory>]'], about: 'Downloads a full copy of a repository (all files and all history) and connects it to the original as "origin".', examples: ['git clone https://github.com/student/amroli-canteen.git'] },
  config: { summary: 'Get and set repository or global options', usage: ['git config [--global | --local] <name> <value>', 'git config [--global | --local] <name>', 'git config [--global | --local] --list', 'git config [--global | --local] --unset <name>'], about: 'Stores settings. --global applies to every repository for your user; without it (inside a repo) the setting applies to this repository only.', examples: ['git config --global user.name "Your Name"', 'git config --global user.email "you@example.com"', 'git config --list'] },
  help: { summary: 'Display help information about Git', usage: ['git help [<command>]', 'git help -g', 'git <command> -h'], about: 'Shows help. `git help <command>` gives the manual for one command; `git <command> -h` gives a short usage summary.', examples: ['git help commit', 'git commit -h', 'git help -g'] },
  add: { summary: 'Add file contents to the index', usage: ['git add [<options>] [--] <pathspec>...'], about: 'Moves changes into the staging area so they are included in the next commit. `git add .` stages everything in the current folder.', options: ['-A, --all    stage all changes in the repository', '-u, --update stage changes to tracked files only', '-f, --force  allow adding ignored files'], examples: ['git add README.md', 'git add .', 'git add *.css'] },
  rm: { summary: 'Remove files from the working tree and from the index', usage: ['git rm [--cached] [-r] [--] <pathspec>...'], about: 'Deletes a tracked file and stages the deletion. With --cached the file stays on disk but Git stops tracking it.', examples: ['git rm old.txt', 'git rm --cached secrets.txt'] },
  restore: { summary: 'Restore working tree files', usage: ['git restore [--staged] [--worktree] [--source=<tree>] [--] <pathspec>...'], about: 'Without options, throws away unstaged edits to a file. With --staged, unstages a file but keeps your edit.', examples: ['git restore menu.txt', 'git restore --staged menu.txt'] },
  status: { summary: 'Show the working tree status', usage: ['git status [-s] [-b]'], about: 'Shows which files are untracked, modified, or staged, and how your branch compares with its upstream.', examples: ['git status', 'git status -s'] },
  commit: { summary: 'Record changes to the repository', usage: ['git commit [-a] [-m <msg>] [--amend] [--allow-empty]'], about: 'Saves a snapshot of everything in the staging area, with a message describing the change.', options: ['-m <msg>     use the given message', '-a, --all    stage modified and deleted tracked files first', '--amend      replace the last commit'], examples: ['git commit -m "Add menu page"', 'git commit -am "Fix cart total"'] },
  log: { summary: 'Show commit logs', usage: ['git log [<options>] [<revision-range>] [[--] <path>...]'], about: 'Lists commits, newest first.', options: ['--oneline           one line per commit', '--graph             draw the branch graph', '--all               include every branch', '-n <n>, -<n>        limit the number of commits', '--author=<name>     only commits by this author', '--grep=<text>       only commits whose message contains text', '--stat, -p          show changed files / full patch'], examples: ['git log --oneline', 'git log --oneline --graph --all', 'git log -n 3', 'git log -- menu.txt'] },
  diff: { summary: 'Show changes between commits, commit and working tree, etc', usage: ['git diff [<options>] [<commit>] [--] [<path>...]', 'git diff [<options>] --staged [<commit>] [--] [<path>...]', 'git diff [<options>] <commit> <commit> [--] [<path>...]'], about: 'Shows line-by-line changes. Lines starting with - were removed, lines starting with + were added.', examples: ['git diff', 'git diff --staged', 'git diff main feature-cart'] },
  show: { summary: 'Show various types of objects', usage: ['git show [<options>] [<object>...]'], about: 'Shows one commit (its message and changes), a tag, or a file at a revision (rev:path).', examples: ['git show', 'git show HEAD~1', 'git show v1.0', 'git show HEAD:menu.txt'] },
  branch: { summary: 'List, create, or delete branches', usage: ['git branch [-a | -r] [-v]', 'git branch <branchname> [<start-point>]', 'git branch (-d | -D) <branchname>...', 'git branch (-m | -M) [<oldbranch>] <newbranch>'], about: 'Without arguments lists branches (* marks the current one). With a name, creates a branch but does not switch to it.', examples: ['git branch', 'git branch feature-cart', 'git branch -d feature-cart', 'git branch -M main'] },
  switch: { summary: 'Switch branches', usage: ['git switch <branch>', 'git switch -c <new-branch> [<start-point>]', 'git switch --detach <commit>'], about: 'Moves you to another branch and updates your files to match it. -c creates the branch first.', examples: ['git switch main', 'git switch -c feature-menu'] },
  checkout: { summary: 'Switch branches or restore working tree files', usage: ['git checkout <branch>', 'git checkout -b <new-branch> [<start-point>]', 'git checkout <commit>', 'git checkout [<commit>] -- <pathspec>...'], about: 'The classic all-in-one command: switches branches, creates branches (-b), visits an old commit (detached HEAD), or restores files (-- <file>). Newer Git splits this into switch and restore.', examples: ['git checkout main', 'git checkout -b feature-cart', 'git checkout -- menu.txt'] },
  merge: { summary: 'Join two or more development histories together', usage: ['git merge [--no-ff] [--ff-only] [-m <msg>] <commit>', 'git merge --abort', 'git merge --continue'], about: 'Brings the commits of another branch into the current branch. If both changed the same lines, Git stops and asks you to resolve the conflict.', examples: ['git merge feature-cart', 'git merge --abort'] },
  reset: { summary: 'Reset current HEAD to the specified state', usage: ['git reset [--soft | --mixed | --hard] [<commit>]', 'git reset [<commit>] [--] <pathspec>...'], about: 'Moves the current branch to another commit. --soft keeps changes staged, --mixed (default) keeps them unstaged, --hard throws them away.', examples: ['git reset --soft HEAD~1', 'git reset HEAD~1', 'git reset --hard HEAD~1', 'git reset menu.txt'] },
  revert: { summary: 'Revert some existing commits', usage: ['git revert [--no-edit] <commit>'], about: 'Creates a new commit that undoes an earlier one. Safe for commits that are already pushed.', examples: ['git revert HEAD', 'git revert a1b2c3d --no-edit'] },
  stash: { summary: 'Stash the changes in a dirty working directory away', usage: ['git stash [push [-m <message>]]', 'git stash list', 'git stash (pop | apply | drop) [<stash>]', 'git stash show [-p] [<stash>]', 'git stash clear'], about: 'Parks your unfinished changes so the working tree is clean, then brings them back later.', examples: ['git stash', 'git stash push -m "cart in progress"', 'git stash list', 'git stash pop'] },
  tag: { summary: 'Create, list, delete or verify tags', usage: ['git tag [-l [<pattern>]] [-n]', 'git tag [-a] [-m <msg>] [-f] <tagname> [<commit>]', 'git tag -d <tagname>...'], about: 'Gives a commit a permanent name such as v1.0. Annotated tags (-a) also store a message, author and date.', examples: ['git tag v1.0', 'git tag -a v1.1 -m "Menu and cart released"', 'git tag -d v1.0'] },
  remote: { summary: 'Manage set of tracked repositories', usage: ['git remote [-v]', 'git remote add <name> <url>', 'git remote remove <name>', 'git remote set-url <name> <newurl>', 'git remote get-url <name>'], about: 'Remotes are short names (usually "origin") for repositories on GitHub.', examples: ['git remote add origin https://github.com/student/amroli-canteen.git', 'git remote -v'] },
  fetch: { summary: 'Download objects and refs from another repository', usage: ['git fetch [<remote>] [--all] [--prune]'], about: 'Downloads new commits from GitHub into origin/... branches without changing your own branch or files.', examples: ['git fetch', 'git fetch origin'] },
  pull: { summary: 'Fetch from and integrate with another repository or a local branch', usage: ['git pull [<remote> [<branch>]] [--ff-only] [--no-ff]'], about: 'git fetch followed by git merge: downloads new commits and merges them into your current branch.', examples: ['git pull', 'git pull origin main'] },
  push: { summary: 'Update remote refs along with associated objects', usage: ['git push [-u] [<remote> [<branch>...]]', 'git push <remote> --delete <branch>', 'git push <remote> --tags'], about: 'Uploads your commits to GitHub. -u remembers the remote branch so later you can just type git push.', examples: ['git push -u origin main', 'git push', 'git push origin v1.0', 'git push origin --delete feature-cart'] },
};

const GROUPS = [
  ['start a working area', ['clone', 'init']],
  ['work on the current change', ['add', 'restore', 'rm']],
  ['examine the history and state', ['diff', 'log', 'show', 'status']],
  ['grow, mark and tweak your common history', ['branch', 'commit', 'merge', 'reset', 'revert', 'switch', 'tag']],
  ['collaborate', ['fetch', 'pull', 'push']],
];

export function mainHelp() {
  const lines = [
    'usage: git [-v | --version] [-h | --help] <command> [<args>]',
    '',
    'These are common Git commands used in various situations:',
  ];
  for (const [title, cmds] of GROUPS) {
    lines.push('', title);
    for (const c of cmds) lines.push(`   ${c.padEnd(10)}${COMMANDS[c].summary}`);
  }
  lines.push('', "'git help -g' lists concept guides. See 'git help <command>'", 'to read about a specific subcommand.', '');
  lines.push('Also available here: checkout, config, help, remote, stash.');
  return `${lines.join('\n')}\n`;
}

export function usage(cmd) {
  const c = COMMANDS[cmd];
  const lines = c.usage.map((u, i) => `${i ? '   or: ' : 'usage: '}${u}`);
  if (c.options) lines.push('', ...c.options.map((o) => `    ${o}`));
  return `${lines.join('\n')}\n`;
}

export function manual(cmd) {
  const c = COMMANDS[cmd];
  return [
    bold('NAME'), `       git-${cmd} - ${c.summary}`, '',
    bold('SYNOPSIS'), ...c.usage.map((u) => `       ${u}`), '',
    bold('DESCRIPTION'), `       ${c.about}`, '',
    ...(c.options ? [bold('OPTIONS'), ...c.options.map((o) => `       ${o}`), ''] : []),
    bold('EXAMPLES'), ...c.examples.map((e) => `       ${e}`), '',
  ].join('\n');
}

export const GUIDES = {
  everyday: 'A useful minimum set of commands for everyday Git',
  glossary: 'A Git Glossary',
  ignore: 'Specifies intentionally untracked files to ignore',
  revisions: 'Specifying revisions and ranges for Git',
  tutorial: 'A tutorial introduction to Git',
  workflows: 'An overview of recommended workflows with Git',
};

export const GUIDE_TEXT = {
  everyday: 'Daily loop: git status → git add <file> → git commit -m "message" → git push.\nStart of the day: git pull. New feature: git switch -c <branch>.',
  glossary: 'Repository: a project tracked by Git.  Commit: a saved snapshot.  Branch: a movable name for a line of work.\nHEAD: where you are now.  Remote: a copy on another computer, e.g. GitHub ("origin").\nOpen the Glossary page of this course for the full list.',
  ignore: 'A .gitignore file lists files Git should not track, one pattern per line:\n  node_modules/\n  *.log\n  .env',
  revisions: 'HEAD = current commit.  HEAD~1 = one commit before.  HEAD^2 = second parent of a merge.\nmain..feature = commits on feature that are not on main.  a1b2c3d = a commit by its short hash.',
  tutorial: 'mkdir project && cd project\ngit init\necho "# Project" > README.md\ngit add README.md\ngit commit -m "Add README"\ngit log --oneline',
  workflows: 'Feature-branch workflow: keep main working; create one branch per feature; open a pull request;\nreview; merge; delete the branch. Pull before you start, push when you finish.',
};
