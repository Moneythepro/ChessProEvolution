// ✅ CLEAN app.js (AI features removed completely)

let game;
let lastMove = null;
let selectedSquare = null;
let timerInterval = null;
let whiteTimeLeft = 600;
let blackTimeLeft = 600;
let lastWhiteSeconds = 600;
let lastBlackSeconds = 600;
let currentTimerColor = "w";
let selectedDuration = 600;
let legalMoves = [];
let boardSquares = [];
let pendingPromotion = null;

const whiteCapturedEl = document.getElementById("whiteCaptured");
const blackCapturedEl = document.getElementById("blackCaptured");
const capturedPieces = { w: [], b: [] };
const promotionModal = document.getElementById("promotionModal");
const menuBtn = document.getElementById("menuBtn");
const menuModal = document.getElementById("menuModal");
const themeToggleMenu = document.getElementById("themeToggleMenu");
const startBtn = document.getElementById("startGameBtn");
const capturedBox = document.getElementById("capturedContainer");
const startMenu = document.getElementById("startMenu");
const timerSelect = document.getElementById("timerSelect");
const statusEl = document.getElementById("status");
const whiteTimerEl = document.getElementById("whiteTimer");
const blackTimerEl = document.getElementById("blackTimer");
const boardEl = document.getElementById("board");
const winnerText = document.getElementById("winnerText");
const winnerModal = document.getElementById("winnerModal");

function playSound(src, volume = 1) {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.play().catch(() => {});
}

function playMoveFeedback() {
  playSound("move.mp3", 0.8);
  navigator.vibrate?.([100]);
}

function showPromotionModal(color) {
  promotionModal.classList.remove("hidden");
  const buttons = promotionModal.querySelectorAll("button");
  buttons.forEach(btn => {
    const type = btn.dataset.piece;
    btn.querySelector("img").src = `./pieces/${color}${type}.png`;
  });
}

promotionModal.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn || !pendingPromotion) return;

  const selectedPiece = btn.dataset.piece;
  pendingPromotion.promotion = selectedPiece;
  const from = pendingPromotion.from;
  const to = pendingPromotion.to;

  const legalMove = game
    .moves({ square: from, verbose: true })
    .find(m => m.to === to && m.promotion === selectedPiece);

  const wasCapture = legalMove && (
    (Array.isArray(legalMove.flags) && legalMove.flags.includes("c")) ||
    (typeof legalMove.flags === "string" && legalMove.flags.includes("c"))
  );

  const capturedTarget = wasCapture ? game.get(to) : null;
  const played = game.move(pendingPromotion);

  if (played) {
    if (wasCapture && capturedTarget && capturedTarget.type !== "k") {
      const capturerColor = capturedTarget.color === "w" ? "b" : "w";
      capturedPieces[capturerColor].push(capturedTarget);
      updateCapturedUI();
    }

    lastMove = { from, to };
    selectedSquare = null;
    legalMoves = [];
    playMoveFeedback();
    renderBoard(true);
    updateStatus();
    currentTimerColor = game.turn();
  }

  pendingPromotion = null;
  promotionModal.classList.add("hidden");
});

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function updateStatus() {
  const board = game.board();
  let whiteKing = false;
  let blackKing = false;

  for (const row of board) {
    for (const cell of row) {
      if (cell?.type === "k") {
        if (cell.color === "w") whiteKing = true;
        if (cell.color === "b") blackKing = true;
      }
    }
  }

  if (!whiteKing || !blackKing) {
    stopTimer();
    const winner = whiteKing ? "White" : "Black";
    winnerText.innerHTML = `<span>${winner} wins by king capture!</span>`;
    winnerModal.className = "show shake glow-" + winner.toLowerCase();
    playSound("win.mp3", 1.0);
    navigator.vibrate?.([200, 100, 200]);
    return;
  }

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

  statusEl.textContent = `${game.turn() === "w" ? "White" : "Black"} to move`;
  statusEl.classList.add("pulse");
  setTimeout(() => statusEl.classList.remove("pulse"), 500);
}

function updateTimerUI() {
  const whiteBox = document.querySelector(".timer.white");
  const blackBox = document.querySelector(".timer.black");
  whiteBox.classList.toggle("active", currentTimerColor === "w");
  blackBox.classList.toggle("active", currentTimerColor === "b");
  whiteBox.classList.toggle("low-time", whiteTimeLeft <= 10);
  blackBox.classList.toggle("low-time", blackTimeLeft <= 10);
  whiteTimerEl.textContent = formatTime(whiteTimeLeft);
  blackTimerEl.textContent = formatTime(blackTimeLeft);
  const total = selectedDuration || 600;
  const whitePercent = Math.max(0, (whiteTimeLeft / total) * 100);
  const blackPercent = Math.max(0, (blackTimeLeft / total) * 100);
  whiteBox.style.setProperty("--progress", `${whitePercent}%`);
  blackBox.style.setProperty("--progress", `${blackPercent}%`);
}

