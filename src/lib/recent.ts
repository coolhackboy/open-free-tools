import { useSyncExternalStore } from 'react';
import { getFreeTool } from '@/tools/catalog';

/** Recently opened tools, newest first. Stored only in this browser (localStorage). */
const KEY = 'oft.recent';
const MAX = 8;
const listeners = new Set<() => void>();
let cached: string[] | null = null;

function read(): string[] {
  if (cached) return cached;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    cached = Array.isArray(raw) ? raw.filter((slug): slug is string => typeof slug === 'string' && Boolean(getFreeTool(slug))).slice(0, MAX) : [];
  } catch {
    cached = [];
  }
  return cached;
}

function write(next: string[]) {
  cached = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode or storage disabled: keep it in memory */
  }
  listeners.forEach((listener) => listener());
}

export function rememberTool(slug: string) {
  const list = read();
  if (list[0] === slug) return;
  write([slug, ...list.filter((item) => item !== slug)].slice(0, MAX));
}

export function clearRecent() {
  write([]);
}

export function useRecent() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read,
    () => [],
  );
}
