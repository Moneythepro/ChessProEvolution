const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const moveListElement = document.getElementById("moveList");
const modeSelect = document.getElementById("modeSelect");
const aiLevelSlider = document.getElementById("aiLevel");

const game = new Chess();
let board = null;
let mode = "pvp";
let aiThinking = false;

// Load and init Stockfish
let stockfishReady = false;
let stockfish;

function initStockfish() {
  stockfish = new Worker("stockfish-worker.js");

  fetch("stockfish.wasm")
    .then(response => response.arrayBuffer())
    .then(wasmBinary => {
      stockfish.postMessage({
        cmd: "load",
        wasmMemory: new WebAssembly.Memory({ initial: 256 }),
        wasmModule: new WebAssembly.Module(wasmBinary),
        urlOrBlob: "stockfish.js"
      });
    });

  stockfish.onmessage = (event) => {
    if (typeof event.data === "string") {
      console.log("Stockfish:", event.data);
      if (event.data === "uciok") {
        stockfishReady = true;
      }
      if (event.data.startsWith("bestmove")) {
        const move = event.data.split(" ")[1];
        game.move(move, { sloppy: true });
        renderBoard();
        aiThinking = false;
        updateStatus();
      }
    }
  };
}

initStockfish();

// Render chessboard
function renderBoard() {
  boardElement.innerHTML = "";
  const board = game.board();
  for (let row = 0; row < 8; row++) {
    const rank = document.createElement("div");
    rank.className = "rank";
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
      rank.appendChild(square);
    }
    boardElement.appendChild(rank);
  }

  // Update move history
  moveListElement.innerHTML = "";
  const history = game.history();
  history.forEach((move, idx) => {
    const li = document.createElement("li");
    li.textContent = move;
    moveListElement.appendChild(li);
  });
}

// Convert piece notation to Unicode symbols
function getPieceUnicode(piece) {
  const symbols = {
    p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
    P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"
  };
  return symbols[piece.color === "w" ? piece.type.toUpperCase() : piece.type] || "";
}

// Click handling
let selectedSquare = null;
function handleSquareClick(row, col) {
  if (aiThinking) return;

  const square = getSquareNotation(row, col);
  const piece = game.get(square);

  if (selectedSquare) {
    const move = { from: selectedSquare, to: square, promotion: "q" };
    const result = game.move(move);
    if (result) {
      selectedSquare = null;
      renderBoard();
      updateStatus();
      if (mode === "ai" && game.turn() === "b") {
        makeAIMove();
      }
    } else {
      selectedSquare = null;
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

  stockfish.postMessage("uci");
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
  renderBoard();
}

function redoMove() {
  // optional
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
    renderBoard();
  }
}

function toggleTheme() {
  document.body.classList.toggle("dark");
}

// Start game
renderBoard();
