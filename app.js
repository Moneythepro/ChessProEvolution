// ChessProEvolution – app.js v3.6 (PvP-only, animated timers, narration, sound, vibration, voice/language selector)

const game = new Chess();
let boardSquares = [];
let selectedSquare = null;
let legalMoves = [];
let lastMove = null;
let speechEnabled = false;
let selectedVoice = null;
let selectedLang = "en-US";

const board = document.getElementById("board");
const timerSelect = document.getElementById("timerSelect");
const speechToggle = document.getElementById("speechToggle");
const voiceSelect = document.getElementById("voiceSelect");
const langSelect = document.getElementById("langSelect");
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

// Load voices reliably across all browsers
function loadVoicesWhenAvailable() {
return new Promise((resolve) => {
const interval = setInterval(() => {
const voices = speechSynthesis.getVoices();
if (voices.length !== 0) {
clearInterval(interval);
resolve(voices);
}
}, 200);
});
}

async function loadVoices() {
const voices = await loadVoicesWhenAvailable();
voiceSelect.innerHTML = voices.map(v => <option value="${v.name}">${v.name} (${v.lang})</option>).join("");
if (!selectedVoice && voices.length > 0) {
selectedVoice = voices.find(v => v.name.includes("Google")) || voices[0];
voiceSelect.value = selectedVoice.name;
}
}

voiceSelect?.addEventListener("change", () => {
const voices = speechSynthesis.getVoices();
selectedVoice = voices.find(v => v.name === voiceSelect.value);
});

langSelect?.addEventListener("change", () => {
selectedLang = langSelect.value;
});

function playSound(src, volume = 1.0) {
try {
const audio = new Audio(src);
audio.volume = volume;
audio.play().catch(() => {});
} catch (e) {
console.error("Sound error:", e);
}
}

// Preload interaction for mobile autoplay policies
document.body.addEventListener("click", () => {
const dummy = new Audio();
dummy.play().catch(() => {});
loadVoices(); // Also trigger voices on first interaction
}, { once: true });

// Narration logic
function speakNarration(move) {
if (!speechEnabled || !move) return;

const from = move.from?.toUpperCase() || "";
const to = move.to?.toUpperCase() || "";
const color = move.color === "w" ? "White" : "Black";
const pieceMap = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
const piece = pieceMap[move.piece] || "piece";

let sentence = "";

if (move.flags.includes("c")) {
const victimColor = move.color === "w" ? "black" : "white";
const capturedPiece = game.get(to)?.type || "piece";
sentence = ${color} ${piece} captured ${victimColor} ${pieceMap[capturedPiece] || "piece"} on ${to};
} else {
sentence = ${color} ${piece} moved from ${from} to ${to};
}

if (game.in_checkmate()) {
sentence += . Checkmate! ${color} wins!;
} else if (game.in_check()) {
sentence += . ${color} king is in check.;
}

const lowTime = currentTimerColor === "w" ? whiteTimeLeft : blackTimeLeft;
if (lowTime <= 10) {
sentence += . ${color} is running low on time.;
}

const utter = new SpeechSynthesisUtterance(sentence);
utter.lang = selectedLang;
if (selectedVoice) utter.voice = selectedVoice;
utter.pitch = 1;
utter.rate = 1;
speechSynthesis.speak(utter);
}

// ✅ Call once DOM loads
loadVoices();

// Rest of your app.js (board rendering, game logic, UI, timer, event handlers...) remains unchanged.

function initBoard() {
board.innerHTML = "";
boardSquares = [];
for (let i = 0; i < 8; i++) {
const row = [];
for (let j = 0; j < 8; j++) {
const square = document.createElement("div");
square.className = "square " + ((i + j) % 2 === 0 ? "light" : "dark");
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
? <img src="./pieces/${piece.color}${piece.type}.png" class="piece${animate && lastMove?.to === squareId ? ' animate-move' : ''}" />
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
winnerText.innerHTML = <span>${winner} wins by checkmate!</span>;
winnerModal.className = "show shake glow-" + winner.toLowerCase();
playSound("win.mp3", 1.0);
navigator.vibrate?.([200, 100, 200]);
return;
}

if (game.in_draw()) {
stopTimer();
winnerText.innerHTML = <span>It's a draw!</span>;
winnerModal.className = "show glow-white";
playSound("draw.mp3", 1.0);
navigator.vibrate?.([300]);
return;
}

statusEl.textContent = ${game.turn() === "w" ? "White" : "Black"} to move;
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
const format = (t) => {
const m = Math.floor(t / 60).toString().padStart(2, "0");
const s = (t % 60).toString().padStart(2, "0");
return ${m}:${s};
};

whiteTimerEl.textContent = format(whiteTimeLeft);
blackTimerEl.textContent = format(blackTimeLeft);

const total = selectedDuration || 600;
const whiteBox = document.querySelector(".timer.white");
const blackBox = document.querySelector(".timer.black");

const whitePercent = Math.max(0, (whiteTimeLeft / total) * 100);
const blackPercent = Math.max(0, (blackTimeLeft / total) * 100);

whiteBox.style.setProperty("--progress", ${whitePercent}%);
blackBox.style.setProperty("--progress", ${blackPercent}%);
}

function updateTimerUI() {
const whiteBox = document.querySelector(".timer.white");
const blackBox = document.querySelector(".timer.black");

whiteBox.classList.toggle("active", currentTimerColor === "w");
blackBox.classList.toggle("active", currentTimerColor === "b");

const whiteSecs = whiteTimeLeft;
const blackSecs = blackTimeLeft;

whiteBox.classList.toggle("low-time", whiteSecs <= 10);
blackBox.classList.toggle("low-time", blackSecs <= 10);

if (currentTimerColor === "w") {
if (whiteSecs <= 10 && lastWhiteSeconds > 10) playSound("beep.mp3", 1.0);
lastWhiteSeconds = whiteSecs;
} else {
if (blackSecs <= 10 && lastBlackSeconds > 10) playSound("beep.mp3", 1.0);
lastBlackSeconds = blackSecs;
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

winnerText.innerHTML = <span>${result}</span>;
winnerModal.className = "show glow-white";
playSound("draw.mp3", 1.0);
navigator.vibrate?.([100, 100, 100]);
}

// Menu and theme
menuBtn.onclick = () => menuModal.classList.toggle("show");
document.addEventListener("click", (e) => {
if (!menuModal.contains(e.target) && e.target !== menuBtn) {
menuModal.classList.remove("show");
}
});
if (themeToggleMenu) {
themeToggleMenu.addEventListener("click", () => {
document.body.classList.toggle("dark");
});
}

// Start
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
const mins = parseInt(timerSelect?.value || "10");
whiteTimeLeft = blackTimeLeft = mins * 60;
lastWhiteSeconds = lastBlackSeconds = mins * 60;
resetTimer();
renderBoard();
updateStatus();
}

initBoard();
