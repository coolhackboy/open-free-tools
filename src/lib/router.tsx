import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import { getFreeTool } from '@/tools/catalog';
import { pagePath, type Locale } from './copy';

/** Deploy base, always ending in "/" (e.g. "/" or "/open-free-tools/"). */
export const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

export type Route =
  | { locale: Locale; name: 'home' }
  | { locale: Locale; name: 'tool'; slug: string }
  | { locale: Locale; name: 'notfound' };

/** Base-relative path ("" or "tools/x/" or "zh/tools/x/") of a URL pathname. */
function relative(pathname: string) {
  let path = pathname;
  try {
    path = decodeURI(pathname);
  } catch {
    /* keep raw */
  }
  if (path.startsWith(BASE)) return path.slice(BASE.length);
  if (`${path}/` === BASE) return '';
  return null;
}

export function parseRoute(pathname: string): Route {
  const rel = relative(pathname);
  if (rel === null) return { locale: 'en', name: 'notfound' };
  const parts = rel.split('/').filter(Boolean);
  let locale: Locale = 'en';
  if (parts[0] === 'zh') {
    locale = 'zh';
    parts.shift();
  }
  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'index.html')) return { locale, name: 'home' };
  if (parts[0] === 'tools' && parts.length === 2 && getFreeTool(parts[1])) return { locale, name: 'tool', slug: parts[1] };
  return { locale, name: 'notfound' };
}

/** Base-relative href → absolute path on this site. */
export const href = (rel: string) => `${BASE}${rel.replace(/^\/+/, '')}`;

/** Base-relative path of a page: routePath('zh', 'sudoku') === 'zh/tools/sudoku/'. */
export const routePath = pagePath;

const listeners = new Set<() => void>();
let snapshot = typeof window === 'undefined' ? '/' : window.location.pathname + window.location.search;

function emit() {
  const next = window.location.pathname + window.location.search;
  if (next === snapshot) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', emit);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Current pathname + search, as a React-friendly external store. */
export function useLocationKey() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

const scrollPositions = new Map<string, number>();

export function navigate(rel: string, opts: { replace?: boolean; keepScroll?: boolean } = {}) {
  const target = href(rel);
  const current = window.location.pathname + window.location.search;
  scrollPositions.set(current, window.scrollY);
  if (target === current) return;
  if (opts.replace) history.replaceState(null, '', target);
  else history.pushState(null, '', target);
  emit();
  if (!opts.keepScroll) window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
}

/** Restore the scroll position of a page reached with Back/Forward. */
export function restoreScroll(key: string) {
  const top = scrollPositions.get(key);
  if (top != null) window.scrollTo({ top, left: 0, behavior: 'instant' as ScrollBehavior });
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    requestAnimationFrame(() => restoreScroll(window.location.pathname + window.location.search));
  });
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string };

/** In-app link: a real <a href> (works without JS, middle-click, copy link) with client-side navigation. */
export function Link({ to, onClick, ...props }: LinkProps) {
  return (
    <a
      {...props}
      href={href(to)}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (props.target && props.target !== '_self') return;
        event.preventDefault();
        navigate(to);
      }}
    />
  );
}
