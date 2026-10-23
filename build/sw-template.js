/* Service worker (PRD U-05, F-05) — generated at build time by vite.config.js from build/sw-template.js.
 * Pages: network first, so students always get the latest lesson when online; cached copy when offline.
 * Assets (hashed file names): cache first. Everything is precached on install, so the whole course,
 * the playground and every slide deck work offline after the first visit. */
const VERSION = '__VERSION__';
const BASE = '__BASE__';
const PRECACHE = __PRECACHE__;
const CACHE = `gg-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((p) => BASE + p)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('gg-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function fromNetwork(request) {
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

  if (request.mode === 'navigate') {
    // ?cmd=, ?presenter etc. do not change the page itself.
    event.respondWith(
      fromNetwork(request).catch(async () =>
        (await caches.match(request, { ignoreSearch: true }))
        ?? (await caches.match(url.origin + url.pathname.replace(/\/?$/, '/'), { ignoreSearch: true }))
        ?? caches.match(BASE)),
    );
    return;
  }
  event.respondWith(caches.match(request).then((hit) => hit ?? fromNetwork(request)));
});
