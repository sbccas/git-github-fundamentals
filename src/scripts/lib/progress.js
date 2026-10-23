/**
 * Local progress store (PRD G-01 – G-03). Saved on this device only.
 * Shape is versioned so later milestones (and Phase 2 sync) can migrate it.
 */
import { read, write } from './storage.js';
import { UNITS } from '../data/site.js';

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
    xp: 0,
    lastVisited: null, // { href, title }
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

export function exportJson() {
  return JSON.stringify(load(), null, 2);
}

export function importJson(text) {
  const data = JSON.parse(text);
  if (typeof data !== 'object' || data.version !== VERSION) throw new Error('This file is not a progress export from this course.');
  save({ ...empty(), ...data });
}
