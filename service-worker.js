const CACHE_NAME = "chess-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
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
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
});
