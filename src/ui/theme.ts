import { useSyncExternalStore } from 'react';

export type ThemePref = 'system' | 'dark' | 'light';

const KEY = 'oft.theme';
const listeners = new Set<() => void>();

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'dark' || v === 'light' ? v : 'system';
  } catch {
    return 'system';
  }
}

let pref: ThemePref = typeof window === 'undefined' ? 'system' : read();

function systemDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function apply(next: ThemePref) {
  const root = document.documentElement;
  if (next === 'system') delete root.dataset.theme;
  else root.dataset.theme = next;
  // Keep the browser chrome color in sync with the resolved theme.
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    if (meta.dataset.original == null) meta.dataset.original = meta.content;
    meta.content = next === 'system' ? meta.dataset.original : bg || meta.dataset.original;
  });
}

export function setTheme(next: ThemePref) {
  pref = next;
  try {
    if (next === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch {
    /* ignore */
  }
  apply(next);
  listeners.forEach((listener) => listener());
}

export function initTheme() {
  apply(pref);
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    apply(pref);
    listeners.forEach((listener) => listener());
  });
}

/** The theme actually shown right now. */
export function resolvedTheme(): 'dark' | 'light' {
  if (pref !== 'system') return pref;
  return systemDark() ? 'dark' : 'light';
}

export function useResolvedTheme() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    resolvedTheme,
    () => 'light' as const,
  );
}
