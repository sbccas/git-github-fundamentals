/**
 * Participant counter on the home page (Milestone 12b plan §3.1; M12B-D1 – D3). Totals only, never names. One small
 * request to the database function course_stats() (no Supabase library), kept on the device for 10 minutes. Nothing
 * is shown when the request fails or when the database hides the totals (fewer than 20 students).
 */
import { SUPABASE_URL, SUPABASE_KEY, configured } from '../data/supabase.js';
import { pageUrl } from '../data/site.js';
import { read, write } from './storage.js';

const CACHE_KEY = 'stats';
export const CACHE_MS = 10 * 60e3;

/** A cached answer is used for 10 minutes (and never one dated in the future). */
export const freshCache = (entry, now = Date.now()) =>
  !!entry && typeof entry.at === 'number' && entry.at <= now && now - entry.at < CACHE_MS;

/** The four totals to show, or [] when hidden or malformed. */
export function statItems(stats) {
  if (!stats || stats.visible !== true) return [];
  const items = [
    { n: stats.students, label: 'Students learning' },
    { n: stats.classes, label: Number(stats.classes) === 1 ? 'Class' : 'Classes' },
    { n: stats.quizzes_passed, label: 'Quizzes passed' },
    { n: stats.missions_completed, label: 'Missions completed' },
  ];
  return items.every((i) => Number.isInteger(i.n) && i.n >= 0) ? items : [];
}

export const formatCount = (n) => Number(n).toLocaleString('en-IN');

async function fetchStats() {
  const cached = read(CACHE_KEY, null);
  if (freshCache(cached)) return cached.data;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/course_stats`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) throw new Error(`course_stats ${res.status}`);
  const data = await res.json();
  write(CACHE_KEY, { at: Date.now(), data });
  return data;
}

function countUp(section) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const nums = [...section.querySelectorAll('[data-count]')];
  nums.forEach((el) => { el.textContent = '0'; });
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    const start = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - start) / 1200);
      const ease = 1 - (1 - k) ** 3;
      nums.forEach((el) => { el.textContent = formatCount(Math.round(Number(el.dataset.count) * ease)); });
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, { threshold: 0.3 });
  io.observe(section);
}

export async function mountCounter() {
  const anchor = document.querySelector('section[aria-label="Course at a glance"]');
  if (!anchor || !configured) return;
  let stats;
  try {
    // Local trial only (plan §5.1): ?counter-preview shows sample totals. import.meta.env.DEV is false in the live
    // build, so this branch and the sample numbers are removed from it.
    stats = import.meta.env.DEV && new URLSearchParams(location.search).has('counter-preview')
      ? { visible: true, students: 312, classes: 9, quizzes_passed: 1450, missions_completed: 2980 }
      : await fetchStats();
  } catch {
    return; // offline, blocked or failed: no counter, nothing else changes
  }
  const items = statItems(stats);
  if (!items.length) return;
  const section = document.createElement('section');
  section.className = 'container counter';
  section.setAttribute('aria-label', 'Students taking part in this course');
  section.innerHTML = `
    <div class="counter-card" data-reveal>
      <p class="eyebrow">Live · Git &amp; GitHub Fundamentals</p>
      <div class="stats counter-stats">
        ${items.map((i) => `<div class="stat"><span class="stat-num" data-count="${i.n}">${formatCount(i.n)}</span><span class="stat-label">${i.label}</span></div>`).join('')}
      </div>
      <p class="counter-cta"><a class="btn btn-primary" href="${pageUrl('account/')}#request">Want this course for your class? Request to join →</a></p>
    </div>`;
  anchor.after(section);
  section.querySelector('[data-reveal]').classList.add('is-visible');
  countUp(section);
}
