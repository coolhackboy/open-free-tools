export type Board = string[];

const KNIGHT = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];

export function initialBoard(): Board {
  return ["rnbqkbnr", "pppppppp", "........", "........", "........", "........", "PPPPPPPP", "RNBQKBNR"];
}

export function squareName(row: number, col: number) {
  return `${"abcdefgh"[col]}${8 - row}`;
}

export function parseSquare(square: string): [number, number] {
  return [8 - Number(square[1]), square.charCodeAt(0) - 97];
}

function clone(board: Board): Board {
  return board.slice();
}

function whitePiece(piece: string) {
  return piece !== "." && piece === piece.toUpperCase();
}

function slides(board: Board, row: number, col: number, deltas: number[][], white: boolean) {
  const moves: [number, number][] = [];
  for (const [dr, dc] of deltas) {
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const piece = board[r][c];
      if (piece === ".") moves.push([r, c]);
      else {
        if (whitePiece(piece) !== white) moves.push([r, c]);
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return moves;
}

function pseudo(board: Board, row: number, col: number): [number, number][] {
  const piece = board[row][col];
  if (piece === ".") return [];
  const white = whitePiece(piece);
  const kind = piece.toLowerCase();
  if (kind === "n") {
    return KNIGHT.map(([dr, dc]) => [row + dr, col + dc] as [number, number]).filter(
      ([r, c]) => r >= 0 && r < 8 && c >= 0 && c < 8 && (board[r][c] === "." || whitePiece(board[r][c]) !== white),
    );
  }
  if (kind === "b") return slides(board, row, col, [[1, 1], [1, -1], [-1, 1], [-1, -1]], white);
  if (kind === "r") return slides(board, row, col, [[1, 0], [-1, 0], [0, 1], [0, -1]], white);
  if (kind === "q") return slides(board, row, col, [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]], white);
  if (kind === "k") {
    const moves: [number, number][] = [];
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (!dr && !dc) continue;
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8 && (board[r][c] === "." || whitePiece(board[r][c]) !== white)) moves.push([r, c]);
      }
    }
    return moves;
  }
  const dir = white ? -1 : 1;
  const start = white ? 6 : 1;
  const moves: [number, number][] = [];
  if (board[row + dir]?.[col] === ".") {
    moves.push([row + dir, col]);
    if (row === start && board[row + dir * 2]?.[col] === ".") moves.push([row + dir * 2, col]);
  }
  for (const dc of [-1, 1]) {
    const target = board[row + dir]?.[col + dc];
    if (target && target !== "." && whitePiece(target) !== white) moves.push([row + dir, col + dc]);
  }
  return moves;
}

function kingSquare(board: Board, white: boolean): [number, number] {
  const king = white ? "K" : "k";
  for (let row = 0; row < 8; row += 1) {
    const col = board[row].indexOf(king);
    if (col >= 0) return [row, col];
  }
  return [-1, -1];
}

export function inCheck(board: Board, white: boolean) {
  const [kr, kc] = kingSquare(board, white);
  if (kr < 0) return false;
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (piece === "." || whitePiece(piece) === white) continue;
      if (pseudo(board, row, col).some(([r, c]) => r === kr && c === kc)) return true;
    }
  }
  return false;
}

export function legalMoves(board: Board, row: number, col: number, whiteTurn: boolean): [number, number][] {
  const piece = board[row][col];
  if (piece === "." || whitePiece(piece) !== whiteTurn) return [];
  return pseudo(board, row, col).filter(([r, c]) => {
    const next = place(board, row, col, r, c);
    return !inCheck(next, whiteTurn);
  });
}

function place(board: Board, fromRow: number, fromCol: number, toRow: number, toCol: number): Board {
  const next = clone(board);
  const chars = next[fromRow].split("");
  let piece = chars[fromCol];
  chars[fromCol] = ".";
  next[fromRow] = chars.join("");
  const dest = next[toRow].split("");
  if (piece === "P" && toRow === 0) piece = "Q";
  if (piece === "p" && toRow === 7) piece = "q";
  dest[toCol] = piece;
  next[toRow] = dest.join("");
  return next;
}

export function applyMove(board: Board, from: string, to: string, whiteTurn: boolean): Board | null {
  const [fromRow, fromCol] = parseSquare(from);
  const [toRow, toCol] = parseSquare(to);
  if (!legalMoves(board, fromRow, fromCol, whiteTurn).some(([r, c]) => r === toRow && c === toCol)) return null;
  return place(board, fromRow, fromCol, toRow, toCol);
}
