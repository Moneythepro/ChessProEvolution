// ✅ FULL FIXED app.js for IllegalChess support

let game; let lastMove = null; let selectedSquare = null; let timerInterval = null; let selectedVoice = null; let selectedLang = "none"; let whiteTimeLeft = 600; let blackTimeLeft = 600; let lastWhiteSeconds = 600; let lastBlackSeconds = 600; let currentTimerColor = "w"; let selectedDuration = 600; let legalMoves = []; let boardSquares = [];

const langSelect = document.getElementById("langSelect"); const voiceSelect = document.getElementById("voiceSelect"); const menuBtn = document.getElementById("menuBtn"); const menuModal = document.getElementById("menuModal"); const themeToggleMenu = document.getElementById("themeToggleMenu"); const startBtn = document.getElementById("startGameBtn"); const startMenu = document.getElementById("startMenu"); const timerSelect = document.getElementById("timerSelect"); const statusEl = document.getElementById("status"); const whiteTimerEl = document.getElementById("whiteTimer"); const blackTimerEl = document.getElementById("blackTimer"); const boardEl = document.getElementById("board"); const winnerText = document.getElementById("winnerText"); const winnerModal = document.getElementById("winnerModal");

const allowedLangs = [ { code: "none", label: "🚫 No Voice" }, { code: "en-US", label: "🇺🇸 English (US)" }, { code: "en-GB", label: "🇬🇧 English (UK)" }, { code: "hi-IN", label: "🇮🇳 Hindi" }, { code: "fr", label: "🇫🇷 French" }, { code: "de", label: "🇩🇪 German" }, { code: "es", label: "🇪🇸 Spanish" }, { code: "ja", label: "🇯🇵 Japanese" } ];

function initLangSelect() { langSelect.innerHTML = allowedLangs.map(lang => <option value="${lang.code}">${lang.label}</option>).join(""); langSelect.value = selectedLang; }

async function loadVoices() { const allVoices = await new Promise(resolve => { const tryLoad = () => { const voices = speechSynthesis.getVoices(); if (voices.length) resolve(voices); }; tryLoad(); speechSynthesis.onvoiceschanged = tryLoad; });

const filtered = allVoices.filter(v => allowedLangs.some(lang => lang.code !== "none" && v.lang.startsWith(lang.code)) );

voiceSelect.innerHTML = filtered.map(v => <option value="${v.name}" data-lang="${v.lang}">${v.name} (${v.lang})</option>).join("");

if (selectedLang !== "none") { const bestMatch = filtered.find(v => v.lang === selectedLang || v.lang.startsWith(selectedLang.split("-")[0])); selectedVoice = bestMatch || null; if (selectedVoice) voiceSelect.value = selectedVoice.name; } else { selectedVoice = null; voiceSelect.value = ""; } }

