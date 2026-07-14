// Service Worker (ADR-008). Lives at the site root so its scope covers all
// pages. Resource-type-specific strategies:
//   HTML      network-first, cache fallback, offline page as last resort
//   CSS/JS    cache-first in a versioned cache; bump VERSION on deployment
//   images    cache-first

const VERSION = 'v1';
const STATIC_CACHE = `static-${VERSION}`;
const PAGES_CACHE = 'pages';
const OFFLINE_PATH = 'public/offline.html';

const PRECACHE = [
  'index.html',
  'pages/products.html',
  'pages/cart.html',
  'styles/main.css',
  'components/product-list.js',
  'components/cart-view.js',
  'shared/db.js',
  'shared/products-data.js',
  'shared/url-params.js',
  'shared/broadcast.js',
  'shared/export-import.js',
  'public/manifest.webmanifest',
  'public/icon.svg',
  OFFLINE_PATH,
];

const scoped = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE.map(scoped));
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = [STATIC_CACHE, PAGES_CACHE];
      for (const name of await caches.keys()) {
        if (!keep.includes(name)) await caches.delete(name);
      }
    })()
  );
});

async function networkFirst(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    // Filter state lives in the query string (ADR-009); the cached document is
    // the same for every query, so match ignoring it.
    let cached =
      (await cache.match(request, { ignoreSearch: true })) ||
      (await caches.match(request, { ignoreSearch: true }));
    if (!cached && new URL(request.url).pathname.endsWith('/')) {
      cached = await caches.match(new URL('index.html', request.url).href);
    }
    return cached || caches.match(scoped(OFFLINE_PATH));
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }
  if (['style', 'script', 'image', 'manifest'].includes(request.destination)) {
    event.respondWith(cacheFirst(request));
  }
});
