// Network-first cache: a normal online visit always checks GitHub Pages for a
// newer app version. The cache is used only when the network is unavailable.
const CACHE_NAME = 'yunas-travel-shell-v1';
const APP_SCOPE = '/yunastravel/';
const APP_ASSETS = [
  APP_SCOPE,
  `${APP_SCOPE}index.html`,
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
        if(request.mode === 'navigate') return caches.match(`${self.location.origin}${APP_SCOPE}`);
        return Response.error();
      }))
  );
});
