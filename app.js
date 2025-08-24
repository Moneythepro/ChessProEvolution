// Chess Pro Evolution — with "Illegal Ultra" mode (no hints UI)
// Uses: chess.js (standard) + chessillegal.js (provided IllegalChess class)

// ---------------------- State ----------------------
let game;
let currentMode = "pvp";         // "pvp" | "illegal" | "illegal-ultra"
let showHints = true;            // toggles UI hints (dots, last move, check)

let lastMove = null;
let selectedSquare = null;
let timerInterval = null;
let selectedVoice = null;
let selectedLang = "en-US";      // default
let whiteTimeLeft = 600;
let blackTimeLeft = 600;
let currentTimerColor = "w";
let selectedDuration = 600;
let legalMoves = [];
let boardSquares = [];
let pendingPromotion = null;

const capturedPieces = { w: [], b: [] };

// ---------------------- Elements ----------------------
const whiteCapturedEl = document.getElementById("whiteCaptured");
const blackCapturedEl = document.getElementById("blackCaptured");
const promotionModal = document.getElementById("promotionModal");

const langSelect = document.getElementById("langSelect");
const voiceSelect = document.getElementById("voiceSelect");
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
const boardWrapper = document.getElementById("boardWrapper");
const modeSelect = document.getElementById("modeSelect");

// ---------------------- Language/Voice ----------------------
const allowedLangs = [
  { code: "none", label: "🚫 No Voice" },
  { code: "en-US", label: "🇺🇸 English (US)" },
  { code: "en-GB", label: "🇬🇧 English (UK)" },
  { code: "hi-IN", label: "🇮🇳 Hindi" },
  { code: "fr", label: "🇫🇷 French" },
  { code: "de", label: "🇩🇪 German" },
  { code: "es", label: "🇪🇸 Spanish" },
  { code: "ja", label: "🇯🇵 Japanese" }
];

function normalizeLang(code){ return code ? code.toLowerCase().replace("_","-") : ""; }

async function loadVoices(){
  return new Promise(resolve=>{
    const tryLoad = ()=>{
      const voices = speechSynthesis.getVoices();
      if(voices.length){
        const filtered = voices.filter(v=>{
          const lang = normalizeLang(v.lang);
          return allowedLangs.some(l => l.code!=="none" && (lang===normalizeLang(l.code) || lang.startsWith(l.code.split("-")[0])));
        });

        voiceSelect.innerHTML = filtered.map(v => `<option value="${v.name}" data-lang="${v.lang}">${v.name} (${v.lang})</option>`).join("");

        if(selectedLang!=="none"){
          let best = filtered.find(v => normalizeLang(v.lang)===normalizeLang(selectedLang))
                 || filtered.find(v => normalizeLang(v.lang).startsWith(selectedLang.split("-")[0].toLowerCase()));
          selectedVoice = best || filtered[0] || null;
          if(selectedVoice) voiceSelect.value = selectedVoice.name;
        }else{
          selectedVoice = null;
          voiceSelect.value = "";
        }
        resolve();
      } else setTimeout(tryLoad,150);
    };
    tryLoad();
  });
}
speechSynthesis.onvoiceschanged = ()=>loadVoices();

window.addEventListener("click", ()=>{
  // unlock audio/speech on first interaction
  loadVoices();
  const unlock = new Audio();
  unlock.play().catch(()=>{});
}, { once:true });

// ---------------------- Sounds ----------------------
const soundCache = {};
function preloadSound(key, src, volume=0.85){
  const audio = new Audio(src);
  audio.preload = "auto"; audio.volume = volume;
  soundCache[key] = audio;
}
function playSound(key){
  const base = soundCache[key];
  if(!base) return;
  const s = base.cloneNode();
  s.volume = base.volume;
  s.play().catch(()=>{});
}
function playMoveFeedback(){ playSound("move"); navigator.vibrate?.([100]); }