function coordsToSquare(i, j) {
  return "abcdefgh"[j] + (8 - i);
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
}

function handleSquareClick(i, j) {
  if (game.game_over()) return;

  const square = coordsToSquare(i, j);
  const piece = game.get(square);

  if (selectedSquare) {
    const from = selectedSquare;
    const to = square;
    const movingPiece = game.get(from);

    if (!movingPiece || movingPiece.color !== game.turn()) {
      selectedSquare = null;
      legalMoves = [];
      renderBoard();
      return;
    }

    const isPromotion =
      movingPiece.type === "p" &&
      ((movingPiece.color === "w" && to.endsWith("8")) ||
       (movingPiece.color === "b" && to.endsWith("1")));

    if (isPromotion) {
      const legalPromotionMoves = game
        .moves({ square: from, verbose: true })
        .filter(m => m.to === to && m.promotion);

      if (legalPromotionMoves.length > 0) {
        pendingPromotion = { from, to };
        showPromotionModal(movingPiece.color);
        return;
      }
    }

    const played = game.move({ from, to });

    if (played) {
      const captured = piece && piece.color !== movingPiece.color ? piece : null;
      if (captured && captured.type !== "k") {
        const capturerColor = captured.color === "w" ? "b" : "w";
        capturedPieces[capturerColor].push(captured);
        updateCapturedUI();
      }

      lastMove = { from, to };
      selectedSquare = null;
      legalMoves = [];
      playMoveFeedback();
      renderBoard(true);
      updateStatus();
      currentTimerColor = game.turn();

    } else {
      const fallback = selectedSquare !== square;
      selectedSquare = fallback ? square : null;
      legalMoves = fallback ? game.moves({ square, verbose: true }).map(m => m.to) : [];
      renderBoard();
    }
  } else if (piece && piece.color === game.turn()) {
    selectedSquare = square;
    legalMoves = game.moves({ square, verbose: true }).map(m => m.to);
    renderBoard();
  }
}

function updateCapturedUI() {
  whiteCapturedEl.innerHTML = "";
  blackCapturedEl.innerHTML = "";
  const pieceOrder = ["q", "r", "b", "n", "p"];

  function renderCaptured(color, container) {
    const grouped = {};
    capturedPieces[color].forEach(p => {
      grouped[p.type] = (grouped[p.type] || 0) + 1;
    });

    pieceOrder.forEach(type => {
      if (grouped[type]) {
        const wrapper = document.createElement("div");
        wrapper.className = "captured-piece";
        wrapper.title = `${grouped[type]} ${type}`;
        const img = document.createElement("img");
        img.src = `./pieces/${color}${type}.png`;
        wrapper.appendChild(img);

        if (grouped[type] > 1) {
          const count = document.createElement("span");
          count.className = "count";
          count.textContent = `×${grouped[type]}`;
          wrapper.appendChild(count);
        }

        container.appendChild(wrapper);
      }
    });
  }

  renderCaptured("w", blackCapturedEl);
  renderCaptured("b", whiteCapturedEl);
}

function initBoard() {
  boardEl.innerHTML = "";
  boardSquares = [];
  for (let i = 0; i < 8; i++) {
    const row = [];
    for (let j = 0; j < 8; j++) {
      const square = document.createElement("div");
      square.className = "square " + ((i + j) % 2 === 0 ? "light" : "dark");
      square.dataset.row = i;
      square.dataset.col = j;
      square.addEventListener("click", () => handleSquareClick(i, j));
      boardEl.appendChild(square);
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
  updateTimerUI();
}

function resetTimer() {
  stopTimer();
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
    updateTimerUI();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
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

function newGame() {
  game = new Chess();
  selectedSquare = null;
  lastMove = null;
  legalMoves = [];
  winnerModal.className = "";

  const mins = parseInt(timerSelect?.value || "10");
  whiteTimeLeft = blackTimeLeft = mins * 60;
  lastWhiteSeconds = lastBlackSeconds = mins * 60;
  selectedDuration = mins * 60;
  capturedPieces.w = [];
  capturedPieces.b = [];
  updateCapturedUI();
  initBoard();
  resetTimer();
  updateStatus();
}

menuBtn.onclick = (e) => {
  e.stopPropagation();
  menuModal.classList.toggle("show");
};

document.addEventListener("click", (e) => {
  if (!menuModal.contains(e.target) && e.target !== menuBtn) {
    menuModal.classList.remove("show");
  }
});

if (themeToggleMenu) {
  themeToggleMenu.addEventListener("change", () => {
    document.body.classList.toggle("dark", themeToggleMenu.checked);
  });
}

startBtn.onclick = () => {
  newGame();
  startMenu.style.display = "none";
  document.getElementById("boardWrapper").style.display = "flex";
  capturedBox.classList.add("show");
};

function resetToStartMenu() {
  startMenu.style.display = "block";
  document.getElementById("boardWrapper").style.display = "none";
  capturedBox.classList.remove("show");
}
