// stockfish.worker.js
self.importScripts("stockfish.js");

let engine = null;

if (typeof Stockfish === "function") {
  engine = Stockfish();
} else {
  engine = self.Module;
}

engine.onmessage = function (e) {
  self.postMessage(e.data ? e.data : e);
};

self.onmessage = function (e) {
  engine.postMessage(e.data);
};
