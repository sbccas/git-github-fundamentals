# Milestone 8 — Course ebooks (Student Edition + Faculty Handbook): implementation plan

| | |
|---|---|
| **Status** | ✅ **Approved by the course owner (Hitesh Patel) on 24 October 2026** · plan first published in `961e13b` · ✅ **Delivered 24 October 2026** in commit `9a8e51c` (results: [PROGRESS.md §7b](../PROGRESS.md)) |
| **Requested by** | Hitesh Patel (course owner), 24 October 2026: "make it look like a real ebook with an attractive cover page, details of the course with faculty details, an index with links, to share with students for physical or digital reference" |
| **Decisions taken** (24 Oct 2026) | (1) Two books from one design: a **Student Edition** for students, and the **Faculty Handbook** as a faculty ebook. (2) Each book as a **ready PDF on the site** plus a **web version** that prints the same way. |
| **PRD** | P-12 (§6.1) and F-19 (§6.6), Milestone 8 (§12), v1.10 |

## 1. Why two books

The Faculty Handbook (`docs/faculty-handbook/`, about 10,700 words) is written **to teachers**: "board diagrams to draw",
"questions students ask", "misconceptions to correct", "self-check for faculty", storytelling tips. It contains no exam
papers or answer keys, but its voice is not right for students. The **unit lessons** (`content/units/unit-1..5.md`,
about 8,600 words, 56 sections, 14 diagrams, real Git output) are written for students and, with the cheat sheet and
glossary, make a complete student textbook. Both books share one ebook design.

## 2. The books

### 2.1 Student Edition — *Git & GitHub Fundamentals: Student Edition*

1. **Cover** (full page): course title, "Student Edition", SBCCAS name and logo mark, neon course style (the same look
   as the student notice), edition and date, course URL.
2. **Inside cover — About this book**: course details from `src/scripts/data/site.js` (5 units, 30 hours, 2 credits,
   15 sessions, programmes BCA · BCA – AI · B.Sc. Data Science · M.Sc. IT); the college (name, Amroli, Surat, VNSGU,
   Jivan Jyot Trust, website, email); **faculty** from `FACULTY` (photo, name, role, department, GitHub) and the
   "Created by" credit; how to use the book with the website (Playground, missions); licence CC BY-SA 4.0; edition.
3. **Contents** — clickable table of contents: chapters (units) and their sections, with page numbers.
4. **Chapters 1–5** — the unit lessons, each starting on a new page with a chapter opener (unit number, title, hours,
   topics, the missions that practise it). Diagrams, callouts, terminal blocks and tables as on the site.
   Interactive elements become print-friendly: flip cards show both sides; "▶ Try it" / Copy buttons are removed.
5. **Appendices**: A. Command cheat sheet (all 62 commands, from `content/cheatsheet.json`) · B. Glossary (47 terms,
   from `content/glossary.json`) · C. Practise online: the 15 missions and 4 GitHub labs with their site links ·
   D. Course at a glance (units, hours, sessions).
6. **Back matter**: a short colophon (licence, source repository, "learning material, not an official certificate").

### 2.2 Faculty Edition — *Faculty Handbook*

Same design: cover marked **Faculty Edition**, the same inside cover (course, college, faculty), clickable contents,
then the existing story bible, chapters 1–5 and appendices from `docs/faculty-handbook/`. Content unchanged.
It stays a faculty resource (linked from Teach), although the site is public.

### 2.3 Design (both books)

- A4 portrait, printable on paper and readable on a phone as a PDF.
- Page footer: book title · page number (CSS `@page` margin boxes; no page number on the cover).
- Each chapter starts on a new page; headings stay with their text; diagrams and code blocks are not split across pages
  where avoidable.
- Light paper palette for print (as all printing on the site); the cover keeps the neon dark design.
- Fonts: the site's self-hosted Inter, Sora and JetBrains Mono (embedded in the PDF).

## 3. Implementation (smallest safe set of changes)

1. **Pages** (existing Vite multi-page structure, rendered at build time with the existing Markdown pipeline):
   `src/book/student/index.html` and `src/book/faculty/index.html`, each with the cover, inside cover, contents
   (generated from the headings) and chapters via `<!-- @md … -->`. New stylesheet `src/styles/book.css`.
   A small build-time helper renders the cheat-sheet and glossary appendices from their JSON files.
2. **PDF files**: a maintainer script `npm run ebooks` builds the site, prints both pages with headless Chrome and
   writes `public/books/git-github-fundamentals-student-edition.pdf` and `…-faculty-handbook.pdf`. Two passes:
   the first finds the page of every chapter and section, the second prints the contents with those page numbers.
   The PDFs are committed, so GitHub Pages serves them without running Chrome in CI. Requirements for the script:
   Node, Google Chrome, Python 3 with `pypdfium2` (local maintainer machine only; documented in the README).
3. **Downloads and links**: "Download PDF" and "Read online" on a new **Books** entry in the More menu and mobile menu;
   the books in `PAGES` (Ctrl+K); the Student Edition linked from the home page resources and the cheat sheet;
   the Faculty Edition linked from the Teach hub and the handbook page.
4. **Offline**: the two web versions are precached like every page. The **PDF files are not precached** (they would add
   several MB to every first visit); the service worker caches a PDF after it is downloaded once.
5. **Docs**: PRD (requirements + Milestone 8), PROGRESS.md, README (how to regenerate the PDFs), trial checklist row.

## 4. Draft requirements (to move into the PRD on approval)

| ID | Requirement |
|---|---|
| P-12 | **Student Edition ebook** (`/book/student/` + PDF download): cover, inside cover with course, college and faculty details, clickable contents with page numbers, the five unit lessons as chapters, appendices (cheat sheet, glossary, missions and labs, course at a glance), licence. Printable on A4 and readable on phones. |
| F-19 | **Faculty Handbook ebook** (`/book/faculty/` + PDF download): the same design for the existing handbook, marked Faculty Edition, linked from Teach. |

## 5. Acceptance criteria

- Both PDFs open on Android and iPhone; the cover, inside cover, contents and chapters appear in that order.
- Every contents entry is a working link in the PDF and on the web page, and shows the correct page number.
- Faculty details on the inside cover match the About page (name, role, department, photo, GitHub).
- Every unit lesson section, diagram, callout, table and terminal block appears; no buttons or empty interactive boxes.
- Each chapter starts on a new page; page numbers in the footer; no page is blank by accident.
- Printing the web version gives the same layout as the PDF.
- The site still works offline; first-visit download size does not grow by the PDF sizes.
- Course content, lessons, missions, quizzes, XP and badges are unchanged.

## 6. Tests and checks

**Automated (`npm test`):** both book pages exist; the Student Edition contains all 56 lesson sections, 14 diagrams,
62 cheat-sheet commands and 47 glossary terms; the Faculty Edition contains every handbook chapter; contents links
point to existing anchors; the faculty block uses `FACULTY` data; PDFs are excluded from the precache list.

**Script checks (`npm run ebooks`):** both PDFs generated; page count reported; every contents page number matches the
page where the heading is found; cover has no page number.

**Manual (real devices):** open each PDF on a phone, tap contents links, check readability; print a few pages on paper.

## 7. Exclusions and safety

- No change to lesson, handbook, quiz or mission content (only presentation); no new runtime libraries on the site.
- No paid services, no login, no analytics; PDFs are static files.
- The books are learning material, **not** an official certificate or syllabus document; they carry the college and
  course name but no other college's material.
- Faculty details only from `FACULTY` (currently Hitesh Patel); no other names are invented.
