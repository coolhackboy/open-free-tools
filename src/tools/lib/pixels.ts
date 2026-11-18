import { contoursToSvg, maskToDxf, traceMask, type Point } from "./dxf";

export function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function luminance(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return [clampByte((r + m) * 255), clampByte((g + m) * 255), clampByte((b + m) * 255)];
}

export function colorizePixels(data: Uint8ClampedArray, width: number, height: number) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (Math.max(r, g, b) - Math.min(r, g, b) > 28) continue;
      const l = luminance(r, g, b) / 255;
      const upper = y < height * 0.45;
      let hue = 28;
      let sat = 0.28;
      if (upper && l > 0.55) {
        hue = 205;
        sat = 0.45;
      } else if (l > 0.78) {
        hue = 40;
        sat = 0.12;
      } else if (l > 0.42) {
        hue = 24;
        sat = 0.32;
      } else if (!upper && l > 0.18) {
        hue = 95;
        sat = 0.3;
      } else {
        hue = 230;
        sat = 0.25;
      }
      const [nr, ng, nb] = hslToRgb(hue, sat, l);
      data[i] = nr;
      data[i + 1] = ng;
      data[i + 2] = nb;
    }
  }
}

export function enhancePixels(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      const value = data[i + c] / 255;
      const curved = (value - 0.5) * 1.18 + 0.5;
      data[i + c] = clampByte(curved * 255);
    }
  }
}

export function boxBlur(source: Uint8ClampedArray, width: number, height: number, radius: number) {
  const out = new Uint8ClampedArray(source);
  const tmp = new Uint8ClampedArray(source.length);
  const blurAxis = (input: Uint8ClampedArray, output: Uint8ClampedArray, horizontal: boolean) => {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let k = -radius; k <= radius; k += 1) {
          const sx = horizontal ? Math.min(width - 1, Math.max(0, x + k)) : x;
          const sy = horizontal ? y : Math.min(height - 1, Math.max(0, y + k));
          const i = (sy * width + sx) * 4;
          r += input[i];
          g += input[i + 1];
          b += input[i + 2];
          count += 1;
        }
        const o = (y * width + x) * 4;
        output[o] = r / count;
        output[o + 1] = g / count;
        output[o + 2] = b / count;
        output[o + 3] = input[o + 3];
      }
    }
  };
  blurAxis(source, tmp, true);
  blurAxis(tmp, out, false);
  return out;
}

export function unsharp(data: Uint8ClampedArray, width: number, height: number, amount = 0.7) {
  const blurred = boxBlur(data, width, height, 1);
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      data[i + c] = clampByte(data[i + c] + (data[i + c] - blurred[i + c]) * amount);
    }
  }
}

export function floodMask(data: Uint8ClampedArray, width: number, height: number, x: number, y: number, tolerance: number) {
  const mask = new Uint8Array(width * height);
  const sx = Math.max(0, Math.min(width - 1, Math.round(x)));
  const sy = Math.max(0, Math.min(height - 1, Math.round(y)));
  const seed = (sy * width + sx) * 4;
  const sr = data[seed];
  const sg = data[seed + 1];
  const sb = data[seed + 2];
  const stack = [sx, sy];
  while (stack.length) {
    const cy = stack.pop()!;
    const cx = stack.pop()!;
    const index = cy * width + cx;
    if (mask[index]) continue;
    const p = index * 4;
    if (Math.abs(data[p] - sr) + Math.abs(data[p + 1] - sg) + Math.abs(data[p + 2] - sb) > tolerance) continue;
    mask[index] = 1;
    if (cx > 0) stack.push(cx - 1, cy);
    if (cx + 1 < width) stack.push(cx + 1, cy);
    if (cy > 0) stack.push(cx, cy - 1);
    if (cy + 1 < height) stack.push(cx, cy + 1);
  }
  return mask;
}

export function edgeBackgroundMask(data: Uint8ClampedArray, width: number, height: number, tolerance: number) {
  const mask = new Uint8Array(width * height);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    const index = y * width + x;
    if (mask[index]) return;
    mask[index] = 2;
    stack.push(x, y);
  };
  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }
  while (stack.length) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    const index = y * width + x;
    const p = index * 4;
    const local = [data[p], data[p + 1], data[p + 2]];
    mask[index] = 1;
    const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of neighbors) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nIndex = ny * width + nx;
      if (mask[nIndex]) continue;
      const np = nIndex * 4;
      const distance = Math.abs(data[np] - local[0]) + Math.abs(data[np + 1] - local[1]) + Math.abs(data[np + 2] - local[2]);
      if (distance <= tolerance) {
        mask[nIndex] = 2;
        stack.push(nx, ny);
      }
    }
  }
  for (let i = 0; i < mask.length; i += 1) if (mask[i] !== 1) mask[i] = 0;
  return mask;
}

export function applyMaskAlpha(data: Uint8ClampedArray, mask: Uint8Array, invert = false) {
  for (let i = 0; i < mask.length; i += 1) {
    const selected = mask[i] > 0;
    if (invert ? !selected : selected) data[i * 4 + 3] = 0;
  }
}

