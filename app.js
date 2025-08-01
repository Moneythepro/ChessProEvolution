// ✅ Updated Ultimate Chess App with:
// - Illegal move override
// - Move numbering
// - Checkmate freedom
// - Timer (10/20/30min)
// - Point-based timeout win
// - Move speech toggle
// - ✅ Fixed [object Object] move history bug
// - ✅ Accurate per-player timer system

// 🎵 Sound and Vibration Setup
const winSound = new Audio("win.mp3");
const drawSound = new Audio("draw.mp3");
const moveSound = new Audio("move.mp3");

const board = document.getElementById("board");
const statusEl = document.getElementById("status");
const moveList = document.getElementById("moveList");
const modeSelect = document.getElementById("modeSelect");
const aiLevelInput = document.getElementById("aiLevel");
const winnerModal = document.getElementById("winnerModal");
const winnerText = document.getElementById("winnerText");
const timerSelect = document.getElementById("timerSelect");
const speechToggle = document.getElementById("speechToggle");
const whiteTimerEl = document.getElementById("whiteTimer");
const blackTimerEl = document.getElementById("blackTimer");

const game = new Chess();
let boardSquares = [];
let selectedSquare = null;
let legalMoves = [];
let lastMove = null;
let history = [];
let redoStack = [];
let mode = "pvp";
let aiThinking = false;
let speechEnabled = false;

const aiWorker = window.stockfish;
let initialized = false;

let whiteTimeLeft = 600;
let blackTimeLeft = 600;
let currentTimerColor = "w";
let timerInterval;

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
        lastMove = { from: played.from, to: played.to };
        history.push(played.san);
        redoStack = [];
        playMoveFeedback();
        speakMove(played);
        renderBoard();
        updateStatus();
        currentTimerColor = game.turn();
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
      square.className = `square animated ${(i + j) % 2 === 0 ? "light" : "dark"}`;
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
  updateTimerDisplay();
}

function coordsToSquare(i, j) {
  return "abcdefgh"[j] + (8 - i);
}

function handleSquareClick(i, j) {
  if (aiThinking || game.game_over()) return;

  const square = coordsToSquare(i, j);
  const piece = game.get(square);

  if (selectedSquare) {
    const move = {
      from: selectedSquare,
      to: square,
      promotion: "q"
    };
    const played = game.move(move);
    if (played) {
      lastMove = { from: played.from, to: played.to };
      history.push(played.san);
      redoStack = [];
      selectedSquare = null;
      legalMoves = [];
      playMoveFeedback();
      speakMove(played);
      renderBoard();
      updateStatus();
      currentTimerColor = game.turn();
      if (mode === "ai" && !game.game_over()) requestAIMove();
    } else {
      selectedSquare = null;
      legalMoves = [];
      renderBoard();
    }
  } else if (piece && piece.color === game.turn()) {
    selectedSquare = square;
    legalMoves = game.moves({ square, verbose: true }).map(m => m.to);
    renderBoard();
  }
}

function renderBoard() {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const square = boardSquares[i][j];
      const squareId = coordsToSquare(i, j);
      const piece = game.get(squareId);
      square.innerHTML = piece ? `<span class="piece">${getPieceSymbol(piece)}</span>` : "";
      square.classList.remove("selected", "last-move", "check", "legal");

      if (lastMove && (squareId === lastMove.from || squareId === lastMove.to)) {
        square.classList.add("last-move");
      }
      if (selectedSquare === squareId) square.classList.add("selected");
      if (legalMoves.includes(squareId)) square.classList.add("legal");

      if (game.in_check()) {
        const kingSquare = findKing(game.turn());
        if (squareId === kingSquare) square.classList.add("check");
      }
    }
  }
  renderMoveList();
}

function renderMoveList() {
  if (!moveList) return;
  moveList.innerHTML = "";
  for (let i = 0; i < history.length; i += 2) {
    const li = document.createElement("li");
    li.textContent = `${i / 2 + 1}. ${history[i] || ""} ${history[i + 1] || ""}`;
    moveList.appendChild(li);
  }
}

function findKing(color) {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const square = coordsToSquare(i, j);
      const piece = game.get(square);
      if (piece?.type === "k" && piece.color === color) return square;
    }
  }
  return null;
}

