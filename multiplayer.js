// multiplayer.js

let playerColor = null;
let roomRef = null;
let unsubscribe = null;

async function openMultiplayer() {
  const roomId = prompt("Enter Room ID (leave blank to create new):");

  if (!roomId) {
    // Create new game
    roomRef = await db.collection("games").add({
      fen: game.fen(),
      turn: "w",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    playerColor = "w";
    alert("Room created! Share this ID: " + roomRef.id);
  } else {
    // Join existing game
    roomRef = db.collection("games").doc(roomId);
    const roomSnap = await roomRef.get();

    if (!roomSnap.exists) {
      alert("Room not found!");
      return;
    }

    playerColor = "b";
    alert("Joined game as Black.");
  }

  listenForMoves();
}

function listenForMoves() {
  if (!roomRef) return;

  unsubscribe = roomRef.onSnapshot((doc) => {
    const data = doc.data();
    if (!data) return;

    const currentFen = game.fen();
    if (currentFen !== data.fen) {
      game.load(data.fen);
      updateBoard(); // custom function that redraws the board
    }

    // Handle turn indicator
    if (data.turn === playerColor) {
      statusText.textContent = "Your move";
    } else {
      statusText.textContent = "Opponent's move";
    }
  });
}

function multiplayerMove(from, to) {
  if (!roomRef || game.turn() !== playerColor) return;

  const move = game.move({ from, to, promotion: "q" });

  if (move) {
    updateBoard();
    roomRef.set({
      fen: game.fen(),
      turn: game.turn(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
}
