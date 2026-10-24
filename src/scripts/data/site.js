/**
 * Single source of course facts used across pages (PRD §5, §10).
 * Lesson text itself lives in /content (added from Milestone 3).
 */

// Vite sets import.meta.env; the fallback lets `npm test` import this file under plain Node.
export const BASE = import.meta.env?.BASE_URL ?? '/git-github-fundamentals/';

/** Feature flags. facultySection shows the Faculty card on the About page (PRD D-6). */
export const FEATURES = {
  facultySection: true,
};

/**
 * Faculty shown on the About page once FEATURES.facultySection is true (PRD D-6).
 * Fields: name, role, dept, and optionally email, github (profile URL) and photo (a file in public/faculty/,
 * about 192×192 px; without one the card shows the first letter of the name).
 */
export const FACULTY = [
  { name: 'Hitesh Patel', role: 'Department Coordinator', dept: 'B.Sc. Data Science', github: 'https://github.com/contact2hitech', photo: 'faculty/hitesh-patel.webp' },
];

/** Who built this course website (About page and footer). */
export const CREATOR = { name: 'Hitesh Patel', github: 'https://github.com/contact2hitech' };

export const COLLEGE = {
  name: 'Sutex Bank College of Computer Applications & Science',
  shortName: 'SBCCAS',
  popularName: 'Amroli College',
  location: 'Amroli, Surat, Gujarat, India',
  affiliation: 'Veer Narmad South Gujarat University (VNSGU)',
  trust: 'Jivan Jyot Trust',
  email: 'info@amrolicollege.ac.in',
  website: 'https://www.amrolicollege.ac.in',
  github: 'https://github.com/sbccas',
  portal: 'https://sbccas.github.io/',
  instagram: 'https://www.instagram.com/amrolicollege.official/',
  programmes: ['BCA', 'BCA – AI', 'B.Sc. Data Science', 'M.Sc. IT'],
};

export const COURSE = {
  title: 'Git & GitHub Fundamentals',
  credits: 2,
  hours: 30,
  sessions: 15,
  sessionHours: 2,
  missions: 15,
  labs: 4,
};

export const UNITS = [
  {
    n: 1,
    slug: 'unit-1',
    title: 'Introduction to Version Control',
    short: 'Version control',
    hours: 4,
    color: 'var(--u1)',
    summary: 'Why version control exists, the three kinds of VCS, and setting up Git and GitHub on Windows.',
    topics: ['Local, centralized & distributed VCS', 'Benefits of Git & GitHub', 'Installing Git on Windows', 'git config', 'git help', 'Creating a GitHub account'],
    missions: ['M-01', 'M-02'],
  },
  {
    n: 2,
    slug: 'unit-2',
    title: 'Getting Started with Git',
    short: 'Getting started',
    hours: 8,
    color: 'var(--u2)',
    summary: 'Local and remote repositories, the three stages, and the everyday commands — from your first commit to your first push.',
    topics: ['Local vs remote repositories', 'init · status · add · commit', 'push · clone', 'pull · fetch', 'Your first repository'],
    missions: ['M-03', 'M-04', 'M-05', 'M-06', 'M-07'],
  },
  {
    n: 3,
    slug: 'unit-3',
    title: 'Branching and Merging',
    short: 'Branching',
    hours: 6,
    color: 'var(--u3)',
    summary: 'Work in parallel with branches, bring work together with merges, and calmly resolve conflicts.',
    topics: ['Introduction to branches', 'Creating & switching branches', 'Merging & resolving conflicts', 'Deleting branches'],
    missions: ['M-08', 'M-09', 'M-10', 'M-11'],
  },
  {
    n: 4,
    slug: 'unit-4',
    title: 'Advanced Git Commands',
    short: 'Advanced',
    hours: 6,
    color: 'var(--u4)',
    summary: 'Read history like a detective, park work with stash, mark releases with tags, and undo mistakes safely.',
    topics: ['log · diff · show', 'stash', 'Tags', 'reset', 'Undoing: revert, reset, checkout'],
    missions: ['M-12', 'M-13', 'M-14', 'M-15'],
  },
  {
    n: 5,
    slug: 'unit-5',
    title: 'Introduction to GitHub',
    short: 'GitHub',
    hours: 4,
    color: 'var(--u5)',
    summary: 'Find your way around GitHub, manage repositories, use issues, and contribute with forks and pull requests.',
    topics: ['Navigating the GitHub interface', 'Creating & managing repositories', 'Issues & pull requests', 'Forking repositories', 'Git cheat sheet'],
    missions: ['L-01', 'L-02', 'L-03', 'L-04'],
  },
];

