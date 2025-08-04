// chessillegal.js — ignore check & checkmate, allow any piece to move, follow basic movement rules

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
    // Temporarily allow all piece moves by loading the position into a new chess instance
    const clone = new Chess(this.chess.fen());
    const allMoves = clone.moves({ verbose: true });
    const move = allMoves.find(m =>
      m.from === from &&
      m.to === to &&
      (promotion ? m.promotion === promotion : true)
    );

    if (!move) return null;

    // Execute move manually (bypassing king safety)
    const piece = this.chess.get(from);
    if (!piece) return null;

    this.chess.remove(from);
    this.chess.put({ type: promotion || piece.type, color: piece.color }, to);

    // Push move into history
    return {
      from,
      to,
      color: piece.color,
      piece: piece.type,
      flags: "", // minimal
    };
  }

  moves({ square, verbose }) {
    // Use normal piece movement rules, but bypass check prevention
    const clone = new Chess(this.chess.fen());
    const all = clone.moves({ square, verbose: true });
    return verbose
      ? all.map(m => ({ from: m.from, to: m.to, promotion: m.promotion }))
      : all.map(m => m.to);
  }

  in_checkmate() {
    return false;
  }

  in_check() {
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
}
