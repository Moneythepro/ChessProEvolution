/* service-worker.js */
const CACHE_VERSION = 'v5';
const CACHE_NAME = `chess-pro-${CACHE_VERSION}`;
const OFFLINE_URL = './offline.html';

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./favicon.png",
  "./banner.png",
  "./offline.html",

  // Pieces
  "./pieces/wp.png", "./pieces/wr.png", "./pieces/wn.png", "./pieces/wb.png",
  "./pieces/wq.png", "./pieces/wk.png", "./pieces/bp.png", "./pieces/br.png",
  "./pieces/bn.png", "./pieces/bb.png", "./pieces/bq.png", "./pieces/bk.png",

  // Sounds
  "./win.mp3", "./draw.mp3", "./move.mp3",

  // Vendor
  "./vendor/lucide.min.js",
  "./vendor/chess.min.js",

  // Screenshots & icons
  "./screenshots/screen1.png",
  "./screenshots/screen2.png",
  "./icons/icon-192x192.png",
  "./icons/icon-512x512.png",
  "./icons/icon-512x512-maskable.png"
];

// Install
self.addEventListener("install", event => {
  console.log('[SW] Installing & caching assets...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate
self.addEventListener("activate", event => {
  console.log('[SW] Activating and cleaning old caches...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch with stale-while-revalidate + offline fallback
self.addEventListener("fetch", event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          // Save new response in cache
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache =>
              cache.put(event.request, networkResponse.clone())
            );
          }
          return networkResponse;
        })
        .catch(() => cachedResponse || (event.request.mode === 'navigate'
          ? caches.match(OFFLINE_URL)
          : undefined)
        );
      return cachedResponse || fetchPromise;
    })
  );
});

// Push notification support (future)
self.addEventListener('push', event => {
  const data = event.data?.json() || { title: 'Chess Pro Evolution', body: 'Your move!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icons/icon-192x192.png',
      badge: './icons/icon-192x192.png'
    })
  );
});

// Background sync example
self.addEventListener('sync', event => {
  if (event.tag === 'sync-game-data') {
    event.waitUntil(
      // Example: send unsent matches to server
      fetch('/sync-data', { method: 'POST' })
    );
  }
});
