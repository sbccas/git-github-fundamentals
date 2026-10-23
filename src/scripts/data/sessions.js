/** The 15 two-hour sessions (docs/faculty-guide.md §3). `deck: true` once its slides exist. */
export const SESSIONS = [
  { n: 1, unit: 1, title: 'Why version control?', practice: [], deck: true },
  { n: 2, unit: 1, title: 'Installing Git, config, help & GitHub account', practice: ['M-01', 'M-02', 'L-01'], deck: true },
  { n: 3, unit: 2, title: 'Terminal basics, git init & the three stages', practice: ['M-03'], deck: true },
  { n: 4, unit: 2, title: 'status, add and commit in depth', practice: ['M-04'], deck: true },
  { n: 5, unit: 2, title: 'Local vs remote: push, clone & your first GitHub repo', practice: ['M-05', 'M-07'], deck: true },
  { n: 6, unit: 2, title: 'Teamwork: fetch vs pull', practice: ['M-06'], deck: true },
  { n: 7, unit: 3, title: 'Branches: create & switch', practice: ['M-08'], deck: true },
  { n: 8, unit: 3, title: 'Merging & resolving conflicts', practice: ['M-09', 'M-10'], deck: true },
  { n: 9, unit: 3, title: 'Deleting branches & team branching workflow', practice: ['M-11'], deck: true },
  { n: 10, unit: 4, title: 'Reading history: log, diff, show', practice: ['M-12'], deck: true },
  { n: 11, unit: 4, title: 'stash & tags', practice: ['M-13', 'M-14'], deck: true },
  { n: 12, unit: 4, title: 'Undoing changes: restore, reset, revert', practice: ['M-15'], deck: true },
  { n: 13, unit: 5, title: 'The GitHub interface, repositories & issues', practice: ['L-02', 'L-03'], deck: false },
  { n: 14, unit: 5, title: 'Forks, pull requests & the cheat sheet', practice: ['L-04'], deck: false },
  { n: 15, unit: 0, title: 'Final practical, self-check & showcase', practice: [], deck: false },
];

export const pad2 = (n) => String(n).padStart(2, '0');

/** Handbook chapter per unit (anchor ids in docs/faculty-handbook). */
export const HANDBOOK_CHAPTERS = { 1: 'chapter-1', 2: 'chapter-2', 3: 'chapter-3', 4: 'chapter-4' };
