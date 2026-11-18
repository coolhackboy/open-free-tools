import { useEffect, useRef, useState } from "react";
import type { FreeTool } from "@/tools/catalog";
import { toolMode } from "@/tools/catalog";
import { applyMove, initialBoard, legalMoves, parseSquare, squareName, type Board } from "@/tools/lib/chess";
import { ActionButton, ResultText, ToolPanel, tx } from "@/tools/controls";

type Props = { tool: FreeTool; locale: string };

const ELEMENTS = `
1 H Hydrogen 1 1
2 He Helium 18 1
3 Li Lithium 1 2
4 Be Beryllium 2 2
5 B Boron 13 2
6 C Carbon 14 2
7 N Nitrogen 15 2
8 O Oxygen 16 2
9 F Fluorine 17 2
10 Ne Neon 18 2
11 Na Sodium 1 3
12 Mg Magnesium 2 3
13 Al Aluminium 13 3
14 Si Silicon 14 3
15 P Phosphorus 15 3
16 S Sulfur 16 3
17 Cl Chlorine 17 3
18 Ar Argon 18 3
19 K Potassium 1 4
20 Ca Calcium 2 4
21 Sc Scandium 3 4
22 Ti Titanium 4 4
23 V Vanadium 5 4
24 Cr Chromium 6 4
25 Mn Manganese 7 4
26 Fe Iron 8 4
27 Co Cobalt 9 4
28 Ni Nickel 10 4
29 Cu Copper 11 4
30 Zn Zinc 12 4
31 Ga Gallium 13 4
32 Ge Germanium 14 4
33 As Arsenic 15 4
34 Se Selenium 16 4
35 Br Bromine 17 4
36 Kr Krypton 18 4
37 Rb Rubidium 1 5
38 Sr Strontium 2 5
39 Y Yttrium 3 5
40 Zr Zirconium 4 5
41 Nb Niobium 5 5
42 Mo Molybdenum 6 5
43 Tc Technetium 7 5
44 Ru Ruthenium 8 5
45 Rh Rhodium 9 5
46 Pd Palladium 10 5
47 Ag Silver 11 5
48 Cd Cadmium 12 5
49 In Indium 13 5
50 Sn Tin 14 5
51 Sb Antimony 15 5
52 Te Tellurium 16 5
53 I Iodine 17 5
54 Xe Xenon 18 5
55 Cs Caesium 1 6
56 Ba Barium 2 6
57 La Lanthanum 3 9
58 Ce Cerium 4 9
59 Pr Praseodymium 5 9
60 Nd Neodymium 6 9
61 Pm Promethium 7 9
62 Sm Samarium 8 9
63 Eu Europium 9 9
64 Gd Gadolinium 10 9
65 Tb Terbium 11 9
66 Dy Dysprosium 12 9
67 Ho Holmium 13 9
68 Er Erbium 14 9
69 Tm Thulium 15 9
70 Yb Ytterbium 16 9
71 Lu Lutetium 17 9
72 Hf Hafnium 4 6
73 Ta Tantalum 5 6
74 W Tungsten 6 6
75 Re Rhenium 7 6
76 Os Osmium 8 6
77 Ir Iridium 9 6
78 Pt Platinum 10 6
79 Au Gold 11 6
80 Hg Mercury 12 6
81 Tl Thallium 13 6
82 Pb Lead 14 6
83 Bi Bismuth 15 6
84 Po Polonium 16 6
85 At Astatine 17 6
86 Rn Radon 18 6
87 Fr Francium 1 7
88 Ra Radium 2 7
89 Ac Actinium 3 10
90 Th Thorium 4 10
91 Pa Protactinium 5 10
92 U Uranium 6 10
93 Np Neptunium 7 10
94 Pu Plutonium 8 10
95 Am Americium 9 10
96 Cm Curium 10 10
97 Bk Berkelium 11 10
98 Cf Californium 12 10
99 Es Einsteinium 13 10
100 Fm Fermium 14 10
101 Md Mendelevium 15 10
102 No Nobelium 16 10
103 Lr Lawrencium 17 10
104 Rf Rutherfordium 4 7
105 Db Dubnium 5 7
106 Sg Seaborgium 6 7
107 Bh Bohrium 7 7
108 Hs Hassium 8 7
109 Mt Meitnerium 9 7
110 Ds Darmstadtium 10 7
111 Rg Roentgenium 11 7
112 Cn Copernicium 12 7
113 Nh Nihonium 13 7
114 Fl Flerovium 14 7
115 Mc Moscovium 15 7
116 Lv Livermorium 16 7
117 Ts Tennessine 17 7
118 Og Oganesson 18 7
`.trim().split("\n").map((line) => {
  const [n, s, name, col, row] = line.split(" ");
  return { n: Number(n), s, name, col: Number(col), row: Number(row) };
});

