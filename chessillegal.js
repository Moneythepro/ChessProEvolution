class IllegalChess {
  constructor() {
    this.chess = new Chess();
  }

  turn() {
    return this.chess.turn();
  }

  get(square) {
    return this.chess.get(square);
  }

  move({ from, to, promotion }) {
    const piece = this.chess.get(from);
    if (!piece || piece.color !== this.turn()) return null;

    const captured = this.chess.get(to); // Check capture before placing

    // Move the piece manually
    this.chess.remove(from);
    this.chess.put({ type: promotion || piece.type, color: piece.color }, to);

    // Swap turn manually
    this._swapTurn();

    return {
      from,
      to,
      color: piece.color,
      piece: piece.type,
      promotion: promotion || undefined,
      flags: captured ? "c" : "",
    };
  }

  moves({ square, verbose }) {
    const piece = this.chess.get(square);
    if (!piece || piece.color !== this.turn()) return [];

    const validMoves = [];

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const to = "abcdefgh"[j] + (8 - i);
        if (to === square) continue;

        const target = this.chess.get(to);
        if (!target || target.color !== piece.color) {
          validMoves.push(
            verbose ? { from: square, to, promotion: "q" } : to
          );
        }
      }
    }

    return validMoves;
  }

  // Override check functions: always false
  in_check() {
    return false;
  }

  in_checkmate() {
    const currentTurn = this.chess.turn();
    const tempChess = new Chess(this.chess.fen());

    const moves = tempChess.moves({ verbose: true });
    if (moves.length === 0 && tempChess.in_check()) return true;

    return false;
  }

  in_draw() {
    return this.chess.in_draw();
  }

  game_over() {
    return this.in_checkmate() || this.in_draw();
  }

  board() {
    return this.chess.board();
  }

  fen() {
    return this.chess.fen();
  }

  _swapTurn() {
    const parts = this.chess.fen().split(" ");
    parts[1] = parts[1] === "w" ? "b" : "w";
    this.chess.load(parts.join(" "));
  }
}
