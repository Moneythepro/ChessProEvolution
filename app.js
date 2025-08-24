/* Mobile-first app with Illigal Chess Ultra (no hints) */

let game;
let mode = "pvp";          // pvp | illegal | illegal-ultra
let showHints = true;      // dots, last-move, check highlight
let lastMove = null;
let selectedSquare = null;
let legalMoves = [];
let boardSquares = [];
let pendingPromotion = null;

// timers
let whiteTimeLeft = 600, blackTimeLeft = 600;
let selectedDuration = 600;
let currentTimerColor = "w";
let timerInterval = null;

// voice
let selectedLang = "none";
let selectedVoice = null;

// captured
const capturedPieces = { w: [], b: [] };

// DOM
const boardEl = document.getElementById("board");
const boardWrapper = document.getElementById("boardWrapper");
const statusEl = document.getElementById("status");
const startMenu = document.getElementById("startMenu");
const modeSelect = document.getElementById("modeSelect");
const timerSelect = document.getElementById("timerSelect");
const startBtn = document.getElementById("startGameBtn");
const langSelect = document.getElementById("langSelect");
const voiceSelect = document.getElementById("voiceSelect");
const whiteTimerEl = document.getElementById("whiteTimer");
const blackTimerEl = document.getElementById("blackTimer");
const menuBtn = document.getElementById("menuBtn");
const menuModal = document.getElementById("menuModal");
const themeToggleMenu = document.getElementById("themeToggleMenu");
const winnerModal = document.getElementById("winnerModal");
const winnerText = document.getElementById("winnerText");
const playAgainBtn = document.getElementById("playAgainBtn");
const mainMenuBtn = document.getElementById("mainMenuBtn");
const promotionModal = document.getElementById("promotionModal");
const promotionSheet = document.querySelector("#promotionModal .sheet-card");
const whiteCapturedEl = document.getElementById("whiteCaptured");
const blackCapturedEl = document.getElementById("blackCaptured");

// --- Sounds ---
const soundCache = {};
function preloadSound(key, src, volume = 0.85) {
  const a = new Audio(src);
  a.preload = "auto";
  a.volume = volume;
  soundCache[key] = a;
}
function playSound(key) {
  const s = soundCache[key];
  if (!s) return;
  const c = s.cloneNode();
  c.volume = s.volume;
  c.play().catch(()=>{});
}
preloadSound("move", "move.mp3");
preloadSound("win", "win.mp3");
preloadSound("draw", "draw.mp3");

// --- Voice ---
function normalizeLang(code){ return (code||"").toLowerCase().replace("_","-"); }
async function loadVoices() {
  return new Promise(resolve=>{
    const go = () => {
      const voices = speechSynthesis.getVoices();
      if (!voices.length) return setTimeout(go, 120);
      const allowed = ["en-us","en-gb","hi-in","fr","es","de","ja"];
      const filtered = voices.filter(v => {
        const ln = normalizeLang(v.lang);
        return allowed.some(a => ln === a || ln.startsWith(a.split("-")[0]));
      });
      voiceSelect.innerHTML = filtered
        .map(v=>`<option value="${v.name}">${v.name} (${v.lang})</option>`).join("");
      if (selectedLang !== "none"){
        selectedVoice = filtered.find(v=>normalizeLang(v.lang)===normalizeLang(selectedLang)) || filtered[0] || null;
        if (selectedVoice) voiceSelect.value = selectedVoice.name;
      }
      resolve();
    };
    go();
  });
}
speechSynthesis.onvoiceschanged = loadVoices;

function speakNarration(move){
  if (!move || selectedLang==="none" || !selectedVoice) return;
  const mapEn = {p:"pawn", n:"knight", b:"bishop", r:"rook", q:"queen", k:"king"};
  const color = move.color==="w" ? "White" : "Black";
  const text = `${color} ${mapEn[move.piece]||"piece"} from ${move.from.toUpperCase()} to ${move.to.toUpperCase()}`;
  try{
    const u = new SpeechSynthesisUtterance(text);
    u.voice = selectedVoice; u.lang = selectedVoice.lang || selectedLang;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }catch(e){}
}

