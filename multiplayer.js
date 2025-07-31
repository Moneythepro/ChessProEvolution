let playerColor = null;
let roomRef = null;
let unsubscribe = null;
let playerId = null;
let moveHistory = [];

const db = firebase.firestore();

// Helper to get UID/email
auth.onAuthStateChanged(user => {
  if (user) {
    playerId = user.uid;
  }
});

// Open/create multiplayer room
async function openMultiplayer() {
  const roomId = prompt("Enter Room ID (leave blank to create new):");

  if (!playerId) {
    alert("Please sign in to play multiplayer.");
    return;
  }

  if (!roomId) {
    // Create new game
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
    // Join existing room
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

// Listen for board updates
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

    // Turn logic
    if (data.turn === playerColor) {
      statusEl.textContent = "Your move";
    } else {
      statusEl.textContent = "Opponent's move";
    }

    // Game end
    if (data.status === "ended") {
      statusEl.textContent = "Game over. Winner: " + data.winner;
    }

    // Show opponent UID
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

  roomRef.set({
    fen: game.fen(),
    turn: game.turn(),
    moveHistory,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  // Check for game end
  if (game.in_checkmate() || game.in_draw()) {
    roomRef.set({
      status: "ended",
      winner: game.in_checkmate() ? (playerColor === "w" ? "White" : "Black") : "Draw"
    }, { merge: true });
  }
}

// Show opponent info
function showOpponent(players) {
  const opponentId = Object.entries(players).find(([color, uid]) => uid !== playerId)?.[1];
  if (opponentId) {
    document.getElementById("userStatus").textContent += ` | Opponent: ${opponentId}`;
  }
}

// Leave current room
function leaveGame() {
  if (unsubscribe) unsubscribe();
  roomRef = null;
  playerColor = null;
  isMultiplayer = false;
  alert("Left the multiplayer game.");
  renderBoard();
}

// Ask for rematch (resets board)
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

// Extra multiplayer buttons
function showMultiplayerControls() {
  const controls = document.getElementById("controls");
  if (!document.getElementById("leaveBtn")) {
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
