/**
 * Git Passport page (PRD G-04 – G-07). Reads progress; the only thing it ever saves is the
 * optional self-entered name. Opening the passport never awards XP or badges.
 */
import '../main.js';
import { UNITS, pageUrl } from '../data/site.js';
import { load, setPassportName } from '../lib/progress.js';
import { passportSummary, nextActivity } from '../lib/passport.js';
import { MISSIONS } from '../../../content/missions/missions.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const missionTitle = (id) => MISSIONS.find((m) => m.id === id)?.title ?? '';
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const LABEL = 'Learning-progress record · saved on this device · not an official college certificate';

function ring(percent) {
  return `<div class="ring" role="img" aria-label="${percent}% complete">
    <svg viewBox="0 0 36 36" aria-hidden="true"><circle class="ring-track" cx="18" cy="18" r="15.9155" />
    <circle class="ring-value" cx="18" cy="18" r="15.9155" pathLength="100" style="stroke-dashoffset:${100 - percent}" /></svg>
    <span class="ring-label">${percent}%</span></div>`;
}

function render() {
  const data = load();
  const s = passportSummary(data, MISSIONS.length);
  const next = nextActivity(data, missionTitle);

  $('[data-pp-name]').textContent = s.name || 'Student';
  $('[data-pp-empty]').hidden = !s.isNew;

  $('[data-pp-level]').innerHTML = `
    <div class="pp-level-num"><span>Level</span><b>${s.level}</b></div>
    <div class="pp-level-body">
      <p><b>${s.xp}</b> XP</p>
      <span class="pp-bar" role="progressbar" aria-label="XP towards the next level" aria-valuemin="0" aria-valuemax="${s.levelSize}" aria-valuenow="${s.levelInto}"><span style="width:${(s.levelInto / s.levelSize) * 100}%"></span></span>
      <p class="muted">${s.xpToNext} XP to level ${s.level + 1}</p>
    </div>`;

  $('[data-pp-next]').innerHTML = `
    <p class="pp-next-label">${s.isNew ? 'Start here' : 'Your next step'}</p>
    <div class="pp-next-body">
      <div><h2>${esc(next.title)}</h2><p>${esc(next.text)}</p></div>
      <a class="btn btn-primary" href="${esc(next.href)}">${next.rule === 'resume' ? 'Resume' : 'Go'} →</a>
    </div>`;
  if (next.unit) $('[data-pp-next]').style.setProperty('--u', UNITS[next.unit - 1].color);
  else $('[data-pp-next]').style.removeProperty('--u');

  const stat = (num, of, label) => `<div class="pp-stat"><b>${num}${of !== null ? `<small>/${of}</small>` : ''}</b><span>${label}</span></div>`;
  $('[data-pp-stats]').innerHTML = [
    stat(`${s.overall}%`, null, 'course progress'),
    stat(s.missionsDone, s.missionTotal, 'missions'),
    stat(s.quizzesPassed, UNITS.length, 'quizzes passed'),
    stat(s.badgesEarned, s.badges.length, 'badges'),
    stat(s.selfCheckBest === null ? '—' : `${s.selfCheckBest}%`, null, 'self-check best'),
  ].join('');

  $('[data-pp-units]').innerHTML = s.units.map((u) => {
    const practice = u.missionsTotal
      ? `<li><span>Missions</span><b>${u.missionsDone}/${u.missionsTotal}</b></li>`
      : '<li><span>GitHub labs</span><b class="muted">checked by your teacher</b></li>';
    const status = u.badgeEarned
      ? `<p class="pp-stamp">${u.badge.icon} Earned ${fmtDate(u.badgeEarned)}</p>`
      : `<p class="pp-todo"><span>To unlock:</span> ${u.missing.map(esc).join(' · ')}</p>`;
    return `<article class="pp-unit${u.badgeEarned ? ' is-earned' : ''}" style="--u:${u.unit.color}">
      <header><div><span class="unit-num">Unit ${u.unit.n}</span><h3>${u.badge.title}</h3></div>${ring(u.percent)}</header>
      <ul class="pp-facts">
        <li><span>Lesson</span><b>${u.sectionsTotal ? `${u.sectionsRead}/${u.sectionsTotal} sections` : 'not started'}</b></li>
        <li><span>Quiz best</span><b>${u.quizBest === null ? '—' : `${u.quizBest}%${u.quizPassed ? ' ✓' : ''}`}</b></li>
        ${practice}
      </ul>
      ${status}
      <a class="pp-unit-link" href="${pageUrl(`${u.unit.slug}/`)}">Open Unit ${u.unit.n} →</a>
    </article>`;
  }).join('');

  $('[data-pp-badge-count]').textContent = `${s.badgesEarned} of ${s.badges.length}`;
  $('[data-pp-badges]').innerHTML = s.badges.map((b) => `
    <li class="pp-badge${b.earned ? ' is-earned' : ''}">
      <span class="pp-badge-icon" aria-hidden="true">${b.icon}</span>
      <span><strong>${b.title}</strong><span class="muted">${b.desc}</span>
      <span class="pp-badge-state">${b.earned ? `Earned ${fmtDate(b.earned)}` : '🔒 Locked'}</span></span>
    </li>`).join('');
  return s;
}

