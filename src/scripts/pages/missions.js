import '../main.js';
import { MISSIONS, UPCOMING } from '../../../content/missions/missions.js';
import { UNITS, pageUrl } from '../data/site.js';
import { load, level, completeMission, BADGES, setLastVisited } from '../lib/progress.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const missionId = params.get('m')?.toUpperCase();
const mission = MISSIONS.find((m) => m.id === missionId);

const badgeName = (id) => BADGES.find((b) => b.id === id);

function statsHtml() {
  const p = load();
  const lv = level(p.xp);
  const done = Object.values(p.missions).filter((m) => m.done).length;
  return `<div class="ms-stat"><span class="ms-num">${p.xp}</span><span>XP</span></div>
    <div class="ms-stat"><span class="ms-num">${lv.level}</span><span>Level</span>
      <span class="ms-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${lv.next}" aria-valuenow="${lv.into}" aria-label="Progress to next level"><span style="width:${(lv.into / lv.next) * 100}%"></span></span></div>
    <div class="ms-stat"><span class="ms-num">${done}<small>/${MISSIONS.length + UPCOMING.length}</small></span><span>Missions</span></div>
    <div class="ms-stat"><span class="ms-num">${Object.keys(p.badges).length}<small>/${BADGES.length}</small></span><span>Badges</span></div>`;
}

/* ======================= HUB ======================= */
function renderHub() {
  $('[data-hub]').hidden = false;
  $('[data-stats]').innerHTML = `${statsHtml()}<a class="ms-move" href="${pageUrl('passport/')}">🛂 Open your Git Passport →</a><a class="ms-move" href="${pageUrl('about/#progress')}">Switching phone or computer? Export your progress →</a>`;
  const p = load();
  const all = [...MISSIONS, ...UPCOMING.map((m) => ({ ...m, upcoming: true }))];
  $('[data-mission-list]').innerHTML = UNITS.filter((u) => u.n <= 4).map((u) => {
    const list = all.filter((m) => m.unit === u.n);
    return `<section class="ms-unit" style="--u:${u.color}">
      <h2><span class="unit-num">Unit ${u.n}</span> ${u.title}</h2>
      <div class="ms-grid">${list.map((m) => {
        const done = p.missions[m.id]?.done;
        if (m.upcoming) return `<div class="ms-card is-upcoming"><span class="ms-id">${m.id}</span><h3>${m.title}</h3><p class="muted">Coming in Milestone 4</p></div>`;
        return `<a class="ms-card card-link${done ? ' is-done' : ''}" href="?m=${m.id}">
          <span class="ms-id">${m.id}</span>${done ? '<span class="ms-check" aria-label="Completed">✓</span>' : ''}
          <h3>${m.title}</h3>
          <p>${m.brief.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 110)}…</p>
          <span class="ms-meta">~${m.minutes} min · ${m.goals.filter((g) => !g.optional).length} goals · ${done ? 'Play again' : 'Start'} →</span>
        </a>`;
      }).join('')}</div>
    </section>`;
  }).join('') + `<p class="muted ms-note">Unit 5 is practised on the real GitHub website — see the <a href="${pageUrl('labs/')}">Labs</a>.</p>`;
  $('[data-badges]').innerHTML = BADGES.map((b) => `<div class="badge${p.badges[b.id] ? ' is-earned' : ''}" title="${b.desc}">
    <span class="badge-icon" aria-hidden="true">${b.icon}</span><strong>${b.title}</strong><span class="muted">${p.badges[b.id] ? 'Earned' : b.desc}</span></div>`).join('');
}

