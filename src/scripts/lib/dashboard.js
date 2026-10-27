/**
 * Faculty dashboard helpers (Milestone 12 plan §1, §3.2): turn faculty_batch_progress() rows into table cells and
 * CSV. Pure functions, tested by npm test. Rows contain only the plan's fields (no email, no account ids).
 */
import { UNITS } from '../data/site.js';
import { BADGES, level } from './progress.js';

export const MISSION_TOTAL = UNITS.flatMap((u) => u.missions).filter((m) => m.startsWith('M-')).length;
export const BADGE_TOTAL = BADGES.length;

/** One student row → display values. */
export function summarize(row) {
  const xp = Number(row.xp) || 0;
  const units = UNITS.map((u) => {
    const x = row.units?.[String(u.n)] ?? {};
    const total = Number(x.total) || 0;
    return {
      n: u.n,
      read: Math.min(x.sections?.length ?? 0, total || Infinity),
      total,
      quizBest: x.quiz?.best ?? null,
      passed: !!x.quiz?.passed,
      complete: !!x.complete,
    };
  });
  return {
    name: row.display_name ?? '',
    roll: row.roll_no ?? '',
    github: row.github_username ?? '',
    programme: row.programme ?? '',
    xp,
    level: level(xp).level,
    units,
    unitsComplete: units.filter((u) => u.complete).length,
    missions: row.missions?.length ?? 0,
    badges: row.badges?.length ?? 0,
    selfCheck: row.self_check_best ?? null,
    updated: row.updated_at ?? null,
  };
}

/** Short text for a unit cell: ✓ complete · quiz score · lessons read · — (not started). */
export function unitCell(u) {
  if (u.complete) return { text: '✓', tone: 'done', title: `Unit ${u.n} complete${u.quizBest != null ? ` · quiz ${u.quizBest}%` : ''}` };
  if (u.quizBest != null) return { text: `${u.quizBest}%`, tone: u.passed ? 'pass' : 'tried', title: `Unit ${u.n} quiz best ${u.quizBest}% · ${u.passed ? 'passed' : 'not passed yet'}` };
  if (u.read > 0) return { text: `${u.read}/${u.total}`, tone: 'started', title: `Unit ${u.n}: ${u.read} of ${u.total} lessons read` };
  return { text: '—', tone: 'none', title: `Unit ${u.n} not started` };
}

/** Sort students: 'name' (A–Z), 'roll' (roll number, missing last), 'xp' (highest first), 'updated' (most recent first). */
export function sortStudents(list, by) {
  const out = [...list];
  if (by === 'roll') out.sort((a, b) => (!a.roll) - (!b.roll) || a.roll.localeCompare(b.roll, undefined, { numeric: true, sensitivity: 'base' }) || a.name.localeCompare(b.name));
  else if (by === 'xp') out.sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));
  else if (by === 'updated') out.sort((a, b) => (Date.parse(b.updated) || 0) - (Date.parse(a.updated) || 0) || a.name.localeCompare(b.name));
  else out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return out;
}

/**
 * One CSV cell. Text starting with = + - @ (or a tab / carriage return) is prefixed with ' so a spreadsheet shows
 * it as text instead of running it as a formula (plan §3.2).
 */
export function csvCell(value) {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(students, batchName = '') {
  const header = ['Batch', 'Roll no / SID', 'Display name', 'GitHub username', 'Programme', 'XP', 'Level',
    ...UNITS.flatMap((u) => [`Unit ${u.n} lessons read`, `Unit ${u.n} lessons`, `Unit ${u.n} quiz best %`, `Unit ${u.n} quiz passed`, `Unit ${u.n} complete`]),
    `Missions done (of ${MISSION_TOTAL})`, `Badges (of ${BADGE_TOTAL})`, 'Self-check best %', 'Last synced'];
  const yesNo = (b) => (b ? 'yes' : 'no');
  const lines = students.map((s) => [batchName, s.roll, s.name, s.github, s.programme, s.xp, s.level,
    ...s.units.flatMap((u) => [u.read, u.total, u.quizBest ?? '', yesNo(u.passed), yesNo(u.complete)]),
    s.missions, s.badges, s.selfCheck ?? '', s.updated ?? ''].map(csvCell).join(','));
  return `﻿${[header.map(csvCell).join(','), ...lines].join('\r\n')}\r\n`; // BOM: Excel reads UTF-8 names correctly
}
