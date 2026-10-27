/* Service worker (PRD U-05, F-05) — generated at build time by vite.config.js from build/sw-template.js.
 * Pages: network first, so students always get the latest lesson when online; cached copy when offline.
 * Assets (hashed file names): cache first. Everything is precached on install, so the whole course,
 * the playground and every slide deck work offline after the first visit. */
const VERSION = '__VERSION__';
const BASE = '__BASE__';
const PRECACHE = __PRECACHE__;
const CACHE = `gg-${VERSION}`;
// Sign-in return addresses carry one-time codes (?code=…, ?error=…): fetched, never stored (Milestone 11 plan §5).
const AUTH_PARAMS = ['code', 'error', 'error_description', 'state'];

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

async function fromNetwork(request, store = true) {
  const response = await fetch(request);
  if (store && response.ok && response.type === 'basic') {
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
    const authReturn = AUTH_PARAMS.some((p) => url.searchParams.has(p));
    event.respondWith(
      fromNetwork(request, !authReturn).catch(async () =>
        (await caches.match(request, { ignoreSearch: true }))
        ?? (await caches.match(url.origin + url.pathname.replace(/\/?$/, '/'), { ignoreSearch: true }))
        ?? caches.match(BASE)),
    );
    return;
  }
  event.respondWith(caches.match(request).then((hit) => hit ?? fromNetwork(request)));
});