preloadSound("move","move.mp3",0.85);
preloadSound("win","win.mp3",1.0);
preloadSound("draw","draw.mp3",1.0);

// ---------------------- Speech ----------------------
function speakNarration(move){
  if(!move || selectedLang==="none" || !selectedVoice) return;

  const from = move.from?.toUpperCase();
  const to   = move.to?.toUpperCase();
  const colorEn = move.color==="w" ? "White" : "Black";
  const pieceMapEn = { p:"pawn", n:"knight", b:"bishop", r:"rook", q:"queen", k:"king" };

  const isCapture = typeof move.flags==="string"
    ? move.flags.includes("c")
    : Array.isArray(move.flags) && move.flags.includes("c");

  let sentence = "";
  if(normalizeLang(selectedLang)==="hi-in"){
    const pieceHi = { p:"प्यादा", n:"घोड़ा", b:"ऊँट", r:"हाथी", q:"वज़ीर", k:"राजा" };
    const colorHi = move.color==="w" ? "सफ़ेद" : "काला";
    sentence = isCapture
      ? `${colorHi} ${pieceHi[move.piece]} ने ${to} पर मोहरा मारा`
      : `${colorHi} ${pieceHi[move.piece]} ${from} से ${to} चला`;
  }else{
    const piece = pieceMapEn[move.piece] || "piece";
    sentence = isCapture
      ? `${colorEn} ${piece} captured on ${to}`
      : `${colorEn} ${piece} moved from ${from} to ${to}`;
  }

  try{
    const u = new SpeechSynthesisUtterance(sentence);
    u.voice = selectedVoice; u.lang = selectedVoice.lang || selectedLang; u.pitch=1; u.rate=1;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }catch(e){}
}

// ---------------------- Captured UI ----------------------
function updateCapturedUI(){
  whiteCapturedEl.innerHTML = ""; blackCapturedEl.innerHTML="";
  const order = ["q","r","b","n","p"];
  function render(color, container){
    const grouped = {};
    capturedPieces[color].forEach(p => { grouped[p.type] = (grouped[p.type]||0) + 1; });
    order.forEach(type=>{
      if(grouped[type]){
        const wrap = document.createElement("div"); wrap.className="captured-piece"; wrap.title = `${grouped[type]} ${type}`;
        const img = document.createElement("img"); img.src = `./pieces/${color}${type}.png`; wrap.appendChild(img);
        if(grouped[type]>1){ const c = document.createElement("span"); c.className="count"; c.textContent=`×${grouped[type]}`; wrap.appendChild(c); }
        container.appendChild(wrap);
      }
    });
  }
  render("w", blackCapturedEl); // black captured white
  render("b", whiteCapturedEl); // white captured black
}

// ---------------------- Board helpers ----------------------
function coordsToSquare(i,j){ return "abcdefgh"[j] + (8 - i); }

function findKing(color){
  for(let i=0;i<8;i++) for(let j=0;j<8;j++){
    const sq = coordsToSquare(i,j);
    const p = game.get(sq);
    if(p?.type==="k" && p.color===color) return sq;
  }
  return null;
}

function renderBoard(animate=false){
  for(let i=0;i<8;i++){
    for(let j=0;j<8;j++){
      const square = boardSquares[i][j];
      const squareId = coordsToSquare(i,j);
      const piece = game.get(squareId);

      // piece sprite
      square.innerHTML = piece ? `<img src="./pieces/${piece.color}${piece.type}.png" class="piece${(animate && showHints && lastMove?.to===squareId)?' animate-move':''}" />` : "";

      // reset classes
      square.classList.remove("selected","last-move","check","legal");

      if(showHints){
        if(lastMove && (squareId===lastMove.from || squareId===lastMove.to)) square.classList.add("last-move");
        if(selectedSquare===squareId) square.classList.add("selected");
        if(legalMoves.includes(squareId)) square.classList.add("legal");

        // check highlight (not in Ultra)
        if(typeof game.in_check==="function" && game.in_check()){
          const king = findKing(game.turn());
          if(squareId===king) square.classList.add("check");
        }
      }
    }
  }
}

