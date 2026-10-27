/**
 * Local progress store (PRD G-01 – G-03). Saved on this device only.
 * Shape is versioned so later milestones (and Phase 2 sync) can migrate it.
 */
import { read, write } from './storage.js';
import { UNITS, BASE } from '../data/site.js';

const KEY = 'progress';
const VERSION = 1;

export const XP = { mission: 75, quizPass: 100, unitComplete: 50 };

export const BADGES = [
  { id: 'first-commit', icon: '🌱', title: 'First Commit', desc: 'Saved your first snapshot (Mission M-03).' },
  { id: 'unit-1', icon: '🧭', title: 'Version Control Explorer', desc: 'Finished every Unit 1 mission and passed the quiz.' },
  { id: 'unit-2', icon: '🚀', title: 'Repository Launcher', desc: 'Finished every Unit 2 mission and passed the quiz.' },
  { id: 'unit-3', icon: '🌿', title: 'Branch Master', desc: 'Finished every Unit 3 mission and passed the quiz.' },
  { id: 'unit-4', icon: '🕵️', title: 'History Detective', desc: 'Finished every Unit 4 mission and passed the quiz.' },
  { id: 'unit-5', icon: '🤝', title: 'Open Source Collaborator', desc: 'Passed the Unit 5 quiz.' },
  { id: 'conflict-crusher', icon: '⚔️', title: 'Conflict Crusher', desc: 'Resolved your first merge conflict (Mission M-10).' },
  { id: 'time-traveller', icon: '⏳', title: 'Time Traveller', desc: 'Used the time-travel slider to visit an old commit.' },
  { id: 'course-complete', icon: '🏆', title: 'Course Complete', desc: 'Earned every unit badge.' },
];

const MISSION_BADGES = { 'M-03': 'first-commit', 'M-10': 'conflict-crusher' };

function empty() {
  return {
    version: VERSION,
    units: {},      // { "1": { sections: ["why", …], total: 9, quiz: { best: 80, last: 80, passed: true }, complete: false } }
    missions: {},   // { "M-01": { done: true, at: "2026-10-22T…" } }
    badges: {},     // { "first-commit": "2026-10-22T…" }
    games: {},      // { "conflict": "2026-10-23T…" }
    xp: 0,
    lastVisited: null, // { href, title }
    // Optional, added later without a version bump: selfCheck { best, last, byUnit, at } and
    // profile { name } (the student's self-entered name for the Git Passport; this device only).
  };
}

export function load() {
  const data = read(KEY);
  if (!data || data.version !== VERSION) return empty();
  return { ...empty(), ...data };
}

export function save(data) {
  write(KEY, data);
  window.dispatchEvent(new CustomEvent('gg:progress', { detail: data }));
}

const unitEntry = (data, n) => (data.units[String(n)] ??= { sections: [], total: 0, quiz: null, complete: false });

/** Percent complete for a unit: lesson sections read + quiz passed (complete = 100). */
export function unitPercent(data, unitNumber) {
  const u = data.units[String(unitNumber)];
  if (!u) return 0;
  if (u.complete) return 100;
  const total = u.total || 0;
  const parts = total + 1;
  const done = Math.min(u.sections?.length ?? 0, total) + (u.quiz?.passed ? 1 : 0);
  return Math.round((done / parts) * 100);
}

export function level(xp) {
  const lvl = Math.floor(xp / 250) + 1;
  return { level: lvl, into: xp % 250, next: 250 };
}

/** Award any badges whose conditions are now met. Returns newly earned badge ids. */
function checkBadges(data) {
  const earned = [];
  const give = (id) => { if (!data.badges[id]) { data.badges[id] = new Date().toISOString(); earned.push(id); } };
  for (const [m, b] of Object.entries(MISSION_BADGES)) if (data.missions[m]?.done) give(b);
  for (const u of UNITS) {
    const missions = u.missions.filter((m) => m.startsWith('M-'));
    const quizOk = data.units[String(u.n)]?.quiz?.passed;
    if (quizOk && missions.every((m) => data.missions[m]?.done)) give(`unit-${u.n}`);
  }
  if (UNITS.every((u) => data.badges[`unit-${u.n}`])) give('course-complete');
  return earned;
}

