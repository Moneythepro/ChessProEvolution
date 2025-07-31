let playerColor = null;
let roomRef = null;
let unsubscribe = null;
let playerId = null;
let moveHistory = [];

const db = firebase.firestore();
const auth = firebase.auth(); // fallback if not imported as `auth`
const game = new Chess(); // assume global

const statusEl = document.getElementById("status") || (() => {
  const el = document.createElement("div");
  el.id = "status";
  document.body.appendChild(el);
  return el;
})();

auth.onAuthStateChanged(user => {
  if (user) playerId = user.uid;
});

async function openMultiplayer() {
  const roomId = prompt("Enter Room ID (leave blank to create new):");

  if (!playerId) {
    alert("Please sign in to play multiplayer.");
    return;
  }

  if (!roomId) {
    roomRef = await db.collection("games").add({
      fen: game.fen(),
      turn: "w",
      players: { w: playerId },
      moveHistory: [],
      status: "ongoing",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    playerColor = "w";
    alert("Room created! Share this ID: " + roomRef.id);
  } else {
    roomRef = db.collection("games").doc(roomId);
    const roomSnap = await roomRef.get();

    if (!roomSnap.exists) {
      alert("Room not found!");
      return;
    }

    const data = roomSnap.data();
    if (data.players?.b && data.players?.w && !Object.values(data.players).includes(playerId)) {
      alert("Room already full!");
      return;
    }

    if (data.players.w && !data.players.b) {
      playerColor = "b";
      await roomRef.set({ players: { ...data.players, b: playerId } }, { merge: true });
    } else if (!data.players.w) {
      playerColor = "w";
      await roomRef.set({ players: { ...data.players, w: playerId } }, { merge: true });
    } else {
      playerColor = Object.entries(data.players).find(([_, uid]) => uid === playerId)?.[0];
    }

    alert(`Joined game as ${playerColor === 'w' ? 'White' : 'Black'}.`);
  }

  listenForMoves();
  showMultiplayerControls();
}

function listenForMoves() {
  if (!roomRef) return;

  unsubscribe = roomRef.onSnapshot((doc) => {
    const data = doc.data();
    if (!data) return;

    if (data.fen && data.fen !== game.fen()) {
      game.load(data.fen);
      renderBoard();
    }

    moveHistory = data.moveHistory || [];

    if (data.status === "ended") {
      statusEl.textContent = "Game over. Winner: " + data.winner;
    } else {
      statusEl.textContent = data.turn === playerColor ? "Your move" : "Opponent's move";
    }

    showOpponent(data.players);
  });
}

function multiplayerMove(from, to) {
  if (!roomRef || game.turn() !== playerColor) return;

  const move = game.move({ from, to, promotion: "q" });
  if (!move) return;

  renderBoard();
  moveHistory.push(`${from}-${to}`);

  const isCheckmate = game.in_checkmate();
  const isDraw = game.in_draw();
  const winner = isCheckmate
    ? (game.turn() === "w" ? "Black" : "White")
    : isDraw ? "Draw" : null;

  const updates = {
    fen: game.fen(),
    turn: game.turn(),
    moveHistory,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (winner) {
    updates.status = "ended";
    updates.winner = winner;
  }

  roomRef.set(updates, { merge: true });
}

function showOpponent(players) {
  const opponentId = Object.entries(players).find(([_, uid]) => uid !== playerId)?.[1];
  const status = document.getElementById("userStatus") || (() => {
    const el = document.createElement("div");
    el.id = "userStatus";
    document.body.appendChild(el);
    return el;
  })();

  if (opponentId && !status.textContent.includes(opponentId)) {
    status.textContent += ` | Opponent: ${opponentId}`;
  }
}

function leaveGame() {
  if (unsubscribe) unsubscribe();
  roomRef = null;
  playerColor = null;
  moveHistory = [];

  game.reset();
  renderBoard();
  statusEl.textContent = "Left multiplayer game.";

  document.getElementById("leaveBtn")?.remove();
  document.getElementById("rematchBtn")?.remove();
}

function requestRematch() {
  if (!roomRef) return;
  game.reset();
  moveHistory = [];

  roomRef.set({
    fen: game.fen(),
    turn: "w",
    moveHistory,
    status: "ongoing"
  }, { merge: true });

  renderBoard();
}

function showMultiplayerControls() {
  const controls = document.getElementById("controls") || (() => {
    const el = document.createElement("div");
    el.id = "controls";
    document.body.appendChild(el);
    return el;
  })();

  if (!document.getElementById("leaveBtn")) {
    const leaveBtn = document.createElement("button");
    leaveBtn.textContent = "Leave Game";
    leaveBtn.id = "leaveBtn";
    leaveBtn.onclick = leaveGame;
    controls.appendChild(leaveBtn);
  }

  if (!document.getElementById("rematchBtn")) {
    const rematchBtn = document.createElement("button");
    rematchBtn.textContent = "Rematch";
    rematchBtn.id = "rematchBtn";
    rematchBtn.onclick = requestRematch;
    controls.appendChild(rematchBtn);
  }
}