/* ======================= RUNNER ======================= */
async function runMission(m) {
  const [{ createWorkbench }, engine, { cyan, bold, dim }] = await Promise.all([
    import('../terminal/workbench.js'),
    import('../missions/engine.js'),
    import('../terminal/ansi.js'),
  ]);
  $('[data-runner]').hidden = false;
  document.title = `${m.id} ${m.title} · Missions`;
  $('[data-runner-title]').textContent = `${m.id} · ${m.title}`;
  const unit = UNITS[m.unit - 1];
  document.body.style.setProperty('--u', unit.color);

  let results = [];
  let hintsShown = 0;
  let celebrated = load().missions[m.id]?.done ?? false;
  const panelEl = $('[data-panel="mission"]');

  const missionPanel = {
    async refresh() { render(); },
  };

  function render() {
    const required = m.goals.filter((g) => !g.optional).length;
    const doneReq = results.filter((r, i) => r.done && !m.goals[i].optional).length;
    $('[data-runner-progress]').textContent = `${doneReq}/${required} goals`;
    const tab = document.querySelector('[data-tab="mission"]');
    tab.textContent = doneReq === required ? 'Mission ✓' : `Mission ${doneReq}/${required}`;
    const next = MISSIONS[MISSIONS.indexOf(m) + 1];
    const complete = doneReq === required;
    panelEl.innerHTML = `
      ${complete ? `<div class="ms-win" role="status">
        <p class="ms-win-title">🎉 Mission complete!</p>
        ${m.success}
        <div class="ms-win-actions">${next ? `<a class="mini-btn mini-btn-primary" href="?m=${next.id}">Next: ${next.id} ${next.title} →</a>` : ''}<a class="mini-btn" href="${pageUrl('missions/')}">All missions</a></div>
      </div>` : ''}
      <p class="ms-unit-label" style="color:${unit.color}">Unit ${unit.n} · ${unit.title}</p>
      <div class="ms-brief">${m.brief}</div>
      <p class="gh-section">Goals</p>
      <ol class="ms-goals">${m.goals.map((g, i) => `<li class="${results[i]?.done ? 'is-done' : ''}${g.optional ? ' is-optional' : ''}">
        <span class="ms-tick" aria-hidden="true">${results[i]?.done ? '✓' : g.optional ? '☆' : ''}</span><span>${g.text}</span>
        <span class="visually-hidden">${results[i]?.done ? '(done)' : '(not done yet)'}</span></li>`).join('')}</ol>
      <p class="gh-section">Hints</p>
      <div class="ms-hints">${m.hints.slice(0, hintsShown).map((h, i) => `<div class="ms-hint"><span class="ms-hint-n">Hint ${i + 1}</span>${h}</div>`).join('')}
        ${hintsShown < m.hints.length ? `<button class="mini-btn" type="button" data-hint>${hintsShown ? 'Another hint' : 'Show a hint'} (${hintsShown + 1}/${m.hints.length})</button>` : ''}</div>`;
  }

  panelEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-hint]')) { hintsShown++; render(); }
  });

  const wb = createWorkbench({
    defaultTab: 'mission',
    extraPanels: { mission: missionPanel },
    onAfterCommand: () => check(),
    onReset: () => restart(false),
    welcome: () => `${bold(`${m.id} · ${m.title}`)}\n${dim(`Read the mission ${matchMedia('(max-width: 960px)').matches ? 'below the terminal' : 'on the right'}, then type commands here. Goals tick automatically.`)}\n`,
  });
  const ctx = () => engine.createContext(wb, m);

  async function check() {
    const c = ctx();
    results = await engine.evaluate(m, c);
    render();
    const required = m.goals.map((g, i) => (g.optional ? true : results[i].done));
    if (required.every(Boolean) && !celebrated) {
      celebrated = true;
      const r = completeMission(m.id);
      const extra = r.badges.map((b) => ` · Badge: ${badgeName(b)?.icon} ${badgeName(b)?.title}`).join('');
      wb.notify(`Mission complete! +${r.xp} XP${extra}`, 6000);
      wb.selectTab('mission');
    }
  }

  async function setup(wipe) {
    const sid = engine.missionSandbox(m.id);
    const fresh = wipe || !engine.loadMissionState(m.id).setupDone;
    await wb.load(sid, { wipe: fresh });
    if (fresh) {
      engine.saveMissionState(m.id, { setupDone: false });
      const c = ctx();
      await m.setup(c);
      engine.saveMissionState(m.id, { ...c.state, setupDone: true });
      await wb.setCwd(m.start ? `${wb.shell.home}/${m.start}` : wb.shell.home);
      wb.term.print(`${cyan('Mission ready.')} ${dim('Your sandbox has been prepared for this story.')}\n`);
    }
    await check();
  }

  async function restart(confirmFirst = true) {
    if (confirmFirst && !window.confirm(`Restart ${m.id}? Your work in this mission's sandbox will be reset.`)) return;
    hintsShown = 0;
    await setup(true);
    wb.notify('Mission restarted.');
  }
  $('[data-mission-reset]').addEventListener('click', () => restart(true));

  await setup(false);
  wb.term.focus();
  setLastVisited(`${location.pathname}?m=${m.id}`, `Mission ${m.id}: ${m.title}`);
}

if (mission) runMission(mission);
else renderHub();