function getPieceSymbol(piece) {
  const symbols = {
    p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
    P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"
  };
  return symbols[piece.color === "w" ? piece.type.toUpperCase() : piece.type];
}

function updateStatus() {
  if (game.in_checkmate()) {
    stopTimer();
    const winner = game.turn() === "w" ? "Black" : "White";
    winnerText.textContent = `${winner} wins by checkmate!`;
    winnerModal.style.display = "block";
    winSound.play();
    navigator.vibrate?.([200, 100, 200]);
    return;
  }
  if (game.in_draw()) {
    stopTimer();
    winnerText.textContent = `It's a draw!`;
    winnerModal.style.display = "block";
    drawSound.play();
    navigator.vibrate?.([300]);
    return;
  }
  statusEl.textContent = `${game.turn() === "w" ? "White" : "Black"} to move`;
}

function playMoveFeedback() {
  moveSound.play();
  navigator.vibrate?.([50]);
}

function speakMove(move) {
  if (!speechEnabled) return;
  const utter = new SpeechSynthesisUtterance(`${move.from} to ${move.to}`);
  speechSynthesis.speak(utter);
}

function requestAIMove() {
  aiThinking = true;
  const level = parseInt(aiLevelInput.value || 5);
  aiWorker.postMessage(`setoption name Skill Level value ${level}`);
  aiWorker.postMessage(`position fen ${game.fen()}`);
  aiWorker.postMessage(`go depth ${Math.min(20, level + 4)}`);
}

function undoMove() {
  const move = game.undo();
  if (move) {
    // Backup SAN before undo, because undo deletes it
    const san = history.pop();
    redoStack.push({ ...move, san });
    lastMove = null;
    selectedSquare = null;
    legalMoves = [];
    renderBoard();
    updateStatus();
  }
}

function redoMove() {
  if (redoStack.length > 0) {
    const move = redoStack.pop();
    game.move(move);
    lastMove = { from: move.from, to: move.to };
    history.push(move.san || `${move.from}-${move.to}`);
    renderBoard();
    updateStatus();
  }
}

function newGame() {
  game.reset();
  history = [];
  redoStack = [];
  selectedSquare = null;
  lastMove = null;
  legalMoves = [];
  aiThinking = false;
  winnerModal.style.display = "none";
  speechEnabled = speechToggle?.checked || false;
  resetTimer();
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
      history = game.history();
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

// Timer Logic
function resetTimer() {
  stopTimer();
  const mins = parseInt(timerSelect?.value || "0");
  if (!mins) return;
  whiteTimeLeft = blackTimeLeft = mins * 60;
  currentTimerColor = game.turn();
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    if (currentTimerColor === "w") {
      whiteTimeLeft--;
      if (whiteTimeLeft <= 0) {
        stopTimer();
        decideWinnerByPoints();
        return;
      }
    } else {
      blackTimeLeft--;
      if (blackTimeLeft <= 0) {
        stopTimer();
        decideWinnerByPoints();
        return;
      }
    }
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function updateTimerDisplay() {
  const format = (t) => {
    const m = Math.floor(t / 60).toString().padStart(2, "0");
    const s = (t % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };
  whiteTimerEl.textContent = format(whiteTimeLeft);
  blackTimerEl.textContent = format(blackTimeLeft);
}

function decideWinnerByPoints() {
  const score = { w: 0, b: 0 };
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9 };

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = game.get(coordsToSquare(i, j));
      if (piece && piece.type !== "k") {
        score[piece.color] += values[piece.type] || 0;
      }
    }
  }

  if (score.w > score.b) {
    winnerText.textContent = "White wins on points!";
  } else if (score.b > score.w) {
    winnerText.textContent = "Black wins on points!";
  } else {
    winnerText.textContent = "Draw by equal points!";
  }

  winnerModal.style.display = "block";
  drawSound.play();
  navigator.vibrate?.([100, 100, 100]);
}

window.undoMove = undoMove;
window.redoMove = redoMove;
window.newGame = newGame;
window.changeMode = changeMode;
window.exportPGN = exportPGN;
window.importPGN = importPGN;
window.toggleTheme = toggleTheme;

initBoard();
