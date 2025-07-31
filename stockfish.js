importScripts('https://cdn.jsdelivr.net/gh/niklasf/stockfish.wasm@master/src/stockfish.js');

onmessage = function (event) {
  postMessage('uci'); // Ensure UCI mode is active

  const stockfish = new Worker('https://cdn.jsdelivr.net/gh/niklasf/stockfish.wasm@master/src/stockfish.js');

  stockfish.onmessage = function (e) {
    postMessage(e.data);
  };

  stockfish.postMessage(event.data);
};