/* ---------- optional self-entered name (G-07) ---------- */
const form = $('[data-pp-form]');
const editBtn = $('[data-pp-edit]');
editBtn.addEventListener('click', () => {
  const open = form.hidden;
  form.hidden = !open;
  editBtn.setAttribute('aria-expanded', String(open));
  if (open) { $('[data-pp-input]').value = load().profile?.name ?? ''; $('[data-pp-input]').focus(); }
});
form.addEventListener('submit', (e) => {
  e.preventDefault();
  setPassportName($('[data-pp-input]').value);
  form.hidden = true;
  editBtn.setAttribute('aria-expanded', 'false');
  editBtn.focus();
});

/* ---------- print / PNG card (G-06) ---------- */
$('[data-pp-print]').addEventListener('click', () => window.print());

const NEON = ['#b69cff', '#2ef2ff', '#b6ff3b', '#ffd23f', '#ff5ec8'];

async function drawCard() {
  const s = passportSummary(load(), MISSIONS.length);
  try { await Promise.all(['700 64px "Sora Variable"', '500 24px "Inter Variable"'].map((f) => document.fonts.load(f))); } catch { /* system fonts are fine */ }
  const W = 1200; const H = 630;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const display = '"Sora Variable", "Segoe UI", sans-serif';
  const body = '"Inter Variable", "Segoe UI", sans-serif';

  g.fillStyle = '#060912'; g.fillRect(0, 0, W, H);
  const glow = (x, y, r, color) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); };
  glow(0, 0, 620, 'rgba(139,123,255,.35)'); glow(W, H, 620, 'rgba(46,230,214,.22)');
  g.strokeStyle = 'rgba(182,156,255,.85)'; g.lineWidth = 3;
  g.beginPath(); g.roundRect(24, 24, W - 48, H - 48, 28); g.stroke();

  g.fillStyle = '#2ee6d6'; g.font = `700 22px ${body}`; g.fillText('GIT & GITHUB FUNDAMENTALS · SBCCAS', 72, 92);
  g.fillStyle = '#f2f5ff'; g.font = `700 68px ${display}`; g.fillText('Git Passport', 72, 168);
  g.fillStyle = '#c3cbe0'; g.font = `500 30px ${body}`;
  g.fillText(`${s.name || 'Student'}${s.name ? ' (self-entered)' : ''}`, 72, 220);

  // Level block
  g.fillStyle = '#f2f5ff'; g.font = `700 112px ${display}`; g.textAlign = 'right'; g.fillText(String(s.level), W - 80, 190);
  g.font = `600 24px ${body}`; g.fillStyle = '#8a94ad'; g.fillText('LEVEL', W - 80, 92);
  g.fillStyle = '#c3cbe0'; g.font = `600 28px ${body}`; g.fillText(`${s.xp} XP`, W - 80, 236);
  g.textAlign = 'left';

  // Units
  s.units.forEach((u, i) => {
    const x = 72 + i * 214; const y = 290;
    g.fillStyle = 'rgba(14,21,39,.9)'; g.strokeStyle = u.badgeEarned ? NEON[i] : 'rgba(148,163,184,.35)'; g.lineWidth = u.badgeEarned ? 3 : 2;
    g.beginPath(); g.roundRect(x, y, 196, 150, 18); g.fill(); g.stroke();
    g.fillStyle = NEON[i]; g.font = `700 20px ${body}`; g.fillText(`UNIT ${u.unit.n}`, x + 20, y + 38);
    g.fillStyle = '#f2f5ff'; g.font = `700 46px ${display}`; g.fillText(`${u.percent}%`, x + 20, y + 96);
    g.fillStyle = u.badgeEarned ? NEON[i] : '#8a94ad'; g.font = `600 18px ${body}`;
    g.fillText(u.badgeEarned ? `${u.badge.icon} badge earned` : u.started ? 'in progress' : 'not started', x + 20, y + 130);
  });

  // Badges row
  g.font = `40px ${body}`;
  s.badges.forEach((b, i) => { g.globalAlpha = b.earned ? 1 : 0.18; g.fillText(b.icon, 72 + i * 62, 520); });
  g.globalAlpha = 1;
  g.fillStyle = '#c3cbe0'; g.font = `600 24px ${body}`;
  g.fillText(`${s.badgesEarned}/${s.badges.length} badges · ${s.missionsDone}/${s.missionTotal} missions · ${s.quizzesPassed}/5 quizzes`, 660, 512);

  g.fillStyle = '#8a94ad'; g.font = `500 18px ${body}`;
  g.fillText(`${LABEL} · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`, 72, 572);
  g.fillText('sbccas.github.io/git-github-fundamentals', 72, 596);
  return c;
}

$('[data-pp-card]').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  try {
    const canvas = await drawCard();
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `git-passport-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } finally {
    btn.disabled = false;
  }
});

// The passport is a dashboard, so unlike lessons it does not become the "continue where you left off" page.
render();
window.addEventListener('gg:progress', render);
window.addEventListener('storage', (e) => { if (e.key === 'gg-progress') render(); });
