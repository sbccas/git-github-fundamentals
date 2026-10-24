/**
 * Course ebooks (PRD P-12, F-19): renders the Student Edition and the Faculty Handbook as one long, printable page.
 * Used by vite.config.js for `<!-- @book student -->` / `<!-- @book faculty -->`. Page numbers for the contents come
 * from build/book-pages.json, written by `npm run ebooks` (scripts/ebooks.mjs) after a first print.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { COURSE, COLLEGE, UNITS, FACULTY, CREATOR } from '../src/scripts/data/site.js';
import { SESSIONS } from '../src/scripts/data/sessions.js';
import { MISSIONS } from '../content/missions/missions.js';

export const LIVE = 'https://sbccas.github.io/git-github-fundamentals/';
export const EDITION = 'Edition 1 · October 2026';
export const BOOKS = {
  student: { title: 'Git & GitHub Fundamentals', edition: 'Student Edition', pdf: 'books/git-github-fundamentals-student-edition.pdf' },
  faculty: { title: 'Teaching Git & GitHub with Stories', edition: 'Faculty Edition', pdf: 'books/git-github-fundamentals-faculty-handbook.pdf' },
};
const HANDBOOK = ['00-story-bible', '01-unit-1', '02-unit-2', '03-unit-3', '04-unit-4', '05-unit-5', '06-appendices'];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const strip = (html) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/**
 * Make a rendered lesson fit inside the book: prefix its ids (every unit has a #summary), point links to other
 * lessons at their place in the book, and send other site links to the live site (they must work inside the PDF).
 */
function adaptLesson(html, n, base) {
  const prefix = `u${n}-`;
  const b = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html
    .replace(/\sid="([^"]+)"/g, ` id="${prefix}$1"`)
    .replace(/href="#([^"]+)"/g, `href="#${prefix}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`)
    .replace(new RegExp(`href="${b}unit-(\\d)/#([^"]+)"`, 'g'), (_, u, id) => `href="#u${u}-${id}"`)
    .replace(new RegExp(`href="${b}unit-(\\d)/"`, 'g'), (_, u) => `href="#chapter-${u}"`)
    .replace(new RegExp(`href="${b}`, 'g'), `href="${LIVE}`)
    // Lesson h2 sections become h3 under the chapter heading (a clean outline for PDF bookmarks).
    .replace(/<(\/?)h([2-5])([\s>])/g, (_, slash, d, rest) => `<${slash}h${Number(d) + 1}${rest}`);
}

function pageNumbers(project) {
  const f = join(project, 'build/book-pages.json');
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
}

function cover(kind) {
  const b = BOOKS[kind];
  return `<section class="bk-cover" aria-label="Cover">
    <div class="bk-cover-top"><span>${esc(COLLEGE.shortName)} · ${esc(COLLEGE.popularName)}, Surat</span><span class="bk-pill">${esc(b.edition)}</span></div>
    <div class="bk-cover-main">
      <p class="bk-cover-kicker">Certificate course · ${COURSE.credits} credits · ${COURSE.hours} hours</p>
      <h1 class="bk-cover-title">${kind === 'student' ? 'Git &amp; <span>GitHub</span><br>Fundamentals' : 'Teaching <span>Git &amp; GitHub</span><br>with Stories'}</h1>
      <p class="bk-cover-sub">${kind === 'student'
        ? 'Version control from your first commit to your first pull request — told through the Amroli Canteen project.'
        : 'The faculty handbook: the Amroli Canteen story bible, deeper explanations and classroom examples for every unit.'}</p>
      <div class="bk-cover-graph" aria-hidden="true">
        <svg viewBox="0 0 600 120"><path d="M20 80 H580" class="g1"/><path d="M180 80 C230 80 230 30 280 30 H400 C450 30 450 80 500 80" class="g2"/>
        ${[20, 100, 180, 340, 500, 580].map((x) => `<circle cx="${x}" cy="80" r="11" class="c1"/>`).join('')}
        ${[280, 400].map((x) => `<circle cx="${x}" cy="30" r="11" class="c2"/>`).join('')}</svg>
      </div>
    </div>
    <div class="bk-cover-foot">
      <p><strong>${esc(COLLEGE.name)}</strong><br>${esc(COLLEGE.popularName)} · Affiliated to ${esc(COLLEGE.affiliation)} · ${esc(COLLEGE.trust)}</p>
      <p class="bk-cover-url">${LIVE.replace('https://', '')}<br><span>${EDITION}</span></p>
    </div>
  </section>`;
}

