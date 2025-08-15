/* service-worker.js */
const CACHE_VERSION = 'v4';           // bump to force update
const CACHE_NAME = `chess-pro-${CACHE_VERSION}`;

// List EVERYTHING needed offline
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './chessillegal.js',
  './manifest.json',

  // vendor
  './vendor/chess.min.js',
  './vendor/lucide.min.js',

  // icons
  './icons/icon-192.png',
  './icons/icon-512.png',

  // pieces
  './pieces/wp.png',
  './pieces/wr.png',
  './pieces/wn.png',
  './pieces/wb.png',
  './pieces/wq.png',
  './pieces/wk.png',
  './pieces/bp.png',
  './pieces/br.png',
  './pieces/bn.png',
  './pieces/bb.png',
  './pieces/bq.png',
  './pieces/bk.png',

  // sounds
  './win.mp3',
  './draw.mp3',
  './move.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// A small helper: cache-first for same-origin GET requests
async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  if (cached) return cached;

  // If online, fetch and update cache (optional)
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    // If offline and not in cache, try app shell
    if (req.mode === 'navigate') {
      return cache.match('./index.html');
    }
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Handle navigation requests (refresh/open app) – serve app shell
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((res) => res || fetch(request))
    );
    return;
  }

  // Same-origin: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Cross-origin (should be none after self-hosting): try network, fallback if needed
  event.respondWith(
    fetch(request).catch(() => caches.match('./index.html'))
  );
});
