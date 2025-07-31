const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const game = new Chess();
let selectedSquare = null;
let isAIEnabled = false;
const stockfish = new Worker("https://cdn.jsdelivr.net/npm/stockfish/stockfish.js");

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
    const move = game.move({ from: selectedSquare, to: square, promotion: "q" });
    selectedSquare = null;
    if (move) {
      playSound(move);
      renderBoard();
      if (isAIEnabled && !game.game_over()) aiMove();
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
}

function startNewGame() {
  game.reset();
  renderBoard();
}

function undoMove() {
  game.undo();
  if (isAIEnabled) game.undo();
  renderBoard();
}

function playWithAI() {
  isAIEnabled = true;
  startNewGame();
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
  statusEl.textContent = status;
}

renderBoard();