// ---------------------- Status & Timers ----------------------
function formatTime(s){ const m = Math.floor(s/60).toString().padStart(2,"0"); const ss=(s%60).toString().padStart(2,"0"); return `${m}:${ss}`; }

function updateTimerUI(){
  const whiteBox = document.querySelector(".timer.white");
  const blackBox = document.querySelector(".timer.black");
  whiteBox.classList.toggle("active", currentTimerColor==="w");
  blackBox.classList.toggle("active", currentTimerColor==="b");
  whiteBox.classList.toggle("low-time", whiteTimeLeft<=10);
  blackBox.classList.toggle("low-time", blackTimeLeft<=10);
  whiteTimerEl.textContent = formatTime(whiteTimeLeft);
  blackTimerEl.textContent = formatTime(blackTimeLeft);
  const total = selectedDuration || 600;
  whiteBox.style.setProperty("--progress", `${Math.max(0,(whiteTimeLeft/total)*100)}%`);
  blackBox.style.setProperty("--progress", `${Math.max(0,(blackTimeLeft/total)*100)}%`);
}

function stopTimer(){ clearInterval(timerInterval); }

function resetTimer(){
  stopTimer();
  updateTimerUI();
  currentTimerColor = game.turn();
  timerInterval = setInterval(()=>{
    if(currentTimerColor==="w"){ whiteTimeLeft--; if(whiteTimeLeft<=0) return decideWinnerByPoints(); }
    else { blackTimeLeft--; if(blackTimeLeft<=0) return decideWinnerByPoints(); }
    updateTimerUI();
  },1000);
}

function updateStatus(){
  // win by king capture (Illegal modes)
  const board = game.board();
  let whiteKing=false, blackKing=false;
  for(const row of board) for(const cell of row){
    if(cell?.type==="k"){ if(cell.color==="w") whiteKing=true; else blackKing=true; }
  }

  if(!whiteKing || !blackKing){
    stopTimer();
    const winner = whiteKing ? "White" : "Black";
    winnerText.innerHTML = `<span>${winner} wins by king capture!</span>`;
    winnerModal.classList.add("show");
    playSound("win"); navigator.vibrate?.([200,100,200]);
    return;
  }

  // standard end states (for normal mode)
  if(typeof game.in_checkmate==="function" && game.in_checkmate()){
    stopTimer();
    const loser = game.turn()==="w" ? "White" : "Black";
    const winner = loser==="White" ? "Black" : "White";
    winnerText.innerHTML = `<span>${winner} wins by checkmate!</span>`;
    winnerModal.classList.add("show");
    playSound("win"); navigator.vibrate?.([200,100,200]);
    return;
  }

  if(typeof game.in_draw==="function" && game.in_draw()){
    stopTimer();
    winnerText.innerHTML = `<span>It's a draw!</span>`;
    winnerModal.classList.add("show");
    playSound("draw"); navigator.vibrate?.([300]);
    return;
  }

  statusEl.textContent = `${game.turn()==="w" ? "White" : "Black"} to move`;
}

// ---------------------- Moves & Clicks ----------------------
function showPromotionModal(color){
  promotionModal.classList.remove("hidden");
  promotionModal.querySelectorAll("button").forEach(btn=>{
    const type = btn.dataset.piece;
    btn.querySelector("img").src = `./pieces/${color}${type}.png`;
  });
}

