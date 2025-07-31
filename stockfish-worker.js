// stockfish-worker.js
importScripts("stockfish.js");

const engine = STOCKFISH();

onmessage = function (e) {
  engine.postMessage(e.data);
};

engine.onmessage = function (e) {
  postMessage(e.data);
};
