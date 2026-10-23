import '../main.js';
import { SESSIONS, pad2, HANDBOOK_CHAPTERS } from '../data/sessions.js';
import { UNITS, pageUrl } from '../data/site.js';
import OBJECTIVES from 'virtual:session-objectives';

const groups = [...UNITS.map((u) => ({ unit: u.n, title: `Unit ${u.n} · ${u.title}`, color: u.color })), { unit: 0, title: 'Final assessment', color: 'var(--accent)' }];

document.querySelector('[data-sessions]').innerHTML = groups.map((g) => {
  const list = SESSIONS.filter((s) => s.unit === g.unit);
  return `<section class="teach-unit" style="--u:${g.color}">
    <h3>${g.title}</h3>
    <ol class="teach-sessions">${list.map((s) => `
      <li class="teach-session${s.deck ? '' : ' is-soon'}">
        <span class="ts-num">${pad2(s.n)}</span>
        <div class="ts-body">
          <strong>${s.title}</strong>
          <span class="muted">2 hours${s.practice.length ? ` · ${s.practice.join(', ')}` : ''}</span>
          ${OBJECTIVES[s.n] ? `<p class="ts-objectives"><span>Objectives</span> ${OBJECTIVES[s.n]}</p>` : ''}
        </div>
        <div class="ts-actions">
          ${s.deck ? `<a class="ts-btn ts-present" href="${pageUrl(`teach/session-${pad2(s.n)}/`)}">▶ Present</a>` : '<span class="ts-btn is-disabled">Slides coming soon</span>'}
          <a class="ts-btn" href="${pageUrl(`teach/guide/#session-${s.n}`)}">Session plan</a>
          ${HANDBOOK_CHAPTERS[s.unit] ? `<a class="ts-btn" href="${pageUrl(`teach/handbook/#${HANDBOOK_CHAPTERS[s.unit]}`)}">Handbook</a>` : ''}
        </div>
      </li>`).join('')}</ol>
  </section>`;
}).join('');
