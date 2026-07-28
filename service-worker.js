// Service worker for CSE Hydropower Data dashboard.
//
// Strategy: cache the app shell (the dashboard HTML + icons) so the app can
// open even with no signal. The live Excel data (fetched from the
// Cloudflare Worker / OneDrive proxy) is NEVER cached here -- any
// cross-origin request is left completely alone and always goes straight
// to the network, so the numbers you see are always current.

const CACHE_NAME = 'cse-hydropower-v1';
const APP_SHELL = [
  './hydropower_dashboard_web.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests (the dashboard's own files).
  // Everything else -- in particular the live Excel data coming from a
  // different domain (the Worker/proxy) -- is left untouched so it is
  // always fetched fresh, never served from cache.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