// Single promotion handler (no duplicates)
promotionModal.addEventListener("click",(e)=>{
  const btn = e.target.closest("button");
  if(!btn || !pendingPromotion) return;

  const selectedPiece = btn.dataset.piece;
  pendingPromotion.promotion = selectedPiece;

  const {from,to} = pendingPromotion;
  const played = game.move({ from, to, promotion: selectedPiece });

  if(played){
    // if promotion captured a non-king, book it for UI
    const capturedFlag = played.flags && String(played.flags).includes("c");
    if(capturedFlag){
      // captured piece color is opposite of mover
      const victimColor = played.color==="w" ? "b" : "w";
      // we can't get the exact type after move easily here; skip counting on promo capture as type is already removed.
      // (Captured pieces are still counted on non-promo moves accurately)
    }
    lastMove = { from, to };
    selectedSquare = null;
    legalMoves = [];
    playMoveFeedback();
    speakNarration(played);
    renderBoard(true);
    updateStatus();
    currentTimerColor = game.turn();
  }

  pendingPromotion = null;
  promotionModal.classList.add("hidden");
});

function handleSquareClick(i,j){
  if(typeof game.game_over==="function" && game.game_over()) return;
  const square = coordsToSquare(i,j);
  const piece = game.get(square);

  if(selectedSquare){
    const from = selectedSquare;
    const to = square;
    const movingPiece = game.get(from);

    // sanity: must move your own piece
    if(!movingPiece || movingPiece.color !== game.turn()){
      selectedSquare = null; legalMoves = []; renderBoard(); return;
    }

    const isPromo = movingPiece.type==="p" && (
      (movingPiece.color==="w" && to.endsWith("8")) ||
      (movingPiece.color==="b" && to.endsWith("1"))
    );

    if(isPromo){
      // only show promo UI if that promotion move is actually possible according to engine
      const canPromo = game.moves({ square: from, verbose:true })
                         .some(m => m.to===to && m.promotion);
      if(canPromo){
        pendingPromotion = { from, to };
        showPromotionModal(movingPiece.color);
        return;
      }
    }

    const played = game.move({ from, to });

    if(played){
      // capture bookkeeping (ignore king)
      const prevPiece = piece && piece.color !== movingPiece.color ? piece : null;
      if(prevPiece && prevPiece.type!=="k"){
        const capturerColor = prevPiece.color==="w" ? "b" : "w";
        capturedPieces[capturerColor].push(prevPiece);
        updateCapturedUI();
      }

      lastMove = { from, to };
      selectedSquare = null;
      legalMoves = [];
      playMoveFeedback();
      speakNarration(played);
      renderBoard(true);
      updateStatus();
      currentTimerColor = game.turn();
    } else {
      // If move failed, reselect (no dots in Ultra)
      const fallback = selectedSquare !== square;
      selectedSquare = fallback ? square : null;
      legalMoves = (!showHints || !fallback) ? [] : game.moves({ square, verbose:true }).map(m => m.to);
      renderBoard();
    }
  } else if(piece && piece.color===game.turn()){
    selectedSquare = square;
    legalMoves = showHints ? game.moves({ square, verbose:true }).map(m=>m.to) : [];
    renderBoard();
  }
}

// ---------------------- Build Board ----------------------
function initBoard(){
  boardEl.innerHTML = ""; boardSquares = [];
  for(let i=0;i<8;i++){
    const row = [];
    for(let j=0;j<8;j++){
      const square = document.createElement("div");
      square.className = "square " + ((i+j)%2===0 ? "light" : "dark");
      square.dataset.row = i; square.dataset.col = j;
      square.addEventListener("click", ()=>handleSquareClick(i,j));
      boardEl.appendChild(square);
      row.push(square);

      if(i===7){ const fileLabel = document.createElement("div"); fileLabel.className="file-label"; fileLabel.textContent="abcdefgh"[j]; square.appendChild(fileLabel); }
      if(j===0){ const rankLabel = document.createElement("div"); rankLabel.className="rank-label"; rankLabel.textContent=8-i; square.appendChild(rankLabel); }
    }
    boardSquares.push(row);
  }
  renderBoard();
  updateStatus();
  updateTimerUI();
}

