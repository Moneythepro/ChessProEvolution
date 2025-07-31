const boardElement = document.getElementById("board");
const statusEl = document.getElementById("status");
const moveListEl = document.getElementById("moveList");
const modeSelect = document.getElementById("modeSelect");
const aiLevelSlider = document.getElementById("aiLevel");

const game = new Chess();
let mode = "pvp";
let selectedSquare = null;
let moveHistory = [];
let redoStack = [];

const stockfish = new Worker("stockfish-worker.js");

// Handle Stockfish responses
stockfish.onmessage = function (e) {
  console.log("Stockfish says:", e.data);
  if (e.data.startsWith("bestmove")) {
    const move = e.data.split(" ")[1];
    applyAIMove(move);
  }
};

function renderBoard() {
  boardElement.innerHTML = "";
  const board = game.board();
  for (let row = 7; row >= 0; row--) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      square.className = `square ${(row + col) % 2 ? "dark" : "light"}`;
      square.dataset.row = row;
      square.dataset.col = col;
      const piece = board[row][col];
      if (piece) {
        square.textContent = piece.color + piece.type;
        square.textContent = piece.type.toUpperCase() === piece.type
          ? piece.type.unicode().toUpperCase()
          : piece.type.toLowerCase().unicode().toLowerCase();
      }
      square.addEventListener("click", () => onSquareClick(row, col));
      boardElement.appendChild(square);
    }
  }
}

function onSquareClick(row, col) {
  const square = String.fromCharCode(97 + col) + (row + 1);
  const piece = game.get(square);

  if (selectedSquare && game.move({ from: selectedSquare, to: square, promotion: 'q' })) {
    moveHistory.push(game.history({ verbose: true }).slice(-1)[0]);
    redoStack = [];
    renderBoard();
    updateMoveList();
    updateStatus();

    if (mode === "ai" && game.turn() === "b") {
      requestAIMove(game.fen(), aiLevelSlider.value);
    }

    selectedSquare = null;
  } else {
    if (piece && piece.color === game.turn()) {
      selectedSquare = square;
    } else {
      selectedSquare = null;
    }
  }
}

function applyAIMove(moveString) {
  const move = {
    from: moveString.slice(0, 2),
    to: moveString.slice(2, 4),
    promotion: "q",
  };
  const result = game.move(move);
  if (result) {
    moveHistory.push(result);
    renderBoard();
    updateMoveList();
    updateStatus();
  }
}

function updateStatus() {
  if (game.in_checkmate()) {
    statusEl.textContent = "Checkmate!";
  } else if (game.in_draw()) {
    statusEl.textContent = "Draw!";
  } else {
    statusEl.textContent = `${game.turn() === "w" ? "White" : "Black"} to move`;
  }
}

function updateMoveList() {
  moveListEl.innerHTML = "";
  const moves = game.history();
  for (let i = 0; i < moves.length; i += 2) {
    const li = document.createElement("li");
    li.textContent = `${i / 2 + 1}. ${moves[i]} ${moves[i + 1] || ""}`;
    moveListEl.appendChild(li);
  }
}

function undoMove() {
  const move = game.undo();
  if (move) {
    redoStack.push(move);
    renderBoard();
    updateMoveList();
    updateStatus();
  }
}

function redoMove() {
  const move = redoStack.pop();
  if (move) {
    game.move(move);
    moveHistory.push(move);
    renderBoard();
    updateMoveList();
    updateStatus();
  }
}

function newGame() {
  game.reset();
  moveHistory = [];
  redoStack = [];
  renderBoard();
  updateMoveList();
  updateStatus();
}

function changeMode() {
  mode = modeSelect.value;
  newGame();
}

function exportPGN() {
  const pgn = game.pgn();
  navigator.clipboard.writeText(pgn).then(() =>
    alert("PGN copied to clipboard!")
  );
}

function importPGN() {
  const pgn = prompt("Paste PGN:");
  if (pgn) {
    game.load_pgn(pgn);
    renderBoard();
    updateMoveList();
    updateStatus();
  }
}

function requestAIMove(fen, depth = 12) {
  stockfish.postMessage("uci");
  stockfish.postMessage("ucinewgame");
  stockfish.postMessage("position fen " + fen);
  stockfish.postMessage("go depth " + depth);
}

function toggleTheme() {
  document.body.classList.toggle("dark");
}

// Unicode mapping for pieces
String.prototype.unicode = function () {
  const map = {
    p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚",
    P: "♙", N: "♘", B: "♗", R: "♖", Q: "♕", K: "♔",
  };
  return map[this] || "";
};

renderBoard();
updateStatus();
