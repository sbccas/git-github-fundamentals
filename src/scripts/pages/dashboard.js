/**
 * Faculty dashboard (Milestone 12 plan §3.2): batches, join codes and each student's progress, read-only.
 * Built only when accounts are enabled. Every call is checked again in the database (allowlist + batch links).
 */
import '../main.js';
import '../lib/account-boot.js';
import { configured, PROGRAMMES } from '../data/supabase.js';
import { BASE } from '../data/site.js';
import { getSession, api, rememberAccount } from '../lib/account.js';
import { classify } from '../lib/sync.js';
import { summarize, unitCell, sortStudents, toCsv, MISSION_TOTAL, BADGE_TOTAL } from '../lib/dashboard.js';

const $ = (s, root = document) => root.querySelector(s);
const view = $('[data-dash-view]');
const msgBox = $('[data-dash-msg]');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const programmeLabel = (v) => PROGRAMMES.find((p) => p.value === v)?.label ?? v;
const REFRESH_MS = 60e3;
const PICK_KEY = 'gg-dash-batch';

let batches = [];
let current = null; // selected batch
let students = [];
let sortBy = 'name';
let filter = '';
let refreshTimer = null;

function message(text, tone = 'info') {
  msgBox.textContent = text ?? '';
  msgBox.dataset.tone = tone;
  msgBox.hidden = !text;
}

function explain(err) {
  const kind = classify(err);
  if (kind === 'offline') return 'You seem to be offline, or the account service is unavailable. Try again shortly.';
  if (kind === 'auth') return 'Your sign-in has ended, or this account is not on the faculty list.';
  return err?.message || 'Something went wrong. Please try again.';
}

const timeAgo = (iso) => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 'never';
  const min = Math.round((Date.now() - t) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(t).toLocaleDateString();
};

/* ---------------- Gate: signed in + on the faculty list ---------------- */

function gate(html) {
  view.innerHTML = `<section class="card acct-card">${html}</section>`;
}

async function main() {
  if (!configured) { gate('<h2>Accounts are not set up</h2><p>This build has no account settings.</p>'); return; }
  let session = null;
  try { session = await getSession(); } catch { /* treated as signed out */ }
  if (!session) {
    gate(`<h2>Faculty only</h2><p>Sign in with your GitHub account on the account page first, then come back here.</p>
      <p><a class="btn btn-primary" href="${BASE}account/">Go to the account page →</a></p>`);
    return;
  }
  let st;
  try { st = await api.status(); } catch (err) { gate(`<h2>Could not check your account</h2><p>${esc(explain(err))}</p>`); return; }
  rememberAccount({ faculty: !!st.is_faculty });
  if (!st.is_faculty) {
    gate(`<h2>This page is for course faculty</h2><p>Your GitHub account is not on the faculty list. If you teach this course, ask the course coordinator to add you.</p>
      <p><a class="btn btn-ghost" href="${BASE}account/">Back to your account</a></p>`);
    return;
  }
  await loadBatches();
}

/* ---------------- Batches ---------------- */

async function loadBatches(selectId) {
  try {
    batches = await api.facultyBatches();
  } catch (err) {
    message(explain(err), 'bad');
    return;
  }
  let remembered = null;
  try { remembered = localStorage.getItem(PICK_KEY); } catch { /* ignore */ }
  current = batches.find((b) => b.id === (selectId ?? current?.id ?? remembered)) ?? batches[0] ?? null;
  render();
  if (current) await loadStudents();
}

function batchPickerHtml() {
  if (!batches.length) return '<p>No batches yet. Create the first one below.</p>';
  if (batches.length === 1) return '';
  return `<label class="dash-pick"><span>Batch</span>
    <select data-pick>${batches.map((b) => `<option value="${esc(b.id)}"${b.id === current?.id ? ' selected' : ''}>${esc(b.name)} (${b.students})</option>`).join('')}</select></label>`;
}

function createFormHtml(open) {
  const year = new Date().getFullYear();
  return `
    <details class="card acct-card dash-create"${open ? ' open' : ''}>
      <summary><strong>Create a batch</strong></summary>
      <form class="acct-form" data-create novalidate>
        <label for="dash-name">Batch name</label>
        <input id="dash-name" name="name" type="text" maxlength="80" required placeholder="BCA 2026 – SY AI">
        <label for="dash-prog">Programme</label>
        <select id="dash-prog" name="programme" required>
          ${PROGRAMMES.map((p) => `<option value="${esc(p.value)}"${p.value === 'BCA-AI' ? ' selected' : ''}>${esc(p.label)}</option>`).join('')}
        </select>
        <label for="dash-year">Year</label>
        <input id="dash-year" name="year" type="number" min="2020" max="2100" value="${year}" required>
        <div class="acct-actions"><button class="btn btn-primary" type="submit">Create batch and join code</button></div>
      </form>
    </details>`;
}

