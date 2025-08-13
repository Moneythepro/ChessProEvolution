// voice.js — Handles voice narration and voice/ language selection

const langSelect = document.getElementById("langSelect");
const voiceSelect = document.getElementById("voiceSelect");

const allowedLangs = [
  { code: "none", label: "🚫 No Voice" },
  { code: "en‑US", label: "🇺🇸 English (US)" },
  { code: "en‑GB", label: "🇬🇧 English (UK)" },
  { code: "hi‑IN", label: "🇮🇳 Hindi" },
  { code: "fr",   label: "🇫🇷 French" },
  { code: "de",   label: "🇩🇪 German" },
  { code: "es",   label: "🇪🇸 Spanish" },
  { code: "ja",   label: "🇯🇵 Japanese" }
];

let selectedLang = "none";
let selectedVoice = null;

function initLangSelect() {
  langSelect.innerHTML = allowedLangs
    .map(l => `<option value="${l.code}">${l.label}</option>`)
    .join("");
  langSelect.value = selectedLang;
}

async function loadVoices() {
  return new Promise(resolve => {
    let attempts = 0;
    const tryLoad = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length || attempts >= 10) {
        const filtered = voices.filter(v =>
          allowedLangs.some(l => l.code !== "none" && v.lang.startsWith(l.code))
        );
        voiceSelect.innerHTML = filtered
          .map(v => `<option value="${v.name}" data‑lang="${v.lang}">${v.name} (${v.lang})</option>`)
          .join("");

        if (selectedLang !== "none") {
          const bestMatch = filtered.find(v =>
            v.lang === selectedLang || v.lang.startsWith(selectedLang.split("-")[0])
          );
          selectedVoice = bestMatch || null;
          if (selectedVoice) voiceSelect.value = selectedVoice.name;
        } else {
          selectedVoice = null;
          voiceSelect.value = "";
        }
        resolve();
      } else {
        attempts++;
        setTimeout(tryLoad, 200);
      }
    };
    tryLoad();
  });
}

langSelect.addEventListener("change", async () => {
  selectedLang = langSelect.value;
  await loadVoices();
});

voiceSelect.addEventListener("change", () => {
  const voiceName = voiceSelect.value;
  const voices = speechSynthesis.getVoices();
  selectedVoice = voices.find(v => v.name === voiceName) || null;
});

function speakNarration(game, move, whiteTimeLeft, blackTimeLeft, currentTimerColor) {
  if (!move || selectedLang === "none" || !selectedVoice) return;

  const from = move.from?.toUpperCase();
  const to = move.to?.toUpperCase();
  const color = move.color === "w" ? "White" : "Black";
  const pieceNames = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
  const piece = pieceNames[move.piece] || "piece";

  const flags = Array.isArray(move.flags) ? move.flags : (typeof move.flags === "string" ? move.flags.split("") : []);
  const isCapture = flags.includes("c");

  let sentence = isCapture
    ? `${color} ${piece} captured on ${to}`
    : `${color} ${piece} moved from ${from} to ${to}`;

  if (game.in_checkmate?.() && game.in_checkmate()) {
    sentence += `. Checkmate! ${color} wins!`;
  } else if (game.in_check?.() && game.in_check()) {
    sentence += `. ${color} king is in check.`;
  }

  const lowTime = currentTimerColor === "w" ? whiteTimeLeft : blackTimeLeft;
  if (lowTime <= 10) {
    sentence += `. ${color} is running low on time.`;
  }

  const utter = new SpeechSynthesisUtterance(sentence);
  utter.voice = selectedVoice;
  utter.lang = selectedVoice.lang || selectedLang;
  utter.pitch = 1;
  utter.rate = 1;

  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}
