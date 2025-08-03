// ChessProEvolution – app.js v3.5 (AI Narration + PvP + Animated Timers + Voice Alerts)

const game = new Chess();
let boardSquares = [];
let selectedSquare = null;
let legalMoves = [];
let lastMove = null;
let speechEnabled = false;

const board = document.getElementById("board");
const timerSelect = document.getElementById("timerSelect");
const speechToggle = document.getElementById("speechToggle");
const whiteTimerEl = document.getElementById("whiteTimer");
const blackTimerEl = document.getElementById("blackTimer");
const winnerModal = document.getElementById("winnerModal");
const winnerText = document.getElementById("winnerText");
const statusEl = document.getElementById("status");
const menuBtn = document.getElementById("menuBtn");
const menuModal = document.getElementById("menuModal");
const startMenu = document.getElementById("startMenu");
const startBtn = document.getElementById("startGameBtn");
const themeToggleMenu = document.getElementById("themeToggleMenu");

let whiteTimeLeft = 600;
let blackTimeLeft = 600;
let currentTimerColor = "w";
let timerInterval = null;
let lastWhiteSeconds = 600;
let lastBlackSeconds = 600;
let selectedDuration = 600;

function playSound(src, volume = 1.0) {
  try {
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch (e) {
    console.error("Sound error:", e);
  }
}

document.body.addEventListener("click", () => {
  const dummy = new Audio();
  dummy.play().catch(() => {});
}, { once: true });

function speakNarration(move) {
  if (!speechEnabled || !move) return;
  const from = (move.from || "").toUpperCase();
  const to = (move.to || "").toUpperCase();
  const color = move.color === "w" ? "White" : "Black";
  const pieceMap = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
  const piece = pieceMap[move.piece] || "piece";

  let sentence = `${color} ${piece} moved from ${from} to ${to}`;
  if (move.captured) {
    const targetColor = move.color === "w" ? "black" : "white";
    const captured = pieceMap[move.captured] || "piece";
    sentence = `${color} ${piece} captured ${targetColor} ${captured} on ${to}`;
  }
  if (from === "king" && to === "in check") {
    sentence = `Check! ${color} king is in danger`;
  }
  if (to === "10 seconds left") {
    sentence = `${color} has only 10 seconds remaining`;
  }

  const utter = new SpeechSynthesisUtterance(sentence);
  utter.pitch = 1;
  utter.rate = 1;
  speechSynthesis.speak(utter);
}

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
  updateTimerUI();
}

function coordsToSquare(i, j) {
  return "abcdefgh"[j] + (8 - i);
}