export function markSection(unit, id, total) {
  const data = load();
  const u = unitEntry(data, unit);
  u.total = total;
  if (u.sections.includes(id)) { save(data); return; }
  u.sections.push(id);
  save(data);
}

export function setUnitTotal(unit, total) {
  const data = load();
  const u = unitEntry(data, unit);
  if (u.total !== total) { u.total = total; save(data); }
}

export function completeUnit(unit) {
  const data = load();
  const u = unitEntry(data, unit);
  if (u.complete) return { xp: 0, badges: [] };
  u.complete = true;
  data.xp += XP.unitComplete;
  const badges = checkBadges(data);
  save(data);
  return { xp: XP.unitComplete, badges };
}

export function recordQuiz(unit, percent, passMark) {
  const data = load();
  const u = unitEntry(data, unit);
  const firstPass = percent >= passMark && !u.quiz?.passed;
  u.quiz = { best: Math.max(u.quiz?.best ?? 0, percent), last: percent, passed: !!u.quiz?.passed || percent >= passMark };
  if (firstPass) data.xp += XP.quizPass;
  const badges = checkBadges(data);
  save(data);
  return { xp: firstPass ? XP.quizPass : 0, badges };
}

export function completeMission(id, xp = XP.mission) {
  const data = load();
  if (data.missions[id]?.done) return { xp: 0, badges: [], first: false };
  data.missions[id] = { done: true, at: new Date().toISOString() };
  data.xp += xp;
  const badges = checkBadges(data);
  save(data);
  return { xp, badges, first: true };
}

/** Mini-games (e.g. the conflict game) give XP once. */
export function completeGame(id, xp = 50) {
  const data = load();
  data.games ??= {};
  if (data.games[id]) return { xp: 0 };
  data.games[id] = new Date().toISOString();
  data.xp += xp;
  save(data);
  return { xp };
}

export function earnBadge(id) {
  const data = load();
  if (data.badges[id]) return false;
  data.badges[id] = new Date().toISOString();
  save(data);
  return true;
}

export function setLastVisited(href, title) {
  const data = load();
  data.lastVisited = { href, title };
  save(data);
}

/** Git Passport (G-07): the student's own name, stored on this device only. Empty clears it. */
export function setPassportName(name) {
  const data = load();
  const clean = cleanName(name);
  if (clean) data.profile = { name: clean };
  else delete data.profile;
  save(data);
  return clean;
}

export function exportJson() {
  return JSON.stringify(load(), null, 2);
}

/**
 * XP is fully determined by recorded work, because every award is given once:
 * missions × 75 + first quiz passes × 100 + units marked complete × 50 + mini-games × 50.
 */
export function deriveXp(data) {
  const missions = Object.values(data.missions ?? {}).filter((m) => m?.done).length;
  const units = Object.values(data.units ?? {});
  const quizzes = units.filter((u) => u?.quiz?.passed).length;
  const complete = units.filter((u) => u?.complete).length;
  const games = Object.keys(data.games ?? {}).length;
  return missions * XP.mission + quizzes * XP.quizPass + complete * XP.unitComplete + games * GAME_XP;
}

const GAME_XP = 50;
const GAMES = ['conflict'];
const MISSION_IDS = new Set(UNITS.flatMap((u) => u.missions).filter((m) => m.startsWith('M-')));
const BADGE_IDS = new Set(BADGES.map((b) => b.id));

function cleanName(name) {
  return String(name ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

class ImportError extends Error {}
const fail = (why) => { throw new ImportError(`This file is not a valid progress export from this course (${why}).`); };
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isDate = (v) => typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v));
const pct = (v, what) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 ? Math.round(v) : fail(`${what} must be 0–100`));