// --- Helpers ---
function coordsToSquare(i,j){ return "abcdefgh"[j] + (8-i); }
function findKing(color){
  for (let i=0;i<8;i++) for (let j=0;j<8;j++){
    const s = coordsToSquare(i,j);
    const p = game.get(s);
    if (p?.type==="k" && p.color===color) return s;
  }
  return null;
}
function formatTime(secs){
  const m = Math.floor(secs/60).toString().padStart(2,"0");
  const s = (secs%60).toString().padStart(2,"0");
  return `${m}:${s}`;
}

// --- Board render ---
function renderBoard(animate=false){
  for (let i=0;i<8;i++){
    for (let j=0;j<8;j++){
      const el = boardSquares[i][j];
      const sq = coordsToSquare(i,j);
      const piece = game.get(sq);
      el.innerHTML = piece ? `<img src="./pieces/${piece.color}${piece.type}.png" class="piece${animate && lastMove?.to===sq ? ' animate-move':''}" />` : "";
      el.classList.remove("selected","last-move","check","legal");

      if (showHints){
        if (lastMove && (sq===lastMove.from || sq===lastMove.to)) el.classList.add("last-move");
        if (selectedSquare===sq) el.classList.add("selected");
        if (legalMoves.includes(sq)) el.classList.add("legal");
        if (game.in_check && game.in_check()){
          const k = findKing(game.turn());
          if (sq===k) el.classList.add("check");
        }
      }
    }
  }
}

// --- Captured pieces ---
function updateCapturedUI(){
  whiteCapturedEl.innerHTML = "";
  blackCapturedEl.innerHTML = "";
  const order = ["q","r","b","n","p"];
  function render(color, container){
    const grouped = {};
    capturedPieces[color].forEach(p => grouped[p.type] = (grouped[p.type]||0)+1);
    order.forEach(type=>{
      if (!grouped[type]) return;
      const box = document.createElement("div"); box.className = "captured-piece";
      const img = document.createElement("img"); img.src = `./pieces/${color}${type}.png`;
      box.appendChild(img);
      if (grouped[type]>1){
        const c = document.createElement("span"); c.className = "count"; c.textContent = `×${grouped[type]}`;
        box.appendChild(c);
      }
      container.appendChild(box);
    });
  }
  render("b", whiteCapturedEl); // white captured black pieces
  render("w", blackCapturedEl); // black captured white pieces
}

// --- Status / Timers ---
function updateStatus(){
  // win by king capture in Illegal/Ultra
  const board = game.board();
  let wK=false,bK=false;
  for (const row of board) for (const c of row){
    if (c?.type==="k"){ if (c.color==="w") wK=true; if (c.color==="b") bK=true; }
  }
  if (!wK || !bK){
    stopTimer();
    const winner = wK ? "White" : "Black";
    winnerText.textContent = `${winner} wins by king capture!`;
    winnerModal.classList.add("show");
    playSound("win");
    return;
  }

  if (game.in_checkmate && game.in_checkmate()){
    stopTimer();
    const loser = game.turn()==="w" ? "White" : "Black";
    const winner = loser==="White" ? "Black" : "White";
    winnerText.textContent = `${winner} wins by checkmate!`;
    winnerModal.classList.add("show");
    playSound("win");
    return;
  }

  if (game.in_draw && game.in_draw()){
    stopTimer();
    winnerText.textContent = `It's a draw!`;
    winnerModal.classList.add("show");
    playSound("draw");
    return;
  }

  statusEl.textContent = `${game.turn()==="w" ? "White" : "Black"} to move`;
  const whiteBox = document.querySelector(".timer.white");
  const blackBox = document.querySelector(".timer.black");
  whiteBox.classList.toggle("active", currentTimerColor==="w");
  blackBox.classList.toggle("active", currentTimerColor==="b");
  whiteBox.classList.toggle("low-time", whiteTimeLeft<=10);
  blackBox.classList.toggle("low-time", blackTimeLeft<=10);
}

