let game = new Chess();
let lastMove = null;
let selectedSquare = null;
let legalMoves = []; 
let timerInterval = null;
let selectedVoice = null;
let selectedLang = "en-US";
let whiteTimeLeft = 600;
let blackTimeLeft = 600;
let lastWhiteSeconds = 600;
let lastBlackSeconds = 600;
let currentTimerColor = "w";
let selectedDuration = 600;

const langSelect = document.getElementById("langSelect");
const voiceSelect = document.getElementById("voiceSelect");
const menuBtn = document.getElementById("menuBtn");
const menuModal = document.getElementById("menuModal");
const themeToggleMenu = document.getElementById("themeToggleMenu");
const startBtn = document.getElementById("startGameBtn");
const startMenu = document.getElementById("startMenu");
const timerSelect = document.getElementById("timerSelect");
const statusEl = document.getElementById("status");
const whiteTimerEl = document.getElementById("whiteTimer");
const blackTimerEl = document.getElementById("blackTimer");
const boardEl = document.getElementById("board");
const winnerText = document.getElementById("winnerText");
const winnerModal = document.getElementById("winnerModal");

const allowedLangs = [
  { code: "none", label: "🚫 No Voice" },
  { code: "en-US", label: "🇺🇸 English (US)" },
  { code: "en-GB", label: "🇬🇧 English (UK)" },
  { code: "hi",     label: "🇮🇳 Hindi" },
  { code: "fr",     label: "🇫🇷 French" },
  { code: "de",     label: "🇩🇪 German" },
  { code: "es",     label: "🇪🇸 Spanish" },
  { code: "ja",     label: "🇯🇵 Japanese" }
];

// === LANGUAGE SELECT ===
function initLangSelect() {
  langSelect.innerHTML = allowedLangs.map(lang =>
    `<option value="${lang.code}">${lang.label}</option>`
  ).join("");
  langSelect.value = selectedLang;
}

async function loadVoices() {
  const allVoices = await new Promise(resolve => {
    const tryLoad = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length) resolve(voices);
    };
    tryLoad();
    speechSynthesis.onvoiceschanged = tryLoad;
  });

  const filtered = allVoices.filter(v =>
    allowedLangs.some(lang => lang.code !== "none" && v.lang.startsWith(lang.code))
  );

  voiceSelect.innerHTML = filtered.map(v =>
    `<option value="${v.name}" data-lang="${v.lang}">${v.name} (${v.lang})</option>`
  ).join("");

  if (selectedLang !== "none") {
    const bestMatch = filtered.find(v => v.lang === selectedLang)
      || filtered.find(v => v.lang.startsWith(selectedLang.split("-")[0]));
    selectedVoice = bestMatch || null;
    if (selectedVoice) voiceSelect.value = selectedVoice.name;
  } else {
    selectedVoice = null;
    voiceSelect.value = "";
  }
}

langSelect.addEventListener("change", async () => {
  selectedLang = langSelect.value;
  await loadVoices();
});

voiceSelect.addEventListener("change", () => {
  const voiceName = voiceSelect.value;
  const allVoices = speechSynthesis.getVoices();
  selectedVoice = allVoices.find(v => v.name === voiceName) || null;
});

document.body.addEventListener("click", () => {
  const dummy = new Audio();
  dummy.play().catch(() => {});
  initLangSelect();
  loadVoices();
}, { once: true });

// === SPEECH ===
function speakNarration(move) {
  if (!move || selectedLang === "none" || !selectedVoice) return;

  const from = move.from?.toUpperCase();
  const to = move.to?.toUpperCase();
  const color = move.color === "w" ? "White" : "Black";
  const pieceMap = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
  const piece = pieceMap[move.piece] || "piece";

  let sentence = "";

  if (move.flags.includes("c")) {
    const victimColor = move.color === "w" ? "black" : "white";
    const captured = game.get(to)?.type || "piece";
    sentence = `${color} ${piece} captured ${victimColor} ${pieceMap[captured] || "piece"} on ${to}`;
  } else {
    sentence = `${color} ${piece} moved from ${from} to ${to}`;
  }

  if (game.in_checkmate()) sentence += `. Checkmate! ${color} wins!`;
  else if (game.in_check()) sentence += `. ${color} king is in check.`;

  const lowTime = currentTimerColor === "w" ? whiteTimeLeft : blackTimeLeft;
  if (lowTime <= 10) sentence += `. ${color} is running low on time.`;

  const utter = new SpeechSynthesisUtterance(sentence);
  utter.voice = selectedVoice;
  utter.lang = selectedVoice.lang || selectedLang;
  utter.pitch = 1;
  utter.rate = 1;
  speechSynthesis.speak(utter);
}

// === UTILITY ===
function playMoveFeedback() {
  playSound("move.mp3", 0.8);
  navigator.vibrate?.([100]);
}

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function updateStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function playSound(src, volume = 1) {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.play().catch(() => {});
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
}

// === MENU ===
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

// === GAME START ===
startBtn.onclick = () => {
  game = new Chess();
  selectedSquare = null;
  lastMove = null;

  startMenu.style.display = "none";
  document.getElementById("boardWrapper").style.display = "flex";

  const mins = parseInt(timerSelect?.value || "10");
  whiteTimeLeft = blackTimeLeft = mins * 60;
  lastWhiteSeconds = lastBlackSeconds = mins * 60;
  selectedDuration = mins * 60;

  newGame();

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (currentTimerColor === "w") {
      whiteTimeLeft = Math.max(0, whiteTimeLeft - 1);
      if (whiteTimeLeft === 0) {
        clearInterval(timerInterval);
        updateStatus("Black wins on time!");
      }
    } else {
      blackTimeLeft = Math.max(0, blackTimeLeft - 1);
      if (blackTimeLeft === 0) {
        clearInterval(timerInterval);
        updateStatus("White wins on time!");
      }
    }
    updateTimerUI();
  }, 1000);
};

function newGame() {
  game.reset();
  selectedSquare = null;
  lastMove = null;
  updateStatus("White to move");
  renderBoard();
}

function renderBoard() {
  boardEl.innerHTML = "";
  const squares = game.board();
  for (let r = 7; r >= 0; r--) {
    for (let f = 0; f < 8; f++) {
      const squareName = "abcdefgh"[f] + (r + 1);
      const piece = squares[r][f];
      const div = document.createElement("div");
      div.className = "square " + ((r + f) % 2 === 0 ? "light" : "dark");
      div.dataset.square = squareName;

      if (piece) {
        const img = document.createElement("img");
        img.src = `pieces/${piece.color}${piece.type}.png`;
        img.className = "piece";
        div.appendChild(img);
      }
      boardEl.appendChild(div);
    }
  }
}

boardEl.addEventListener("click", (e) => {
  const target = e.target.closest(".square");
  if (!target) return;
  const clickedSquare = target.dataset.square;

  if (selectedSquare) {
    const legalMoves = game.moves({ square: selectedSquare, verbose: true });
    const move = legalMoves.find(m => m.to === clickedSquare);
    if (move) {
      makeMove(move.from, move.to);
      selectedSquare = null;
    } else {
      selectedSquare = clickedSquare;
    }
  } else {
    selectedSquare = clickedSquare;
  }
});

function makeMove(from, to) {
  const move = game.move({ from, to, sloppy: true });
  if (move) {
    lastMove = move;
    speakNarration(move);
    playMoveFeedback();
    currentTimerColor = game.turn();
    updateStatus(`${currentTimerColor === "w" ? "White" : "Black"} to move`);
    updateTimerUI();
    renderBoard();
  }
}

// === INIT ===
initLangSelect();
loadVoices();