/** Only links inside this site may become the "Continue where you left off" link. */
function safeHref(href) {
  if (typeof href !== 'string' || href.length > 200) return false;
  return href.startsWith(BASE) && !href.startsWith('//') && !/[\s"'<>\\]/.test(href);
}

/**
 * Check an imported progress object (G-08). Returns a clean copy or throws ImportError.
 * Wrong types or out-of-range values reject the whole file; unknown entries are dropped;
 * badges that the recorded work does not justify are removed; XP is recalculated.
 */
export function validateProgress(input) {
  if (!isObj(input)) fail('not a progress object');
  if (input.version !== VERSION) fail('unsupported version');
  const out = empty();

  if (input.units !== undefined) {
    if (!isObj(input.units)) fail('units');
    for (const u of UNITS) {
      const src = input.units[String(u.n)];
      if (src === undefined) continue;
      if (!isObj(src)) fail(`unit ${u.n}`);
      const sections = src.sections ?? [];
      if (!Array.isArray(sections) || sections.some((s) => typeof s !== 'string' || s.length > 80)) fail(`unit ${u.n} sections`);
      const total = src.total ?? 0;
      if (!Number.isInteger(total) || total < 0 || total > 100) fail(`unit ${u.n} section total`);
      let quiz = null;
      if (src.quiz != null) {
        if (!isObj(src.quiz) || typeof src.quiz.passed !== 'boolean') fail(`unit ${u.n} quiz`);
        quiz = { best: pct(src.quiz.best, 'quiz score'), last: pct(src.quiz.last ?? src.quiz.best, 'quiz score'), passed: src.quiz.passed };
      }
      if (src.complete !== undefined && typeof src.complete !== 'boolean') fail(`unit ${u.n} complete`);
      out.units[String(u.n)] = { sections: [...new Set(sections)].slice(0, 100), total, quiz, complete: !!src.complete };
    }
  }

  if (input.missions !== undefined) {
    if (!isObj(input.missions)) fail('missions');
    for (const [id, m] of Object.entries(input.missions)) {
      if (!MISSION_IDS.has(id)) continue;
      if (!isObj(m) || typeof m.done !== 'boolean') fail(`mission ${id}`);
      if (m.done) out.missions[id] = { done: true, at: isDate(m.at) ? m.at : new Date(0).toISOString() };
    }
  }

  if (input.games !== undefined) {
    if (!isObj(input.games)) fail('games');
    for (const id of GAMES) if (input.games[id] !== undefined) out.games[id] = isDate(input.games[id]) ? input.games[id] : new Date(0).toISOString();
  }

  if (input.badges !== undefined) {
    if (!isObj(input.badges)) fail('badges');
    for (const [id, at] of Object.entries(input.badges)) {
      if (!BADGE_IDS.has(id)) continue;
      if (!isDate(at)) fail(`badge ${id} date`);
      out.badges[id] = at;
    }
    // Keep only badges the recorded work justifies (time-traveller leaves no other record, so it stays).
    const justified = new Set(['time-traveller']);
    for (const [m, b] of Object.entries(MISSION_BADGES)) if (out.missions[m]?.done) justified.add(b);
    for (const u of UNITS) {
      const missions = u.missions.filter((m) => m.startsWith('M-'));
      if (out.units[String(u.n)]?.quiz?.passed && missions.every((m) => out.missions[m]?.done)) justified.add(`unit-${u.n}`);
    }
    if (UNITS.every((u) => justified.has(`unit-${u.n}`))) justified.add('course-complete');
    for (const id of Object.keys(out.badges)) if (!justified.has(id)) delete out.badges[id];
  }

  if (isObj(input.lastVisited) && safeHref(input.lastVisited.href) && typeof input.lastVisited.title === 'string') {
    out.lastVisited = { href: input.lastVisited.href, title: input.lastVisited.title.slice(0, 120) };
  }

  if (input.selfCheck != null) {
    const s = input.selfCheck;
    if (!isObj(s)) fail('self-check');
    const byUnit = {};
    if (s.byUnit !== undefined) {
      if (!isObj(s.byUnit)) fail('self-check units');
      for (const u of UNITS) if (s.byUnit[u.n] !== undefined) byUnit[u.n] = pct(s.byUnit[u.n], 'self-check score');
    }
    out.selfCheck = { best: pct(s.best, 'self-check score'), last: pct(s.last ?? s.best, 'self-check score'), byUnit, at: isDate(s.at) ? s.at : null };
  }

  if (isObj(input.profile)) {
    const name = cleanName(input.profile.name);
    if (name) out.profile = { name };
  }

  out.xp = deriveXp(out);
  return out;
}

/** True when a progress document records any learning (used before offering to add it to an account). */
export function hasProgress(data) {
  const any = (o) => Object.keys(o ?? {}).length > 0;
  return any(data?.units) || any(data?.missions) || any(data?.badges) || any(data?.games) || !!data?.selfCheck || !!data?.profile;
}

/** Same content, ignoring key order. */
export function sameProgress(a, b) {
  const canon = (v) => (Array.isArray(v) ? v.map(canon)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
}

/** Union of two date maps (missions hold { done, at }); the earliest date is kept. */
function unionEarliest(a = {}, b = {}) {
  const time = (v) => { const t = Date.parse(v && typeof v === 'object' ? v.at : v); return Number.isNaN(t) ? Infinity : t; };
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) if (!(k in out) || time(v) < time(out[k])) out[k] = v;
  return out;
}

/**
 * Merge two valid progress documents (Phase 2 sync, Milestone 11 plan §4.2): `a` is the stored or older copy,
 * `b` the incoming or newer one. Learning facts are united and scores only rise, so nothing is lost and XP is not
 * doubled. The same rules run in the database (save_progress → private.merge_progress).
 */
export function mergeProgress(a, b) {
  const units = {};
  for (const n of new Set([...Object.keys(a.units ?? {}), ...Object.keys(b.units ?? {})])) {
    const ua = a.units?.[n];
    const ub = b.units?.[n];
    if (!ua || !ub) { units[n] = ua ?? ub; continue; }
    const qa = ua.quiz;
    const qb = ub.quiz;
    units[n] = {
      sections: [...new Set([...(ua.sections ?? []), ...(ub.sections ?? [])])].slice(0, 100),
      total: Math.max(ua.total ?? 0, ub.total ?? 0),
      quiz: !qa ? qb ?? null : !qb ? qa : { best: Math.max(qa.best, qb.best), last: qb.last, passed: qa.passed || qb.passed },
      complete: !!(ua.complete || ub.complete),
    };
  }
  let selfCheck = b.selfCheck ?? a.selfCheck;
  if (a.selfCheck && b.selfCheck) {
    const newer = Date.parse(a.selfCheck.at) > (Date.parse(b.selfCheck.at) || -Infinity) ? a.selfCheck : b.selfCheck;
    selfCheck = { ...newer, best: Math.max(a.selfCheck.best, b.selfCheck.best) };
  }
  const out = {
    version: VERSION,
    units,
    missions: unionEarliest(a.missions, b.missions),
    badges: unionEarliest(a.badges, b.badges),
    games: unionEarliest(a.games, b.games),
    xp: 0,
    lastVisited: b.lastVisited ?? a.lastVisited ?? null, // no timestamp in v1: the latest save wins (M11-D3)
  };
  if (selfCheck) out.selfCheck = selfCheck;
  const profile = b.profile ?? a.profile;
  if (profile) out.profile = profile;
  return validateProgress(out); // removes unjustified badges and recalculates XP
}

/** Replace this device's progress with an exported file. Throws, without saving anything, if the file is invalid. */
export function importJson(text) {
  let data;
  try { data = JSON.parse(text); } catch { fail('not JSON'); }
  save(validateProgress(data));
}
