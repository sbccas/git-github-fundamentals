/**
 * Git Passport (PRD G-04, G-05): read-only views over the progress object from progress.js.
 * Nothing here saves or awards anything — opening the passport never changes progress.
 */
import { UNITS, pageUrl } from '../data/site.js';
import { BADGES, level, unitPercent } from './progress.js';

/** Missions checked in the browser for a unit (Unit 5's labs happen on real GitHub and are not tracked). */
export const unitMissions = (u) => u.missions.filter((m) => m.startsWith('M-'));

/** Has the student recorded anything at all for this unit? */
function started(data, u) {
  const e = data.units[String(u.n)];
  return !!(e?.sections?.length || e?.quiz || e?.complete || unitMissions(u).some((m) => data.missions[m]?.done));
}

export function unitStatus(data, u) {
  const e = data.units[String(u.n)] ?? {};
  const missions = unitMissions(u);
  const done = missions.filter((m) => data.missions[m]?.done);
  const badgeId = `unit-${u.n}`;
  const missing = [];
  if (!e.quiz?.passed) missing.push(`Pass the Unit ${u.n} quiz`);
  const todo = missions.filter((m) => !done.includes(m));
  if (todo.length) missing.push(`Finish ${todo.join(', ')}`);
  return {
    unit: u,
    percent: unitPercent(data, u.n),
    sectionsRead: Math.min(e.sections?.length ?? 0, e.total || 0),
    sectionsTotal: e.total || 0,
    quizBest: e.quiz ? e.quiz.best : null,
    quizPassed: !!e.quiz?.passed,
    missionsDone: done.length,
    missionsTotal: missions.length,
    complete: !!e.complete,
    started: started(data, u),
    badge: BADGES.find((b) => b.id === badgeId),
    badgeEarned: data.badges[badgeId] ?? null,
    missing: data.badges[badgeId] ? [] : missing,
  };
}

/** Average of the five unit percentages (same numbers as the rings on the home page). */
export const overallPercent = (data) => Math.round(UNITS.reduce((s, u) => s + unitPercent(data, u.n), 0) / UNITS.length);

export function isNewStudent(data) {
  return !data.xp && !Object.keys(data.missions).length && !Object.keys(data.badges).length
    && !UNITS.some((u) => started(data, u)) && !data.selfCheck;
}

/**
 * The next thing to do, from recorded progress only (G-05). First match wins:
 * 1 unfinished mission in a started unit · 2 unpassed quiz in a started unit · 3 revise a unit scoring below 75 %
 * · 4 resume the last page · 5 start the next unit · 6 final self-check · done.
 * `missionTitle(id)` is optional (the page passes mission titles; tests can omit it).
 */
export function nextActivity(data, missionTitle = () => '') {
  const units = UNITS.map((u) => unitStatus(data, u));
  for (const s of units) {
    if (!s.started) continue;
    const m = unitMissions(s.unit).find((id) => !data.missions[id]?.done);
    if (m) {
      const t = missionTitle(m);
      return { rule: 'mission', unit: s.unit.n, href: pageUrl(`missions/?m=${m}`), title: `Mission ${m}${t ? ` · ${t}` : ''}`, text: `Finish your Unit ${s.unit.n} missions — ${s.missionsDone} of ${s.missionsTotal} done.` };
    }
  }
  for (const s of units) {
    if (s.started && !s.quizPassed) {
      return { rule: 'quiz', unit: s.unit.n, href: pageUrl(`${s.unit.slug}/#quiz`), title: `Unit ${s.unit.n} quiz`, text: s.quizBest === null ? `Take the Unit ${s.unit.n} quiz to unlock its badge.` : `Your best is ${s.quizBest}%. Try again to pass and unlock the badge.` };
    }
  }
  const weak = units.find((s) => s.quizBest !== null && s.quizBest < 75);
  if (weak) {
    return { rule: 'revise', unit: weak.unit.n, href: pageUrl(`${weak.unit.slug}/`), title: `Revise Unit ${weak.unit.n}: ${weak.unit.title}`, text: `Your best quiz score is ${weak.quizBest}%. Re-read the lesson, then retake the quiz.` };
  }
  if (data.lastVisited?.href) {
    return { rule: 'resume', unit: null, href: data.lastVisited.href, title: data.lastVisited.title, text: 'Pick up where you left off.' };
  }
  const next = units.find((s) => !s.started);
  if (next) {
    return { rule: 'start', unit: next.unit.n, href: pageUrl(`${next.unit.slug}/`), title: `Start Unit ${next.unit.n}: ${next.unit.title}`, text: next.unit.summary };
  }
  if (!data.selfCheck) {
    return { rule: 'self-check', unit: null, href: pageUrl('self-check/'), title: 'Final self-check', text: '40 questions across all five units, with a report that shows what to revise.' };
  }
  return { rule: 'done', unit: null, href: pageUrl('playground/'), title: 'Keep practising in the Playground', text: 'Every unit is done. Try the Bonus page or help a classmate with a mission.' };
}

/** Everything the passport page shows, in one object. */
export function passportSummary(data, missionTotal) {
  const lv = level(data.xp);
  const quizzesPassed = UNITS.filter((u) => data.units[String(u.n)]?.quiz?.passed).length;
  return {
    name: data.profile?.name ?? '',
    xp: data.xp,
    level: lv.level,
    levelInto: lv.into,
    levelSize: lv.next,
    xpToNext: lv.next - lv.into,
    overall: overallPercent(data),
    units: UNITS.map((u) => unitStatus(data, u)),
    badges: BADGES.map((b) => ({ ...b, earned: data.badges[b.id] ?? null })),
    badgesEarned: BADGES.filter((b) => data.badges[b.id]).length,
    missionsDone: Object.values(data.missions).filter((m) => m?.done).length,
    missionTotal,
    quizzesPassed,
    selfCheckBest: data.selfCheck?.best ?? null,
    isNew: isNewStudent(data),
  };
}