// ---------------------- Scoring when time runs out ----------------------
function decideWinnerByPoints(){
  stopTimer();
  const values = { p:1, n:3, b:3, r:5, q:9 };
  const score = { w:0, b:0 };
  for(let i=0;i<8;i++) for(let j=0;j<8;j++){
    const p = game.get(coordsToSquare(i,j));
    if(p && p.type!=="k") score[p.color] += values[p.type] || 0;
  }
  let result = "Draw by equal points!";
  if(score.w>score.b) result="White wins on points!";
  else if(score.b>score.w) result="Black wins on points!";

  winnerText.innerHTML = `<span>${result}</span>`;
  winnerModal.classList.add("show");
  playSound("draw"); navigator.vibrate?.([100,100,100]);
}

// ---------------------- Game Lifecycle ----------------------
function newGame(){
  currentMode = modeSelect?.value || "pvp";
  const illegalMode = (currentMode==="illegal" || currentMode==="illegal-ultra");
  // engine setup
  game = illegalMode ? new IllegalChess() : new Chess();

  // UI hint policy
  showHints = currentMode !== "illegal-ultra";

  // reset UI + state
  selectedSquare = null; lastMove = null; legalMoves = [];
  winnerModal.classList.remove("show");

  const mins = parseInt(timerSelect?.value || "10", 10);
  whiteTimeLeft = blackTimeLeft = mins*60; selectedDuration = mins*60;

  capturedPieces.w.length = 0; capturedPieces.b.length = 0;
  updateCapturedUI();

  initBoard();
  resetTimer();
  updateStatus();
  // toggle body class for CSS-only customizations if needed
  document.body.classList.toggle("mode-ultra", !showHints);
}

// ---------------------- UI Events ----------------------
langSelect.addEventListener("change", async ()=>{
  selectedLang = langSelect.value;
  await loadVoices();
});
voiceSelect.addEventListener("change", ()=>{
  const voiceName = voiceSelect.value;
  const all = speechSynthesis.getVoices();
  selectedVoice = all.find(v => v.name===voiceName) || null;
});

menuBtn.addEventListener("click",(e)=>{
  e.stopPropagation();
  menuModal.classList.toggle("show");
});
document.addEventListener("click",(e)=>{
  if(!menuModal.contains(e.target) && e.target!==menuBtn) menuModal.classList.remove("show");
});
if(themeToggleMenu){
  themeToggleMenu.addEventListener("change",()=> document.body.classList.toggle("dark", themeToggleMenu.checked));
}

startBtn.addEventListener("click", ()=>{
  newGame();
  startMenu.style.display = "none";
  boardWrapper.style.display = "flex";
  capturedBox.classList.add("show");
});

document.getElementById("quitGameBtn").addEventListener("click", ()=>{
  if(boardWrapper.style.display==="flex"){
    if(confirm("Quit current game and return to the main menu?")){
      resetToStartMenu();
      menuModal.classList.remove("show");
    }
  }
});

// Allow Enter to start game quickly
document.addEventListener("keydown",(e)=>{
  if(startMenu.style.display!== "none" && (e.key==="Enter" || e.key===" ")){
    startBtn.click();
  }
});

// ---------------------- Reset to Start ----------------------
function resetToStartMenu(){
  boardWrapper.style.display = "none";
  winnerModal.classList.remove("show");
  capturedBox.classList.remove("show");
  whiteCapturedEl.innerHTML = ""; blackCapturedEl.innerHTML = "";

  startMenu.removeAttribute("style");
  startBtn.removeAttribute("style");
  startBtn.className = startBtn.dataset.originalClass || startBtn.className;

  document.body.style.overflow = "";
  document.body.style.touchAction = "";

  try{ stopTimer(); }catch(e){}
}

// expose for buttons
window.newGame = newGame;
window.resetToStartMenu = resetToStartMenu;