function updateTimerUI(){
  whiteTimerEl.textContent = formatTime(whiteTimeLeft);
  blackTimerEl.textContent = formatTime(blackTimeLeft);
}
function stopTimer(){ clearInterval(timerInterval); }
function resetTimer(){
  stopTimer();
  currentTimerColor = game.turn();
  timerInterval = setInterval(()=>{
    if (currentTimerColor==="w"){
      whiteTimeLeft--; if (whiteTimeLeft<=0) return decideWinnerByPoints();
    } else {
      blackTimeLeft--; if (blackTimeLeft<=0) return decideWinnerByPoints();
    }
    updateTimerUI();
  },1000);
}
function decideWinnerByPoints(){
  stopTimer();
  const vals = {p:1,n:3,b:3,r:5,q:9};
  const score = {w:0,b:0};
  for (let i=0;i<8;i++) for (let j=0;j<8;j++){
    const p = game.get(coordsToSquare(i,j));
    if (p && p.type!=="k") score[p.color]+=vals[p.type]||0;
  }
  let msg = "Draw by equal points!";
  if (score.w>score.b) msg = "White wins on points!";
  else if (score.b>score.w) msg = "Black wins on points!";
  winnerText.textContent = msg;
  winnerModal.classList.add("show");
  playSound("draw");
}

// --- Input ---
function handleSquareClick(i,j){
  if (game.game_over && game.game_over()) return;
  const square = coordsToSquare(i,j);
  const piece = game.get(square);

  if (selectedSquare){
    const from = selectedSquare;
    const to = square;
    const moving = game.get(from);
    if (!moving || moving.color !== game.turn()){
      selectedSquare = null; legalMoves = []; renderBoard(); return;
    }

    // promotion?
    const isPromo = moving.type==="p" &&
      ((moving.color==="w" && to.endsWith("8")) || (moving.color==="b" && to.endsWith("1")));
    if (isPromo){
      // check if any promo line exists
      const promos = game.moves({square: from, verbose:true}).filter(m=>m.to===to && m.promotion);
      if (promos.length){
        pendingPromotion = {from, to};
        showPromotion(moving.color);
        return;
      }
    }

    const capturedBefore = game.get(to);
    const played = game.move({from,to});
    if (played){
      if (capturedBefore && capturedBefore.color !== moving.color && capturedBefore.type!=="k"){
        const capturerColor = capturedBefore.color==="w" ? "b" : "w";
        capturedPieces[capturerColor].push(capturedBefore);
        updateCapturedUI();
      }
      lastMove = {from,to};
      selectedSquare = null; legalMoves = [];
      playSound("move"); speakNarration(played);
      renderBoard(true); updateStatus();
      currentTimerColor = game.turn();
    } else {
      // select different piece (no hints in Ultra)
      selectedSquare = (selectedSquare!==square && piece && piece.color===game.turn()) ? square : null;
      legalMoves = showHints && selectedSquare ? game.moves({square:selectedSquare, verbose:true}).map(m=>m.to) : [];
      renderBoard();
    }

  } else if (piece && piece.color===game.turn()){
    selectedSquare = square;
    legalMoves = showHints ? game.moves({square, verbose:true}).map(m=>m.to) : [];
    renderBoard();
  }
}

// --- Promotion UI ---
function showPromotion(color){
  promotionModal.classList.add("show");
  promotionModal.querySelectorAll("button").forEach(btn=>{
    const t = btn.dataset.piece;
    btn.querySelector("img").src = `./pieces/${color}${t}.png`;
  });
}
promotionModal.addEventListener("click",(e)=>{
  const b = e.target.closest("button"); if (!b || !pendingPromotion) return;
  const {from,to} = pendingPromotion;
  const promo = b.dataset.piece;
  const target = game.get(to);
  const moving = game.get(from);
  const played = game.move({from,to,promotion:promo});
  if (played){
    if (target && target.color!==moving.color && target.type!=="k"){
      const capturerColor = target.color==="w" ? "b" : "w";
      capturedPieces[capturerColor].push(target);
      updateCapturedUI();
    }
    lastMove = {from,to}; selectedSquare = null; legalMoves = [];
    playSound("move"); speakNarration(played);
    renderBoard(true); updateStatus();
    currentTimerColor = game.turn();
  }
  pendingPromotion = null;
  promotionModal.classList.remove("show");
});