function speakNarration(move) { if (!move || selectedLang === "none" || !selectedVoice) return; speechSynthesis.cancel(); const from = move.from?.toUpperCase(); const to = move.to?.toUpperCase(); const color = move.color === "w" ? "White" : "Black"; const pieceMap = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" }; const piece = pieceMap[move.piece] || "piece"; let sentence = move.flags.includes("c") ? ${color} ${piece} captured on ${to} : ${color} ${piece} moved from ${from} to ${to}; if (game.in_checkmate()) sentence += . Checkmate! ${color} wins!; else if (game.in_check()) sentence += . ${color} king is in check.; const lowTime = currentTimerColor === "w" ? whiteTimeLeft : blackTimeLeft; if (lowTime <= 10) sentence += . ${color} is running low on time.; const utter = new SpeechSynthesisUtterance(sentence); utter.voice = selectedVoice; utter.lang = selectedVoice.lang || selectedLang; utter.pitch = 1; utter.rate = 1; speechSynthesis.speak(utter); }

function playMoveFeedback() { playSound("move.mp3", 0.8); navigator.vibrate?.([100]); }

function formatTime(secs) { const m = Math.floor(secs / 60).toString().padStart(2, "0"); const s = (secs % 60).toString().padStart(2, "0"); return ${m}:${s}; }

function updateStatus() { if (game.in_checkmate()) { stopTimer(); const loser = game.turn() === "w" ? "White" : "Black"; const winner = loser === "White" ? "Black" : "White"; winnerText.innerHTML = <span>${winner} wins by checkmate!</span>; winnerModal.className = "show shake glow-" + winner.toLowerCase(); playSound("win.mp3", 1.0); navigator.vibrate?.([200, 100, 200]); return; } if (game.in_draw()) { stopTimer(); winnerText.innerHTML = <span>It's a draw!</span>; winnerModal.className = "show glow-white"; playSound("draw.mp3", 1.0); navigator.vibrate?.([300]); return; } statusEl.textContent = ${game.turn() === "w" ? "White" : "Black"} to move; statusEl.classList.add("pulse"); setTimeout(() => statusEl.classList.remove("pulse"), 500); }

function playSound(src, volume = 1) { const audio = new Audio(src); audio.volume = volume; audio.play().catch(() => {}); }

function updateTimerUI() { const whiteBox = document.querySelector(".timer.white"); const blackBox = document.querySelector(".timer.black"); whiteBox.classList.toggle("active", currentTimerColor === "w"); blackBox.classList.toggle("active", currentTimerColor === "b"); whiteBox.classList.toggle("low-time", whiteTimeLeft <= 10); blackBox.classList.toggle("low-time", blackTimeLeft <= 10); whiteTimerEl.textContent = formatTime(whiteTimeLeft); blackTimerEl.textContent = formatTime(blackTimeLeft); const total = selectedDuration || 600; const whitePercent = Math.max(0, (whiteTimeLeft / total) * 100); const blackPercent = Math.max(0, (blackTimeLeft / total) * 100); whiteBox.style.setProperty("--progress", ${whitePercent}%); blackBox.style.setProperty("--progress", ${blackPercent}%); }

function coordsToSquare(i, j) { return "abcdefgh"[j] + (8 - i); }

function findKing(color) { for (let i = 0; i < 8; i++) { for (let j = 0; j < 8; j++) { const square = coordsToSquare(i, j); const piece = game.get(square); if (piece?.type === "k" && piece.color === color) return square; } } return null; }

function renderBoard(animate = false) { for (let i = 0; i < 8; i++) { for (let j = 0; j < 8; j++) { const square = boardSquares[i][j]; const squareId = coordsToSquare(i, j); const piece = game.get(squareId); square.innerHTML = piece ? <img src="./pieces/${piece.color}${piece.type}.png" class="piece${animate && lastMove?.to === squareId ? ' animate-move' : ''}" /> : ""; square.classList.remove("selected", "last-move", "check", "legal"); if (lastMove && (squareId === lastMove.from || squareId === lastMove.to)) square.classList.add("last-move"); if (selectedSquare === squareId) square.classList.add("selected"); if (legalMoves.includes(squareId)) square.classList.add("legal"); if (game.in_check()) { const king = findKing(game.turn()); if (squareId === king) square.classList.add("check"); } } } }

function handleSquareClick(i, j) { if (game.game_over()) return; const square = coordsToSquare(i, j); const piece = game.get(square);

if (selectedSquare) { const move = { from: selectedSquare, to: square, promotion: "q" }; const played = game.move(move);

if (played) {
  lastMove = { from: move.from, to: move.to };
  selectedSquare = null;
  legalMoves = [];
  playMoveFeedback();
  speakNarration(played);
  renderBoard(true);
  updateStatus();
  currentTimerColor = game.turn();
} else {
  const fallback = selectedSquare !== square;
  selectedSquare = fallback ? square : null;
  legalMoves = fallback ? game.moves({ square, verbose: true }).map(m => m.to) : [];
  renderBoard();
}

} else if (piece && piece.color === game.turn()) { selectedSquare = square; legalMoves = game.moves({ square, verbose: true }).map(m => m.to); renderBoard(); } }

function initBoard() { boardEl.innerHTML = ""; boardSquares = []; for (let i = 0; i < 8; i++) { const row = []; for (let j = 0; j < 8; j++) { const square = document.createElement("div"); square.className = "square " + ((i + j) % 2 === 0 ? "light" : "dark"); square.dataset.row = i; square.dataset.col = j; square.addEventListener("click", () => handleSquareClick(i, j)); boardEl.appendChild(square); row.push(square);

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

} renderBoard(); updateStatus(); updateTimerUI(); }



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
  const mode = document.getElementById("modeSelect")?.value || "pvp";
  game = mode === "illegal" ? new IllegalChess() : new Chess();

  selectedSquare = null;
  lastMove = null;
  legalMoves = [];
  winnerModal.className = "";

  const mins = parseInt(timerSelect?.value || "10");
  whiteTimeLeft = blackTimeLeft = mins * 60;
  lastWhiteSeconds = lastBlackSeconds = mins * 60;
  selectedDuration = mins * 60;

  initBoard();
  resetTimer();
  updateStatus();
                           }

// --- Event Listeners ---
langSelect.addEventListener("change", async () => {
  selectedLang = langSelect.value;
  await loadVoices();
});

voiceSelect.addEventListener("change", () => {
  const voiceName = voiceSelect.value;
  const allVoices = speechSynthesis.getVoices();
  selectedVoice = allVoices.find(v => v.name === voiceName) || null;
});

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

// ✅ Start Game (safe init here)
startBtn.onclick = () => {
  newGame();
  startMenu.style.display = "none";
  document.getElementById("boardWrapper").style.display = "flex";
};

// 🟢 Only load voices/langs on first user interaction
document.body.addEventListener("click", () => {
  const dummy = new Audio();
  dummy.play().catch(() => {});
  initLangSelect();
  loadVoices();
}, { once: true });
(themeToggleMenu) {
  themeToggleMenu.addEventListener("change", () => {
    document.body.classList.toggle("dark", themeToggleMenu.checked);
  });
}

// ✅ Start Game (safe init here)
startBtn.onclick = () => {
  newGame();
  startMenu.style.display = "none";
  document.getElementById("boardWrapper").style.display = "flex";
};

// 🟢 Only load voices/langs on first user interaction
document.body.addEventListener("click", () => {
  const dummy = new Audio();
  dummy.play().catch(() => {});
  initLangSelect();
  loadVoices();
}, { once: true });
  
