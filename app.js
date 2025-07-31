const board = document.getElementById("board");
const game = new Chess();
const statusEl = document.getElementById("status");

function renderBoard() {
  board.innerHTML = "";
  const position = game.board();
  position.forEach((row, i) => {
    row.forEach((square, j) => {
      const div = document.createElement("div");
      div.className = "square " + ((i + j) % 2 === 0 ? "light" : "dark");
      if (square) div.textContent = square.type.toUpperCase();
      div.dataset.row = i;
      div.dataset.col = j;
      div.onclick = () => handleSquareClick(i, j);
      board.appendChild(div);
    });
  });
  statusEl.textContent = game.turn() === "w" ? "White's turn" : "Black's turn";
}

let selected = null;

function handleSquareClick(i, j) {
  const square = String.fromCharCode(97 + j) + (8 - i);
  if (!selected) {
    selected = square;
  } else {
    multiplayerMove(selected, square);
    selected = null;
  }
}

renderBoard();
