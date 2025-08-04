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

    // Always allow move, no legality check
    this.chess.remove(from);
    this.chess.put({ type: promotion || piece.type, color: piece.color }, to);
    this._swapTurn();

    return {
      from,
      to,
      color: piece.color,
      piece: piece.type,
      promotion: promotion || undefined,
      flags: this.chess.get(to) ? "c" : "", // capture flag if any
    };
  }

  moves({ square, verbose }) {
    const piece = this.chess.get(square);
    if (!piece || piece.color !== this.turn()) return [];

    // Allow movement to any empty or enemy-occupied square (excluding king overlap)
    const all = [];

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const to = "abcdefgh"[j] + (8 - i);
        if (to === square) continue;
        const target = this.chess.get(to);
        if (!target || target.color !== piece.color) {
          all.push(verbose ? { from: square, to } : to);
        }
      }
    }

    return all;
  }

  in_check() {
    return false;
  }

  in_checkmate() {
    return false;
  }

  in_draw() {
    return this.chess.in_draw();
  }

  game_over() {
    return false;
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
