/**
 * Registers the service worker (built site only) so the course installs to the home screen and
 * works offline after the first visit (PRD U-05). The first time the cache is ready, a small
 * note tells the student they can now use the site without internet.
 */
import { readRaw, writeRaw } from './storage.js';

export function initPwa() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
      if (readRaw('offline-ready')) return;
      const worker = reg.installing ?? reg.waiting;
      if (!worker) { writeRaw('offline-ready', '1'); return; }
      worker.addEventListener('statechange', () => {
        if (worker.state !== 'activated') return;
        writeRaw('offline-ready', '1');
        showNote('Saved for offline use — this course now works without internet on this device.');
      });
    } catch {
      /* Offline support is a bonus; the site works without it. */
    }
  });
}

function showNote(text) {
  const note = document.createElement('div');
  note.className = 'pwa-note';
  note.setAttribute('role', 'status');
  note.textContent = text;
  document.body.append(note);
  setTimeout(() => note.classList.add('is-leaving'), 5000);
  setTimeout(() => note.remove(), 5600);
}
