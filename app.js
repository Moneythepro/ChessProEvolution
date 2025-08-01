// ChessProEvolution – app.js v2.0 Polished Final

const game = new Chess();
let boardSquares = [];
let selectedSquare = null;
let legalMoves = [];
let lastMove = null;
let history = [];
let mode = "pvp";
let aiThinking = false;
let showHistory = true;
let speechEnabled = false;
let initialized = false;

const board = document.getElementById("board");
const moveList = document.getElementById("moveList");
const modeSelect = document.getElementById("modeSelect");
const aiLevelInput = document.getElementById("aiLevel");
const timerSelect = document.getElementById("timerSelect");
const speechToggle = document.getElementById("speechToggle");
const whiteTimerEl = document.getElementById("whiteTimer");
const blackTimerEl = document.getElementById("blackTimer");
const winnerModal = document.getElementById("winnerModal");
const winnerText = document.getElementById("winnerText");
const statusEl = document.getElementById("status");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const toggleHistoryBtn = document.getElementById("toggleHistoryBtn");
const moveHistoryModal = document.getElementById("moveHistoryModal");
const closeHistoryModal = document.getElementById("closeHistoryModal");
const menuBtn = document.getElementById("menuBtn");
const menuModal = document.getElementById("menuModal");
const startMenu = document.getElementById("startMenu");
const startBtn = document.getElementById("startGameBtn");

const winSound = new Audio("win.mp3");
const drawSound = new Audio("draw.mp3");
const moveSound = new Audio("move.mp3");

let whiteTimeLeft = 600;
let blackTimeLeft = 600;
let currentTimerColor = "w";
let timerInterval = null;

const aiWorker = new Worker("stockfish-worker.js");
aiWorker.onmessage = (e) => {
  const line = e.data;
  if (typeof line !== "string") return;

  if (!initialized && line.includes("uciok")) {
    initialized = true;
    aiWorker.postMessage("isready");
  }

  if (line.startsWith("bestmove")) {
    const move = line.split(" ")[1];
    if (move) {
      const played = game.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: "q" });
      if (played) {
        lastMove = { from: played.from, to: played.to };
        history.push(played.san);
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

      if (i === 7) {
        const fileLabel = document.createElement("div");
        fileLabel.className = "file-label";
        fileLabel.textContent = "abcdefgh"[j];
        square.appendChild(fileLabel);
      }
      if (j === 0) {
        const rankLabel = document.createElement("div");
        rankLabel.className = "rank-label";
        rankLabel.textContent = 8 - i;
        square.appendChild(rankLabel);
      }
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
  if (aiThinking) return;
  const square = coordsToSquare(i, j);
  const piece = game.get(square);

  if (selectedSquare) {
    const move = { from: selectedSquare, to: square, promotion: "q" };
    const played = game.move(move);
    if (played) {
      lastMove = { from: played.from, to: played.to };
      history.push(played.san);
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

      square.innerHTML = piece
        ? `<img src="pieces/${piece.color}${piece.type}.svg" class="piece" />`
        : "";
      square.classList.remove("selected", "last-move", "check", "legal");

      if (lastMove && (squareId === lastMove.from || squareId === lastMove.to)) {
        square.classList.add("last-move");
      }
      if (selectedSquare === squareId) square.classList.add("selected");
      if (legalMoves.includes(squareId)) square.classList.add("legal");

      if (game.in_check()) {
        const king = findKing(game.turn());
        if (squareId === king) square.classList.add("check");
      }
    }
  }
  renderMoveList();
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

function renderMoveList() {
  moveList.innerHTML = "";
  for (let i = 0; i < history.length; i += 2) {
    const li = document.createElement("li");
    const white = history[i] || "";
    const black = history[i + 1] || "";
    li.textContent = `${i / 2 + 1}. ${white} ${black}`;
    moveList.appendChild(li);
  }
}

function updateStatus() {
  if (game.in_checkmate()) {
    stopTimer();
    const winner = game.turn() === "w" ? "Black" : "White";
    winnerText.innerHTML = `<span>${winner} wins by checkmate!</span>`;
    winnerModal.classList.add("show");
    winSound.play();
    navigator.vibrate?.([200, 100, 200]);
    return;
  }
  if (game.in_draw()) {
    stopTimer();
    winnerText.innerHTML = `<span>It's a draw!</span>`;
    winnerModal.classList.add("show");
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
  const utter = new SpeechSynthesisUtterance(`${move.san}`);
  speechSynthesis.speak(utter);
}

function requestAIMove() {
  aiThinking = true;
  const level = parseInt(aiLevelInput.value || 5);
  aiWorker.postMessage(`setoption name Skill Level value ${level}`);
  aiWorker.postMessage(`position fen ${game.fen()}`);
  aiWorker.postMessage(`go depth ${Math.min(20, level + 4)}`);
}

function resetTimer() {
  stopTimer();
  const mins = parseInt(timerSelect?.value || "10");
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
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const score = { w: 0, b: 0 };
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = game.get(coordsToSquare(i, j));
      if (piece && piece.type !== "k") {
        score[piece.color] += values[piece.type] || 0;
      }
    }
  }
  let result = "Draw by equal points!";
  if (score.w > score.b) result = "White wins on points!";
  else if (score.b > score.w) result = "Black wins on points!";
  winnerText.innerHTML = `<span>${result}</span>`;
  winnerModal.classList.add("show");
  drawSound.play();
  navigator.vibrate?.([100, 100, 100]);
}

// Menu actions
menuBtn.onclick = () => {
  menuModal.classList.add("show");
};
document.addEventListener("click", (e) => {
  if (!menuModal.contains(e.target) && e.target !== menuBtn) {
    menuModal.classList.remove("show");
  }
});

toggleHistoryBtn.onclick = () => {
  moveHistoryModal.classList.add("show");
};
closeHistoryModal.onclick = () => {
  moveHistoryModal.classList.remove("show");
};

// Export & Import
exportBtn.onclick = () => {
  const blob = new Blob([game.pgn()], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "game.pgn";
  a.click();
  URL.revokeObjectURL(url);
};

importBtn.onclick = () => {
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
};

// Start game
startBtn.onclick = () => {
  mode = modeSelect.value;
  speechEnabled = speechToggle?.checked;
  startMenu.style.display = "none";
  document.getElementById("boardWrapper").style.display = "flex";
  newGame();
};

function newGame() {
  game.reset();
  history = [];
  selectedSquare = null;
  lastMove = null;
  legalMoves = [];
  aiThinking = false;
  winnerModal.classList.remove("show");
  resetTimer();
  renderBoard();
  updateStatus();
}

initBoard();
