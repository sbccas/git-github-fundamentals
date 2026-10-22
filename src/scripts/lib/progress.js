/**
 * Local progress store (PRD G-01 – G-03). Saved on this device only.
 * Shape is versioned so later milestones (and Phase 2 sync) can migrate it.
 */
import { read, write } from './storage.js';

const KEY = 'progress';
const VERSION = 1;

function empty() {
  return {
    version: VERSION,
    units: {},      // { "1": { sections: ["why-vcs", ...], quiz: { best: 80 }, complete: false } }
    missions: {},   // { "M-01": { done: true, at: "2026-10-22T…" } }
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

/**
 * Percent complete for a unit: lesson sections read + quiz passed + unit marked complete.
 * Section totals are passed in by the caller (they come from the lesson content).
 */
export function unitPercent(data, unitNumber, totalSections = 0) {
  const u = data.units[String(unitNumber)];
  if (!u) return 0;
  if (u.complete) return 100;
  const parts = totalSections + 1; // + quiz
  const done = Math.min(u.sections?.length ?? 0, totalSections) + (u.quiz?.best >= 60 ? 1 : 0);
  return Math.round((done / parts) * 100);
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
