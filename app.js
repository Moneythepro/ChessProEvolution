const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const historyList = document.getElementById("historyList");

const game = new Chess();
let selectedSquare = null;
let isAIEnabled = false;
let isMultiplayer = false;

// ✅ Updated to use working Stockfish CDN
const stockfish = new Worker("https://cdn.jsdelivr.net/npm/stockfish@16.1.0/dist/stockfish.wasm.js");

const moveSound = new Audio("move.mp3");
const captureSound = new Audio("capture.mp3");

function renderBoard() {
  boardEl.innerHTML = "";
  const position = game.board();

  for (let r = 7; r >= 0; r--) {
    for (let c = 0; c < 8; c++) {
      const squareColor = (r + c) % 2 === 0 ? "light" : "dark";
      const squareEl = document.createElement("div");
      squareEl.className = `square ${squareColor}`;
      squareEl.dataset.row = r;
      squareEl.dataset.col = c;

      const piece = position[r][c];
      if (piece) {
        squareEl.textContent = piece.color === "w" ? piece.type.toUpperCase() : piece.type;
      }

      squareEl.onclick = () => handleSquareClick(r, c);
      boardEl.appendChild(squareEl);
    }
  }

  updateStatus();
}

function handleSquareClick(r, c) {
  const square = "abcdefgh"[c] + (r + 1);
  if (!selectedSquare) {
    selectedSquare = square;
  } else {
    const from = selectedSquare;
    const to = square;
    selectedSquare = null;

    if (isMultiplayer) {
      multiplayerMove(from, to); // multiplayer.js
    } else {
      const move = game.move({ from, to, promotion: "q" });
      if (move) {
        playSound(move);
        renderBoard();
        if (isAIEnabled && !game.game_over()) aiMove();
      }
    }
  }
}

function aiMove() {
  stockfish.postMessage(`position fen ${game.fen()}`);
  stockfish.postMessage("go depth 12");

  stockfish.onmessage = function (e) {
    const match = e.data.match(/bestmove ([a-h][1-8])([a-h][1-8])/);
    if (match) {
      const move = game.move({ from: match[1], to: match[2], promotion: "q" });
      if (move) {
        playSound(move);
        renderBoard();
      }
    }
  };
}

function playSound(move) {
  navigator.vibrate(50);
  (move.captured ? captureSound : moveSound).play();

  // Add to move history
  if (historyList) {
    const li = document.createElement("li");
    li.textContent = game.history().slice(-1)[0];
    historyList.appendChild(li);
  }
}

function startNewGame() {
  isAIEnabled = false;
  isMultiplayer = false;
  game.reset();
  renderBoard();

  document.getElementById("userStatus").textContent = "";
  if (historyList) historyList.innerHTML = "";
}

function undoMove() {
  game.undo();
  if (isAIEnabled) game.undo();
  renderBoard();
}

function playWithAI() {
  isAIEnabled = true;
  isMultiplayer = false;
  startNewGame();
}

function playMultiplayer() {
  isAIEnabled = false;
  isMultiplayer = true;
  startNewGame();
  openMultiplayer(); // multiplayer.js
}

function updateStatus() {
  let status = "";
  if (game.in_checkmate()) {
    status = `Game over. ${game.turn() === "w" ? "Black" : "White"} wins!`;
  } else if (game.in_draw()) {
    status = "Draw!";
  } else {
    status = `${game.turn() === "w" ? "White" : "Black"} to move.`;
  }

  if (!isMultiplayer) {
    statusEl.textContent = status;
  }
}

// Called by multiplayer.js
function updateBoard() {
  renderBoard();
}

renderBoard();
