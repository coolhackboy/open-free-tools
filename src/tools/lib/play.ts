/** Pure logic for the small games and tests added in the 2026-10 batch. */

export type Cell = "X" | "O" | null;

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

export function tttWinner(board: Cell[]): { winner: "X" | "O" | "draw" | null; line: number[] | null } {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { winner: board[a] as "X" | "O", line };
  }
  return { winner: board.every(Boolean) ? "draw" : null, line: null };
}

function minimax(board: Cell[], turn: "X" | "O", me: "X" | "O", depth: number): number {
  const { winner } = tttWinner(board);
  if (winner === me) return 10 - depth;
  if (winner === "draw") return 0;
  if (winner) return depth - 10;
  const scores: number[] = [];
  board.forEach((cell, index) => {
    if (cell) return;
    board[index] = turn;
    scores.push(minimax(board, turn === "X" ? "O" : "X", me, depth + 1));
    board[index] = null;
  });
  return turn === me ? Math.max(...scores) : Math.min(...scores);
}

/** Best move for `me`. level "easy" picks randomly half the time using the given random source. */
export function tttBestMove(board: Cell[], me: "X" | "O", level: "easy" | "hard" = "hard", random: () => number = Math.random) {
  const open = board.map((cell, index) => (cell ? -1 : index)).filter((index) => index >= 0);
  if (!open.length) return -1;
  if (level === "easy" && random() < 0.5) return open[Math.floor(random() * open.length)];
  let best = -Infinity;
  let move = open[0];
  for (const index of open) {
    const next = board.slice();
    next[index] = me;
    const score = minimax(next, me === "X" ? "O" : "X", me, 1);
    if (score > best) {
      best = score;
      move = index;
    }
  }
  return move;
}

export function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export const MEMORY_FACES = ["🍎", "🚀", "🎧", "🌵", "🐙", "⚽", "🎲", "🌙", "🍩", "🦊", "🎈", "🔔"];

export type MemoryCard = { id: number; face: string; open: boolean; done: boolean };

export function memoryDeck(pairs: number, seed: number): MemoryCard[] {
  const faces = MEMORY_FACES.slice(0, Math.max(2, Math.min(MEMORY_FACES.length, pairs)));
  const cards = [...faces, ...faces];
  const random = seeded(seed);
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [cards[index], cards[swap]] = [cards[swap], cards[index]];
  }
  return cards.map((face, id) => ({ id, face, open: false, done: false }));
}

/**
 * Flip one card. Returns the next deck and whether two unmatched cards are now showing
 * (the UI closes them after a short delay with memoryCloseOpen).
 */
export function memoryFlip(deck: MemoryCard[], id: number) {
  const card = deck[id];
  if (!card || card.open || card.done) return { deck, pending: false, moved: false };
  const showing = deck.filter((item) => item.open && !item.done);
  if (showing.length >= 2) return { deck, pending: true, moved: false };
  const next = deck.map((item) => (item.id === id ? { ...item, open: true } : item));
  const opened = next.filter((item) => item.open && !item.done);
  if (opened.length === 2) {
    if (opened[0].face === opened[1].face) {
      return { deck: next.map((item) => (item.open && !item.done ? { ...item, done: true } : item)), pending: false, moved: true };
    }
    return { deck: next, pending: true, moved: true };
  }
  return { deck: next, pending: false, moved: false };
}

export function memoryCloseOpen(deck: MemoryCard[]) {
  return deck.map((item) => (item.open && !item.done ? { ...item, open: false } : item));
}

export function reactionStats(times: number[]) {
  if (!times.length) return null;
  const sorted = [...times].sort((a, b) => a - b);
  const average = times.reduce((sum, value) => sum + value, 0) / times.length;
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return { average, median, best: sorted[0], worst: sorted[sorted.length - 1] };
}

/** Plates for the color vision screening. "figure"/"ground" are palettes of similar-lightness colors. */
export type Plate = { answer: string; figure: string[]; ground: string[]; kind: "control" | "red-green" | "blue-yellow" };

export const PLATES: Plate[] = [
  { answer: "12", kind: "control", figure: ["#4a4a4a", "#5a5a5a", "#3c3c3c"], ground: ["#d9d4c7", "#e6e0d2", "#cfc8b8"] },
  { answer: "8", kind: "red-green", figure: ["#e0875a", "#d9734f", "#e89a68", "#cf6b45"], ground: ["#9aa84f", "#a7b25d", "#8e9c48", "#b3b866"] },
  { answer: "29", kind: "red-green", figure: ["#d26f4f", "#c9634a", "#dc7f58"], ground: ["#8fa35a", "#9cae63", "#86984f", "#a7b56e"] },
  { answer: "5", kind: "red-green", figure: ["#c46a3d", "#d07a47", "#b95f36"], ground: ["#7f9a4b", "#8ca556", "#759044", "#98ad60"] },
  { answer: "74", kind: "red-green", figure: ["#e3925f", "#d98455", "#eaa06b"], ground: ["#a3ad55", "#b0b862", "#96a24c", "#bcc06c"] },
  { answer: "3", kind: "red-green", figure: ["#cc7a62", "#c26d58", "#d6886d"], ground: ["#8ea07a", "#9aab85", "#82946f", "#a5b48f"] },
  { answer: "45", kind: "red-green", figure: ["#b9805f", "#c48c69", "#ad7455"], ground: ["#8d9a62", "#99a56c", "#828f58", "#a3ae75"] },
  { answer: "6", kind: "blue-yellow", figure: ["#7f95c9", "#8aa0d2", "#7489bf"], ground: ["#a9b17c", "#b5bc86", "#9da672", "#c0c690"] },
];

export function scorePlates(answers: string[]) {
  let control = true;
  let redGreenMiss = 0;
  let blueYellowMiss = 0;
  PLATES.forEach((plate, index) => {
    const ok = (answers[index] ?? "").trim() === plate.answer;
    if (plate.kind === "control" && !ok) control = false;
    if (plate.kind === "red-green" && !ok) redGreenMiss += 1;
    if (plate.kind === "blue-yellow" && !ok) blueYellowMiss += 1;
  });
  const redGreenTotal = PLATES.filter((plate) => plate.kind === "red-green").length;
  const correct = PLATES.filter((plate, index) => (answers[index] ?? "").trim() === plate.answer).length;
  const result = !control ? "unclear" : redGreenMiss >= 2 ? "red-green" : blueYellowMiss >= 1 ? "blue-yellow" : "typical";
  return { correct, total: PLATES.length, redGreenMiss, redGreenTotal, blueYellowMiss, result } as const;
}