// --- Init board grid ---
function initBoard(){
  boardEl.innerHTML = "";
  boardSquares = [];
  for (let i=0;i<8;i++){
    const row=[];
    for (let j=0;j<8;j++){
      const sq = document.createElement("div");
      sq.className = "square " + ((i+j)%2===0 ? "light" : "dark");
      sq.dataset.row=i; sq.dataset.col=j;
      sq.addEventListener("click", ()=>handleSquareClick(i,j));
      boardEl.appendChild(sq);
      row.push(sq);

      // labels
      if (i===7){
        const f = document.createElement("div");
        f.className="file-label"; f.textContent = "abcdefgh"[j];
        sq.appendChild(f);
      }
      if (j===0){
        const r = document.createElement("div");
        r.className="rank-label"; r.textContent = 8-i;
        sq.appendChild(r);
      }
    }
    boardSquares.push(row);
  }
  renderBoard();
  updateStatus(); updateTimerUI();
}

// --- Game lifecycle ---
function newGame(){
  mode = modeSelect.value;
  const illegalMode = (mode==="illegal" || mode==="illegal-ultra");
  showHints = (mode!=="illegal-ultra"); // ⬅️ Ultra: no dots, no last move, no check glow

  game = illegalMode ? new IllegalChess() : new Chess();

  selectedSquare = null; legalMoves = []; lastMove = null;
  capturedPieces.w = []; capturedPieces.b = [];
  updateCapturedUI();

  const mins = parseInt(timerSelect.value||"10",10);
  selectedDuration = mins*60;
  whiteTimeLeft = blackTimeLeft = selectedDuration;

  initBoard();
  resetTimer();
  boardWrapper.style.display = "flex";
  startMenu.style.display = "none";
  window.scrollTo({top:0, behavior:"smooth"});
}

// --- UI wiring ---
startBtn.addEventListener("click", newGame);

langSelect.addEventListener("change", async ()=>{
  selectedLang = langSelect.value;
  await loadVoices();
});
voiceSelect.addEventListener("change", ()=>{
  const name = voiceSelect.value;
  selectedVoice = speechSynthesis.getVoices().find(v=>v.name===name) || null;
});

// menu
menuBtn.addEventListener("click", (e)=>{
  e.stopPropagation();
  menuModal.style.display = menuModal.style.display==="flex" ? "none":"flex";
});
document.addEventListener("click", (e)=>{
  if (!menuModal.contains(e.target) && e.target!==menuBtn) menuModal.style.display="none";
});
themeToggleMenu.addEventListener("click", ()=>{
  document.body.classList.toggle("dark");
  menuModal.style.display="none";
});

// winner modal actions
playAgainBtn.addEventListener("click", ()=>{
  winnerModal.classList.remove("show");
  newGame();
});
mainMenuBtn.addEventListener("click", ()=>{
  winnerModal.classList.remove("show");
  boardWrapper.style.display = "none";
  startMenu.style.display = "";
  stopTimer();
});

// quit game from menu
document.getElementById("quitGameBtn").addEventListener("click", ()=>{
  if (boardWrapper.style.display==="none") return;
  menuModal.style.display="none";
  boardWrapper.style.display="none";
  startMenu.style.display="";
  stopTimer();
});

// unlock audio/voices
window.addEventListener("click", ()=>{
  const dummy = new Audio(); dummy.play().catch(()=>{});
  loadVoices();
},{once:true});

// initial icon refresh (safe)
document.addEventListener("DOMContentLoaded", ()=>{ if (window.lucide) lucide.createIcons(); });