function blankGrid() {
  return [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}

function slideLine(line: number[]) {
  const compact = line.filter(Boolean);
  const next: number[] = [];
  let score = 0;
  for (let i = 0; i < compact.length; i += 1) {
    if (compact[i] === compact[i + 1]) {
      next.push(compact[i] * 2);
      score += compact[i] * 2;
      i += 1;
    } else next.push(compact[i]);
  }
  while (next.length < 4) next.push(0);
  return { line: next, score };
}

function move2048(cells: number[], direction: "left" | "right" | "up" | "down") {
  const rows = [0, 1, 2, 3].map((row) => [0, 1, 2, 3].map((col) => cells[row * 4 + col]));
  let score = 0;
  const apply = (lines: number[][]) => lines.map((line) => {
    const moved = slideLine(line);
    score += moved.score;
    return moved.line;
  });
  let next = rows;
  if (direction === "left") next = apply(rows);
  if (direction === "right") next = apply(rows.map((row) => row.slice().reverse())).map((row) => row.reverse());
  if (direction === "up" || direction === "down") {
    const cols = [0, 1, 2, 3].map((col) => rows.map((row) => row[col]));
    const moved = direction === "up" ? apply(cols) : apply(cols.map((col) => col.slice().reverse())).map((col) => col.reverse());
    next = [0, 1, 2, 3].map((row) => [0, 1, 2, 3].map((col) => moved[col][row]));
  }
  const flat = next.flat();
  const empty = flat.findIndex((value) => value === 0);
  if (empty >= 0) flat[empty] = 2;
  return { cells: flat, score };
}

type Card = { r: number; s: number };
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dealSolitaire(seed = 1) {
  const cards: Card[] = [];
  for (let s = 0; s < 4; s += 1) for (let r = 1; r <= 13; r += 1) cards.push({ r, s });
  const random = mulberry32(seed);
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  const tableau: Card[][] = [];
  for (let pile = 0; pile < 7; pile += 1) tableau.push(cards.splice(0, pile + 1));
  return { tableau, stock: cards, waste: [] as Card[], foundation: [[], [], [], []] as Card[][] };
}

function cardLabel(card?: Card) {
  return card ? `${RANKS[card.r]}${SUITS[card.s]}` : "·";
}

export function GameTool({ tool, locale }: Props) {
  const mode = toolMode(tool);
  const [result, setResult] = useState("");
  const [cells, setCells] = useState(blankGrid);
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState<Board>(initialBoard);
  const [white, setWhite] = useState(true);
  const [selected, setSelected] = useState("");
  const [covered, setCovered] = useState(() => Array(81).fill(true));
  const [mines, setMines] = useState<boolean[] | null>(null);
  const [flags, setFlags] = useState(() => Array(81).fill(false));
  const [element, setElement] = useState(ELEMENTS[0]);
  const [solitaire, setSolitaire] = useState(() => dealSolitaire());
  const [snake, setSnake] = useState({ body: [[8, 8]], dir: [1, 0] as [number, number], food: [12, 8], score: 0, alive: true });
  const dropRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (mode !== "snake" || !snake.alive || result === "") return undefined;
    const id = window.setInterval(() => {
      setSnake((current) => {
        if (!current.alive) return current;
        const [dx, dy] = current.dir;
        const head = [current.body[0][0] + dx, current.body[0][1] + dy];
        if (head[0] < 0 || head[1] < 0 || head[0] > 15 || head[1] > 15 || current.body.some((part) => part[0] === head[0] && part[1] === head[1])) {
          return { ...current, alive: false };
        }
        const eat = head[0] === current.food[0] && head[1] === current.food[1];
        const body = [head, ...current.body];
        if (!eat) body.pop();
        return { ...current, body, score: current.score + (eat ? 1 : 0), food: eat ? [(head[0] + 5) % 16, (head[1] + 3) % 16] : current.food };
      });
    }, 220);
    return () => window.clearInterval(id);
  }, [mode, result, snake.alive]);

  function run() {
    if (mode === "2048") {
      const moved = move2048(cells, "left");
      setCells(moved.cells);
      setScore((current) => current + moved.score);
      setResult(`Score ${score + moved.score}`);
      return;
    }
    if (mode === "chess") {
      const next = applyMove(board, "e2", "e4", white);
      if (!next) {
        setResult("That move is not legal.");
        return;
      }
      setBoard(next);
      setWhite(false);
      setResult("Black to move");
      return;
    }
    if (mode === "mines") {
      reveal(0);
      return;
    }
    if (mode === "periodic") {
      const hydrogen = ELEMENTS[0];
      setElement(hydrogen);
      setResult(`${hydrogen.name} · ${hydrogen.n}`);
      return;
    }
    if (mode === "solitaire") {
      setSolitaire((current) => {
        if (!current.stock.length) return current;
        const [card, ...stock] = current.stock;
        setResult(`Drew ${cardLabel(card)}. Stock ${stock.length}`);
        return { ...current, stock, waste: [card, ...current.waste] };
      });
      return;
    }
    if (mode === "snake") {
      setSnake({ body: [[8, 8], [7, 8]], dir: [1, 0], food: [12, 8], score: 0, alive: true });
      setResult("Score 0");
      return;
    }
    if (mode === "blocks") {
      dropRef.current?.();
      return;
    }
    setResult("Score 0");
  }

  function reveal(index: number) {
    const width = 9;
    let field = mines;
    if (!field) {
      field = Array(81).fill(false);
      let placed = 0;
      let cursor = (index + 17) % 81;
      while (placed < 10) {
        if (cursor !== index && !field[cursor]) {
          field[cursor] = true;
          placed += 1;
        }
        cursor = (cursor + 7) % 81;
      }
      setMines(field);
    }
    if (field[index]) {
      setResult("Boom. Reset to try again.");
      return;
    }
    const next = covered.slice();
    const stack = [index];
    let opened = 0;
    while (stack.length) {
      const current = stack.pop()!;
      if (!next[current]) continue;
      next[current] = false;
      opened += 1;
      const neighbors = [-1, 0, 1].flatMap((dr) => [-1, 0, 1].map((dc) => [dr, dc]));
      const row = Math.floor(current / width);
      const col = current % width;
      const count = neighbors.filter(([dr, dc]) => {
        const r = row + dr;
        const c = col + dc;
        return r >= 0 && c >= 0 && r < width && c < width && field![r * width + c];
      }).length;
      if (count === 0) {
        neighbors.forEach(([dr, dc]) => {
          const r = row + dr;
          const c = col + dc;
          if (r >= 0 && c >= 0 && r < width && c < width) stack.push(r * width + c);
        });
      }
    }
    setCovered(next);
    setResult(`Revealed ${opened}`);
  }

  function playSquare(square: string) {
    if (!selected) {
      setSelected(square);
      return;
    }
    const [row, col] = parseSquare(selected);
    const [toRow, toCol] = parseSquare(square);
    if (!legalMoves(board, row, col, white).some(([r, c]) => r === toRow && c === toCol)) {
      setSelected(square);
      return;
    }
    const next = applyMove(board, selected, square, white);
    if (!next) return;
    setBoard(next);
    setWhite((current) => !current);
    setSelected("");
    setResult(`${white ? "Black" : "White"} to move`);
  }

  return (
    <ToolPanel>
      {mode === "2048" ? (
        <div className="grid w-fit grid-cols-4 gap-2">
          {cells.map((value, index) => <div key={index} className="grid h-14 w-14 place-items-center rounded bg-muted text-lg font-semibold">{value || ""}</div>)}
        </div>
      ) : null}
      {mode === "2048" ? (
        <div className="flex gap-2">
          {(["left", "right", "up", "down"] as const).map((direction) => (
            <ActionButton key={direction} tone="quiet" onClick={() => {
              const moved = move2048(cells, direction);
              setCells(moved.cells);
              setScore((current) => current + moved.score);
              setResult(`Score ${score + moved.score}`);
            }}>{direction}</ActionButton>
          ))}
        </div>
      ) : null}
      {mode === "chess" ? (
        <div className="grid w-fit grid-cols-8">
          {board.map((row, rowIndex) => row.split("").map((piece, col) => {
            const square = squareName(rowIndex, col);
            const dark = (rowIndex + col) % 2 === 1;
            return (
              <button key={square} type="button" className={`h-10 w-10 text-sm ${dark ? "bg-muted" : "bg-card"} ${selected === square ? "outline outline-2 outline-foreground" : ""}`} onClick={() => playSquare(square)}>
                {piece === "." ? "" : piece}
              </button>
            );
          }))}
        </div>
      ) : null}
      {mode === "mines" ? (
        <div className="grid w-fit grid-cols-9 gap-1">
          {covered.map((hide, index) => (
            <button key={index} type="button" className="h-8 w-8 rounded bg-muted text-xs" onClick={() => reveal(index)} onContextMenu={(event) => { event.preventDefault(); setFlags((current) => current.map((flag, flagIndex) => flagIndex === index ? !flag : flag)); }}>
              {hide ? (flags[index] ? "F" : "") : mines?.[index] ? "*" : ""}
            </button>
          ))}
        </div>
      ) : null}
      {mode === "periodic" ? (
        <div className="grid grid-cols-[repeat(18,minmax(0,1fr))] gap-1">
          {ELEMENTS.map((item) => (
            <button key={item.n} type="button" style={{ gridColumn: item.col, gridRow: item.row }} className="rounded bg-muted px-1 py-1 text-caption leading-tight" onClick={() => { setElement(item); setResult(`${item.name} · ${item.n}`); }}>
              <span className="block text-muted-foreground">{item.n}</span>{item.s}
            </button>
          ))}
        </div>
      ) : null}
      {mode === "solitaire" ? (
        <div className="space-y-3 text-sm">
          <div className="flex gap-2">
            <button type="button" className="h-16 w-12 rounded border" onClick={run}>{solitaire.stock.length}</button>
            <div className="grid h-16 w-12 place-items-center rounded border">{cardLabel(solitaire.waste[0])}</div>
            {solitaire.foundation.map((pile, index) => <div key={index} className="grid h-16 w-12 place-items-center rounded border">{cardLabel(pile.at(-1))}</div>)}
          </div>
          <div className="flex gap-2">
            {solitaire.tableau.map((pile, index) => <div key={index} className="grid h-16 w-12 place-items-center rounded border">{cardLabel(pile.at(-1))}<span className="text-caption text-muted-foreground">{pile.length}</span></div>)}
          </div>
        </div>
      ) : null}
      {mode === "snake" ? (
        <div className="grid w-fit grid-cols-16 gap-px" style={{ gridTemplateColumns: "repeat(16, 12px)" }}>
          {Array.from({ length: 256 }, (_, index) => {
            const x = index % 16;
            const y = Math.floor(index / 16);
            const on = snake.body.some((part) => part[0] === x && part[1] === y);
            const food = snake.food[0] === x && snake.food[1] === y;
            return <div key={index} className={`h-3 w-3 ${on ? "bg-foreground" : food ? "bg-accent" : "bg-muted"}`} />;
          })}
        </div>
      ) : null}
      {mode === "snake" ? (
        <div className="flex gap-2">
          {([[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]).map((dir) => (
            <ActionButton key={dir.join()} tone="quiet" onClick={() => setSnake((current) => ({ ...current, dir }))}>{dir[0] === -1 ? "Left" : dir[0] === 1 ? "Right" : dir[1] === -1 ? "Up" : "Down"}</ActionButton>
          ))}
        </div>
      ) : null}
      {mode === "blocks" ? <BlockPuzzle onScore={(value) => setResult(`Score ${value}`)} bind={(drop) => { dropRef.current = drop; }} /> : null}
      <ActionButton data-action="run" onClick={run}>{tx(locale, "Run", "运行")}</ActionButton>
      {result ? <ResultText>{result}</ResultText> : mode === "periodic" ? <p className="text-sm text-muted-foreground">{`${element.name} · ${element.n}`}</p> : null}
    </ToolPanel>
  );
}