function about(kind, base) {
  const faculty = FACULTY.map((f) => `<div class="bk-person">
      ${f.photo ? `<img src="${base}${esc(f.photo)}" alt="Photo of ${esc(f.name)}" width="64" height="64">` : ''}
      <div><strong>${esc(f.name)}</strong><span>${esc(f.role)} · ${esc(f.dept)}</span>
      ${f.github ? `<a href="${esc(f.github)}">github.com/${esc(f.github.split('/').pop())}</a>` : ''}${f.email ? ` · <a href="mailto:${esc(f.email)}">${esc(f.email)}</a>` : ''}</div>
    </div>`).join('');
  const use = kind === 'student'
    ? `<p>Read a chapter, then <strong>practise in your browser</strong> — the course website runs real Git on your phone or a lab PC, with no installation:</p>
       <ul><li><strong>Playground:</strong> <a href="${LIVE}playground/">${LIVE.replace('https://', '')}playground/</a></li>
       <li><strong>Missions</strong> (15 story challenges): <a href="${LIVE}missions/">${LIVE.replace('https://', '')}missions/</a></li>
       <li><strong>Unit quizzes, labs and your Git Passport</strong> are on the website too.</li></ul>
       <p>Commands in grey boxes are real: type the lines starting with <code>$</code>, without the <code>$</code>.</p>`
    : `<p>Read a chapter <strong>before</strong> you teach its unit. The <a href="${LIVE}teach/guide/">faculty guide</a> says how to run each session;
       this book says what to know. Slides for all 15 sessions are on the <a href="${LIVE}teach/">Teach</a> page.</p>`;
  return `<section class="bk-about">
    <h2 id="about-book">About this book</h2>
    <div class="bk-about-grid">
      <div>
        <h3>The course</h3>
        <dl class="bk-dl">
          <div><dt>Course</dt><dd>${esc(COURSE.title)} (certificate course)</dd></div>
          <div><dt>Credits · hours</dt><dd>${COURSE.credits} credits · ${COURSE.hours} hours · ${COURSE.sessions} sessions of ${COURSE.sessionHours} hours</dd></div>
          <div><dt>Units</dt><dd>${UNITS.map((u) => `${u.n}. ${esc(u.title)} (${u.hours} h)`).join('<br>')}</dd></div>
          <div><dt>For</dt><dd>${COLLEGE.programmes.map(esc).join(' · ')} students</dd></div>
          <div><dt>Practice</dt><dd>${MISSIONS.length} browser missions · ${COURSE.labs} GitHub labs · 5 unit quizzes · final self-check</dd></div>
        </dl>
        <h3>How to use this book</h3>
        ${use}
      </div>
      <div>
        <h3>The college</h3>
        <p><strong>${esc(COLLEGE.name)}</strong> (${esc(COLLEGE.popularName)})<br>${esc(COLLEGE.location)}<br>
        Affiliated to ${esc(COLLEGE.affiliation)} · Managed by ${esc(COLLEGE.trust)}<br>
        <a href="${COLLEGE.website}">${COLLEGE.website.replace('https://', '')}</a> · <a href="mailto:${COLLEGE.email}">${COLLEGE.email}</a><br>
        Instagram <a href="${COLLEGE.instagram}">@${COLLEGE.instagram.split('/').filter(Boolean).pop()}</a></p>
        <h3>Faculty</h3>
        <div class="bk-people">${faculty}</div>
        <p class="bk-small">Book and website created by <a href="${CREATOR.github}">${esc(CREATOR.name)}</a>.</p>
        <h3>Licence</h3>
        <p class="bk-small">Text © ${esc(COLLEGE.name)}, licensed <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>: you may copy, print and share it with credit.
        ${esc(BOOKS[kind].edition)} · ${EDITION}. Learning material, not an official syllabus document or certificate.
        Source: <a href="https://github.com/sbccas/git-github-fundamentals">github.com/sbccas/git-github-fundamentals</a>.</p>
      </div>
    </div>
  </section>`;
}