function codeCardHtml(b) {
  return `
    <section class="card acct-card dash-code" aria-labelledby="dash-code-h">
      <h2 id="dash-code-h">${esc(b.name)}</h2>
      <p class="muted">${esc(programmeLabel(b.programme))} · ${esc(b.year)} · ${b.students} student${b.students === 1 ? '' : 's'}</p>
      <div class="dash-code-row">
        <div>
          <p class="dash-label">Join code ${b.code_enabled ? '' : '<span class="dash-off">disabled</span>'}</p>
          <p class="dash-code-text" data-code>${esc(b.code ?? '')}</p>
        </div>
        <div class="acct-actions">
          <button class="btn btn-primary" type="button" data-project${b.code_enabled ? '' : ' disabled'}>Show on projector</button>
          <button class="btn btn-ghost" type="button" data-regen>New code</button>
          <button class="btn btn-ghost" type="button" data-toggle>${b.code_enabled ? 'Disable code' : 'Enable code'}</button>
        </div>
      </div>
      <details class="dash-colleagues">
        <summary>Faculty with access: ${esc(b.faculty.join(', '))}</summary>
        <form class="acct-form" data-colleague novalidate>
          <label for="dash-colleague">Give another course faculty member access (their GitHub username)</label>
          <div class="acct-row">
            <input id="dash-colleague" name="username" type="text" autocomplete="off" spellcheck="false" placeholder="github-username">
            <button class="btn btn-ghost" type="submit">Add</button>
          </div>
          <p class="muted acct-small">They must be on the faculty list and have signed in once.</p>
        </form>
      </details>
    </section>`;
}

function studentsShellHtml() {
  return `
    <section class="card acct-card dash-students" aria-labelledby="dash-st-h">
      <div class="dash-toolbar">
        <h2 id="dash-st-h">Students</h2>
        <input type="search" data-filter placeholder="Find name or roll no" aria-label="Find a student by name, roll number or GitHub username" value="${esc(filter)}">
        <select data-sort aria-label="Sort students">
          <option value="name"${sortBy === 'name' ? ' selected' : ''}>Name A–Z</option>
          <option value="roll"${sortBy === 'roll' ? ' selected' : ''}>Roll no</option>
          <option value="xp"${sortBy === 'xp' ? ' selected' : ''}>XP, highest first</option>
          <option value="updated"${sortBy === 'updated' ? ' selected' : ''}>Last synced</option>
        </select>
        <button class="btn btn-ghost" type="button" data-refresh>Refresh</button>
        <button class="btn btn-ghost" type="button" data-csv>Download CSV</button>
      </div>
      <p class="muted acct-small" data-summary></p>
      <div class="dash-table-wrap" data-table><p class="muted">Loading students…</p></div>
      <p class="muted acct-small">Units: ✓ complete · % best quiz score (green = passed) · n/m lessons read · — not started. Read-only: faculty cannot change progress.</p>
    </section>`;
}

function render() {
  view.innerHTML = `${batchPickerHtml()}${current ? codeCardHtml(current) + studentsShellHtml() : ''}${createFormHtml(!batches.length)}`;
  wire();
}

function wire() {
  $('[data-pick]', view)?.addEventListener('change', (e) => {
    try { localStorage.setItem(PICK_KEY, e.target.value); } catch { /* ignore */ }
    current = batches.find((b) => b.id === e.target.value);
    render();
    loadStudents();
  });
  $('[data-create]', view)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const name = f.name.value.replace(/\s+/g, ' ').trim();
    if (!name) { message('Please enter a batch name.', 'bad'); return; }
    try {
      const res = await api.createBatch(name, f.programme.value, Number(f.year.value));
      message(`Batch "${name}" created with a join code.`, 'ok');
      await loadBatches(res.id);
    } catch (err) { message(explain(err), 'bad'); }
  });
  if (!current) return;
  $('[data-project]', view)?.addEventListener('click', openProjector);
  $('[data-regen]', view)?.addEventListener('click', async () => {
    if (!confirm('Make a new join code? The old code stops working; students who already joined stay in the batch.')) return;
    await changeCode(true, null);
  });
  $('[data-toggle]', view)?.addEventListener('click', () => changeCode(false, !current.code_enabled));
  $('[data-colleague]', view)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = e.currentTarget.username.value.trim();
    if (!username) return;
    try {
      await api.addColleague(current.id, username);
      message(`${username} can now see this batch.`, 'ok');
      await loadBatches(current.id);
    } catch (err) { message(explain(err), 'bad'); }
  });
  $('[data-filter]', view)?.addEventListener('input', (e) => { filter = e.target.value; renderTable(); });
  $('[data-sort]', view)?.addEventListener('change', (e) => { sortBy = e.target.value; renderTable(); });
  $('[data-refresh]', view)?.addEventListener('click', () => loadStudents());
  $('[data-csv]', view)?.addEventListener('click', downloadCsv);
}

