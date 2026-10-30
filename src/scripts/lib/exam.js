/**
 * Final exam helpers (Milestone 12c plan §3). Pure functions, tested by npm test: server-clock countdown, the answer
 * store that survives reloads and weak networks, the question grid, and the faculty results CSV.
 */
import { csvCell } from './dashboard.js';

/** Milliseconds left until the deadline, using the server clock (offset = server time − this device's time). */
export const msLeft = (deadlineIso, offsetMs, now = Date.now()) => Math.max(0, Date.parse(deadlineIso) - (now + offsetMs));

/** "29:05" (minutes:seconds). */
export function mmss(ms) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

export const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Answers kept on the device until the server confirms them, so a reload or a dropped network loses nothing.
 * state = { answers: { [questionId]: choice }, pending: { [questionId]: choice } }
 */
export function choose(state, questionId, choice) {
  const q = String(questionId);
  return { answers: { ...state.answers, [q]: choice }, pending: { ...state.pending, [q]: choice } };
}
export function confirmSaved(state, questionId, choice) {
  const q = String(questionId);
  if (state.pending[q] !== choice) return state; // changed again meanwhile: keep the newer pending choice
  const pending = { ...state.pending };
  delete pending[q];
  return { answers: state.answers, pending };
}
/** Server answers (on resume) plus anything still pending on this device. */
export const mergeAnswers = (server = {}, local = { answers: {}, pending: {} }) => ({
  answers: { ...server, ...local.pending },
  pending: { ...local.pending },
});

/** Grid cells for the question palette. */
export const palette = (questions, answers, current) =>
  questions.map((q, i) => ({ n: i + 1, answered: answers[String(q.q)] !== undefined, current: i === current }));

export function resultsCsv(rows, examTitle, batchName) {
  const header = ['Batch', 'Exam', 'Roll no / SID', 'Display name', 'GitHub username', 'State', 'Answered', 'Score', 'Total', 'Percent', 'Result', 'Minutes', 'Left the page (times)', 'Submitted at'];
  const state = { not_started: 'Not started', in_progress: 'In progress', submitted: 'Submitted' };
  const lines = rows.map((r) => [batchName, examTitle, r.roll_no ?? '', r.display_name, r.github_username, state[r.state] ?? r.state,
    r.answered ?? 0, r.score ?? '', r.total ?? '', r.percent ?? '', r.state === 'submitted' ? (r.passed ? 'PASS' : 'FAIL') : '',
    r.minutes ?? '', r.leave_count ?? '', r.submitted_at ?? ''].map(csvCell).join(','));
  return `﻿${[header.map(csvCell).join(','), ...lines].join('\r\n')}\r\n`;
}
