// stockfish-worker.js
importScripts("stockfish.js");

let stockfish = STOCKFISH();

onmessage = function (e) {
  stockfish.postMessage(e.data);
};

stockfish.onmessage = function (e) {
  postMessage(e.data);
};
