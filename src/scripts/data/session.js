/**
 * Remote session settings (Milestone 12c plan §2; owner, 29 Oct 2026). Times in India Standard Time.
 * The class-wall repository must match the one allowed by the database (submit_session_links).
 */
export const REMOTE_SESSION = {
  title: 'Remote session',
  date: 'Saturday 31 October',
  from: '2026-10-31T11:00:00+05:30',
  to: '2026-10-31T15:00:00+05:30',
  minMinutes: 90, // faculty report highlight: at least 1.5 hours of active work
  targetMinutes: 120, // student timer goal: 2 hours
  wallRepo: 'sbccas/sy-ai-2026-wall',
  missions: ['M-12', 'M-13', 'M-14', 'M-15'],
  quizzes: [4, 5],
};