async function changeCode(regenerate, enabled) {
  try {
    const res = await api.setCode(current.id, regenerate, enabled);
    Object.assign(current, res);
    message(regenerate ? `New code: ${res.code}` : res.code_enabled ? 'Code enabled.' : 'Code disabled — nobody new can join until you enable it.', 'ok');
    render();
    renderTable();
  } catch (err) { message(explain(err), 'bad'); }
}

/* ---------------- Students ---------------- */

async function loadStudents() {
  clearTimeout(refreshTimer);
  const id = current?.id;
  if (!id) return;
  try {
    const rows = await api.batchProgress(id);
    if (current?.id !== id) return; // batch changed meanwhile
    students = rows.map(summarize);
    renderTable();
  } catch (err) {
    message(explain(err), 'bad');
  }
  refreshTimer = setTimeout(() => { if (document.visibilityState === 'visible') loadStudents(); else refreshTimer = setTimeout(loadStudents, REFRESH_MS); }, REFRESH_MS);
}

function renderTable() {
  const box = $('[data-table]', view);
  if (!box) return;
  const q = filter.trim().toLowerCase();
  const list = sortStudents(students.filter((s) => !q || s.name.toLowerCase().includes(q) || s.github.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q)), sortBy);
  const noRoll = students.filter((s) => !s.roll).length;
  const avg = students.length ? Math.round(students.reduce((t, s) => t + s.xp, 0) / students.length) : 0;
  $('[data-summary]', view).textContent = students.length
    ? `${students.length} student${students.length === 1 ? '' : 's'} · average ${avg} XP${noRoll ? ` · ${noRoll} without a roll no` : ''} · updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (refreshes every minute)`
    : '';
  if (!students.length) { box.innerHTML = '<p>No students have joined yet. Show the join code in class.</p>'; return; }
  if (!list.length) { box.innerHTML = '<p>No student matches that search.</p>'; return; }
  box.innerHTML = `
    <table class="dash-table">
      <thead><tr>
        <th scope="col">Roll no</th><th scope="col">Student</th><th scope="col" class="num">XP</th><th scope="col" class="num">Level</th>
        ${[1, 2, 3, 4, 5].map((n) => `<th scope="col" class="unit">U${n}</th>`).join('')}
        <th scope="col" class="num">Missions</th><th scope="col" class="num">Badges</th><th scope="col" class="num">Self-check</th><th scope="col">Last synced</th>
      </tr></thead>
      <tbody>${list.map((s) => `
        <tr>
          <td class="dash-roll">${s.roll ? esc(s.roll) : '<span class="dash-missing">missing</span>'}</td>
          <th scope="row"><span class="dash-name">${esc(s.name)}</span><span class="dash-sub">@${esc(s.github)} · ${esc(programmeLabel(s.programme))}</span></th>
          <td class="num"><strong>${s.xp}</strong></td><td class="num">${s.level}</td>
          ${s.units.map((u) => { const c = unitCell(u); return `<td class="unit" data-tone="${c.tone}" title="${esc(c.title)}">${esc(c.text)}</td>`; }).join('')}
          <td class="num">${s.missions}/${MISSION_TOTAL}</td><td class="num">${s.badges}/${BADGE_TOTAL}</td>
          <td class="num">${s.selfCheck == null ? '—' : `${esc(s.selfCheck)}%`}</td>
          <td title="${esc(s.updated ? new Date(s.updated).toLocaleString() : 'never')}">${esc(timeAgo(s.updated))}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function downloadCsv() {
  if (!students.length) { message('No students to export yet.', 'bad'); return; }
  const blob = new Blob([toCsv(sortStudents(students, 'name'), current.name)], { type: 'text/csv;charset=utf-8' });
  const safe = current.name.replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '') || 'batch';
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${safe}-progress-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  message('CSV downloaded. It contains student names and progress — keep it under the college\'s data policy.', 'ok');
}

/* ---------------- Projector view ---------------- */

const projector = $('[data-projector]');
function openProjector() {
  $('[data-proj-name]').textContent = current.name;
  $('[data-proj-code]').textContent = `${current.code.slice(0, 4)} ${current.code.slice(4)}`;
  projector.hidden = false;
  $('[data-projector-close]').focus();
}
function closeProjector() { projector.hidden = true; $('[data-project]', view)?.focus(); }
$('[data-projector-close]').addEventListener('click', closeProjector);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !projector.hidden) closeProjector(); });

main();
