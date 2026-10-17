// PWA app shell cache. This never modifies localStorage or IndexedDB.
const CACHE_NAME = 'yunas-travel-shell-v4';
const APP_SHELL = [
  "./",
  "./index.html",
  "./travel-splash.webp",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => Promise.all(
      APP_SHELL.map(path => cache.add(new Request(path, {cache: 'reload'})))
    ))
  );
  // No automatic skipWaiting on updates: ask the user before a reload.
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('yunas-travel-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(self.registration.scope.replace(self.location.origin, ''))) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(new Request(request, {cache: 'no-store'}))
        .catch(async () => {
          return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
        })
    );
    return;
  }

  event.respondWith(
    fetch(request).then(response => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)));
      }
      return response;
    }).catch(() => caches.match(request).then(cached => cached || Response.error()))
  );
});
