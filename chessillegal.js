// chessillegal.js — ignore check & checkmate, allow any piece to move, keep movement rules

class IllegalChess {
  constructor() {
    this.chess = new Chess(); // Use real rules, but override check logic
  }

  turn() {
    return this.chess.turn();
  }

  get(square) {
    return this.chess.get(square);
  }

  move({ from, to, promotion }) {
    const legalMoves = this.chess.moves({ square: from, verbose: true });

    // ✅ Allow any legal piece move, even if king is in check (ignore check rules)
    const move = legalMoves.find(m => m.to === to && (promotion ? m.promotion === promotion : true));
    if (move) {
      return this.chess.move({ from, to, promotion });
    }

    return null; // Illegal based on movement rules
  }

  // 🚫 Disable check-related rules
  in_checkmate() {
    return false;
  }

  in_check() {
    return false;
  }

  in_draw() {
    return this.chess.in_draw(); // Optional: keep draw by repetition/stalemate
  }

  game_over() {
    return false; // Never force game over by checkmate
  }

  moves(opts) {
    return this.chess.moves(opts); // Return standard piece movement options
  }

  board() {
    return this.chess.board();
  }

  fen() {
    return this.chess.fen();
  }
}
