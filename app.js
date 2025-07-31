const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const moveListElement = document.getElementById("moveList");
const modeSelect = document.getElementById("modeSelect");
const aiLevelSlider = document.getElementById("aiLevel");

const game = new Chess();
let board = null;
let mode = "pvp";
let aiThinking = false;
let stockfish = null;
let stockfishReady = false;
let selectedSquare = null;

// Initialize Stockfish Worker
function initStockfish() {
  stockfish = new Worker("stockfish-worker.js");

  stockfish.onmessage = (e) => {
    const line = e.data;
    if (typeof line !== "string") return;

    console.log("Stockfish:", line);

    if (line === "uciok") {
      stockfishReady = true;
      console.log("✅ Stockfish ready!");
    }

    if (line.startsWith("bestmove")) {
      const move = line.split(" ")[1];
      game.move(move, { sloppy: true });
      aiThinking = false;
      selectedSquare = null;
      renderBoard();
      updateStatus();
    }
  };

  stockfish.postMessage("uci");
}

initStockfish();

// Render the board
function renderBoard() {
  boardElement.innerHTML = "";
  const board = game.board();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      square.className = "square " + ((row + col) % 2 === 0 ? "light" : "dark");

      const piece = board[row][col];
      if (piece) {
        const pieceEl = document.createElement("span");
        pieceEl.textContent = getPieceUnicode(piece);
        square.appendChild(pieceEl);
      }

      square.dataset.row = row;
      square.dataset.col = col;
      square.addEventListener("click", () => handleSquareClick(row, col));

      boardElement.appendChild(square);
    }
  }

  // Update move history
  moveListElement.innerHTML = "";
  game.history().forEach((move, idx) => {
    const li = document.createElement("li");
    li.textContent = move;
    moveListElement.appendChild(li);
  });
}

function getPieceUnicode(piece) {
  const symbols = {
    p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
    P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"
  };
  return symbols[piece.color === "w" ? piece.type.toUpperCase() : piece.type] || "";
}

function handleSquareClick(row, col) {
  if (aiThinking) return;

  const square = getSquareNotation(row, col);
  const piece = game.get(square);

  if (selectedSquare) {
    const move = { from: selectedSquare, to: square, promotion: "q" };
    const result = game.move(move);
    selectedSquare = null;

    if (result) {
      renderBoard();
      updateStatus();
      if (mode === "ai" && game.turn() === "b") makeAIMove();
    }
  } else if (piece && piece.color === game.turn()) {
    selectedSquare = square;
  }
}

function getSquareNotation(row, col) {
  const files = "abcdefgh";
  return files[col] + (8 - row);
}

function makeAIMove() {
  if (!stockfishReady || aiThinking) return;
  aiThinking = true;

  stockfish.postMessage("ucinewgame");
  stockfish.postMessage("position fen " + game.fen());
  stockfish.postMessage("go depth " + aiLevelSlider.value);
}

function changeMode() {
  mode = modeSelect.value;
  newGame();
}

function newGame() {
  game.reset();
  selectedSquare = null;
  aiThinking = false;
  renderBoard();
  updateStatus();
}

function updateStatus() {
  if (game.in_checkmate()) {
    statusElement.textContent = "Checkmate! " + (game.turn() === "w" ? "Black" : "White") + " wins!";
  } else if (game.in_draw()) {
    statusElement.textContent = "Draw!";
  } else {
    statusElement.textContent = (game.turn() === "w" ? "White" : "Black") + " to move";
  }
}

function undoMove() {
  game.undo();
  selectedSquare = null;
  renderBoard();
  updateStatus();
}

function exportPGN() {
  const pgn = game.pgn();
  navigator.clipboard.writeText(pgn);
  alert("PGN copied to clipboard!");
}

function importPGN() {
  const pgn = prompt("Paste PGN here:");
  if (pgn) {
    game.load_pgn(pgn);
    selectedSquare = null;
    renderBoard();
    updateStatus();
  }
}

function toggleTheme() {
  document.body.classList.toggle("dark");
}

// Start the game
renderBoard();
