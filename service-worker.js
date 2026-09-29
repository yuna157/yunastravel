// Never cache the HTML shell. This ensures an installed app receives the same
// current version as a Chrome tab, while the small static assets remain usable
// if a network request briefly fails.
const CACHE_NAME = 'yunas-travel-shell-v2';
const APP_SCOPE = '/yunastravel/';
const APP_ASSETS = [
  `${APP_SCOPE}manifest.webmanifest`,
  `${APP_SCOPE}icons/icon-192.png`,
  `${APP_SCOPE}icons/icon-512.png`
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith('yunas-travel-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET') return;

  const url = new URL(request.url);
  if(url.origin !== self.location.origin || !url.pathname.startsWith(APP_SCOPE)) return;

  // The application document must always come from the network. Serving a
  // cached index.html here can leave an installed PWA behind the web version.
  if(request.mode === 'navigate') {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if(response.ok && response.type === 'basic') {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)));
        }
        return response;
      })
      .catch(() => caches.match(request).then(cached => {
        if(cached) return cached;
        return Response.error();
      }))
  );
});
