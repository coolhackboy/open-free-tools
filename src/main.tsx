import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist/wght.css';
import '@fontsource-variable/geist-mono/wght.css';
import './index.css';
import App from './App';
import { config } from './config';
import { initTheme } from './ui/theme';

/** VITE_ACCENT: derive hover / soft / ink / foreground tokens from a single color. */
function applyAccent(color: string) {
  if (!color) return;
  const style = document.documentElement.style;
  style.setProperty('--accent', color);
  style.setProperty('--accent-hover', `color-mix(in oklab, ${color} 88%, white)`);
  style.setProperty('--accent-soft', `color-mix(in oklab, ${color} 13%, transparent)`);
  style.setProperty('--accent-line', `color-mix(in oklab, ${color} 40%, transparent)`);
  style.setProperty('--accent-ink', `color-mix(in oklab, ${color} 70%, var(--fg))`);
  style.setProperty('--ring', `color-mix(in oklab, ${color} 75%, transparent)`);
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = color;
    const m = /^#([0-9a-f]{6})$/i.exec(ctx.fillStyle);
    if (!m) return;
    const n = parseInt(m[1], 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    style.setProperty('--accent-fg', lum > 0.4 ? '#0b0b0c' : '#ffffff');
  } catch {
    /* keep defaults */
  }
}

applyAccent(config.accent);
initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
