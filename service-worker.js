const CACHE_NAME = "chess-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./pieces/wp.svg",
  "./pieces/wr.svg",
  "./pieces/wn.svg",
  "./pieces/wb.svg",
  "./pieces/wq.svg",
  "./pieces/wk.svg",
  "./pieces/bp.svg",
  "./pieces/br.svg",
  "./pieces/bn.svg",
  "./pieces/bb.svg",
  "./pieces/bq.svg",
  "./pieces/bk.svg",
  "./win.mp3",
  "./draw.mp3",
  "./move.mp3"
];

// Install event – cache essential files
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Fetch event – serve from cache first
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});

// Activate event – clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
});