function contents(entries, pages) {
  const pg = (id) => `<span class="bk-toc-pg">${pages?.[id] ?? ''}</span>`;
  return `<nav class="bk-toc" aria-label="Contents">
    <h2 id="contents">Contents</h2>
    <ol>${entries.map((e) => `<li class="bk-toc-${e.level}"><a href="#${e.id}"><span class="bk-toc-t">${e.label}</span><span class="bk-toc-dots" aria-hidden="true"></span>${pg(e.id)}</a></li>`).join('')}</ol>
  </nav>`;
}

/* ---------------- Student Edition ---------------- */

function studentAppendices() {
  const sheet = JSON.parse(readFileSync(new URL('../content/cheatsheet.json', import.meta.url), 'utf8'));
  const terms = JSON.parse(readFileSync(new URL('../content/glossary.json', import.meta.url), 'utf8')).sort((a, b) => a.term.localeCompare(b.term));
  const labs = [
    ['Unit 1 lab', 'Set up Git and GitHub', 'labs/#unit-1'], ['L-01', 'Your profile README', 'labs/#l-01'],
    ['Unit 2 lab', 'Your first project on GitHub', 'labs/#unit-2'], ['Unit 3 lab', 'Branches and a real conflict', 'labs/#unit-3'],
    ['Unit 4 lab', 'Detective, stash, tag and undo', 'labs/#unit-4'], ['L-02', 'Create and configure a repository', 'labs/#l-02'],
    ['L-03', 'Report and fix an issue', 'labs/#l-03'], ['L-04', 'Fork and pull request', 'labs/#l-04'],
  ];
  return `
  <section class="bk-chapter bk-appendix">
    <h2 id="appendix-a">Appendix A · Command cheat sheet</h2>
    <div class="bk-sheet">${sheet.map((g) => `<div class="bk-sheet-group"><h3 id="sheet-${g.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}">${g.icon} ${esc(g.category)}</h3>
      <dl>${g.items.map((i) => `<div><dt><code>${esc(i.cmd)}</code></dt><dd>${esc(i.desc)} <span class="bk-unit">U${i.unit}</span></dd></div>`).join('')}</dl></div>`).join('')}</div>
  </section>
  <section class="bk-chapter bk-appendix">
    <h2 id="appendix-b">Appendix B · Glossary</h2>
    <dl class="bk-glossary">${terms.map((t) => `<div><dt>${esc(t.term)} <span class="bk-unit">U${t.unit}</span></dt><dd>${esc(t.def)}</dd></div>`).join('')}</dl>
  </section>
  <section class="bk-chapter bk-appendix">
    <h2 id="appendix-c">Appendix C · Practise online</h2>
    <p>Every mission runs in your browser with real Git; it checks your work and tells you when each goal is done. Labs use your own free account on github.com.</p>
    <table class="bk-table"><thead><tr><th>Mission</th><th>Unit</th><th>Title</th><th>Time</th></tr></thead><tbody>
      ${MISSIONS.map((m) => `<tr><td><a href="${LIVE}missions/?m=${m.id}">${m.id}</a></td><td>${m.unit}</td><td>${esc(m.title)}</td><td>${m.minutes} min</td></tr>`).join('')}
    </tbody></table>
    <table class="bk-table"><thead><tr><th>Lab</th><th>Title</th><th>Link</th></tr></thead><tbody>
      ${labs.map(([id, t, href]) => `<tr><td>${id}</td><td>${esc(t)}</td><td><a href="${LIVE}${href}">${LIVE.replace('https://', '')}${href}</a></td></tr>`).join('')}
    </tbody></table>
  </section>
  <section class="bk-chapter bk-appendix">
    <h2 id="appendix-d">Appendix D · Course at a glance</h2>
    <table class="bk-table"><thead><tr><th>Session</th><th>Unit</th><th>Topic</th><th>Practice</th></tr></thead><tbody>
      ${SESSIONS.map((s) => `<tr><td>${s.n}</td><td>${s.unit || '—'}</td><td>${esc(s.title)}</td><td>${s.practice.join(', ') || '—'}</td></tr>`).join('')}
    </tbody></table>
    <p class="bk-small">${COURSE.sessions} sessions × ${COURSE.sessionHours} hours = ${COURSE.hours} hours · ${COURSE.credits} credits.</p>
  </section>`;
}

