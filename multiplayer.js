let playerColor = null;
let roomRef = null;
let unsubscribe = null;
let playerId = null;
let moveHistory = [];

const db = firebase.firestore();
const statusEl = document.getElementById("status");
const game = new Chess(); // Ensure chess.js is loaded before this

// Get user ID
auth.onAuthStateChanged(user => {
  if (user) {
    playerId = user.uid;
  }
});

// Open or create a multiplayer game
async function openMultiplayer() {
  const roomId = prompt("Enter Room ID (leave blank to create new):");

  if (!playerId) {
    alert("Please sign in to play multiplayer.");
    return;
  }

  if (!roomId) {
    // Create a new room
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
    // Join an existing room
    roomRef = db.collection("games").doc(roomId);
    const roomSnap = await roomRef.get();

    if (!roomSnap.exists) {
      alert("Room not found!");
      return;
    }

    const data = roomSnap.data();
    if (data.players.b) {
      alert("Room already full!");
      return;
    }

    await roomRef.set({
      players: { ...data.players, b: playerId }
    }, { merge: true });

    playerColor = "b";
    alert("Joined game as Black.");
  }

  listenForMoves();
  showMultiplayerControls();
}

// Realtime sync with Firebase
function listenForMoves() {
  if (!roomRef) return;

  unsubscribe = roomRef.onSnapshot((doc) => {
    const data = doc.data();
    if (!data) return;

    if (data.fen !== game.fen()) {
      game.load(data.fen);
      renderBoard();
    }

    if (data.moveHistory) moveHistory = data.moveHistory;

    if (data.turn === playerColor) {
      statusEl.textContent = "Your move";
    } else {
      statusEl.textContent = "Opponent's move";
    }

    if (data.status === "ended") {
      statusEl.textContent = "Game over. Winner: " + data.winner;
    }

    showOpponent(data.players);
  });
}

// Make a multiplayer move
function multiplayerMove(from, to) {
  if (!roomRef) return;
  if (game.turn() !== playerColor) return;

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

// Show opponent's UID
function showOpponent(players) {
  const opponentId = Object.entries(players).find(([color, uid]) => uid !== playerId)?.[1];
  const status = document.getElementById("userStatus");

  if (opponentId && !status.textContent.includes("Opponent:")) {
    status.textContent += ` | Opponent: ${opponentId}`;
  }
}

// Leave game
function leaveGame() {
  if (unsubscribe) unsubscribe();
  roomRef = null;
  playerColor = null;
  isMultiplayer = false;

  game.reset();
  renderBoard();
  statusEl.textContent = "Left multiplayer game.";

  document.getElementById("leaveBtn")?.remove();
  document.getElementById("rematchBtn")?.remove();
}

// Request a rematch
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

// Show "Leave" and "Rematch" buttons
function showMultiplayerControls() {
  const controls = document.getElementById("controls");

  if (!document.getElementById("leaveBtn") && !document.getElementById("rematchBtn")) {
    const leaveBtn = document.createElement("button");
    leaveBtn.textContent = "Leave Game";
    leaveBtn.id = "leaveBtn";
    leaveBtn.onclick = leaveGame;
    controls.appendChild(leaveBtn);

    const rematchBtn = document.createElement("button");
    rematchBtn.textContent = "Rematch";
    rematchBtn.id = "rematchBtn";
    rematchBtn.onclick = requestRematch;
    controls.appendChild(rematchBtn);
  }
}
