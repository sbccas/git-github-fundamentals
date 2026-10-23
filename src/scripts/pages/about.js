import '../main.js';
import { COLLEGE, COURSE, UNITS, FEATURES, FACULTY, CREATOR } from '../data/site.js';
import { load, level, exportJson, importJson, BADGES } from '../lib/progress.js';
import { MISSIONS } from '../../../content/missions/missions.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;

document.querySelector('[data-course]').innerHTML = [
  row('Title', COURSE.title),
  row('Credits', COURSE.credits),
  row('Duration', `${COURSE.hours} hours · ${COURSE.sessions} sessions of ${COURSE.sessionHours} hours`),
  row('Units', UNITS.map((u) => `${u.n}. ${u.title}`).join('<br>')),
  row('Practice', `${MISSIONS.length} browser missions · ${COURSE.labs} GitHub labs · 5 unit quizzes · final self-check`),
  row('For', `${COLLEGE.programmes.join(' · ')} students`),
  row('Created by', `<a href="${CREATOR.github}" target="_blank" rel="noopener">${esc(CREATOR.name)}</a>`),
].join('');

document.querySelector('[data-college]').innerHTML = [
  row('Name', `${COLLEGE.name} (${COLLEGE.popularName})`),
  row('Location', COLLEGE.location),
  row('Affiliation', COLLEGE.affiliation),
  row('Managed by', COLLEGE.trust),
  row('Website', `<a href="${COLLEGE.website}" target="_blank" rel="noopener">amrolicollege.ac.in</a>`),
  row('Email', `<a href="mailto:${COLLEGE.email}">${COLLEGE.email}</a>`),
  row('GitHub', `<a href="${COLLEGE.github}" target="_blank" rel="noopener">github.com/sbccas</a> · <a href="${COLLEGE.portal}" target="_blank" rel="noopener">learning portal</a>`),
  row('Instagram', `<a href="${COLLEGE.instagram}" target="_blank" rel="noopener">@amrolibca</a>`),
].join('');

// Faculty section (PRD D-6): shown when FEATURES.facultySection is on and FACULTY has entries.
if (FEATURES.facultySection && FACULTY.length) {
  document.querySelector('[data-faculty]').hidden = false;
  document.querySelector('[data-faculty-list]').innerHTML = FACULTY.map((f) => `<div class="faculty-card">
    ${f.photo
      ? `<img class="faculty-photo" src="${import.meta.env.BASE_URL}${esc(f.photo)}" alt="Photo of ${esc(f.name)}" width="72" height="72" loading="lazy">`
      : `<span class="avatar" aria-hidden="true">${esc(f.name.replace(/^(Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.)\s*/, '')[0] ?? '?')}</span>`}
    <strong>${esc(f.name)}</strong><span class="muted">${esc(f.role ?? '')}${f.dept ? ` · ${esc(f.dept)}` : ''}</span>
    ${f.email ? `<a href="mailto:${esc(f.email)}">${esc(f.email)}</a>` : ''}
    ${f.github ? `<a href="${esc(f.github)}" target="_blank" rel="noopener">GitHub · @${esc(f.github.split('/').pop())}</a>` : ''}</div>`).join('');
}

function summary() {
  const p = load();
  const done = Object.values(p.missions).filter((m) => m.done).length;
  const lv = level(p.xp);
  document.querySelector('[data-progress-summary]').innerHTML = `
    <span><b>${p.xp}</b> XP · level ${lv.level}</span>
    <span><b>${done}</b>/${MISSIONS.length} missions</span>
    <span><b>${Object.keys(p.badges).length}</b>/${BADGES.length} badges</span>
    <span><b>${UNITS.filter((u) => p.units[String(u.n)]?.quiz?.passed).length}</b>/5 quizzes passed</span>
    ${p.selfCheck ? `<span>self-check best <b>${p.selfCheck.best}%</b></span>` : ''}`;
}
summary();

document.querySelector('[data-export]').addEventListener('click', () => {
  const blob = new Blob([exportJson()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `git-course-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

document.querySelector('[data-import]').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  const msg = document.querySelector('[data-import-msg]');
  if (!file) return;
  try {
    if (!window.confirm('Replace the progress saved in this browser with the imported file?')) return;
    importJson(await file.text());
    msg.textContent = 'Progress imported ✓';
    summary();
  } catch (err) {
    msg.textContent = `Could not import: ${err.message}`;
  } finally {
    e.target.value = '';
  }
});