export function inpaint(data: Uint8ClampedArray, width: number, height: number, mask: Uint8Array) {
  const out = new Uint8ClampedArray(data);
  let pending = new Uint8Array(mask);
  for (let iter = 0; iter < 180; iter += 1) {
    const next = new Uint8ClampedArray(out);
    const still = new Uint8Array(pending.length);
    let changed = false;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        if (!pending[index]) continue;
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (!dx && !dy) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const nIndex = ny * width + nx;
            if (pending[nIndex]) continue;
            const p = nIndex * 4;
            r += out[p];
            g += out[p + 1];
            b += out[p + 2];
            count += 1;
          }
        }
        if (!count) {
          still[index] = 1;
          continue;
        }
        const p = index * 4;
        next[p] = r / count;
        next[p + 1] = g / count;
        next[p + 2] = b / count;
        next[p + 3] = 255;
        changed = true;
      }
    }
    out.set(next);
    pending = still;
    if (!changed) break;
  }
  return out;
}

export function floydSteinberg(data: Uint8ClampedArray, width: number, height: number, levels = 2) {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i += 1) {
    gray[i] = luminance(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  }
  const step = 255 / (levels - 1);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const old = gray[index];
      const neu = Math.round(old / step) * step;
      const error = old - neu;
      gray[index] = neu;
      if (x + 1 < width) gray[index + 1] += error * 7 / 16;
      if (y + 1 < height) {
        if (x > 0) gray[index + width - 1] += error * 3 / 16;
        gray[index + width] += error * 5 / 16;
        if (x + 1 < width) gray[index + width + 1] += error * 1 / 16;
      }
    }
  }
  for (let i = 0; i < gray.length; i += 1) {
    const value = clampByte(gray[i]);
    data[i * 4] = value;
    data[i * 4 + 1] = value;
    data[i * 4 + 2] = value;
    data[i * 4 + 3] = 255;
  }
}

export function thresholdMask(data: Uint8ClampedArray, width: number, height: number, threshold: number, alpha = false) {
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i += 1) {
    const p = i * 4;
    mask[i] = alpha ? (data[p + 3] > threshold ? 1 : 0) : luminance(data[p], data[p + 1], data[p + 2]) < threshold ? 1 : 0;
  }
  return mask;
}

export function vectorizeRgba(data: Uint8ClampedArray, width: number, height: number) {
  const layers = [70, 140, 210];
  const paths: Point[][] = [];
  const fills = ["#111111", "#555555", "#999999"];
  const svgParts: string[] = [];
  layers.forEach((threshold, index) => {
    const contours = traceMask(thresholdMask(data, width, height, threshold), width, height, 1.5);
    if (!contours.length) return;
    paths.push(...contours);
    svgParts.push(contoursToSvg(contours, width, height, fills[index]).replace(/^<svg[^>]*>|<\/svg>$/g, ""));
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${svgParts.join("")}</svg>`;
  return { svg, dxf: maskToDxf(thresholdMask(data, width, height, 160), width, height) };
}

export function nearestPalette(data: Uint8ClampedArray, palette: [number, number, number][]) {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < palette.length; i += 1) {
    const [r, g, b] = palette[i];
    const distance = (data[0] - r) ** 2 + (data[1] - g) ** 2 + (data[2] - b) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

export const BEAD_PALETTE: { name: string; rgb: [number, number, number] }[] = [
  { name: "White", rgb: [255, 255, 255] },
  { name: "Cream", rgb: [245, 230, 190] },
  { name: "Yellow", rgb: [246, 214, 46] },
  { name: "Orange", rgb: [236, 122, 34] },
  { name: "Red", rgb: [196, 40, 38] },
  { name: "Pink", rgb: [244, 154, 194] },
  { name: "Purple", rgb: [116, 68, 168] },
  { name: "Blue", rgb: [38, 92, 196] },
  { name: "Light blue", rgb: [126, 196, 232] },
  { name: "Green", rgb: [42, 148, 72] },
  { name: "Light green", rgb: [146, 206, 92] },
  { name: "Brown", rgb: [122, 74, 42] },
  { name: "Tan", rgb: [210, 170, 120] },
  { name: "Gray", rgb: [150, 150, 150] },
  { name: "Black", rgb: [28, 28, 28] },
];

export function encodeBmp(data: Uint8ClampedArray, width: number, height: number) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelSize = rowSize * height;
  const out = new Uint8Array(54 + pixelSize);
  const view = new DataView(out.buffer);
  out[0] = 0x42;
  out[1] = 0x4d;
  view.setUint32(2, out.length, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, pixelSize, true);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const src = ((height - 1 - y) * width + x) * 4;
      const dst = 54 + y * rowSize + x * 3;
      out[dst] = data[src + 2];
      out[dst + 1] = data[src + 1];
      out[dst + 2] = data[src];
    }
  }
  return out;
}

export function sampleGrid(data: Uint8ClampedArray, width: number, height: number, columns: number, rows: number) {
  const cells: Uint8ClampedArray[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const x = Math.min(width - 1, Math.floor(((col + 0.5) * width) / columns));
      const y = Math.min(height - 1, Math.floor(((row + 0.5) * height) / rows));
      const i = (y * width + x) * 4;
      cells.push(data.slice(i, i + 4));
    }
  }
  return cells;
}
