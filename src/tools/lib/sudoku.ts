export type SudokuBoard = number[][];

function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function emptyBoard(): SudokuBoard {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

export function isValidPlacement(board: SudokuBoard, row: number, col: number, value: number) {
  for (let i = 0; i < 9; i += 1) {
    if (board[row][i] === value || board[i][col] === value) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      if (board[boxRow + r][boxCol + c] === value) return false;
    }
  }
  return true;
}

function findEmpty(board: SudokuBoard): [number, number] | null {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] === 0) return [row, col];
    }
  }
  return null;
}

export function solveSudoku(board: SudokuBoard): SudokuBoard | null {
  const copy = board.map((row) => [...row]);
  const walk = (): boolean => {
    const empty = findEmpty(copy);
    if (!empty) return true;
    const [row, col] = empty;
    for (let value = 1; value <= 9; value += 1) {
      if (!isValidPlacement(copy, row, col, value)) continue;
      copy[row][col] = value;
      if (walk()) return true;
      copy[row][col] = 0;
    }
    return false;
  };
  return walk() ? copy : null;
}

const TEMPLATE_SOLUTION: SudokuBoard = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

const TEMPLATE_PUZZLE: SudokuBoard = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

function mapBoard(board: SudokuBoard, mapValue: (value: number) => number, rowOrder: number[], colOrder: number[]) {
  return rowOrder.map((row) => colOrder.map((col) => mapValue(board[row][col])));
}

export function createPuzzle(seed: number): { puzzle: SudokuBoard; solution: SudokuBoard } {
  const random = rng(seed);
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
  const mapValue = (value: number) => (value ? digits[value - 1] : 0);
  const band = shuffle([0, 1, 2], random).flatMap((group) => shuffle([0, 1, 2], random).map((offset) => group * 3 + offset));
  const stack = shuffle([0, 1, 2], random).flatMap((group) => shuffle([0, 1, 2], random).map((offset) => group * 3 + offset));
  return {
    puzzle: mapBoard(TEMPLATE_PUZZLE, mapValue, band, stack),
    solution: mapBoard(TEMPLATE_SOLUTION, mapValue, band, stack),
  };
}

export function boardConflicts(board: SudokuBoard): boolean[][] {
  const marks = Array.from({ length: 9 }, () => Array(9).fill(false));
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = board[row][col];
      if (!value) continue;
      board[row][col] = 0;
      if (!isValidPlacement(board, row, col, value)) marks[row][col] = true;
      board[row][col] = value;
    }
  }
  return marks;
}

export function findHint(board: SudokuBoard, solution: SudokuBoard): { row: number; col: number; value: number } | null {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] === 0) return { row, col, value: solution[row][col] };
    }
  }
  return null;
}

export function dailySeed(date = new Date()): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}