function studentBook(md, base, pages) {
  const entries = [{ level: 1, id: 'about-book', label: 'About this book' }];
  const chapters = UNITS.map((u) => {
    const { html, headings } = md.renderFile(`content/units/unit-${u.n}.md`);
    entries.push({ level: 1, id: `chapter-${u.n}`, label: `Chapter ${u.n} · ${esc(u.title)}` });
    for (const h of headings.filter((x) => x.depth === 2)) entries.push({ level: 2, id: `u${u.n}-${h.id}`, label: esc(strip(h.html)) });
    const missions = u.missions.join(', ');
    return `<section class="bk-chapter" style="--u:${u.color}">
      <header class="bk-opener">
        <p class="bk-opener-n">Chapter ${u.n} · Unit ${u.n} · ${u.hours} hours</p>
        <h2 id="chapter-${u.n}">${esc(u.title)}</h2>
        <p class="bk-opener-sum">${esc(u.summary)}</p>
        <ul class="bk-opener-topics">${u.topics.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <p class="bk-opener-practice">Practise online: ${u.n === 5 ? 'GitHub labs' : 'missions'} ${missions}</p>
      </header>
      <div class="lesson-body prose">${adaptLesson(html, u.n, base)}</div>
    </section>`;
  }).join('');
  for (const [id, label] of [['appendix-a', 'Appendix A · Command cheat sheet'], ['appendix-b', 'Appendix B · Glossary'], ['appendix-c', 'Appendix C · Practise online'], ['appendix-d', 'Appendix D · Course at a glance']]) entries.push({ level: 1, id, label });
  return cover('student') + about('student', base) + contents(entries, pages.student) + chapters + studentAppendices();
}

/* ---------------- Faculty Edition ---------------- */

function facultyBook(md, base, pages) {
  const entries = [{ level: 1, id: 'about-book', label: 'About this book' }];
  const chapters = HANDBOOK.map((f) => {
    const { html, headings } = md.renderFile(`docs/faculty-handbook/${f}.md`);
    for (const h of headings) if (h.depth === 2 || h.depth === 3) entries.push({ level: h.depth - 1, id: h.id, label: esc(strip(h.html)) });
    const links = html.replace(new RegExp(`href="${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), `href="${LIVE}`);
    return `<section class="bk-chapter bk-handbook"><div class="lesson-body prose doc">${links}</div></section>`;
  }).join('');
  return cover('faculty') + about('faculty', base) + contents(entries, pages.faculty) + chapters;
}

export function renderBook(kind, md, base, project) {
  const pages = pageNumbers(project);
  return kind === 'faculty' ? facultyBook(md, base, pages) : studentBook(md, base, pages);
}
