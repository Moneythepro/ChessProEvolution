const board = document.getElementById("board");
const statusEl = document.getElementById("status");
const moveList = document.getElementById("moveList");
const modeSelect = document.getElementById("modeSelect");
const aiLevelInput = document.getElementById("aiLevel");

const game = new Chess();
let boardSquares = [];
let selectedSquare = null;
let history = [];
let redoStack = [];

let mode = "pvp";
let aiThinking = false;
const aiWorker = window.stockfish;
let initialized = false;

// Worker setup
aiWorker.onmessage = (event) => {
  const line = event.data;
  if (!initialized && line === "readyok") {
    initialized = true;
    aiWorker.postMessage("uci");
  }

  if (typeof line === "string" && line.startsWith("bestmove")) {
    const move = line.split(" ")[1];
    if (move) {
      const played = game.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: "q" });
      if (played) {
        history.push(`${played.from}${played.to}`);
        redoStack = [];
        renderBoard();
        updateStatus();
      }
    }
    aiThinking = false;
  }
};

aiWorker.postMessage("uci");
aiWorker.postMessage("isready");

function initBoard() {
  board.innerHTML = "";
  boardSquares = [];

  for (let i = 0; i < 8; i++) {
    const row = [];
    for (let j = 0; j < 8; j++) {
      const square = document.createElement("div");
      square.className = `square ${(i + j) % 2 === 0 ? "light" : "dark"}`;
      square.dataset.row = i;
      square.dataset.col = j;
      square.addEventListener("click", () => handleSquareClick(i, j));
      board.appendChild(square);
      row.push(square);
    }
    boardSquares.push(row);
  }

  renderBoard();
  updateStatus();
}

function coordsToSquare(i, j) {
  return "abcdefgh"[j] + (8 - i);
}

function handleSquareClick(i, j) {
  if (aiThinking) return;

  clearHighlights();

  const square = coordsToSquare(i, j);
  const piece = game.get(square);

  if (!selectedSquare && piece && piece.color === game.turn()) {
    selectedSquare = square;
    boardSquares[i][j].classList.add("selected");

    const moves = game.moves({ square, verbose: true });
    for (const move of moves) {
      const to = move.to;
      const [toRow, toCol] = [8 - parseInt(to[1]), "abcdefgh".indexOf(to[0])];
      boardSquares[toRow][toCol].classList.add("highlight");
    }
    return;
  }

  if (selectedSquare) {
    const move = game.move({
      from: selectedSquare,
      to: square,
      promotion: "q"
    });

    if (move) {
      history.push(`${move.from}${move.to}`);
      redoStack = [];
      renderBoard();
      updateStatus();

      if (mode === "ai" && !game.game_over()) {
        requestAIMove();
      }
    }

    selectedSquare = null;
    clearHighlights();
  }
}

function clearHighlights() {
  for (const row of boardSquares) {
    for (const square of row) {
      square.classList.remove("highlight", "selected");
    }
  }
}

function requestAIMove() {
  aiThinking = true;
  const level = parseInt(aiLevelInput.value || 5);
  aiWorker.postMessage(`setoption name Skill Level value ${level}`);
  aiWorker.postMessage(`position fen ${game.fen()}`);
  aiWorker.postMessage(`go depth ${Math.min(20, level + 4)}`);
}

function renderBoard() {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const square = boardSquares[i][j];
      const squareId = coordsToSquare(i, j);
      const piece = game.get(squareId);
      square.innerHTML = piece ? getPieceSymbol(piece) : "";
      square.classList.remove("highlight", "selected"); // reset highlight
    }
  }

  renderMoveList();
}

function getPieceSymbol(piece) {
  const symbols = {
    p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
    P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"
  };
  return symbols[piece.color === "w" ? piece.type.toUpperCase() : piece.type];
}

function renderMoveList() {
  if (!moveList) return;
  moveList.innerHTML = "";
  game.history().forEach((move) => {
    const li = document.createElement("li");
    li.textContent = move;
    moveList.appendChild(li);
  });
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

function undoMove() {
  const move = game.undo();
  if (move) {
    redoStack.push(move);
    renderBoard();
    updateStatus();
  }
}

function redoMove() {
  if (redoStack.length > 0) {
    const move = redoStack.pop();
    game.move(move);
    renderBoard();
    updateStatus();
  }
}

function newGame() {
  game.reset();
  history = [];
  redoStack = [];
  selectedSquare = null;
  aiThinking = false;
  renderBoard();
  updateStatus();
}

function changeMode() {
  mode = modeSelect.value;
  newGame();
}

function exportPGN() {
  const blob = new Blob([game.pgn()], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "game.pgn";
  a.click();
  URL.revokeObjectURL(url);
}

function importPGN() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pgn";
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      game.load_pgn(reader.result);
      renderBoard();
      updateStatus();
    };
    reader.readAsText(file);
  };
  input.click();
}

function toggleTheme() {
  document.body.classList.toggle("dark");
}

// Global exposure
window.undoMove = undoMove;
window.redoMove = redoMove;
window.newGame = newGame;
window.changeMode = changeMode;
window.exportPGN = exportPGN;
window.importPGN = importPGN;
window.toggleTheme = toggleTheme;

initBoard();
