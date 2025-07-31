// multiplayer.js
const db = firebase.firestore();
let roomId = null;
let unsubscribe = null;

// Start or join a game room
function openMultiplayer() {
  const input = prompt("Enter Room ID (or leave empty to create one):");
  if (input) {
    joinRoom(input);
  } else {
    createRoom();
  }
}

async function createRoom() {
  const roomRef = await db.collection("games").add({
    fen: game.fen(),
    turn: game.turn(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  roomId = roomRef.id;
  alert(`Room created! Share this ID: ${roomId}`);
  listenToRoom(roomId);
}

function joinRoom(id) {
  db.collection("games").doc(id).get().then((doc) => {
    if (doc.exists) {
      roomId = id;
      const data = doc.data();
      game.load(data.fen);
      updateBoardUI();
      listenToRoom(roomId);
      alert("Joined game!");
    } else {
      alert("Room not found!");
    }
  });
}

function listenToRoom(id) {
  unsubscribe = db.collection("games").doc(id).onSnapshot((doc) => {
    if (!doc.exists) return;
    const data = doc.data();
    if (data.fen !== game.fen()) {
      game.load(data.fen);
      updateBoardUI();
    }
  });
}

function sendMoveToRoom() {
  if (!roomId) return;
  db.collection("games").doc(roomId).update({
    fen: game.fen(),
    turn: game.turn(),
  });
}

// You can call this after every move
function makeMove(from, to) {
  const move = game.move({ from, to, promotion: 'q' });
  if (move) {
    updateBoardUI();
    sendMoveToRoom();
  }
}
