// Vanisland Rentals — Service Worker
// Caches the static app shell (HTML/JS/CSS/images/icons) for offline use and
// fast repeat loads. Never caches API/data requests — Netlify Functions
// (tenant applications, uploads, verification) and any cross-origin calls
// (Apps Script backends) always hit the network so live data is never stale.

const CACHE_NAME = 'vanisland-rentals-static-v1';

const DYNAMIC_PATH_PREFIXES = [
  '/.netlify/functions/',
];

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isDynamicPath(pathname) {
  return DYNAMIC_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const shell = await cache.match('/index.html');
    if (shell) return shell;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isDynamicPath(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  const isStaticAsset = /\.(?:js|css|png|jpg|jpeg|svg|webp|gif|ico|woff2?|json|mp4|mp3)$/.test(url.pathname);
  if (isStaticAsset) {
    event.respondWith(cacheFirst(request));
  }
});
