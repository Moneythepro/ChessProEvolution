// chessillegal.js — allows illegal moves in PvP mode only

class IllegalChess {
  constructor() {
    this.board = this.defaultBoard();
    this.turnColor = "w";
    this.history = [];
  }

  defaultBoard() {
    return new Chess().board(); // Start from valid initial position
  }

  turn() {
    return this.turnColor;
  }

  get(square) {
    const file = square.charCodeAt(0) - 97;
    const rank = 8 - parseInt(square[1]);
    return this.board[rank][file];
  }

  move({ from, to, promotion }) {
    const fromFile = from.charCodeAt(0) - 97;
    const fromRank = 8 - parseInt(from[1]);
    const toFile = to.charCodeAt(0) - 97;
    const toRank = 8 - parseInt(to[1]);

    const piece = this.board[fromRank][fromFile];
    if (!piece) return null;

    this.board[toRank][toFile] = {
      type: promotion || piece.type,
      color: piece.color,
    };
    this.board[fromRank][fromFile] = null;

    const move = { from, to, color: piece.color, piece: piece.type, flags: "" };
    this.history.push(move);

    this.turnColor = this.turnColor === "w" ? "b" : "w";
    return move;
  }

  in_checkmate() {
    return false; // No checkmate in illegal mode
  }

  in_check() {
    return false; // Ignore check
  }

  in_draw() {
    return false; // No draw logic
  }

  game_over() {
    return false; // Game never ends unless manually
  }

  moves({ square, verbose }) {
    // Show all squares for any piece to move (very permissive)
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        moves.push(verbose
          ? { from: square, to: "abcdefgh"[f] + (8 - r) }
          : "abcdefgh"[f] + (8 - r));
      }
    }
    return moves;
  }

  board() {
    return this.board;
  }
}
