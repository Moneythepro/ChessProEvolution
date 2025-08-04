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

    const legal = new Chess(this.chess.fen()).moves({ square: from, verbose: true });
    const validMove = legal.find(m => m.to === to && (promotion ? m.promotion === promotion : true));

    if (!validMove) return null;

    const captured = this.chess.get(to);

    // If it's a pawn reaching last rank, require promotion
    const isPromotion = piece.type === "p" && (to.endsWith("8") || to.endsWith("1"));
    const finalType = isPromotion ? (promotion || "q") : piece.type;

    this.chess.remove(from);
    this.chess.put({ type: finalType, color: piece.color }, to);

    // Check if king was captured
    if (captured?.type === "k") this._kingCaptured = true;

    this._swapTurn();

    return {
      from,
      to,
      color: piece.color,
      piece: piece.type,
      promotion: isPromotion ? finalType : undefined,
      flags: captured ? "c" : "",
    };
  }

  moves({ square, verbose }) {
    const piece = this.chess.get(square);
    if (!piece || piece.color !== this.turn()) return [];

    const legal = new Chess(this.chess.fen()).moves({ square, verbose: true });

    return verbose
      ? legal.map(m => ({ from: m.from, to: m.to, promotion: m.promotion }))
      : legal.map(m => m.to);
  }

  in_check() {
    return false; // Always false — no check logic
  }

  in_checkmate() {
    return false; // Ignored
  }

  in_draw() {
    return this.chess.in_draw();
  }

  game_over() {
    // Custom: if a king is missing, game ends
    const board = this.chess.board();
    let whiteKing = false;
    let blackKing = false;

    for (const row of board) {
      for (const cell of row) {
        if (cell?.type === "k") {
          if (cell.color === "w") whiteKing = true;
          if (cell.color === "b") blackKing = true;
        }
      }
    }

    return !whiteKing || !blackKing || this.chess.in_draw();
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
