// ✅ stockfish-worker.js (Classic Worker for GitHub Pages)
importScripts("stockfish.js");

const engine = typeof Stockfish === "function" ? Stockfish() : self;

engine.onmessage = function (e) {
  postMessage(typeof e === "object" ? e.data : e);
};

onmessage = function (e) {
  engine.postMessage(e.data);
};
