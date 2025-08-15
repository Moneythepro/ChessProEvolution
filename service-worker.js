/* service-worker.js */
const CACHE_VERSION = 'v3';
const CACHE_NAME = `chess-pro-${CACHE_VERSION}`;
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./favicon.png",
  "./banner.png",
  "./LICENCE.txt",
  "./LICENSE",
  "./README.md",
  "./firebase-config.js",
  "./chessillegal.js",

  // Vendor JS locallly hosted
  "./vendor/lucide.min.js",
  "./vendor/chess.min.js",

  // Chess piece images
  "./pieces/wp.png",
  "./pieces/wr.png",
  "./pieces/wn.png",
  "./pieces/wb.png",
  "./pieces/wq.png",
  "./pieces/wk.png",
  "./pieces/bp.png",
  "./pieces/br.png",
  "./pieces/bn.png",
  "./pieces/bb.png",
  "./pieces/bq.png",
  "./pieces/bk.png",

  // Sound files
  "./win.mp3",
  "./draw.mp3",
  "./move.mp3"
];

// Install: Cache all assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: Remove old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: Use cache-first strategy with navigation fallback
self.addEventListener("fetch", event => {
  const { request } = event;

  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match("./index.html").then(res => res || fetch(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