const SHAPES = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
];

function BlockPuzzle({ onScore, bind }: { onScore: (score: number) => void; bind: (drop: () => void) => void }) {
  const [grid, setGrid] = useState(() => Array.from({ length: 16 }, () => Array(10).fill(0)));
  const [piece, setPiece] = useState({ shape: SHAPES[0], x: 3, y: 0 });
  const [score, setScore] = useState(0);

  useEffect(() => {
    bind(drop);
  });
  function fits(shape: number[][], x: number, y: number, board = grid) {
    return shape.every((row, dy) => row.every((cell, dx) => !cell || (board[y + dy]?.[x + dx] === 0)));
  }
  function merge(board: number[][], shape: number[][], x: number, y: number) {
    const next = board.map((row) => row.slice());
    shape.forEach((row, dy) => row.forEach((cell, dx) => {
      if (cell && next[y + dy]) next[y + dy][x + dx] = 1;
    }));
    const kept = next.filter((row) => row.some((cell) => cell === 0));
    const cleared = next.length - kept.length;
    while (kept.length < 16) kept.unshift(Array(10).fill(0));
    return { board: kept, cleared };
  }
  function drop() {
    let y = piece.y;
    while (fits(piece.shape, piece.x, y + 1)) y += 1;
    const landed = merge(grid, piece.shape, piece.x, y);
    const nextScore = score + landed.cleared * 10;
    setGrid(landed.board);
    setScore(nextScore);
    setPiece({ shape: SHAPES[(nextScore + 1) % SHAPES.length], x: 3, y: 0 });
    onScore(nextScore);
  }

  return (
    <div>
      <div className="grid w-fit grid-cols-10 gap-px">
        {grid.map((row, y) => row.map((cell, x) => {
          const filled = cell || piece.shape.some((shapeRow, dy) => shapeRow.some((bit, dx) => bit && piece.x + dx === x && piece.y + dy === y));
          return <div key={`${x}-${y}`} className={`h-4 w-4 ${filled ? "bg-foreground" : "bg-muted"}`} />;
        }))}
      </div>
      <div className="mt-2 flex gap-2">
        <ActionButton tone="quiet" onClick={() => fits(piece.shape, piece.x - 1, piece.y) && setPiece({ ...piece, x: piece.x - 1 })}>Left</ActionButton>
        <ActionButton tone="quiet" onClick={() => fits(piece.shape, piece.x + 1, piece.y) && setPiece({ ...piece, x: piece.x + 1 })}>Right</ActionButton>
        <ActionButton tone="quiet" onClick={drop}>Drop</ActionButton>
      </div>
    </div>
  );
}