function handleSquareClick(i, j) {
  if (game.game_over()) return;
  const square = coordsToSquare(i, j);
  const piece = game.get(square);

  if (selectedSquare) {
    const move = { from: selectedSquare, to: square, promotion: "q" };
    const played = game.move(move);
    if (played) {
      lastMove = { from: played.from, to: played.to };
      selectedSquare = null;
      legalMoves = [];
      playMoveFeedback();
      speakNarration(played);
      renderBoard(true);
      updateStatus();
      currentTimerColor = game.turn();
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

function renderBoard(animate = false) {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const square = boardSquares[i][j];
      const squareId = coordsToSquare(i, j);
      const piece = game.get(squareId);
      square.innerHTML = piece
        ? `<img src="./pieces/${piece.color}${piece.type}.png" class="piece${animate && lastMove?.to === squareId ? ' animate-move' : ''}" />`
        : "";
      square.classList.remove("selected", "last-move", "check", "legal");
      if (lastMove && (squareId === lastMove.from || squareId === lastMove.to)) square.classList.add("last-move");
      if (selectedSquare === squareId) square.classList.add("selected");
      if (legalMoves.includes(squareId)) square.classList.add("legal");
      if (game.in_check()) {
        const king = findKing(game.turn());
        if (squareId === king) square.classList.add("check");
      }
    }
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

function updateStatus() {
  if (game.in_checkmate()) {
    stopTimer();
    const loser = game.turn() === "w" ? "White" : "Black";
    const winner = loser === "White" ? "Black" : "White";
    winnerText.innerHTML = `<span>${winner} wins by checkmate!</span>`;
    winnerModal.className = "show shake glow-" + winner.toLowerCase();
    playSound("win.mp3", 1.0);
    navigator.vibrate?.([200, 100, 200]);
    return;
  }
  if (game.in_draw()) {
    stopTimer();
    winnerText.innerHTML = `<span>It's a draw!</span>`;
    winnerModal.className = "show glow-white";
    playSound("draw.mp3", 1.0);
    navigator.vibrate?.([300]);
    return;
  }
  if (game.in_check()) {
    speakNarration({ piece: "k", color: game.turn(), from: "king", to: "in check" });
  }
  statusEl.textContent = `${game.turn() === "w" ? "White" : "Black"} to move`;
  statusEl.classList.add("pulse");
  setTimeout(() => statusEl.classList.remove("pulse"), 500);
}

function playMoveFeedback() {
  playSound("move.mp3", 0.8);
  navigator.vibrate?.([50]);
}

function resetTimer() {
  stopTimer();
  updateTimerDisplay();
  updateTimerUI();
  currentTimerColor = game.turn();
  timerInterval = setInterval(() => {
    if (currentTimerColor === "w") {
      whiteTimeLeft--;
      if (whiteTimeLeft <= 0) return decideWinnerByPoints();
    } else {
      blackTimeLeft--;
      if (blackTimeLeft <= 0) return decideWinnerByPoints();
    }
    updateTimerDisplay();
    updateTimerUI();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function updateTimerDisplay() {
  const format = (t) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  whiteTimerEl.textContent = format(whiteTimeLeft);
  blackTimerEl.textContent = format(blackTimeLeft);
  const total = selectedDuration || 600;
  const whiteBox = document.querySelector(".timer.white");
  const blackBox = document.querySelector(".timer.black");
  whiteBox.style.setProperty("--progress", `${Math.max(0, (whiteTimeLeft / total) * 100)}%`);
  blackBox.style.setProperty("--progress", `${Math.max(0, (blackTimeLeft / total) * 100)}%`);
}

function updateTimerUI() {
  const whiteBox = document.querySelector(".timer.white");
  const blackBox = document.querySelector(".timer.black");
  whiteBox.classList.toggle("active", currentTimerColor === "w");
  blackBox.classList.toggle("active", currentTimerColor === "b");
  whiteBox.classList.toggle("low-time", whiteTimeLeft <= 10);
  blackBox.classList.toggle("low-time", blackTimeLeft <= 10);
  if (currentTimerColor === "w" && whiteTimeLeft === 10) {
    speakNarration({ piece: "k", color: "w", to: "10 seconds left" });
  }
  if (currentTimerColor === "b" && blackTimeLeft === 10) {
    speakNarration({ piece: "k", color: "b", to: "10 seconds left" });
  }
  navigator.vibrate?.(40);
}

function decideWinnerByPoints() {
  stopTimer();
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
  winnerModal.className = "show glow-white";
  playSound("draw.mp3", 1.0);
  navigator.vibrate?.([100, 100, 100]);
}

menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  menuModal.classList.toggle("show");
});
document.addEventListener("click", (e) => {
  if (!menuModal.contains(e.target)) menuModal.classList.remove("show");
});

if (themeToggleMenu) {
  themeToggleMenu.addEventListener("click", () => {
    document.body.classList.toggle("dark");
  });
}

startBtn.onclick = () => {
  speechEnabled = speechToggle?.checked;
  startMenu.style.display = "none";
  document.getElementById("boardWrapper").style.display = "flex";
  const mins = parseInt(timerSelect?.value || "10");
  whiteTimeLeft = blackTimeLeft = mins * 60;
  lastWhiteSeconds = lastBlackSeconds = mins * 60;
  selectedDuration = mins * 60;
  newGame();
};

function newGame() {
  game.reset();
  selectedSquare = null;
  lastMove = null;
  legalMoves = [];
  winnerModal.className = "";
  resetTimer();
  renderBoard();
  updateStatus();
}

initBoard();