/** Story cast used in lessons, missions and quizzes (docs/reference-examples.md §1). */
export const CAST = [
  { name: 'Krish', role: 'Frontend', files: 'index.html · menu.css · cart.js', color: 'var(--u1)' },
  { name: 'Dhruvi', role: 'Backend', files: 'app.py · orders.py', color: 'var(--u2)' },
  { name: 'Meet', role: 'Database', files: 'schema.sql · seed.sql', color: 'var(--u3)' },
  { name: 'Hetvi', role: 'Team lead', files: 'README.md · reviews PRs', color: 'var(--u5)' },
];

/** Pages that exist on the site (PRD §6.1). milestone = when the page gets its real content. */
export const PAGES = [
  { slug: '', title: 'Home', desc: 'Course overview', milestone: 1 },
  { slug: 'playground/', title: 'Playground', desc: 'Real Git terminal in your browser', milestone: 2 },
  { slug: 'missions/', title: 'Missions', desc: 'Story-based Git challenges', milestone: 3 },
  { slug: 'passport/', title: 'Git Passport', desc: 'Your XP, level, badges and next step', milestone: 7 },
  { slug: 'book/student/', title: 'Student ebook', desc: 'The whole course as a book — read online or download the PDF', milestone: 8 },
  { slug: 'labs/', title: 'Labs', desc: 'Practical assignments on real GitHub', milestone: 3 },
  { slug: 'cheatsheet/', title: 'Cheat sheet', desc: 'Every command on one page', milestone: 5 },
  { slug: 'self-check/', title: 'Self-check', desc: 'Final 40-question practice test', milestone: 5 },
  { slug: 'bonus/', title: 'Bonus', desc: 'Beyond the syllabus', milestone: 5 },
  { slug: 'glossary/', title: 'Glossary', desc: 'Every term, explained', milestone: 5 },
  { slug: 'about/', title: 'About', desc: 'Course and college details', milestone: 5 },
  { slug: 'teach/', title: 'Teach', desc: 'Lecture slides, session plans and the faculty handbook', milestone: 3 },
  { slug: 'teach/guide/', title: 'Faculty guide', desc: 'How to run each of the 15 sessions', milestone: 3 },
  { slug: 'teach/handbook/', title: 'Faculty handbook', desc: 'Story bible, deeper explanations and examples', milestone: 3 },
  { slug: 'book/faculty/', title: 'Faculty Handbook ebook', desc: 'The faculty handbook as a printable book (PDF)', milestone: 8 },
];

/** Commands for the search palette — each points to the unit that teaches it. */
export const COMMANDS = [
  ['git --version', 1, 'Check that Git is installed'],
  ['git config', 1, 'Set your name, email and preferences'],
  ['git help', 1, 'Open Git’s built-in manual'],
  ['git init', 2, 'Create a new repository'],
  ['git status', 2, 'See what has changed'],
  ['git add', 2, 'Stage changes for the next commit'],
  ['git commit', 2, 'Save a snapshot'],
  ['git remote', 2, 'Connect to GitHub'],
  ['git push', 2, 'Upload commits'],
  ['git clone', 2, 'Copy a repository from GitHub'],
  ['git fetch', 2, 'Download without merging'],
  ['git pull', 2, 'Download and merge'],
  ['git restore --staged', 2, 'Unstage a file'],
  ['git branch', 3, 'List, create or delete branches'],
  ['git switch', 3, 'Move between branches'],
  ['git checkout', 3, 'Switch branches (classic form) or restore files'],
  ['git merge', 3, 'Combine branches'],
  ['git merge --abort', 3, 'Cancel a merge in progress'],
  ['git log', 4, 'Read the project history'],
  ['git diff', 4, 'See exactly what changed'],
  ['git show', 4, 'Inspect one commit'],
  ['git stash', 4, 'Park unfinished work'],
  ['git tag', 4, 'Mark a release'],
  ['git reset', 4, 'Move a branch back (local undo)'],
  ['git revert', 4, 'Undo a commit safely with a new commit'],
  ['git restore', 4, 'Discard changes in a file'],
].map(([cmd, unit, desc]) => ({ cmd, unit, desc }));

export const pageUrl = (slug) => `${BASE}${slug}`;
