# Git & GitHub Fundamentals

An interactive learning platform for the **Git & GitHub Fundamentals** certificate course (2 credits, 30 hours) at
**Sutex Bank College of Computer Applications & Science (SBCCAS), Amroli, Surat**.

Students learn by doing: real Git runs inside the browser (even on a phone), with a live commit graph,
story missions and quizzes mapped to the five-unit syllabus.

**Live site:** https://sbccas.github.io/git-github-fundamentals/ *(after the first deploy)*

## Documents

| File | What it is |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | Product requirements: the agreed scope. Build only what is listed there. |
| [`docs/PROGRESS.md`](docs/PROGRESS.md) | Progress report: every PRD requirement with its status. Update it at the end of each milestone. |
| [`docs/faculty-guide.md`](docs/faculty-guide.md) | Session-by-session teaching guide (15 × 2 hours) — also at `/teach/guide/` |
| [`docs/faculty-handbook/`](docs/faculty-handbook/README.md) | Book-style faculty handbook: story bible + one chapter per unit — also at `/teach/handbook/` |
| [`docs/reference-examples.md`](docs/reference-examples.md) | Teaching patterns and analogies, mapped to units |
| [`docs/launch/`](docs/launch/) | Launch kit: trial checklist (phones, lab PC, projector, students), A4 student notice, WhatsApp announcement — each `.pdf` is printed from the `.html` beside it |

## Run it locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open http://localhost:5173/git-github-fundamentals/

Other commands:

```bash
npm test          # missions end-to-end, Git engine and content checks (no browser needed)
npm run build     # production build into dist/ (also writes the offline service worker, dist/sw.js)
npm run preview   # serve the production build at http://localhost:4173/git-github-fundamentals/
```

## Project layout

```
src/
  index.html            home page
  <page>/index.html     one folder per page (unit-1 … unit-5, playground, missions, …)
  partials/             shared head, header and footer — inserted at build time with <!-- @include name -->
  scripts/main.js       shared behaviour: theme, menus, search palette (Ctrl+K)
  scripts/pages/        one script per page
  scripts/data/site.js  course facts: college, units, pages, commands
  scripts/lib/          storage, progress, palette, PWA registration
  scripts/terminal/     the Playground: shell, Git commands, simulated GitHub, error hints
  styles/               tokens (colours, fonts), base, layout, components, page styles
content/
  units/unit-N.md       lesson text (Markdown + extras, see build/markdown.js)
  quizzes/unit-N.json   quiz questions
  missions/missions.js  story missions: brief, goals with checks, hints, setup
  slides/session-NN.md  lecture decks (--- between slides, "Notes:" for speaker notes)
  diagrams/*.html       diagrams used by lessons and slides
  labs.md               the Labs page
build/markdown.js       build-time Markdown renderer (lessons, slides, handbook)
build/sw-template.js    offline service worker; vite.config.js fills in the file list at build time
public/                 files copied as-is (favicon, app icons, PWA manifest)
tests/                  npm test (runs the Playground engine under Node)
docs/                   PRD, progress report, faculty guide, handbook, reference notes
```

In HTML, write links as `{{base}}unit-1/`; the build replaces `{{base}}` with the site path.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which runs `npm test`, builds the site and publishes it to GitHub Pages.
One-time setup: **Settings → Pages → Source: GitHub Actions**.

## Licence

- Code: MIT (see `LICENSE`)
- Course content (lessons, quizzes, missions, guides): [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
